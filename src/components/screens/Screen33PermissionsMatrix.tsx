"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { MODULE_PERMISSIONS } from "@/lib/permissions";
import * as api from "@/lib/api";

const DEFAULT_ROLES = ["Admin", "Manager", "Operator"];

export default function Screen33PermissionsMatrix() {
  const toast = useToast();
  const confirm = useConfirm();
  const [dbRoles, setDbRoles] = useState<Record<string, string[]>>({});
  const [rolesList, setRolesList] = useState<string[]>(["Admin", "Manager", "Operator"]);
  const [loading, setLoading] = useState(true);

  // New Role Form
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [addRoleError, setAddRoleError] = useState("");

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await api.fetchRoles();
      if (data.roles) {
        setDbRoles(data.roles);
        setRolesList(Object.keys(data.roles));
      }
    } catch {
      // Keep existing state on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleTogglePermission = async (role: string, permission: string) => {
    if (role.toLowerCase() === "admin") return;

    const currentPerms = dbRoles[role] || [];
    const nextPerms = currentPerms.includes(permission)
      ? currentPerms.filter((p) => p !== permission)
      : [...currentPerms, permission];

    // Optimistic UI update
    setDbRoles((prev) => ({
      ...prev,
      [role]: nextPerms,
    }));

    try {
      await api.setRolePermissions(role, nextPerms);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update permissions");
      loadRoles(); // Rollback
    }
  };

  const handleCreateRole = async () => {
    setAddRoleError("");
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      setAddRoleError("Role name is required.");
      return;
    }
    if (rolesList.includes(trimmed)) {
      setAddRoleError("Role already exists.");
      return;
    }

    try {
      await api.setRolePermissions(trimmed, []);
      setShowAddRole(false);
      setNewRoleName("");
      await loadRoles();
      toast.success(`Role "${trimmed}" created.`);
    } catch (err: unknown) {
      setAddRoleError(err instanceof Error ? err.message : "Failed to create role");
    }
  };

  const handleDeleteRole = async (role: string) => {
    const ok = await confirm({
      title: "Delete role",
      message: `Delete the "${role}" role? Its permission settings will be removed. Users assigned to it must be reassigned first.`,
      confirmLabel: "Delete role",
      danger: true,
    });
    if (!ok) return;

    try {
      await api.deleteRole(role);
      await loadRoles();
      toast.success(`Role "${role}" deleted.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete role");
    }
  };

  if (loading) {
    return (
      <>
        <SectionHeader
          title={<>Permissions <strong>Matrix</strong></>}
          description="Configure access rights and feature availability for all user roles across different departments."
        />

        <ScreenFrame
          breadcrumbs={[{ label: "Settings" }, { label: "Permissions Matrix" }]}
          actions={
            <button className="btn btn-primary" disabled style={{ opacity: 0.6 }}>
              + New Role
            </button>
          }
        >
          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--b1)", marginBottom: "20px" }}>
            <Link href="/settings/users" style={{ borderBottom: "none", padding: "10px 16px", borderRadius: "6px 6px 0 0", color: "var(--tx3)", display: "block" }}>
              User Accounts
            </Link>
            <Link href="/settings/permissions" style={{ borderBottom: "2px solid var(--acc)", padding: "10px 16px", borderRadius: "6px 6px 0 0", color: "var(--tx)", fontWeight: 600, display: "block" }}>
              Permissions Matrix
            </Link>
          </div>

          {/* Matrix Grid Skeleton */}
          <div className="card" style={{ padding: "16px", overflowX: "auto" }}>
            <table className="tbl" style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--b1)" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", minWidth: "220px" }}>Module & Specific Permission</th>
                  {rolesList.map((role) => (
                    <th key={role} style={{ textAlign: "center", padding: "10px 14px", minWidth: "110px" }}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-semibold text-tx" style={{ opacity: 0.6 }}>{role}</span>
                      </div>
                      {role.toLowerCase() === "admin" && (
                        <span style={{ fontSize: "8.5px", color: "var(--sem-rd-tx)", fontWeight: 500 }}>(Locked)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(MODULE_PERMISSIONS).map(([moduleName, perms]) => (
                  <React.Fragment key={moduleName}>
                    {/* Category Header Row */}
                    <tr style={{ background: "var(--alt2)", borderBottom: "1px solid var(--b1)" }}>
                      <td colSpan={rolesList.length + 1} style={{ padding: "8px 14px", fontWeight: 700, fontSize: "11.5px", color: "var(--acc)", textTransform: "uppercase" }}>
                        {moduleName}
                      </td>
                    </tr>
                    {/* Permission Rows */}
                    {perms.map((perm) => (
                      <tr key={perm.key} style={{ borderBottom: "1px solid var(--tbl-line)" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div className="font-medium text-tx text-[12px]">{perm.label}</div>
                          <div className="text-[9.5px] text-tx3 font-mono">{perm.key}</div>
                        </td>
                        {rolesList.map((role) => (
                          <td key={role} style={{ textAlign: "center", padding: "10px 14px" }}>
                            <input
                              type="checkbox"
                              checked={role.toLowerCase() === "admin"}
                              disabled
                              style={{ cursor: "not-allowed", opacity: 0.4 }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </ScreenFrame>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Permissions <strong>Matrix</strong></>}
        description="Configure access rights and feature availability for all user roles across different departments."
      />

      <ScreenFrame
        breadcrumbs={[{ label: "Settings" }, { label: "Permissions Matrix" }]}
        actions={
          <button className="btn btn-primary" onClick={() => setShowAddRole(true)}>
            + New Role
          </button>
        }
      >
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--b1)", marginBottom: "20px" }}>
          <Link href="/settings/users" style={{ borderBottom: "none", padding: "10px 16px", borderRadius: "6px 6px 0 0", color: "var(--tx3)", display: "block" }}>
            User Accounts
          </Link>
          <Link href="/settings/permissions" style={{ borderBottom: "2px solid var(--acc)", padding: "10px 16px", borderRadius: "6px 6px 0 0", color: "var(--tx)", fontWeight: 600, display: "block" }}>
            Permissions Matrix
          </Link>
        </div>

        {/* Matrix Grid */}
        <div className="card" style={{ padding: "16px", overflowX: "auto" }}>
          <table className="tbl" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--b1)" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", minWidth: "220px" }}>Module & Specific Permission</th>
                {rolesList.map((role) => {
                  const isDefault = DEFAULT_ROLES.some((r) => r.toLowerCase() === role.toLowerCase());
                  return (
                    <th key={role} style={{ textAlign: "center", padding: "10px 14px", minWidth: "110px" }}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-semibold text-tx">{role}</span>
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            aria-label={`Delete ${role} role`}
                            title={`Delete ${role} role`}
                            className="text-tx3 hover:text-rd text-[13px] leading-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {role.toLowerCase() === "admin" && (
                        <span style={{ fontSize: "8.5px", color: "var(--sem-rd-tx)", fontWeight: 500 }}>(Locked)</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(MODULE_PERMISSIONS).map(([moduleName, perms]) => (
                <React.Fragment key={moduleName}>
                  {/* Category Header Row */}
                  <tr style={{ background: "var(--alt2)", borderBottom: "1px solid var(--b1)" }}>
                    <td colSpan={rolesList.length + 1} style={{ padding: "8px 14px", fontWeight: 700, fontSize: "11.5px", color: "var(--acc)", textTransform: "uppercase" }}>
                      {moduleName}
                    </td>
                  </tr>
                  {/* Permission Rows */}
                  {perms.map((perm) => (
                    <tr key={perm.key} style={{ borderBottom: "1px solid var(--tbl-line)" }} className="hover-bg-s2">
                      <td style={{ padding: "10px 14px" }}>
                        <div className="font-medium text-tx text-[12px]">{perm.label}</div>
                        <div className="text-[9.5px] text-tx3 font-mono">{perm.key}</div>
                      </td>
                      {rolesList.map((role) => {
                        const isAdmin = role.toLowerCase() === "admin";
                        const granted = isAdmin || (dbRoles[role] || []).includes(perm.key);
                        return (
                          <td key={role} style={{ textAlign: "center", padding: "10px 14px" }}>
                            <input
                              type="checkbox"
                              checked={granted}
                              disabled={isAdmin}
                              onChange={() => handleTogglePermission(role, perm.key)}
                              style={{ cursor: isAdmin ? "not-allowed" : "pointer" }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </ScreenFrame>

      {/* Create role modal */}
      <Modal
        open={showAddRole}
        onClose={() => { setShowAddRole(false); setAddRoleError(""); }}
        title="Create new role"
        width={360}
        footer={
          <>
            <Button onClick={() => { setShowAddRole(false); setAddRoleError(""); }}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateRole}>Create role</Button>
          </>
        }
      >
        <div className="field">
          <label className="flbl" htmlFor="new-role-name">Role Name *</label>
          <input
            id="new-role-name"
            className="finp"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateRole(); }}
            placeholder="e.g. Supervisor"
            autoFocus
            aria-invalid={addRoleError ? true : undefined}
            aria-describedby={addRoleError ? "new-role-error" : undefined}
          />
          {addRoleError && (
            <span id="new-role-error" role="alert" className="text-[11px] text-rd">{addRoleError}</span>
          )}
        </div>
      </Modal>
    </>
  );
}

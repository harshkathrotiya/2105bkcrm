"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPermissions = useMemo(() => {
    if (!searchQuery.trim()) return MODULE_PERMISSIONS;
    const query = searchQuery.toLowerCase();
    
    const result: typeof MODULE_PERMISSIONS = {};
    for (const [moduleName, perms] of Object.entries(MODULE_PERMISSIONS)) {
      const matched = perms.filter(
        (p) => p.label.toLowerCase().includes(query) || p.key.toLowerCase().includes(query)
      );
      if (matched.length > 0) {
        result[moduleName] = matched;
      }
    }
    return result;
  }, [searchQuery]);

  // New Role Form
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [addRoleError, setAddRoleError] = useState("");
  const [addRoleLoading, setAddRoleLoading] = useState(false);

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

    setAddRoleLoading(true);
    try {
      await api.setRolePermissions(trimmed, []);
      setShowAddRole(false);
      setNewRoleName("");
      await loadRoles();
      toast.success(`Role "${trimmed}" created.`);
    } catch (err: unknown) {
      setAddRoleError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setAddRoleLoading(false);
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

          {/* Search Bar Skeleton */}
          <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "360px" }}>
              <input
                type="text"
                placeholder="Search permissions by name or keyword..."
                disabled
                className="finp"
                style={{
                  paddingLeft: "36px",
                  fontSize: "12.5px",
                  borderRadius: "10px",
                  height: "38px",
                  opacity: 0.7,
                }}
              />
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--tx3)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
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
      <style dangerouslySetInnerHTML={{ __html: `
        .matrix-row {
          transition: background 0.15s ease;
        }
        .matrix-row:hover {
          background: var(--row-hover) !important;
        }
        .matrix-checkbox-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
          user-select: none;
        }
        .matrix-checkbox-box {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .matrix-checkbox-container:hover .matrix-checkbox-box:not(.locked) {
          border-color: var(--tx) !important;
          transform: scale(1.08);
        }
        .delete-role-btn {
          margin-left: 6px;
          color: var(--tx3);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          line-height: 1;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.15s;
        }
        .delete-role-btn:hover {
          color: var(--rd) !important;
          background: var(--sem-rd-bg) !important;
        }
      `}} />

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
          
          {/* Search Filter Toolbar */}
          <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "360px", minWidth: "260px" }}>
              <input
                type="text"
                placeholder="Search permissions by name or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finp"
                style={{
                  paddingLeft: "36px",
                  fontSize: "12.5px",
                  borderRadius: "10px",
                  height: "38px",
                }}
              />
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--tx3)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--tx3)",
                    fontSize: "16px",
                    lineHeight: 1,
                    padding: "4px",
                  }}
                >
                  ×
                </button>
              )}
            </div>
            {searchQuery && (
              <div style={{ fontSize: "11.5px", color: "var(--tx3)", fontWeight: 500 }}>
                Found {Object.values(filteredPermissions).flat().length} permissions
              </div>
            )}
          </div>

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
                            className="delete-role-btn"
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
              {Object.keys(filteredPermissions).length === 0 ? (
                <tr>
                  <td colSpan={rolesList.length + 1} style={{ textAlign: "center", padding: "40px 16px" }}>
                    <div style={{ color: "var(--tx3)", fontSize: "12px", marginBottom: "12px" }}>
                      No permissions match your search filter.
                    </div>
                    <button
                      className="btn"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search query
                    </button>
                  </td>
                </tr>
              ) : (
                Object.entries(filteredPermissions).map(([moduleName, perms]) => (
                  <React.Fragment key={moduleName}>
                    {/* Category Header Row */}
                    <tr style={{ borderBottom: "1px solid var(--b1)" }}>
                      <td
                        colSpan={rolesList.length + 1}
                        style={{
                          padding: "10px 14px",
                          fontWeight: 700,
                          fontSize: "11.5px",
                          color: "var(--acc)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          background: "var(--alt2)",
                          borderLeft: "4px solid var(--acc)",
                        }}
                      >
                        {moduleName}
                      </td>
                    </tr>
                    {/* Permission Rows */}
                    {perms.map((perm) => (
                      <tr key={perm.key} style={{ borderBottom: "1px solid var(--tbl-line)" }} className="matrix-row">
                        <td style={{ padding: "12px 14px" }}>
                          <div className="font-semibold text-tx text-[12.5px]" style={{ letterSpacing: "-0.01em" }}>{perm.label}</div>
                          <div className="text-[9.5px] text-tx3 font-mono" style={{ marginTop: "2px", opacity: 0.85 }}>{perm.key}</div>
                        </td>
                        {rolesList.map((role) => {
                          const isAdmin = role.toLowerCase() === "admin";
                          const granted = isAdmin || (dbRoles[role] || []).includes(perm.key);
                          return (
                            <td key={role} style={{ textAlign: "center", padding: "10px 14px", verticalAlign: "middle" }}>
                              <label
                                className="matrix-checkbox-container"
                                style={{ cursor: isAdmin ? "not-allowed" : "pointer" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={granted}
                                  disabled={isAdmin}
                                  onChange={() => handleTogglePermission(role, perm.key)}
                                  style={{
                                    position: "absolute",
                                    opacity: 0,
                                    width: 0,
                                    height: 0,
                                  }}
                                />
                                <div
                                  className={`matrix-checkbox-box ${isAdmin ? "locked" : ""}`}
                                  style={{
                                    border: `1.5px solid ${
                                      isAdmin
                                        ? "var(--b2)"
                                        : granted
                                        ? "var(--acc)"
                                        : "var(--b2)"
                                    }`,
                                    background: isAdmin
                                      ? "var(--alt2)"
                                      : granted
                                      ? "var(--acc)"
                                      : "transparent",
                                    boxShadow: granted && !isAdmin ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                                  }}
                                >
                                  {isAdmin ? (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                  ) : granted ? (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--s1)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  ) : null}
                                </div>
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
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
            <Button variant="primary" onClick={handleCreateRole} disabled={addRoleLoading}>{addRoleLoading ? "Creating…" : "Create role"}</Button>
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

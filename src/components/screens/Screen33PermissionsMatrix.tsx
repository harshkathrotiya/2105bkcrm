"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useToast } from "../ui/Toast";
import { type Permission, MODULE_PERMISSIONS } from "@/lib/permissions";


export default function Screen33PermissionsMatrix() {
  const toast = useToast();
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
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (res.ok && data.roles) {
        setDbRoles(data.roles);
        setRolesList(Object.keys(data.roles));
      }
    } catch (err) {
      console.error("Failed to load roles", err);
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
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permissions: nextPerms }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save permissions");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update permissions");
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
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: trimmed, permissions: [] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create role");
      }
      setShowAddRole(false);
      setNewRoleName("");
      await loadRoles();
    } catch (err: any) {
      setAddRoleError(err.message || "Failed to create role");
    }
  };

  if (loading) {
    return (
      <ScreenFrame breadcrumb="Settings › Permissions › Loading...">
        <LoadingSkeleton rows={8} message="Reading database roles and permissions schema..." />
      </ScreenFrame>
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
                {rolesList.map((role) => (
                  <th key={role} style={{ textAlign: "center", padding: "10px 14px", minWidth: "110px" }}>
                    <div className="font-semibold text-tx">{role}</div>
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
      {showAddRole && (
        <div
          style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowAddRole(false)}
        >
          <div className="card" style={{ width: 320, margin: 0, padding: "22px 24px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-t" style={{ marginBottom: "14px" }}>Create new role</div>

            <div className="field" style={{ marginBottom: "16px" }}>
              <div className="flbl">Role Name *</div>
              <input
                className="finp"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Supervisor"
              />
            </div>

            {addRoleError && <div className="text-[11px] text-rd" style={{ marginBottom: "12px" }}>{addRoleError}</div>}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowAddRole(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateRole}>
                Create role
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

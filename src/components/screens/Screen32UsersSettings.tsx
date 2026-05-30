"use client";

import { useState, useEffect } from "react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useCurrentUser } from "@/lib/use-current-user";
import { ROLES, ROLE_PERMISSIONS, type Role, type Permission } from "@/lib/permissions";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  is_active: number;
  created_at: string;
}

const ROLE_BADGE: Record<string, "rd" | "bl" | "gr" | "gy"> = {
  Admin: "rd",
  Manager: "bl",
  Operator: "gr",
};

const PERMISSION_LABELS: Record<Permission, string> = {
  "clients.view": "View clients",
  "clients.create": "Add clients",
  "clients.edit": "Edit clients",
  "clients.delete": "Delete clients",
  "inquiries.view": "View inquiries",
  "inquiries.create": "Add inquiries",
  "inquiries.edit": "Edit inquiries",
  "quotations.view": "View quotations",
  "quotations.create": "Create quotations",
  "quotations.edit": "Edit quotations",
  "invoices.view": "View invoices",
  "invoices.edit": "Edit invoices",
  "calendar.view": "View calendar",
  "equipment.view": "View equipment",
  "equipment.create": "Add equipment",
  "equipment.edit": "Edit equipment",
  "equipment.delete": "Delete equipment",
  "kits.view": "View kits",
  "kits.edit": "Edit kits",
  "vendors.view": "View vendors",
  "vendors.edit": "Edit vendors",
  "staff.view": "View staff",
  "staff.create": "Add staff",
  "staff.edit": "Edit staff",
  "staff.payments": "Manage staff payments",
  "reports.view": "View reports",
  "warehouse.view": "Warehouse check",
  "settings.users": "Manage users & roles",
};

export default function Screen32UsersSettings() {
  const { user: currentUser } = useCurrentUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dynamic roles states
  const [dbRoles, setDbRoles] = useState<Record<string, string[]>>({});
  const [rolesList, setRolesList] = useState<string[]>(["Admin", "Manager", "Operator"]);
  const [newRoleName, setNewRoleName] = useState("");
  const [showAddRole, setShowAddRole] = useState(false);
  const [addRoleError, setAddRoleError] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("Operator");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit modal
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<string>("Operator");
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Role permissions viewer
  const [viewRole, setViewRole] = useState<string>("Admin");

  const load = () => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false); })
      .catch(() => { setError("Failed to load users"); setLoading(false); });
  };

  const loadRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (res.ok && data.roles) {
        setDbRoles(data.roles);
        setRolesList(Object.keys(data.roles));
      }
    } catch (err) {
      console.error("Failed to load roles", err);
    }
  };

  useEffect(() => {
    load();
    loadRoles();
  }, []);

  const handleTogglePermission = async (role: string, permission: string) => {
    if (role.toLowerCase() === "admin") {
      alert("Admin permissions are fixed and cannot be changed.");
      return;
    }

    const currentPerms = dbRoles[role] || [];
    const nextPerms = currentPerms.includes(permission)
      ? currentPerms.filter((p) => p !== permission)
      : [...currentPerms, permission];

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
      alert(err.message || "Failed to update permissions");
      loadRoles();
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
      setViewRole(trimmed);
    } catch (err: any) {
      setAddRoleError(err.message || "Failed to create role");
    }
  };

  const handleCreate = async () => {
    setCreateError("");
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError("Username and password are required.");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername.trim(), name: newName.trim(), password: newPassword, role: newRole }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateError(data.error ?? "Failed to create user"); return; }
    setShowCreate(false);
    setNewUsername(""); setNewName(""); setNewPassword(""); setNewRole("Operator");
    load();
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditPassword("");
    setEditActive(u.is_active === 1);
    setSaveError("");
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true); setSaveError("");
    const body: any = { name: editName, role: editRole, is_active: editActive ? 1 : 0 };
    if (editPassword.trim()) body.password = editPassword.trim();

    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(data.error ?? "Failed to save"); return; }
    setEditUser(null);
    load();
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Failed to delete"); return; }
    load();
  };

  return (
    <>
      <SectionHeader
        title={<>Users & <strong>Roles</strong></>}
        description="Manage who can access the CRM and what they can do. Only Admins can reach this page."
      />
      <ScreenFrame
        breadcrumbs={[{ label: "Settings" }, { label: "Users & Roles" }]}
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New user
          </button>
        }
      >
        <div className="two-col" style={{ gap: "20px" }}>
          {/* Left — user list */}
          <div>
            <div className="card !p-3">
              <div className="card-t">All users</div>

              {loading ? (
                <div className="text-[12px] text-tx3" style={{ padding: "20px" }}>Loading…</div>
              ) : error ? (
                <div className="text-[12px] text-rd" style={{ padding: "20px" }}>{error}</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th style={{ width: 90 }}>Role</th>
                      <th style={{ width: 70 }}>Status</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="cursor-pointer" onClick={() => openEdit(u)}>
                        <td>
                          <div className="font-medium text-tx text-[12px]">{u.name || u.username}</div>
                          <div className="text-[10px] text-tx3">@{u.username}</div>
                        </td>
                        <td>
                          <Badge variant={ROLE_BADGE[u.role] ?? "gy"}>{u.role}</Badge>
                        </td>
                        <td>
                          <Badge variant={u.is_active ? "gr" : "gy"}>
                            {u.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td>
                          {u.id !== currentUser?.id && (
                            <button
                              className="btn btn-danger text-[10px] px-[8px] py-[4px]"
                              onClick={(e) => { e.stopPropagation(); handleDelete(u); }}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right — role permissions viewer */}
          <div>
            <div className="card">
              <div className="flex justify-between items-center" style={{ marginBottom: "14px" }}>
                <span className="card-t" style={{ margin: 0 }}>Role permissions</span>
                <button
                  className="btn btn-sm text-[10px] py-1 px-2"
                  onClick={() => setShowAddRole(true)}
                >
                  + Add Role
                </button>
              </div>
              <div className="flex flex-wrap gap-1" style={{ marginBottom: "14px" }}>
                {rolesList.map((r) => (
                  <button
                    key={r}
                    className={`btn text-[11px] justify-center ${viewRole === r ? "btn-primary" : ""}`}
                    style={{ padding: "4px 8px", minHeight: "auto", flex: "1 0 auto" }}
                    onClick={() => setViewRole(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {(Object.keys(PERMISSION_LABELS) as Permission[]).map((perm) => {
                  const isAdmin = viewRole.toLowerCase() === "admin";
                  const granted = isAdmin || (dbRoles[viewRole] || []).includes(perm);
                  return (
                    <label
                      key={perm}
                      className="row-item"
                      style={{ padding: "6px 0", cursor: isAdmin ? "not-allowed" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span className="text-[11px] text-tx2">{PERMISSION_LABELS[perm]}</span>
                      <input
                        type="checkbox"
                        checked={granted}
                        disabled={isAdmin}
                        onChange={() => handleTogglePermission(viewRole, perm)}
                        style={{ cursor: isAdmin ? "not-allowed" : "pointer" }}
                      />
                    </label>
                  );
                })}
              </div>
              <div
                className="rounded-md text-[10px]"
                style={{
                  marginTop: "14px",
                  padding: "8px 12px",
                  background: "var(--sem-notif-bg)",
                  border: "1px solid var(--sem-notif-bdr)",
                  color: "var(--tx3)",
                }}
              >
                {viewRole.toLowerCase() === "admin" ? (
                  <span>Admin role permissions are locked and always have full access.</span>
                ) : (
                  <span>Check or uncheck permissions above to customize the access rules for this role.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScreenFrame>

      {/* Create user modal */}
      {showCreate && (
        <div
          style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowCreate(false)}
        >
          <div className="card" style={{ width: 380, margin: 0, padding: "22px 24px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-t" style={{ marginBottom: "14px" }}>Create new user</div>

            <div className="fgrid" style={{ gap: "12px", marginBottom: "16px" }}>
              <div className="field span2">
                <div className="flbl">Full name (optional)</div>
                <input className="finp" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Rahul Shah" />
              </div>
              <div className="field span2">
                <div className="flbl">Username *</div>
                <input className="finp" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. rahul" autoCapitalize="none" />
              </div>
              <div className="field span2">
                <div className="flbl">Password * (min 6 chars)</div>
                <input className="finp" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="field span2">
                <div className="flbl">Role *</div>
                <div className="flex flex-wrap gap-2">
                  {rolesList.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`btn justify-center text-[11px] ${newRole === r ? "btn-primary" : ""}`}
                      style={{ padding: "4px 8px", flex: "1 0 auto" }}
                      onClick={() => setNewRole(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-tx3" style={{ marginTop: "6px" }}>
                  {newRole === "Admin" && "Full access including user management."}
                  {newRole === "Manager" && "Can create and edit all records. Cannot manage users or delete equipment."}
                  {newRole === "Operator" && "Read-only access across all sections."}
                  {!["Admin", "Manager", "Operator"].includes(newRole) && "Custom defined role privileges."}
                </div>
              </div>
            </div>

            {createError && <div className="text-[11px] text-rd" style={{ marginBottom: "12px" }}>{createError}</div>}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create user"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Edit user modal */}
      {editUser && (
        <div
          style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setEditUser(null)}
        >
          <div className="card" style={{ width: 380, margin: 0, padding: "22px 24px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-t" style={{ marginBottom: "14px" }}>
              Edit user — <span className="text-tx3 font-normal">@{editUser.username}</span>
            </div>

            <div className="fgrid" style={{ gap: "12px", marginBottom: "16px" }}>
              <div className="field span2">
                <div className="flbl">Full name</div>
                <input className="finp" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="field span2">
                <div className="flbl">Role</div>
                <div className="flex flex-wrap gap-2">
                  {rolesList.map((r) => {
                    const isSelfAdmin = editUser.id === currentUser?.id && editUser.role === "Admin";
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={isSelfAdmin}
                        className={`btn justify-center text-[11px] ${editRole === r ? "btn-primary" : ""}`}
                        style={{ padding: "4px 8px", flex: "1 0 auto", opacity: isSelfAdmin && editRole !== r ? 0.5 : 1 }}
                        onClick={() => setEditRole(r)}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
                {editUser.id === currentUser?.id && editUser.role === "Admin" && (
                  <div className="text-[10px] text-acc" style={{ marginTop: "4px" }}>
                    Logged-in administrators cannot demote their own role.
                  </div>
                )}
              </div>
              <div className="field span2">
                <div className="flbl">New password (leave blank to keep current)</div>
                <input className="finp" type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="••••••••" />
              </div>
              {editUser.id !== currentUser?.id && (
                <div className="field span2">
                  <div className="flbl">Account status</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`btn flex-1 justify-center text-[11px] ${editActive ? "btn-success" : ""}`}
                      onClick={() => setEditActive(true)}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      className={`btn flex-1 justify-center text-[11px] ${!editActive ? "btn-danger" : ""}`}
                      onClick={() => setEditActive(false)}
                    >
                      Inactive
                    </button>
                  </div>
                </div>
              )}
            </div>

            {saveError && <div className="text-[11px] text-rd" style={{ marginBottom: "12px" }}>{saveError}</div>}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

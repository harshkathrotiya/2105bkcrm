"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { useCurrentUser } from "@/lib/use-current-user";
import * as api from "@/lib/api";
import type { UserRow } from "@/lib/api";

const ROLE_BADGE: Record<string, "rd" | "bl" | "gr" | "gy"> = {
  Admin: "rd",
  Manager: "bl",
  Operator: "gr",
};

export default function Screen32UsersSettings() {
  const { user: currentUser } = useCurrentUser();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dynamic roles states
  const [rolesList, setRolesList] = useState<string[]>(["Admin", "Manager", "Operator"]);

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

  const load = () => {
    setLoading(true);
    api.fetchUsers()
      .then((data) => { setUsers(data); setLoading(false); })
      .catch(() => { setError("Failed to load users"); setLoading(false); });
  };

  const loadRoles = async () => {
    try {
      const data = await api.fetchRoles();
      if (data.roles) setRolesList(Object.keys(data.roles));
    } catch {
      // Keep default roles on failure
    }
  };

  useEffect(() => {
    load();
    loadRoles();
  }, []);

  const handleCreate = async () => {
    setCreateError("");
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError("Username and password are required.");
      return;
    }
    setCreating(true);
    try {
      await api.createUser({ username: newUsername.trim(), name: newName.trim(), password: newPassword, role: newRole });
      setShowCreate(false);
      setNewUsername(""); setNewName(""); setNewPassword(""); setNewRole("Operator");
      load();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
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
    try {
      const body: Parameters<typeof api.updateUser>[1] = { name: editName, role: editRole, is_active: editActive ? 1 : 0 };
      if (editPassword.trim()) body.password = editPassword.trim();
      await api.updateUser(editUser.id, body);
      setEditUser(null);
      load();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    const ok = await confirm({
      message: `Delete user "${u.username}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteUser(u.id);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <>
      <SectionHeader
        title={<>Users & <strong>Roles</strong></>}
        description="Manage user credentials, status, and system roles. Only Administrators have access."
      />
      <ScreenFrame
        breadcrumbs={[{ label: "Settings" }, { label: "User Accounts" }]}
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New user
          </button>
        }
      >
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--b1)", marginBottom: "20px" }}>
          <Link href="/settings/users" style={{ borderBottom: "2px solid var(--acc)", padding: "10px 16px", borderRadius: "6px 6px 0 0", color: "var(--tx)", fontWeight: 600, display: "block" }}>
            User Accounts
          </Link>
          <Link href="/settings/permissions" style={{ borderBottom: "none", padding: "10px 16px", borderRadius: "6px 6px 0 0", color: "var(--tx3)", display: "block" }}>
            Permissions Matrix
          </Link>
        </div>

        {/* User list */}
        <div className="card !p-3">
          <div className="card-t" style={{ marginBottom: "14px" }}>All users</div>

          {loading ? (
            <div className="text-[12px] text-tx3" style={{ padding: "20px" }}>Loading…</div>
          ) : error ? (
            <div className="text-[12px] text-rd" style={{ padding: "20px" }}>{error}</div>
          ) : (
            <table className="tbl" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--b1)" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px" }}>User</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", width: 140 }}>Role</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", width: 120 }}>Status</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="cursor-pointer hover-bg-s2" onClick={() => openEdit(u)} style={{ borderBottom: "1px solid var(--tbl-line)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div className="font-medium text-tx text-[13px]">{u.name || u.username}</div>
                      <div className="text-[11px] text-tx3">@{u.username}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge variant={ROLE_BADGE[u.role] ?? "gy"}>{u.role}</Badge>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge variant={u.is_active ? "gr" : "gy"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button className="btn btn-sm" onClick={() => openEdit(u)}>Edit</button>
                        {u.id !== currentUser?.id && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(u)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                <select
                  className="fsel"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  required
                >
                  {rolesList.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
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
                <div className="flbl">Role *</div>
                {editUser.id === currentUser?.id && editUser.role === "Admin" ? (
                  <>
                    <select
                      className="fsel"
                      value={editRole}
                      disabled
                      required
                    >
                      <option value="Admin">Admin</option>
                    </select>
                    <div className="text-[10px] text-acc" style={{ marginTop: "4px" }}>
                      Logged-in administrators cannot demote their own role.
                    </div>
                  </>
                ) : (
                  <select
                    className="fsel"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    required
                  >
                    {rolesList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
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


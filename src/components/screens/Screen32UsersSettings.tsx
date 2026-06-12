"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, UserPlus, X, Shield, Users } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { useCurrentUser } from "@/lib/use-current-user";
import * as api from "@/lib/api";
import type { UserRow } from "@/lib/api";

const ROLE_COLOR: Record<string, { bg: string; dot: string; text: string }> = {
  Admin:             { bg: "#FEE2E2", dot: "#EF4444", text: "#DC2626" },
  Manager:           { bg: "#EFF6FF", dot: "#3B82F6", text: "#1D4ED8" },
  Operator:          { bg: "#F0FDF4", dot: "#22C55E", text: "#15803D" },
  "Department Head": { bg: "#FEF3C7", dot: "#F59E0B", text: "#B45309" },
  Staff:             { bg: "#F5F3FF", dot: "#8B5CF6", text: "#6D28D9" },
};

function RolePill({ role }: { role: string }) {
  const c = ROLE_COLOR[role] ?? { bg: "#F1F5F9", dot: "#94A3B8", text: "#475569" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.text, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {role}
    </span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return active
    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#F0FDF4", color: "#15803D", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} /> Active
      </span>
    : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#F1F5F9", color: "#475569", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94A3B8", flexShrink: 0 }} /> Inactive
      </span>;
}

const ROLE_HINT: Record<string, string> = {
  Admin: "Full access including user management.",
  Manager: "Can create and edit all records. Cannot manage users or delete equipment.",
  Operator: "Read-only access across all sections.",
  "Department Head": "View and edit access scoped to their department.",
  Staff: "See own assigned events, dates, and payments only.",
};

export default function Screen32UsersSettings() {
  const { user: currentUser } = useCurrentUser();
  const toast = useToast();
  const confirm = useConfirm();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [rolesList, setRolesList] = useState<string[]>(["Admin", "Manager", "Operator", "Department Head", "Staff"]);

  // Staff list for Staff role picker
  const [staffList, setStaffList] = useState<{ id: number; name: string; role: string }[]>([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("Operator");
  const [newDepartment, setNewDepartment] = useState("VIDEO");
  const [newStaffId, setNewStaffId] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit modal
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("Operator");
  const [editDepartment, setEditDepartment] = useState("VIDEO");
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.fetchUsers()
      .then((data) => { setUsers(data); setLoading(false); })
      .catch(() => { setError("Failed to load users"); setLoading(false); });
  };

  useEffect(() => {
    load();
    api.fetchRoles().then((d) => { if (d.roles) setRolesList(Object.keys(d.roles)); }).catch(() => {});
    fetch("/api/staff?limit=500", { credentials: "same-origin" })
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setStaffList((d.items ?? d ?? []).map((s: any) => ({ id: s.id, name: s.name, role: s.role }))))
      .catch(() => {});
  }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const counts = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.role === "Admin").length,
    deptHeads: users.filter((u) => u.role === "Department Head").length,
  };

  const resetCreate = () => { setNewUsername(""); setNewName(""); setNewPassword(""); setNewRole("Operator"); setNewDepartment("VIDEO"); setNewStaffId(""); setCreateError(""); };

  const handleCreate = async () => {
    setCreateError("");
    if (!newUsername.trim() || !newPassword.trim()) { setCreateError("Username and password are required."); return; }
    if (newPassword.length < 6) { setCreateError("Password must be at least 6 characters."); return; }
    if (newRole === "Staff" && !newStaffId) { setCreateError("Please select which staff member this account belongs to."); return; }
    setCreating(true);
    try {
      await api.createUser({
        username: newUsername.trim(),
        name: newName.trim(),
        password: newPassword,
        role: newRole,
        department: newRole === "Department Head" ? newDepartment : undefined,
        staffId: newRole === "Staff" ? newStaffId : undefined,
      });
      setShowCreate(false);
      resetCreate();
      load();
      toast.success("User created successfully.");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u); setEditName(u.name); setEditRole(u.role);
    setEditDepartment(u.department ?? "VIDEO"); setEditPassword("");
    setEditActive(u.is_active === 1); setSaveError("");
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true); setSaveError("");
    try {
      const body: Parameters<typeof api.updateUser>[1] = { name: editName, role: editRole, is_active: editActive ? 1 : 0 };
      if (editPassword.trim()) body.password = editPassword.trim();
      if (editRole === "Department Head") body.department = editDepartment;
      await api.updateUser(editUser.id, body);
      setEditUser(null);
      load();
      toast.success("User updated.");
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    const ok = await confirm({ message: `Delete user "@${u.username}"? This cannot be undone.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    setDeletingId(u.id);
    try {
      await api.deleteUser(u.id);
      load();
      toast.success("User deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const getInitials = (name: string, username: string) => {
    const n = name || username;
    return n.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2);
  };

  const AVATAR_COLORS = ["#EFF6FF", "#F0FDF4", "#FEF3C7", "#F5F3FF", "#FFF1F2", "#ECFDF5"];
  const AVATAR_TEXT   = ["#1D4ED8", "#15803D", "#B45309", "#6D28D9", "#BE123C", "#065F46"];
  const getAvatar = (id: string) => {
    const idx = id.charCodeAt(0) % AVATAR_COLORS.length;
    return { bg: AVATAR_COLORS[idx], fg: AVATAR_TEXT[idx] };
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
          <button
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => { resetCreate(); setShowCreate(true); }}
          >
            <UserPlus size={14} /> New User
          </button>
        }
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--b1)", marginBottom: 24 }}>
          <Link href="/settings/users" style={{ borderBottom: "2px solid var(--acc)", padding: "10px 16px", color: "var(--tx)", fontWeight: 600, fontSize: 13 }}>
            User Accounts
          </Link>
          <Link href="/settings/permissions" style={{ borderBottom: "2px solid transparent", padding: "10px 16px", color: "var(--tx3)", fontSize: 13 }}>
            Permissions Matrix
          </Link>
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Users", value: counts.total, icon: <Users size={18} color="#3B82F6" />, iconBg: "#EFF6FF" },
            { label: "Active", value: counts.active, icon: <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />, iconBg: "#F0FDF4" },
            { label: "Admins", value: counts.admins, icon: <Shield size={18} color="#EF4444" />, iconBg: "#FEE2E2" },
            { label: "Dept Heads", value: counts.deptHeads, icon: <Shield size={18} color="#F59E0B" />, iconBg: "#FEF3C7" },
          ].map((k) => (
            <div key={k.label} style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {k.icon}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--tx3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "var(--tx)", lineHeight: 1 }}>{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 14, overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--b1)", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>All Users</span>
              <span style={{ fontSize: 12, color: "var(--tx3)", background: "var(--alt2)", borderRadius: 999, padding: "2px 8px" }}>{filtered.length}</span>
            </div>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--tx3)" }} />
              <input
                style={{ paddingLeft: 30, paddingRight: 12, height: 34, border: "1px solid var(--b1)", borderRadius: 8, fontSize: 12, color: "var(--tx)", background: "var(--s1)", outline: "none", width: 220 }}
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--alt)" }}>
                  {["User", "Role", "Department", "Status", "Created", "Actions"].map((h, i) => (
                    <th key={h} style={{ padding: "11px 20px", textAlign: i === 5 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--b1)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} style={{ padding: "14px 20px", borderBottom: "1px solid var(--b1)" }}>
                          <div style={{ height: 12, background: "var(--alt2)", borderRadius: 4, width: j === 0 ? "60%" : "40%" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr><td colSpan={6} style={{ padding: "40px 20px", textAlign: "center", color: "var(--rd)", fontSize: 13 }}>{error}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "var(--tx3)", fontSize: 13 }}>No users found.</td></tr>
                ) : (
                  filtered.map((u, idx) => {
                    const { bg, fg } = getAvatar(u.id);
                    return (
                      <tr key={u.id}
                        style={{ borderBottom: idx < filtered.length - 1 ? "1px solid var(--tbl-line)" : "none", cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        onClick={() => openEdit(u)}
                      >
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                              {getInitials(u.name, u.username)}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{u.name || u.username}</div>
                              <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px" }}><RolePill role={u.role} /></td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--tx2)" }}>
                          {u.role === "Department Head" && u.department ? u.department : <span style={{ color: "var(--tx3)" }}>—</span>}
                        </td>
                        <td style={{ padding: "14px 20px" }}><StatusPill active={!!u.is_active} /></td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--tx3)" }}>{u.created_at || "—"}</td>
                        <td style={{ padding: "14px 20px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => openEdit(u)}
                              style={{ background: "var(--bl)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                            >
                              Edit
                            </button>
                            {u.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDelete(u)}
                                disabled={deletingId === u.id}
                                style={{ background: "var(--sem-rd-bg)", color: "var(--rd)", border: "1px solid var(--sem-rd-bdr)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", opacity: deletingId === u.id ? 0.5 : 1 }}
                              >
                                {deletingId === u.id ? "…" : "Delete"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ScreenFrame>

      {/* ── Create User Modal ── */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowCreate(false)}>
          <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 14, width: "100%", maxWidth: 440, boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--b1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus size={16} color="#3B82F6" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>Create New User</div>
                  <div style={{ fontSize: 11, color: "var(--tx3)" }}>Set credentials and assign a role</div>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx3)", display: "flex" }}><X size={16} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field span2" style={{ gridColumn: "span 2" }}>
                  <div className="flbl">Full Name</div>
                  <input className="finp" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Rahul Shah" />
                </div>
                <div className="field span2" style={{ gridColumn: "span 2" }}>
                  <div className="flbl">Username *</div>
                  <input className="finp" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. rahul" autoCapitalize="none" autoComplete="off" />
                </div>
                <div className="field span2" style={{ gridColumn: "span 2" }}>
                  <div className="flbl">Password * (min 6 chars)</div>
                  <input className="finp" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                </div>
              </div>

              {/* Role selector cards */}
              <div>
                <div className="flbl" style={{ marginBottom: 8 }}>Role *</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {rolesList.map((r) => (
                    <button key={r} type="button" onClick={() => setNewRole(r)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: `2px solid ${newRole === r ? "var(--bl)" : "var(--b1)"}`, background: newRole === r ? "var(--sem-bl-bg)" : "var(--s2)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: (ROLE_COLOR[r] ?? ROLE_COLOR["Operator"]).dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: newRole === r ? "var(--bl)" : "var(--tx)" }}>{r}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--tx3)", lineHeight: 1.4 }}>{ROLE_HINT[r] ?? "Custom role"}</div>
                    </button>
                  ))}
                </div>
              </div>

              {newRole === "Department Head" && (
                <div className="field">
                  <div className="flbl">Department *</div>
                  <select className="fsel" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)}>
                    <option value="VIDEO">Video</option>
                    <option value="LED">LED</option>
                    <option value="MERGED">Merged</option>
                  </select>
                </div>
              )}

              {newRole === "Staff" && (
                <div className="field">
                  <div className="flbl">Link to Staff Record *</div>
                  <select className="fsel" value={newStaffId} onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : "";
                    setNewStaffId(id);
                    if (id) {
                      const s = staffList.find((x) => x.id === id);
                      if (s) {
                        if (!newName.trim()) setNewName(s.name);
                        if (!newUsername.trim()) setNewUsername(s.name.split(" ")[0].toLowerCase());
                      }
                    }
                  }}>
                    <option value="">— Select staff member —</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4 }}>This staff member will see their own assigned events and payments when they log in.</div>
                </div>
              )}

              {createError && (
                <div style={{ background: "var(--sem-rd-bg)", border: "1px solid var(--sem-rd-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--rd)" }}>
                  {createError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid var(--b1)" }}>
              <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={creating} onClick={handleCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {creating ? "Creating…" : <><UserPlus size={13} /> Create User</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setEditUser(null)}>
          <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 14, width: "100%", maxWidth: 440, boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--b1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: getAvatar(editUser.id).bg, color: getAvatar(editUser.id).fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                  {getInitials(editUser.name, editUser.username)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>{editUser.name || editUser.username}</div>
                  <div style={{ fontSize: 11, color: "var(--tx3)" }}>@{editUser.username}</div>
                </div>
              </div>
              <button onClick={() => setEditUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx3)", display: "flex" }}><X size={16} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <div className="flbl">Full Name</div>
                <input className="finp" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              {/* Role selector */}
              <div>
                <div className="flbl" style={{ marginBottom: 8 }}>Role *</div>
                {editUser.id === currentUser?.id && editUser.role === "Admin" ? (
                  <div style={{ padding: "10px 12px", borderRadius: 8, border: "2px solid var(--b1)", background: "var(--s2)", fontSize: 12, color: "var(--tx3)" }}>
                    Admin — <span style={{ color: "var(--tx3)" }}>Cannot demote your own role.</span>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {rolesList.map((r) => (
                      <button key={r} type="button" onClick={() => setEditRole(r)}
                        style={{ padding: "10px 12px", borderRadius: 8, border: `2px solid ${editRole === r ? "var(--bl)" : "var(--b1)"}`, background: editRole === r ? "var(--sem-bl-bg)" : "var(--s2)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: (ROLE_COLOR[r] ?? ROLE_COLOR["Operator"]).dot, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: editRole === r ? "var(--bl)" : "var(--tx)" }}>{r}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "var(--tx3)", lineHeight: 1.4 }}>{ROLE_HINT[r] ?? "Custom role"}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {editRole === "Department Head" && (
                <div className="field">
                  <div className="flbl">Department *</div>
                  <select className="fsel" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)}>
                    <option value="VIDEO">Video</option>
                    <option value="LED">LED</option>
                    <option value="MERGED">Merged</option>
                  </select>
                </div>
              )}

              <div className="field">
                <div className="flbl">New Password (leave blank to keep current)</div>
                <input className="finp" type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
              </div>

              {editUser.id !== currentUser?.id && (
                <div className="field">
                  <div className="flbl">Account Status</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => setEditActive(true)}
                      style={{ flex: 1, padding: "9px", borderRadius: 8, border: `2px solid ${editActive ? "#22C55E" : "var(--b1)"}`, background: editActive ? "#F0FDF4" : "var(--s2)", color: editActive ? "#15803D" : "var(--tx3)", cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
                      Active
                    </button>
                    <button type="button" onClick={() => setEditActive(false)}
                      style={{ flex: 1, padding: "9px", borderRadius: 8, border: `2px solid ${!editActive ? "#EF4444" : "var(--b1)"}`, background: !editActive ? "#FEE2E2" : "var(--s2)", color: !editActive ? "#DC2626" : "var(--tx3)", cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
                      Inactive
                    </button>
                  </div>
                </div>
              )}

              {saveError && (
                <div style={{ background: "var(--sem-rd-bg)", border: "1px solid var(--sem-rd-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--rd)" }}>
                  {saveError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid var(--b1)" }}>
              <button className="btn" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

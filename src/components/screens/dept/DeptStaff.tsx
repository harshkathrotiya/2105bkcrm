"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserCircle2, Phone, IndianRupee } from "lucide-react";
import { useStaff } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { useDebounce } from "@/lib/use-debounce";
import { getAvatarStyle } from "@/lib/constants";

const STATUS_COLOR: Record<string, { bg: string; dot: string; text: string }> = {
  Available: { bg: "#F0FDF4", dot: "#22C55E", text: "#15803D" },
  Deployed:  { bg: "#EFF6FF", dot: "#3B82F6", text: "#1D4ED8" },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? { bg: "#F3F4F6", dot: "#9CA3AF", text: "#6B7280" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.text, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

export default function DeptStaff() {
  const { can } = useCurrentUser();
  const { staff, loading } = useStaff();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState<"All" | "Available" | "Deployed">("All");
  const [typeFilter, setTypeFilter] = useState<"All" | "INHOUSE" | "EXTERNAL">("All");

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      // scope to dept head's own department (BOTH staff visible to all depts)
      if (user?.department && s.department && s.department !== "BOTH" && s.department !== user.department) return false;
      if (statusFilter !== "All" && s.status !== statusFilter) return false;
      if (typeFilter !== "All" && s.staffType !== typeFilter) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.role.toLowerCase().includes(q) && !s.phone.includes(q)) return false;
      }
      return true;
    });
  }, [staff, statusFilter, typeFilter, debouncedSearch, user?.department]);

  const deptStaff = useMemo(() =>
    staff.filter((s) => !user?.department || !s.department || s.department === "BOTH" || s.department === user.department),
  [staff, user?.department]);

  const counts = useMemo(() => ({
    total: deptStaff.length,
    available: deptStaff.filter((s) => s.status === "Available").length,
    deployed: deptStaff.filter((s) => s.status === "Deployed").length,
    pendingPay: deptStaff.reduce((a, s) => a + (s.pendingPayment ?? 0), 0),
  }), [deptStaff]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: "#F4F6F9" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Staff</h1>
        {can("staff.create") && (
          <Link href="/staff/new">
            <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <UserCircle2 size={15} /> Add Staff
            </button>
          </Link>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total", value: counts.total, color: "#0F172A" },
          { label: "Available", value: counts.available, color: "#22C55E" },
          { label: "Deployed", value: counts.deployed, color: "#3B82F6" },
          { label: "Pending Pay", value: `₹${counts.pendingPay.toLocaleString("en-IN")}`, color: "#EF4444" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>{loading ? "—" : k.value}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Staff</span>
            <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", borderRadius: 999, padding: "2px 8px" }}>Total {filtered.length}</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748B" }} />
              <input
                style={{ paddingLeft: 30, paddingRight: 12, height: 34, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#0F172A", background: "#FFFFFF", outline: "none", width: 200 }}
                placeholder="Search staff"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select style={{ height: 34, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, padding: "0 10px", background: "#FFFFFF", color: "#0F172A", outline: "none" }}
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | "Available" | "Deployed")}>
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Deployed">Deployed</option>
            </select>
            <select style={{ height: 34, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, padding: "0 10px", background: "#FFFFFF", color: "#0F172A", outline: "none" }}
              value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "All" | "INHOUSE" | "EXTERNAL")}>
              <option value="All">All Types</option>
              <option value="INHOUSE">In-house</option>
              <option value="EXTERNAL">External</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Staff", "Role", "Type", "Status", "Phone", "Pending Pay", "Action"].map((h, i) => (
                  <th key={h} style={{ padding: "11px 20px", textAlign: i === 6 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0" }}>
                        <div style={{ height: 12, background: "#F1F5F9", borderRadius: 4, width: j === 0 ? "60%" : "40%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "#64748B", fontSize: 13 }}>No staff found.</td></tr>
              ) : (
                filtered.map((s, idx) => {
                  const { bg, fg } = getAvatarStyle(s.id);
                  return (
                    <tr key={s.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #E2E8F0" : "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{s.name}</div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: "#334155" }}>{s.role}</td>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: "#334155" }}>{s.staffType === "INHOUSE" ? "In-house" : "External"}</td>
                      <td style={{ padding: "14px 20px" }}><StatusPill status={s.status} /></td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#334155" }}>
                          <Phone size={11} color="#94A3B8" />{s.phone}
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        {s.pendingPayment > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "#EF4444", fontWeight: 500 }}>
                            <IndianRupee size={11} />{s.pendingPayment.toLocaleString("en-IN")}
                          </div>
                        ) : <span style={{ color: "#CBD5E1", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <Link href={`/staff/${s.id}`}>
                          <button style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>View</button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ClipboardList, MapPin, Calendar } from "lucide-react";
import { useInquiries } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { useDebounce } from "@/lib/use-debounce";

const STATUS_COLOR: Record<string, { bg: string; dot: string; text: string }> = {
  New:       { bg: "#EFF6FF", dot: "#3B82F6", text: "#1D4ED8" },
  Quoted:    { bg: "#FFFBEB", dot: "#F59E0B", text: "#B45309" },
  Confirmed: { bg: "#F0FDF4", dot: "#22C55E", text: "#15803D" },
  Cancelled: { bg: "#FFF1F2", dot: "#F43F5E", text: "#BE123C" },
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

export default function DeptInquiries() {
  const { user } = useCurrentUser();
  const { inquiries, loading } = useInquiries();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("All");

  const deptInquiries = useMemo(() =>
    inquiries.filter((i) => !user?.department || !i.department || i.department === "MERGED" || i.department === user.department),
  [inquiries, user?.department]);

  const filtered = useMemo(() => {
    return deptInquiries.filter((i) => {
      if (statusFilter !== "All" && i.status !== statusFilter) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        return (i.eventName || "").toLowerCase().includes(q) || (i.venue || "").toLowerCase().includes(q) || (i.eventType || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [deptInquiries, statusFilter, debouncedSearch]);

  const counts = useMemo(() => ({
    total: deptInquiries.length,
    new: deptInquiries.filter((i) => i.status === "New").length,
    confirmed: deptInquiries.filter((i) => i.status === "Confirmed").length,
    quoted: deptInquiries.filter((i) => i.status === "Quoted").length,
    cancelled: deptInquiries.filter((i) => i.status === "Cancelled").length,
  }), [deptInquiries]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: "#F4F6F9" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Inquiries</h1>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total", value: counts.total, color: "#0F172A" },
          { label: "New", value: counts.new, color: "#3B82F6" },
          { label: "Quoted", value: counts.quoted, color: "#F59E0B" },
          { label: "Confirmed", value: counts.confirmed, color: "#22C55E" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{loading ? "—" : k.value}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        {/* Table toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Inquiries</span>
            <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", borderRadius: 999, padding: "2px 8px" }}>Total {filtered.length}</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748B" }} />
              <input
                style={{ paddingLeft: 30, paddingRight: 12, height: 34, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#0F172A", background: "#FFFFFF", outline: "none", width: 200 }}
                placeholder="Search inquiries"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Status filter */}
            <select
              style={{ height: 34, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, padding: "0 10px", background: "#FFFFFF", color: "#0F172A", outline: "none" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Quoted">Quoted</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Inquiry", "Type", "Status", "Date", "Venue", "Action"].map((h, i) => (
                  <th key={h} style={{ padding: "11px 20px", textAlign: i === 5 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0" }}>
                        <div style={{ height: 12, background: "#F1F5F9", borderRadius: 4, width: j === 0 ? "60%" : "40%", animation: "pulse 1.5s infinite" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "#64748B", fontSize: 13 }}>No inquiries found.</td>
                </tr>
              ) : (
                filtered.map((inq, idx) => (
                  <tr key={inq.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #E2E8F0" : "none", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Inquiry name + icon */}
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <ClipboardList size={18} color="#3B82F6" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{inq.eventName || inq.eventType || "Untitled"}</div>
                          {inq.location && <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{inq.location}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#334155" }}>{inq.eventType || "—"}</td>
                    <td style={{ padding: "14px 20px" }}><StatusPill status={inq.status} /></td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#334155" }}>
                        <Calendar size={11} color="#94A3B8" />
                        {inq.startDate}{inq.endDate !== inq.startDate ? ` → ${inq.endDate}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {inq.venue ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#334155" }}>
                          <MapPin size={11} color="#94A3B8" />
                          {inq.venue}
                        </div>
                      ) : <span style={{ color: "#CBD5E1", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <Link href={`/inquiries/${inq.id}`}>
                        <button style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>View</button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

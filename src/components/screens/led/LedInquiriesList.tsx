"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ClipboardList, Calendar, MapPin, Package } from "lucide-react";
import { useInquiries } from "@/lib/store";
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

export default function LedInquiriesList() {
  const { inquiries, loading } = useInquiries();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("All");

  const ledInquiries = useMemo(() =>
    inquiries.filter((i) => i.department === "LED" || i.department === "MERGED"),
  [inquiries]);

  const filtered = useMemo(() => {
    return ledInquiries.filter((i) => {
      if (statusFilter !== "All" && i.status !== statusFilter) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        return (
          (i.eventName || "").toLowerCase().includes(q) ||
          (i.venue || "").toLowerCase().includes(q) ||
          (i.eventType || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ledInquiries, statusFilter, debouncedSearch]);

  const counts = useMemo(() => ({
    total: ledInquiries.length,
    new: ledInquiries.filter((i) => i.status === "New").length,
    confirmed: ledInquiries.filter((i) => i.status === "Confirmed").length,
    quoted: ledInquiries.filter((i) => i.status === "Quoted").length,
    cancelled: ledInquiries.filter((i) => i.status === "Cancelled").length,
  }), [ledInquiries]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: "#F4F6F9" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0, lineHeight: 1 }}>LED Inquiries</h1>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>LED Department events and projects</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/led/stock">
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#475569", cursor: "pointer" }}>
              <Package size={14} /> LED Stock →
            </button>
          </Link>
          <Link href="/inquiries/new">
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#3B82F6", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer" }}>
              + New LED Inquiry
            </button>
          </Link>
        </div>
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
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>LED Inquiries</span>
            <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", borderRadius: 999, padding: "2px 8px" }}>Total {filtered.length}</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748B" }} />
              <input
                style={{ paddingLeft: 30, paddingRight: 12, height: 34, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#0F172A", background: "#FFFFFF", outline: "none", width: 200 }}
                placeholder="Search LED inquiries"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
                {["Event", "Type", "Status", "Date", "Venue", "LED Type", "Action"].map((h, i) => (
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
                <tr>
                  <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "#64748B", fontSize: 13 }}>
                    {ledInquiries.length === 0
                      ? "No LED inquiries found. Create one using the \"New LED Inquiry\" button."
                      : "No inquiries match your search."}
                  </td>
                </tr>
              ) : (
                filtered.map((inq, idx) => (
                  <tr key={inq.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #E2E8F0" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 9, background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <ClipboardList size={16} color="#0C447C" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{inq.eventName || inq.eventType || "Untitled"}</div>
                          {inq.location && <div style={{ fontSize: 11, color: "#64748B", marginTop: 1 }}>{inq.location}</div>}
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
                    <td style={{ padding: "14px 20px" }}>
                      {inq.ledType ? (
                        <span style={{ fontSize: 11, fontWeight: 600, background: "#E6F1FB", color: "#0C447C", borderRadius: 999, padding: "2px 8px" }}>
                          {inq.ledType}
                        </span>
                      ) : <span style={{ color: "#CBD5E1", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <Link href={`/led/inquiries/${inq.id}`}>
                        <button style={{ background: "#0C447C", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                          View
                        </button>
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

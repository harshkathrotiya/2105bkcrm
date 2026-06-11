"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, IndianRupee, Search, CheckCircle2 } from "lucide-react";

interface Assignment {
  id: number;
  positionName: string | null;
  daysAssigned: number;
  ratePerDay: number;
  totalAmount: number;
  reportingTime: string;
  paidAmount: number;
  pendingAmount: number;
  inquiry: {
    id: string;
    event_name: string;
    event_type: string;
    venue: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    status: string;
    department: string;
  };
}

const STATUS_COLOR: Record<string, { bg: string; dot: string; text: string }> = {
  New:       { bg: "#EFF6FF", dot: "#3B82F6", text: "#1D4ED8" },
  Quoted:    { bg: "#FFFBEB", dot: "#F59E0B", text: "#B45309" },
  Confirmed: { bg: "#DCFCE7", dot: "#22C55E", text: "#15803D" },
  Cancelled: { bg: "#FEE2E2", dot: "#EF4444", text: "#DC2626" },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? { bg: "#F1F5F9", dot: "#94A3B8", text: "#64748B" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.text, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

export default function StaffMyEvents() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Confirmed" | "Cancelled">("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/staff/my-assignments", { credentials: "same-origin" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setAssignments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = assignments.filter((a) => {
    if (filter !== "All" && a.inquiry.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (a.inquiry.event_name || "").toLowerCase().includes(q) || (a.inquiry.venue || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>My Schedule</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>All events you've been assigned to</div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          <input
            style={{ paddingLeft: 30, paddingRight: 12, height: 36, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#0F172A", background: "#FFFFFF", outline: "none", width: 220 }}
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(["All", "Confirmed", "Cancelled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "0 16px", height: 36, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${filter === f ? "#3B82F6" : "#E2E8F0"}`, background: filter === f ? "#EFF6FF" : "#FFFFFF", color: filter === f ? "#1D4ED8" : "#64748B" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Event cards */}
      {loading ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "40px", textAlign: "center", color: "#64748B" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "56px", textAlign: "center" }}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><Calendar size={32} color="#CBD5E1" /></div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>No events found</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>Try changing the filter or check back later.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((a) => (
            <div key={a.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 24px" }}>
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 3 }}>
                    {a.inquiry.event_name || a.inquiry.event_type}
                  </div>
                  {a.positionName && (
                    <div style={{ fontSize: 12, color: "#3B82F6", fontWeight: 600, background: "#EFF6FF", display: "inline-block", borderRadius: 6, padding: "2px 8px" }}>
                      {a.positionName}
                    </div>
                  )}
                </div>
                <StatusPill status={a.inquiry.status} />
              </div>

              {/* Details row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
                  <Calendar size={14} color="#94A3B8" />
                  <span><strong>{a.inquiry.start_date}</strong>{a.inquiry.end_date !== a.inquiry.start_date ? ` – ${a.inquiry.end_date}` : ""}</span>
                  <span style={{ color: "#CBD5E1" }}>·</span>
                  <span style={{ color: "#64748B" }}>{a.daysAssigned} day{a.daysAssigned > 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
                  <Clock size={14} color="#94A3B8" />
                  Reporting at <strong>{a.reportingTime}</strong>
                </div>
                {a.inquiry.venue && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
                    <MapPin size={14} color="#94A3B8" />
                    {a.inquiry.venue}
                  </div>
                )}
              </div>

              {/* Payment row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
                  <IndianRupee size={14} color="#94A3B8" />
                  <span>₹{a.ratePerDay.toLocaleString("en-IN")}<span style={{ color: "#94A3B8" }}>/day</span></span>
                  <span style={{ color: "#CBD5E1" }}>×</span>
                  <span>{a.daysAssigned} days</span>
                  <span style={{ color: "#CBD5E1" }}>=</span>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>₹{a.totalAmount.toLocaleString("en-IN")}</span>
                </div>

                {a.pendingAmount > 0 ? (
                  <span style={{ background: "#FEE2E2", color: "#DC2626", borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>
                    ₹{a.pendingAmount.toLocaleString("en-IN")} pending
                  </span>
                ) : a.paidAmount > 0 ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#DCFCE7", color: "#15803D", borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>
                    <CheckCircle2 size={12} /> Paid
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

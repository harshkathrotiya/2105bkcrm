"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, IndianRupee, Briefcase } from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";

interface Assignment {
  id: number;
  positionName: string | null;
  daysAssigned: number;
  ratePerDay: number;
  withEquipment: boolean;
  equipmentRatePerDay: number;
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

export default function StaffPortal() {
  const { user } = useCurrentUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff/my-assignments", { credentials: "same-origin" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setAssignments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalEarned = assignments.reduce((s, a) => s + a.paidAmount, 0);
  const totalPending = assignments.reduce((s, a) => s + a.pendingAmount, 0);
  const upcoming = assignments.filter((a) => a.inquiry.status === "Confirmed").length;

  const initials = (user?.name ?? "S").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: "#F4F6F9" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#3B82F6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Welcome, {user?.name ?? "Staff"}</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Your assigned events and payments</div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Events", value: loading ? "—" : assignments.length, color: "#0F172A", icon: <Briefcase size={16} color="#3B82F6" /> },
          { label: "Upcoming", value: loading ? "—" : upcoming, color: "#15803D", icon: <Calendar size={16} color="#22C55E" /> },
          { label: "Pending Payment", value: loading ? "—" : `₹${totalPending.toLocaleString("en-IN")}`, color: "#DC2626", icon: <IndianRupee size={16} color="#EF4444" /> },
        ].map((k) => (
          <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Events list */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>My Events</span>
          <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", borderRadius: 999, padding: "2px 8px" }}>{assignments.length}</span>
        </div>

        {loading ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748B", fontSize: 13 }}>Loading...</div>
        ) : assignments.length === 0 ? (
          <div style={{ padding: "56px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>No events assigned yet</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Your Department Head will assign you to events.</div>
          </div>
        ) : (
          <div>
            {assignments.map((a, idx) => (
              <div key={a.id} style={{
                padding: "20px 24px",
                borderBottom: idx < assignments.length - 1 ? "1px solid #F1F5F9" : "none",
              }}>
                {/* Event name + status */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 3 }}>
                      {a.inquiry.event_name || a.inquiry.event_type}
                    </div>
                    {a.positionName && (
                      <div style={{ fontSize: 12, color: "#3B82F6", fontWeight: 500 }}>{a.positionName}</div>
                    )}
                  </div>
                  <StatusPill status={a.inquiry.status} />
                </div>

                {/* Date / Time / Venue row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                    <Calendar size={13} color="#94A3B8" />
                    {a.inquiry.start_date}
                    {a.inquiry.end_date !== a.inquiry.start_date && ` – ${a.inquiry.end_date}`}
                    {` (${a.daysAssigned} day${a.daysAssigned > 1 ? "s" : ""})`}
                  </div>
                  {a.reportingTime && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                      <Clock size={13} color="#94A3B8" />
                      Reporting: {a.reportingTime}
                    </div>
                  )}
                  {a.inquiry.venue && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                      <MapPin size={13} color="#94A3B8" />
                      {a.inquiry.venue}
                    </div>
                  )}
                </div>

                {/* Payment row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#334155" }}>
                    <IndianRupee size={12} color="#94A3B8" />
                    <span style={{ color: "#64748B" }}>₹{a.ratePerDay.toLocaleString("en-IN")}/day</span>
                    <span style={{ color: "#CBD5E1", margin: "0 2px" }}>×</span>
                    <span style={{ color: "#64748B" }}>{a.daysAssigned} days</span>
                    <span style={{ color: "#CBD5E1", margin: "0 2px" }}>=</span>
                    <span style={{ fontWeight: 700, color: "#0F172A" }}>₹{a.totalAmount.toLocaleString("en-IN")}</span>
                  </div>

                  {a.pendingAmount > 0 ? (
                    <span style={{ background: "#FEE2E2", color: "#DC2626", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                      ₹{a.pendingAmount.toLocaleString("en-IN")} pending
                    </span>
                  ) : a.paidAmount > 0 ? (
                    <span style={{ background: "#DCFCE7", color: "#15803D", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                      Paid
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer total */}
        {assignments.length > 0 && (
          <div style={{ padding: "14px 24px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end", gap: 24 }}>
            <div style={{ fontSize: 13, color: "#64748B" }}>
              Total earned: <span style={{ fontWeight: 700, color: "#15803D" }}>₹{totalEarned.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ fontSize: 13, color: "#64748B" }}>
              Pending: <span style={{ fontWeight: 700, color: "#DC2626" }}>₹{totalPending.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

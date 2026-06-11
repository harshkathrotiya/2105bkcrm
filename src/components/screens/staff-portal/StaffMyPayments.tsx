"use client";

import { useEffect, useState } from "react";
import { IndianRupee, Calendar, CheckCircle2, Clock4 } from "lucide-react";

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
    status: string;
  };
}

export default function StaffMyPayments() {
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
  const totalAll = assignments.reduce((s, a) => s + a.totalAmount, 0);

  const paid = assignments.filter((a) => a.pendingAmount === 0 && a.paidAmount > 0);
  const pending = assignments.filter((a) => a.pendingAmount > 0);

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>My Payments</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>Payment status across all your events</div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Payable", value: `₹${totalAll.toLocaleString("en-IN")}`, color: "#0F172A", iconBg: "#F1F5F9", icon: <IndianRupee size={18} color="#64748B" /> },
          { label: "Received", value: `₹${totalEarned.toLocaleString("en-IN")}`, color: "#15803D", iconBg: "#DCFCE7", icon: <CheckCircle2 size={18} color="#22C55E" /> },
          { label: "Pending", value: `₹${totalPending.toLocaleString("en-IN")}`, color: "#DC2626", iconBg: "#FEE2E2", icon: <Clock4 size={18} color="#EF4444" /> },
        ].map((k) => (
          <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{loading ? "—" : k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending payments */}
      {pending.length > 0 && (
        <div style={{ background: "#FFFFFF", border: "1px solid #FCA5A5", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #FEE2E2", background: "#FFF5F5", display: "flex", alignItems: "center", gap: 8 }}>
            <Clock4 size={15} color="#EF4444" />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#DC2626" }}>Pending Payments</span>
            <span style={{ fontSize: 11, color: "#EF4444", background: "#FEE2E2", borderRadius: 999, padding: "2px 8px" }}>{pending.length}</span>
          </div>
          {pending.map((a, idx) => (
            <div key={a.id} style={{ padding: "16px 20px", borderBottom: idx < pending.length - 1 ? "1px solid #FEF2F2" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{a.inquiry.event_name || a.inquiry.event_type}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B", marginTop: 3 }}>
                    <Calendar size={11} color="#94A3B8" /> {a.inquiry.start_date}
                    {a.positionName && <><span style={{ color: "#CBD5E1" }}>·</span> {a.positionName}</>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#DC2626" }}>₹{a.pendingAmount.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>of ₹{a.totalAmount.toLocaleString("en-IN")} total</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paid events */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={15} color="#22C55E" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Paid Events</span>
          <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", borderRadius: 999, padding: "2px 8px" }}>{paid.length}</span>
        </div>

        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#64748B", fontSize: 13 }}>Loading...</div>
        ) : paid.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No payments received yet.</div>
        ) : (
          paid.map((a, idx) => (
            <div key={a.id} style={{ padding: "16px 20px", borderBottom: idx < paid.length - 1 ? "1px solid #F8FAFC" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{a.inquiry.event_name || a.inquiry.event_type}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B", marginTop: 3 }}>
                    <Calendar size={11} color="#94A3B8" /> {a.inquiry.start_date}
                    {a.positionName && <><span style={{ color: "#CBD5E1" }}>·</span> {a.positionName}</>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#15803D" }}>₹{a.paidAmount.toLocaleString("en-IN")}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#DCFCE7", color: "#15803D", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}><CheckCircle2 size={11} /> Paid</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, IndianRupee, Briefcase, Clock, MapPin, ChevronRight } from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import { useLang } from "@/lib/lang-context";

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
    status: string;
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

export default function StaffDashboard() {
  const { user } = useCurrentUser();
  const { t } = useLang();
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
  const upcoming = assignments.filter((a) => a.inquiry.status === "Confirmed");
  const initials = (user?.name ?? "S").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ padding: "32px" }}>

      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A" }}>{t("portal_good_day")}, {user?.name?.split(" ")[0] ?? "Staff"}</div>
        <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{t("portal_summary")}</div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: t("portal_total_events"), value: loading ? "—" : assignments.length, color: "#0F172A", iconBg: "#EFF6FF", icon: <Briefcase size={18} color="#3B82F6" /> },
          { label: t("portal_upcoming"),     value: loading ? "—" : upcoming.length, color: "#15803D", iconBg: "#DCFCE7", icon: <Calendar size={18} color="#22C55E" /> },
          { label: t("portal_pending"),      value: loading ? "—" : `₹${totalPending.toLocaleString("en-IN")}`, color: "#DC2626", iconBg: "#FEE2E2", icon: <IndianRupee size={18} color="#EF4444" /> },
        ].map((k) => (
          <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{t("portal_upcoming")}</span>
            <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", borderRadius: 999, padding: "2px 8px" }}>{upcoming.length}</span>
          </div>
          <Link href="/my-schedule/events" style={{ fontSize: 12, color: "#3B82F6", fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
            {t("view_all")} <ChevronRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "#64748B", fontSize: 13 }}>{t("loading")}</div>
        ) : upcoming.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><Calendar size={32} color="#CBD5E1" /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{t("portal_no_upcoming")}</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>{t("portal_assigned_by")}</div>
          </div>
        ) : (
          upcoming.slice(0, 3).map((a, idx) => (
            <div key={a.id} style={{ padding: "18px 20px", borderBottom: idx < Math.min(upcoming.length, 3) - 1 ? "1px solid #F1F5F9" : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{a.inquiry.event_name || a.inquiry.event_type}</div>
                  {a.positionName && <div style={{ fontSize: 12, color: "#3B82F6", fontWeight: 500 }}>{a.positionName}</div>}
                </div>
                <StatusPill status={a.inquiry.status} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                  <Calendar size={12} color="#94A3B8" />
                  {a.inquiry.start_date}{a.inquiry.end_date !== a.inquiry.start_date ? ` – ${a.inquiry.end_date}` : ""}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                  <Clock size={12} color="#94A3B8" />
                  {t("portal_report_at")} {a.reportingTime}
                </div>
                {a.inquiry.venue && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                    <MapPin size={12} color="#94A3B8" />
                    {a.inquiry.venue}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick earnings summary */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{t("portal_earnings")}</div>
        <div style={{ display: "flex", gap: 32 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{t("portal_total_earned")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#15803D" }}>₹{loading ? "—" : totalEarned.toLocaleString("en-IN")}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{t("portal_pending")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#DC2626" }}>₹{loading ? "—" : totalPending.toLocaleString("en-IN")}</div>
          </div>
          <Link href="/my-payments" style={{ alignSelf: "center", background: "#3B82F6", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
            {t("portal_view_payments")}
          </Link>
        </div>
      </div>

    </div>
  );
}

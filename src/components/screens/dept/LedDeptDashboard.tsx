"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Monitor, Package, Users, TrendingUp,
  Calendar, ArrowRight, AlertTriangle, CheckCircle2,
  Layers, Truck, BarChart3, IndianRupee,
} from "lucide-react";
import { useInquiries } from "@/lib/store";
import { useStaff } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import * as api from "@/lib/api";
import type { LedCompanyLot } from "@/lib/types";

const fmt = (n: number) => n.toLocaleString("en-IN");

const LED_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  P4:       { bg: "#E6F1FB", color: "#0C447C" },
  P3:       { bg: "#E1F5EE", color: "#085041" },
  P2:       { bg: "#FAEEDA", color: "#633806" },
  FLOOR:    { bg: "#FAECE7", color: "#712B13" },
  P4_CURVED:{ bg: "#F0EBF8", color: "#5B21B6" },
};

function LedTypeBadge({ type }: { type: string }) {
  const c = LED_TYPE_COLORS[type] ?? { bg: "#F1F5F9", color: "#475569" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", background: c.bg, color: c.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
      {type}
    </span>
  );
}

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

export default function LedDeptDashboard() {
  const { user } = useCurrentUser();
  const { inquiries, loading: inqLoading } = useInquiries();
  const { staff, loading: staffLoading } = useStaff();
  const [lots, setLots] = useState<LedCompanyLot[]>([]);
  const [lotsLoading, setLotsLoading] = useState(true);

  useEffect(() => {
    api.fetchLedLots()
      .then(setLots)
      .catch(() => setLots([]))
      .finally(() => setLotsLoading(false));
  }, []);

  // LED-only inquiries
  const ledInquiries = useMemo(() =>
    inquiries.filter((i) => i.department === "LED" || i.department === "MERGED"),
  [inquiries]);

  const inqCounts = useMemo(() => ({
    total: ledInquiries.length,
    new: ledInquiries.filter((i) => i.status === "New").length,
    quoted: ledInquiries.filter((i) => i.status === "Quoted").length,
    confirmed: ledInquiries.filter((i) => i.status === "Confirmed").length,
  }), [ledInquiries]);

  // LED staff
  const ledStaff = useMemo(() =>
    staff.filter((s) => s.department === "LED" || s.department === "BOTH"),
  [staff]);

  const staffCounts = useMemo(() => ({
    total: ledStaff.length,
    available: ledStaff.filter((s) => s.status === "Available").length,
    deployed: ledStaff.filter((s) => s.status === "Deployed").length,
    pendingPay: ledStaff.reduce((a, s) => a + (s.pendingPayment ?? 0), 0),
  }), [ledStaff]);

  // Stock totals
  const stockTotals = useMemo(() => ({
    companies: lots.length,
    totalCabinets: lots.reduce((a, l) => a + l.totalCabinets, 0),
    totalSqft: lots.reduce((a, l) => a + (l.sqftForPricing ?? l.totalCabinets * 4), 0),
  }), [lots]);

  // Recent LED inquiries (last 5)
  const recentInquiries = useMemo(() =>
    [...ledInquiries]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
  [ledInquiries]);

  // Upcoming events (confirmed + future)
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() =>
    ledInquiries
      .filter((i) => i.status === "Confirmed" && i.startDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3),
  [ledInquiries, today]);

  const loading = inqLoading || staffLoading;

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: "#F4F6F9" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0, lineHeight: 1.2 }}>
            LED Department
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: "6px 0 0" }}>
            Welcome back, {user?.name || "Department Head"}
          </p>
        </div>
        <Link href="/led/inquiries">
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#0C447C", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            <Monitor size={15} /> View All Inquiries <ArrowRight size={13} />
          </button>
        </Link>
      </div>

      {/* KPI row 1 — Inquiries */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Inquiries
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { label: "Total", value: inqCounts.total, color: "#0F172A", icon: <Monitor size={16} color="#0C447C" /> },
            { label: "New", value: inqCounts.new, color: "#3B82F6", icon: <AlertTriangle size={16} color="#3B82F6" /> },
            { label: "Quoted", value: inqCounts.quoted, color: "#F59E0B", icon: <BarChart3 size={16} color="#F59E0B" /> },
            { label: "Confirmed", value: inqCounts.confirmed, color: "#22C55E", icon: <CheckCircle2 size={16} color="#22C55E" /> },
          ].map((k) => (
            <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
                {k.icon}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{loading ? "—" : k.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* KPI row 2 — Staff */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={15} color="#3B82F6" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>LED Staff</span>
            </div>
            <Link href="/staff" style={{ fontSize: 12, color: "#3B82F6", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
            {[
              { label: "Total", value: staffCounts.total, color: "#0F172A" },
              { label: "Available", value: staffCounts.available, color: "#22C55E" },
              { label: "Deployed", value: staffCounts.deployed, color: "#3B82F6" },
              { label: "Pending Pay", value: `₹${fmt(staffCounts.pendingPay)}`, color: "#EF4444" },
            ].map((k, i) => (
              <div key={k.label} style={{ padding: "18px 16px", borderRight: i < 3 ? "1px solid #E2E8F0" : "none" }}>
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{staffLoading ? "—" : k.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI row 3 — Stock */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Package size={15} color="#0C447C" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Warehouse Stock</span>
            </div>
            <Link href="/led/stock" style={{ fontSize: 12, color: "#3B82F6", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              Manage <ArrowRight size={11} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
            {[
              { label: "Companies", value: stockTotals.companies, color: "#0F172A" },
              { label: "Cabinets", value: fmt(stockTotals.totalCabinets), color: "#0C447C" },
              { label: "Sq.ft (pricing)", value: fmt(stockTotals.totalSqft), color: "#22C55E" },
            ].map((k, i) => (
              <div key={k.label} style={{ padding: "18px 16px", borderRight: i < 2 ? "1px solid #E2E8F0" : "none" }}>
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{lotsLoading ? "—" : k.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Recent inquiries */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Monitor size={15} color="#64748B" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Recent Inquiries</span>
            </div>
            <Link href="/led/inquiries" style={{ fontSize: 12, color: "#3B82F6", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              All <ArrowRight size={11} />
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: "20px" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 44, background: "#F8FAFC", borderRadius: 8, marginBottom: 8 }} />
              ))}
            </div>
          ) : recentInquiries.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
              No LED inquiries yet.
            </div>
          ) : (
            <div>
              {recentInquiries.map((inq, i) => (
                <Link key={inq.id} href={`/led/inquiries/${inq.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: i < recentInquiries.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{inq.eventName || inq.eventType || "Untitled"}</div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{inq.startDate}{inq.endDate !== inq.startDate ? ` → ${inq.endDate}` : ""} · {inq.venue || "—"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {inq.ledType && <LedTypeBadge type={inq.ledType} />}
                      <StatusPill status={inq.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming confirmed events */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={15} color="#22C55E" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Upcoming Events</span>
            </div>
          </div>
          {loading ? (
            <div style={{ padding: "20px" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: 56, background: "#F8FAFC", borderRadius: 8, marginBottom: 8 }} />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
              No upcoming confirmed events.
            </div>
          ) : (
            <div>
              {upcoming.map((inq, i) => {
                const daysAway = Math.ceil((new Date(inq.startDate).getTime() - Date.now()) / 86400000);
                return (
                  <Link key={inq.id} href={`/led/inquiries/${inq.id}`} style={{ textDecoration: "none" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < upcoming.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{inq.eventName || inq.eventType}</div>
                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
                          {inq.startDate}{inq.endDate !== inq.startDate ? ` → ${inq.endDate}` : ""}
                          {inq.venue ? ` · ${inq.venue}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: daysAway <= 3 ? "#EF4444" : daysAway <= 7 ? "#F59E0B" : "#22C55E" }}>
                          {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `${daysAway}d away`}
                        </div>
                        {inq.screenAreaSqft && (
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{fmt(inq.screenAreaSqft)} sq.ft</div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Company lots stock list */}
      {lots.length > 0 && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={15} color="#0C447C" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Cabinet Lots</span>
            </div>
            <Link href="/led/stock" style={{ fontSize: 12, color: "#3B82F6", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              Manage stock <ArrowRight size={11} />
            </Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Company", "Type", "Cabinet Size", "Total Cabinets", "Sq.ft (pricing)", "Boxes"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lots.map((lot, i) => (
                  <tr key={lot.id} style={{ borderBottom: i < lots.length - 1 ? "1px solid #F1F5F9" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "13px 20px", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{lot.name}</td>
                    <td style={{ padding: "13px 20px" }}><LedTypeBadge type={lot.ledType} /></td>
                    <td style={{ padding: "13px 20px", fontSize: 12, color: "#334155", fontFamily: "monospace" }}>{lot.cabinetHeightMm}×{lot.cabinetWidthMm}mm</td>
                    <td style={{ padding: "13px 20px", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{fmt(lot.totalCabinets)}</td>
                    <td style={{ padding: "13px 20px", fontSize: 13, fontWeight: 600, color: "#0C447C" }}>{fmt(lot.sqftForPricing ?? lot.totalCabinets * 4)}</td>
                    <td style={{ padding: "13px 20px", fontSize: 13, color: "#334155" }}>{lot.totalBoxes ?? Math.ceil(lot.totalCabinets / lot.cabinetsPerBox)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 20 }}>
        {[
          { label: "Inquiries", desc: "View all LED jobs", href: "/led/inquiries", icon: <Monitor size={20} color="#0C447C" />, bg: "#E6F1FB" },
          { label: "Warehouse Stock", desc: "Manage cabinet lots", href: "/led/stock", icon: <Package size={20} color="#085041" />, bg: "#E1F5EE" },
          { label: "Staff", desc: "LED operators & technicians", href: "/staff", icon: <Users size={20} color="#633806" />, bg: "#FAEEDA" },
          { label: "Calendar", desc: "Event schedule", href: "/calendar", icon: <Calendar size={20} color="#5B21B6" />, bg: "#F0EBF8" },
        ].map((q) => (
          <Link key={q.label} href={q.href} style={{ textDecoration: "none" }}>
            <div
              style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px", cursor: "pointer", transition: "box-shadow 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: q.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                {q.icon}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{q.label}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>{q.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

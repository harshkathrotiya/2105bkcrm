"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import {
  useInquiries,
  useQuotations,
  useInvoices,
  useCalendar,
  useClients,
} from "@/lib/store";
import * as api from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  Users,
  ClipboardList,
  FileText,
  Building2,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  Wrench,
  PartyPopper,
} from "lucide-react";

export default function Screen00Dashboard() {
  const { can } = useCurrentUser();
  const { inquiries, loading: inquiriesLoading } = useInquiries();
  const { quotations, loading: quotationsLoading } = useQuotations();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { calendarEvents, loading: calendarLoading } = useCalendar();
  const { clients } = useClients();

  const [assetSummary, setAssetSummary] = useState<{ totalValue: number; totalCount: number } | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);

  useEffect(() => {
    let active = true;
    api.fetchAssetSummary()
      .then((data) => { if (active) setAssetSummary(data); })
      .catch((err) => console.error("Failed to load asset summary:", err))
      .finally(() => { if (active) setLoadingAsset(false); });
    return () => { active = false; };
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-IN");
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ── KPI metrics ──────────────────────────────────────────────────────────
  const activeEventsCount = useMemo(() => {
    const now = new Date();
    return inquiries.filter((inq) => {
      if (inq.status !== "Confirmed") return false;
      const start = new Date(inq.startDate);
      return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
    }).length;
  }, [inquiries]);

  const pendingQuotesCount = useMemo(
    () => quotations.filter((q) => q.status === "Draft" || q.status === "Sent").length,
    [quotations]
  );

  const pendingPaymentsTotal = useMemo(
    () => invoices.filter((inv) => inv.status !== "Paid").reduce((s, inv) => s + (inv.balance || 0), 0),
    [invoices]
  );

  // Year-to-date collected revenue (advance + balance received)
  const ytdCollected = useMemo(() => {
    const yearStart = `${new Date().getFullYear()}-01-01`;
    return invoices.reduce((sum, inv) => {
      let v = 0;
      if (inv.advanceReceived && (inv.advanceReceivedAt || "") >= yearStart) v += inv.advance || 0;
      if (inv.balanceReceived && (inv.balanceReceivedAt || "") >= yearStart) v += inv.balance || 0;
      return sum + v;
    }, 0);
  }, [invoices]);

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { id: string; level: "rd" | "am" | "bl"; text: string; href: string }[] = [];

    // Overdue invoices (past due date, not fully paid)
    const overdue = invoices.filter((inv) => inv.status !== "Paid" && inv.dueDate && inv.dueDate < todayStr);
    for (const inv of overdue.slice(0, 5)) {
      list.push({
        id: `overdue-${inv.id}`,
        level: "rd",
        text: `Overdue: ${inv.clientName} — ₹${fmt(inv.balance || 0)} due ${inv.dueDate}`,
        href: `/invoices/${inv.id}`,
      });
    }

    // Quotations sent, awaiting approval
    const awaiting = quotations.filter((q) => q.status === "Sent");
    if (awaiting.length > 0) {
      list.push({
        id: "awaiting-approval",
        level: "am",
        text: `${awaiting.length} quotation${awaiting.length === 1 ? "" : "s"} awaiting client approval`,
        href: "/quotations",
      });
    }

    // Confirmed events in the next 7 days
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in7Str = in7.toISOString().split("T")[0];
    const upcoming = inquiries.filter(
      (i) => i.status === "Confirmed" && i.startDate >= todayStr && i.startDate <= in7Str
    );
    if (upcoming.length > 0) {
      list.push({
        id: "upcoming-events",
        level: "bl",
        text: `${upcoming.length} confirmed event${upcoming.length === 1 ? "" : "s"} in the next 7 days`,
        href: "/calendar",
      });
    }

    return list;
  }, [invoices, quotations, inquiries, todayStr]);

  const todayEvents = useMemo(() => {
    const t = new Date();
    return calendarEvents.filter(
      (e) => e.date === t.getDate() && e.month === t.getMonth() && e.year === t.getFullYear()
    );
  }, [calendarEvents]);

  const recentInquiries = useMemo(
    () => [...inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [inquiries]
  );

  const isLoading = inquiriesLoading || quotationsLoading || invoicesLoading || calendarLoading || loadingAsset;

  if (isLoading) {
    return (
      <ScreenFrame breadcrumb="Dashboard › Loading...">
        <LoadingSkeleton rows={8} />
      </ScreenFrame>
    );
  }

  const kpis = [
    { label: "Active Events (This Month)", value: String(activeEventsCount), sub: "Confirmed events deployed", color: "var(--bl)", href: "/inquiries" },
    { label: "Pending Quotations", value: String(pendingQuotesCount), sub: "Awaiting client approval", color: "var(--acc)", href: "/quotations" },
    { label: "Payments Outstanding", value: `₹${fmt(pendingPaymentsTotal)}`, sub: "From pending & partial invoices", color: "var(--rd)", valColor: "var(--sem-rd-tx)", href: "/invoices?status=Unpaid" },
    { label: "Collected (YTD)", value: `₹${fmt(ytdCollected)}`, sub: "Advance + balance received this year", color: "var(--gr)", valColor: "var(--sem-gr-tx)", href: "/invoices" },
    { label: "Total Asset Value", value: `₹${fmt(assetSummary?.totalValue || 0)}`, sub: `Valuation of ${assetSummary?.totalCount || 0} items`, color: "var(--gr)", href: "/equipment" },
  ];

  const quickActions: { label: string; href: string; icon: typeof Users; primary?: boolean; perm?: Parameters<typeof can>[0] }[] = [
    { label: "Create New Inquiry", href: "/inquiries/new", icon: ClipboardList, primary: true, perm: "inquiries.create" },
    { label: "Add Client", href: "/clients/new", icon: Users, perm: "clients.create" },
    { label: "New Quotation", href: "/quotations/new", icon: FileText, perm: "quotations.create" },
    { label: "Warehouse Check", href: "/warehouse/check", icon: Building2 },
    { label: "Manage Staff", href: "/staff", icon: UserCheck },
    { label: "Add Equipment", href: "/equipment/new", icon: Wrench, perm: "equipment.create" },
  ];

  const visibleQuickActions = quickActions.filter((qa) => !qa.perm || can(qa.perm));

  return (
    <>
      <SectionHeader
        title={<>CRM <strong>Dashboard</strong></>}
        description="BK Media live operational overview, active bookings, payment tracking, and inventory status."
      />

      <ScreenFrame breadcrumb="Dashboard">
        {/* KPI cards — clickable drill-downs */}
        <div className="metrics" style={{ marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
          {kpis.map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className="met"
              style={{ borderLeft: `4px solid ${k.color}`, background: "var(--s1)", padding: "16px", borderRadius: "8px", display: "block", textDecoration: "none" }}
            >
              <div className="met-l" style={{ color: "var(--tx3)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>{k.label}</div>
              <div className="met-v" style={{ fontSize: "26px", fontWeight: 700, margin: "6px 0 2px", color: k.valColor || "var(--tx)" }}>{k.value}</div>
              <div className="text-[10px] text-tx3">{k.sub}</div>
            </Link>
          ))}
        </div>

        {/* Alerts banner */}
        {alerts.length > 0 && (
          <div className="card" style={{ padding: "14px 16px", marginBottom: "20px", borderLeft: "4px solid var(--acc)" }}>
            <div className="card-t" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} color="var(--acc)" /> Needs attention
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {alerts.map((a) => (
                <Link key={a.id} href={a.href} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12px", color: "var(--tx2)", textDecoration: "none" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: `var(--${a.level === "rd" ? "rd" : a.level === "am" ? "acc" : "bl"})`, flexShrink: 0 }} />
                  <span className="hover:underline">{a.text}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "20px" }}>
          {/* Left: Recent inquiries */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="card" style={{ padding: "16px", margin: 0 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: "14px" }}>
                <span className="card-t" style={{ fontSize: "14px", fontWeight: 600 }}>Recent Inquiries</span>
                <Link href="/inquiries" className="text-[11px] text-acc flex items-center gap-1 hover:underline">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Dept.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInquiries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-tx3" style={{ fontStyle: "italic" }}>
                          No inquiries yet.{can("inquiries.create") && (<> <Link href="/inquiries/new" className="text-acc hover:underline">Create one</Link>.</>)}
                        </td>
                      </tr>
                    ) : (
                      recentInquiries.map((inq) => {
                        const client = clients.find((c) => c.id === inq.clientId);
                        return (
                          <tr key={inq.id} style={{ cursor: "pointer" }}>
                            <td>
                              <Link href={`/inquiries/${inq.id}`} className="font-semibold text-tx">
                                {inq.eventName || "Unnamed Event"}
                              </Link>
                            </td>
                            <td>{client?.name || inq.clientId}</td>
                            <td style={{ fontSize: "11px" }}>{inq.startDate}</td>
                            <td>
                              <Badge variant={inq.department === "LED" ? "am" : inq.department === "MERGED" ? "bl" : "gr"}>
                                {inq.department || "VIDEO"}
                              </Badge>
                            </td>
                            <td>
                              <Badge variant={inq.status === "Confirmed" ? "gr" : inq.status === "Cancelled" ? "rd" : "bl"}>
                                {inq.status}
                              </Badge>
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

          {/* Right: today + quick actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="card" style={{ padding: "16px", margin: 0 }}>
              <div className="card-t" style={{ fontSize: "14px", fontWeight: 600, marginBottom: "14px", display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarCheck size={14} /> Today&apos;s Schedule
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {todayEvents.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", background: "var(--s2)", borderRadius: "8px", border: "1px solid var(--b1)", color: "var(--tx3)", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <PartyPopper size={14} /> Nothing scheduled today.
                  </div>
                ) : (
                  todayEvents.map((evt) => (
                    <div key={evt.id} style={{ padding: "10px 12px", background: "var(--s2)", borderRadius: "8px", border: "1px solid var(--b1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>{evt.label}</div>
                        <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>Type: {evt.type}</div>
                      </div>
                      <Badge variant="bl">Today</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card" style={{ padding: "16px", margin: 0 }}>
              <div className="card-t" style={{ fontSize: "14px", fontWeight: 600, marginBottom: "14px" }}>Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {visibleQuickActions.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <Link key={qa.href} href={qa.href} className={`btn ${qa.primary ? "btn-primary" : ""} text-[11.5px]`} style={{ justifyContent: "flex-start", gap: 6, padding: "8px 10px" }}>
                      <Icon size={13} /> {qa.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

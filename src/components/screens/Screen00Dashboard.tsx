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
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Receipt,
  CalendarDays,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function Screen00Dashboard() {
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
      .then((data) => {
        if (active) {
          setAssetSummary(data);
        }
      })
      .catch((err) => console.error("Failed to load asset summary:", err))
      .finally(() => {
        if (active) setLoadingAsset(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-IN");

  // Metrics calculations
  const activeEventsCount = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return inquiries.filter((inq) => {
      if (inq.status !== "Confirmed") return false;
      const start = new Date(inq.startDate);
      return start.getMonth() === currentMonth && start.getFullYear() === currentYear;
    }).length;
  }, [inquiries]);

  const pendingQuotesCount = useMemo(() => {
    return quotations.filter((q) => q.status === "Draft" || q.status === "Sent").length;
  }, [quotations]);

  const pendingPaymentsTotal = useMemo(() => {
    return invoices
      .filter((inv) => inv.status !== "Paid")
      .reduce((sum, inv) => sum + (inv.balance || 0), 0);
  }, [invoices]);

  const todayEvents = useMemo(() => {
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth();
    const y = today.getFullYear();

    return calendarEvents.filter(
      (event) => event.date === d && event.month === m && event.year === y
    );
  }, [calendarEvents]);

  const recentInquiries = useMemo(() => {
    return [...inquiries]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [inquiries]);

  const isLoading = inquiriesLoading || quotationsLoading || invoicesLoading || calendarLoading || loadingAsset;

  if (isLoading) {
    return (
      <ScreenFrame breadcrumb="Dashboard › Loading...">
        <LoadingSkeleton rows={8} message="Analyzing dashboard summary and metrics..." />
      </ScreenFrame>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>CRM <strong>Dashboard</strong></>}
        description="BK Media live operational overview, active bookings, payment tracking, and inventory status."
      />

      <ScreenFrame breadcrumb="Dashboard">
        {/* Metrics Grid */}
        <div className="metrics" style={{ marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <div className="met" style={{ borderLeft: "4px solid var(--bl)", background: "var(--s1)", padding: "16px", borderRadius: "8px" }}>
            <div className="met-l" style={{ color: "var(--tx3)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>Active Events (This Month)</div>
            <div className="met-v" style={{ fontSize: "28px", fontWeight: 700, margin: "6px 0 2px" }}>{activeEventsCount}</div>
            <div className="text-[10px] text-tx3">Confirmed events deployed</div>
          </div>
          <div className="met" style={{ borderLeft: "4px solid var(--acc)", background: "var(--s1)", padding: "16px", borderRadius: "8px" }}>
            <div className="met-l" style={{ color: "var(--tx3)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>Pending Quotations</div>
            <div className="met-v" style={{ fontSize: "28px", fontWeight: 700, margin: "6px 0 2px" }}>{pendingQuotesCount}</div>
            <div className="text-[10px] text-tx3">Awaiting client approval</div>
          </div>
          <div className="met" style={{ borderLeft: "4px solid var(--rd)", background: "var(--s1)", padding: "16px", borderRadius: "8px" }}>
            <div className="met-l" style={{ color: "var(--tx3)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>Payments Outstanding</div>
            <div className="met-v r" style={{ fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", color: "var(--sem-rd-tx)" }}>₹{fmt(pendingPaymentsTotal)}</div>
            <div className="text-[10px] text-tx3">From pending & partial invoices</div>
          </div>
          <div className="met" style={{ borderLeft: "4px solid var(--gr)", background: "var(--s1)", padding: "16px", borderRadius: "8px" }}>
            <div className="met-l" style={{ color: "var(--tx3)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>Total Asset Value</div>
            <div className="met-v g" style={{ fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", color: "var(--sem-gr-tx)" }}>₹{fmt(assetSummary?.totalValue || 0)}</div>
            <div className="text-[10px] text-tx3">Valuation of {assetSummary?.totalCount || 0} equipment items</div>
          </div>
        </div>

        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "20px" }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Recent Inquiries */}
            <div className="card" style={{ padding: "16px", margin: 0 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: "14px" }}>
                <span className="card-t" style={{ fontSize: "14px", fontWeight: 600 }}>Recent Inquiries</span>
                <Link href="/inquiries" className="text-[11px] text-acc flex items-center gap-1 hover:underline">
                  View All Inquiries <ArrowRight size={12} />
                </Link>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th>Client</th>
                      <th>Dates</th>
                      <th>Dept.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInquiries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-tx3" style={{ fontStyle: "italic" }}>
                          No inquiries found.
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

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Today's Schedule */}
            <div className="card" style={{ padding: "16px", margin: 0 }}>
              <div className="card-t" style={{ fontSize: "14px", fontWeight: 600, marginBottom: "14px" }}>Today's Schedule</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {todayEvents.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", background: "var(--s2)", borderRadius: "8px", border: "1px solid var(--b1)", color: "var(--tx3)", fontSize: "12px" }}>
                    🎉 No event deployments or shoots scheduled today.
                  </div>
                ) : (
                  todayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        padding: "10px 12px",
                        background: "var(--s2)",
                        borderRadius: "8px",
                        border: "1px solid var(--b1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
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

            {/* Quick Actions */}
            <div className="card" style={{ padding: "16px", margin: 0 }}>
              <div className="card-t" style={{ fontSize: "14px", fontWeight: 600, marginBottom: "14px" }}>Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                <Link href="/inquiries/new" className="btn btn-primary justify-center text-[12px] py-2">
                  + Create New Inquiry
                </Link>
                <Link href="/clients/new" className="btn justify-center text-[12px] py-2">
                  + Add Client Profile
                </Link>
                <Link href="/warehouse/check" className="btn justify-center text-[12px] py-2">
                  🔍 Check Warehouse Stock
                </Link>
                <Link href="/staff" className="btn justify-center text-[12px] py-2">
                  👤 Manage Staff Schedules
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

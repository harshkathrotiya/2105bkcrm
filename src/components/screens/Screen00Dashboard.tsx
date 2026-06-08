"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Calendar,
  AlertCircle,
  IndianRupee,
  Package,
  Clock,
  TrendingUp,
  PieChart as PieChartIcon,
  CheckCircle2,
  FileCheck,
} from "lucide-react";

// Recharts components for analytics
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Screen00Dashboard() {
  const { can } = useCurrentUser();
  const router = useRouter();
  const { inquiries, loading: inquiriesLoading } = useInquiries();
  const { quotations, loading: quotationsLoading } = useQuotations();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { calendarEvents, loading: calendarLoading } = useCalendar();
  const { clients } = useClients();

  const [assetSummary, setAssetSummary] = useState<{ totalValue: number; totalCount: number } | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [chartsMounted, setChartsMounted] = useState(false);
  useEffect(() => { setChartsMounted(true); }, []);

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

  // ── Monthly Revenue Trend data (current year, Jan to Dec) ──────────────────
  const revenueTrendData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = [
      { name: "Jan", revenue: 0 },
      { name: "Feb", revenue: 0 },
      { name: "Mar", revenue: 0 },
      { name: "Apr", revenue: 0 },
      { name: "May", revenue: 0 },
      { name: "Jun", revenue: 0 },
      { name: "Jul", revenue: 0 },
      { name: "Aug", revenue: 0 },
      { name: "Sep", revenue: 0 },
      { name: "Oct", revenue: 0 },
      { name: "Nov", revenue: 0 },
      { name: "Dec", revenue: 0 },
    ];

    invoices.forEach((inv) => {
      if (inv.advanceReceived && inv.advanceReceivedAt) {
        const d = new Date(inv.advanceReceivedAt);
        if (d.getFullYear() === currentYear) {
          const monthIdx = d.getMonth();
          if (monthIdx >= 0 && monthIdx < 12) {
            months[monthIdx].revenue += inv.advance || 0;
          }
        }
      }
      if (inv.balanceReceived && inv.balanceReceivedAt) {
        const d = new Date(inv.balanceReceivedAt);
        if (d.getFullYear() === currentYear) {
          const monthIdx = d.getMonth();
          if (monthIdx >= 0 && monthIdx < 12) {
            months[monthIdx].revenue += inv.balance || 0;
          }
        }
      }
    });

    return months;
  }, [invoices]);

  const totalYearRevenue = useMemo(() => {
    return revenueTrendData.reduce((sum, m) => sum + m.revenue, 0);
  }, [revenueTrendData]);

  // Growth percentage: comparison of current month vs previous month
  const revenueGrowthPct = useMemo(() => {
    const currentMonthIdx = new Date().getMonth();
    const currentMonthRevenue = revenueTrendData[currentMonthIdx]?.revenue || 0;
    const prevMonthRevenue = revenueTrendData[currentMonthIdx - 1]?.revenue || 0;
    if (prevMonthRevenue === 0) {
      return currentMonthRevenue > 0 ? 100 : 0;
    }
    const pct = ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
    return parseFloat(pct.toFixed(1));
  }, [revenueTrendData]);

  // ── Department Distribution data ──────────────────────────────────────────
  const deptDistributionData = useMemo(() => {
    let videoCount = 0;
    let ledCount = 0;
    let mergedCount = 0;

    inquiries.forEach((inq) => {
      const dept = (inq.department || "VIDEO").toUpperCase();
      if (dept === "LED") {
        ledCount++;
      } else if (dept === "MERGED") {
        mergedCount++;
      } else {
        videoCount++;
      }
    });

    const totalDepts = videoCount + ledCount + mergedCount;
    if (totalDepts === 0) {
      return [
        { name: "Video", value: 0, percentage: 0, color: "#10b981" },
        { name: "LED", value: 0, percentage: 0, color: "#3b82f6" },
        { name: "Merged", value: 0, percentage: 0, color: "#6b7280" },
      ];
    }

    return [
      { name: "Video", value: videoCount, percentage: Math.round((videoCount / totalDepts) * 100), color: "#10b981" },
      { name: "LED", value: ledCount, percentage: Math.round((ledCount / totalDepts) * 100), color: "#3b82f6" },
      { name: "Merged", value: mergedCount, percentage: Math.round((mergedCount / totalDepts) * 100), color: "#6b7280" },
    ];
  }, [inquiries]);

  const totalEventsCount = useMemo(() => {
    return inquiries.length;
  }, [inquiries]);

  // ── Recent Activity feed data generation ───────────────────────────────
  const recentActivities = useMemo(() => {
    const list: {
      id: string;
      type: "inquiry" | "client" | "payment" | "equipment" | "quotation";
      title: string;
      description: string;
      timestamp: string;
      timestampMs: number;
    }[] = [];

    // 1. Inquiries created
    inquiries.forEach((inq) => {
      const client = clients.find((c) => c.id === inq.clientId);
      const clientName = client?.name || "New Client";
      const timeMs = inq.createdAt ? new Date(inq.createdAt).getTime() : 0;
      list.push({
        id: `inq-${inq.id}`,
        type: "inquiry",
        title: "Inquiry Created",
        description: `New inquiry "${inq.eventName || "Unnamed Event"}" for ${clientName}`,
        timestamp: inq.createdAt,
        timestampMs: timeMs,
      });

      // If Confirmed, also show "Equipment assigned"
      if (inq.status === "Confirmed") {
        const updateTime = inq.updatedAt || inq.createdAt;
        const updateMs = updateTime ? new Date(updateTime).getTime() : timeMs;
        list.push({
          id: `equip-${inq.id}`,
          type: "equipment",
          title: "Equipment Assigned",
          description: `Equipment & staff dispatched for "${inq.eventName || "Unnamed Event"}"`,
          timestamp: updateTime,
          timestampMs: updateMs + 1000, // offset slightly to distinguish
        });
      }
    });

    // 2. Clients added
    clients.forEach((client) => {
      const timeMs = client.createdAt ? new Date(client.createdAt).getTime() : 0;
      list.push({
        id: `client-${client.id}`,
        type: "client",
        title: "Client Added",
        description: `Client "${client.name}" registered in CRM`,
        timestamp: client.createdAt,
        timestampMs: timeMs,
      });
    });

    // 3. Quotation approved
    quotations.forEach((q) => {
      if (q.status === "Approved") {
        const approvedTime = q.approvedAt || q.updatedAt || q.createdAt;
        const timeMs = approvedTime ? new Date(approvedTime).getTime() : 0;
        list.push({
          id: `quote-app-${q.id}`,
          type: "quotation",
          title: "Quotation Approved",
          description: `Quotation ${q.quoteNo} approved for "${q.eventName}"`,
          timestamp: approvedTime,
          timestampMs: timeMs,
        });
      }
    });

    // 4. Payments received
    invoices.forEach((inv) => {
      if (inv.advanceReceived && inv.advanceReceivedAt) {
        const timeMs = new Date(inv.advanceReceivedAt).getTime();
        list.push({
          id: `pay-adv-${inv.id}`,
          type: "payment",
          title: "Payment Received",
          description: `Advance payment of ₹${fmt(inv.advance || 0)} received from ${inv.clientName}`,
          timestamp: inv.advanceReceivedAt,
          timestampMs: timeMs,
        });
      }
      if (inv.balanceReceived && inv.balanceReceivedAt) {
        const timeMs = new Date(inv.balanceReceivedAt).getTime();
        list.push({
          id: `pay-bal-${inv.id}`,
          type: "payment",
          title: "Payment Received",
          description: `Balance payment of ₹${fmt(inv.balance || 0)} received from ${inv.clientName}`,
          timestamp: inv.balanceReceivedAt,
          timestampMs: timeMs,
        });
      }
    });

    // Sort by timestamp desc
    return list
      .filter((act) => act.timestampMs > 0)
      .sort((a, b) => b.timestampMs - a.timestampMs);
  }, [inquiries, clients, quotations, invoices]);

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (isNaN(diffMs)) {
      return dateStr;
    }

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

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

  const kpis: {
    label: string;
    value: string;
    sub: string;
    color: string;
    iconColor: string;
    iconBg?: string;
    icon: any;
    href: string;
    valColor?: string;
  }[] = [
    { 
      label: "Active Events", 
      value: String(activeEventsCount), 
      sub: "Confirmed events deployed", 
      color: "var(--bl)", 
      iconColor: "#3b82f6", 
      icon: Calendar,
      href: "/inquiries" 
    },
    { 
      label: "Pending Quotations", 
      value: String(pendingQuotesCount), 
      sub: "Awaiting client approval", 
      color: "var(--bl)", 
      iconColor: "var(--bl)", 
      icon: FileText,
      href: "/quotations" 
    },
    { 
      label: "Payments Outstanding", 
      value: `₹${fmt(pendingPaymentsTotal)}`, 
      sub: "From pending & partial invoices", 
      color: "var(--bl)", 
      valColor: "var(--sem-rd-tx)", 
      iconColor: "var(--bl)",
      icon: AlertCircle,
      href: "/invoices?status=Unpaid" 
    },
    { 
      label: "Collected (YTD)", 
      value: `₹${fmt(ytdCollected)}`, 
      sub: "Advance + balance received this year", 
      color: "var(--bl)", 
      valColor: "var(--sem-gr-tx)", 
      iconColor:"var(--bl)", 
      icon: IndianRupee,
      href: "/invoices" 
    },
    { 
      label: "Total Asset Value", 
      value: `₹${fmt(assetSummary?.totalValue || 0)}`, 
      sub: `Valuation of ${assetSummary?.totalCount || 0} items`, 
      color: "var(--bl)", 
      iconColor: "#10b981", 
     icon: Package,
      href: "/equipment" 
    },
  ];

  const quickActions: {
    label: string;
    href: string;
    icon: typeof Users;
    primary?: boolean;
    perm?: Parameters<typeof can>[0];
    className?: string;
  }[] = [
    { 
      label: "Create New Inquiry", 
      href: "/inquiries/new", 
      icon: ClipboardList, 
      primary: true, 
      perm: "inquiries.create",
      className: "btn-primary hover:bg-[#2e2e2e] transition-all duration-200" 
    },
    { 
      label: "Add Client", 
      href: "/clients/new", 
      icon: Users, 
      perm: "clients.create",
      className: "border-blue-200 bg-blue-50/40 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-400 dark:hover:bg-blue-950/30 transition-all duration-200" 
    },
    { 
      label: "New Quotation", 
      href: "/quotations/new", 
      icon: FileText, 
      perm: "quotations.create",
      className: "border-emerald-200 bg-emerald-50/40 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all duration-200" 
    },
    { 
      label: "Warehouse Check", 
      href: "/warehouse/check", 
      icon: Building2,
      className: "border-orange-200 bg-orange-50/40 text-orange-600 hover:bg-orange-50 hover:border-orange-300 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400 dark:hover:bg-orange-950/30 transition-all duration-200" 
    },
    { 
      label: "Manage Staff", 
      href: "/staff", 
      icon: UserCheck,
      className: "border-purple-200 bg-purple-50/40 text-purple-600 hover:bg-purple-50 hover:border-purple-300 dark:border-purple-900/40 dark:bg-purple-950/20 dark:text-purple-400 dark:hover:bg-purple-950/30 transition-all duration-200" 
    },
    { 
      label: "Add Equipment", 
      href: "/equipment/new", 
      icon: Wrench, 
      perm: "equipment.create",
      className: "border-cyan-200 bg-cyan-50/40 text-cyan-600 hover:bg-cyan-50 hover:border-cyan-300 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-400 dark:hover:bg-cyan-950/30 transition-all duration-200" 
    },
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
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <Link
                key={k.label}
                href={k.href}
                className="met group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md border border-b1 hover:border-hover-card-border"
                style={{ background: "var(--s1)", padding: "18px", borderRadius: "12px", display: "block", textDecoration: "none" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="met-l" style={{ color: "var(--tx3)", fontSize: "12px", fontWeight: 500, textTransform: "capitalize", letterSpacing: "normal" }}>{k.label}</div>
                  <div style={{ color: k.iconColor, background: k.iconBg || "var(--s2)", padding: "6px", borderRadius: "8px" }} className="transition-transform group-hover:scale-110">
                    <Icon size={16} strokeWidth={2} />
                  </div>
                </div>
                <div className="met-v" style={{ fontSize: "28px", fontWeight: 700, margin: "8px 0 4px", color: k.valColor || "var(--tx)", letterSpacing: "-0.03em" }}>{k.value}</div>
                <div className="text-[11px] text-tx3 font-normal" style={{ color: "var(--tx3)" }}>{k.sub}</div>
                <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: k.color, opacity: 0.8 }} />
              </Link>
            );
          })}
        </div>

        {/* Analytics Section (New) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          {/* Revenue Trend Line Chart */}
          <div className="card transition-all duration-300 hover:shadow-md border border-b1" style={{ padding: "20px", borderRadius: "12px", background: "var(--s1)", margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx)" }} className="flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-emerald-500" /> Revenue Trend
                </h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--tx)" }}>₹{fmt(totalYearRevenue)}</span>
                  <span style={{ fontSize: "11px", fontWeight: 500, color: revenueGrowthPct >= 0 ? "var(--gr)" : "var(--rd)" }}>
                    {revenueGrowthPct >= 0 ? "+" : ""}{revenueGrowthPct}% vs last month
                  </span>
                </div>
              </div>
              <div style={{ fontSize: "10px", color: "var(--tx3)", background: "var(--s2)", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--b1)" }}>
                YTD Revenue
              </div>
            </div>
            
            <div style={{ width: "100%", height: 180, minWidth: 0 }}>
              {chartsMounted && <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--b1)" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "var(--tx3)", fontSize: 10 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "var(--tx3)", fontSize: 10 }}
                    tickFormatter={(value) => `₹${value >= 100000 ? (value / 100000).toFixed(1) + "L" : value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`}
                  />
                  <Tooltip 
                    contentStyle={{ background: "var(--s1)", borderColor: "var(--b1)", borderRadius: "8px", color: "var(--tx)" }}
                    formatter={(value: any) => [`₹${fmt(value)}`, "Revenue"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, stroke: "#10b981", strokeWidth: 1.5, fill: "var(--s1)" }}
                    activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>}
            </div>
          </div>

          {/* Department Distribution Donut Chart */}
          <div className="card transition-all duration-300 hover:shadow-md border border-b1" style={{ padding: "20px", borderRadius: "12px", background: "var(--s1)", margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx)" }} className="flex items-center gap-1.5">
                  <PieChartIcon size={15} className="text-blue-500" /> Department Distribution
                </h3>
                <p style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "2px" }}>Active inquiries by department</p>
              </div>
              <div style={{ fontSize: "10px", color: "var(--tx3)", background: "var(--s2)", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--b1)" }}>
                Total: {totalEventsCount} Events
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", alignItems: "center" }}>
              <div style={{ position: "relative", width: "100%", height: 180, minWidth: 0 }}>
                {chartsMounted && <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                    >
                      {deptDistributionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          style={{ 
                            outline: "none", 
                            cursor: "pointer", 
                            opacity: activePieIndex === null || activePieIndex === index ? 1 : 0.6,
                            transition: "opacity 0.2s ease"
                          }} 
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {activePieIndex !== null && deptDistributionData[activePieIndex] ? (
                    <>
                      <span style={{ 
                        fontSize: "22px", 
                        fontWeight: 700, 
                        color: deptDistributionData[activePieIndex].color,
                        lineHeight: 1.1,
                        transition: "all 0.2s ease"
                      }}>
                        {deptDistributionData[activePieIndex].value}
                      </span>
                      <div style={{ 
                        fontSize: "9px", 
                        textTransform: "uppercase", 
                        color: "var(--tx3)", 
                        fontWeight: 600, 
                        marginTop: "2px",
                        letterSpacing: "0.05em",
                        transition: "all 0.2s ease"
                      }}>
                        {deptDistributionData[activePieIndex].name}
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={{ 
                        fontSize: "22px", 
                        fontWeight: 700, 
                        color: "var(--tx)",
                        lineHeight: 1.1,
                        transition: "all 0.2s ease"
                      }}>
                        {totalEventsCount}
                      </span>
                      <div style={{ 
                        fontSize: "9px", 
                        textTransform: "uppercase", 
                        color: "var(--tx3)", 
                        fontWeight: 600, 
                        marginTop: "2px",
                        letterSpacing: "0.05em",
                        transition: "all 0.2s ease"
                      }}>
                        Events
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {deptDistributionData.map((dept) => (
                  <div key={dept.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dept.color, flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--tx)" }}>{dept.name} ({dept.percentage}%)</span>
                      <span style={{ fontSize: "10px", color: "var(--tx3)" }}>{dept.value} event{dept.value === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts banner */}
        {alerts.length > 0 && (
          <div className="card" style={{ padding: "14px 16px", marginBottom: "20px", borderLeft: "4px solid var(--acc)" }}>
            <div className="card-t" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px", display: "flex", alignItems: "center", gap: 6, color: "var(--tx2)", textTransform: "capitalize", letterSpacing: "normal" }}>
              <AlertTriangle size={14} color="var(--acc)" /> Needs Attention
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
          {/* Left: Recent Inquiries + Recent Activity */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Recent Inquiries */}
            <div className="card border border-b1" style={{ padding: "20px", margin: 0, borderRadius: "12px", background: "var(--s1)" }}>
              <div className="flex justify-between items-center" style={{ marginBottom: "16px" }}>
                <span className="card-t" style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx2)", textTransform: "capitalize", letterSpacing: "normal", marginBottom: 0 }}>Recent Inquiries</span>
                <Link href="/inquiries" className="text-[11px] text-acc flex items-center gap-1 hover:underline">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div style={{ overflowX: "auto" }} className="tbl-scroll">
                <table className="tbl" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--s1)" }}>
                    <tr>
                      <th style={{ background: "var(--s1)", borderBottom: "1px solid var(--b1)", paddingBottom: "10px" }}>Event Name</th>
                      <th style={{ background: "var(--s1)", borderBottom: "1px solid var(--b1)", paddingBottom: "10px" }}>Client</th>
                      <th style={{ background: "var(--s1)", borderBottom: "1px solid var(--b1)", paddingBottom: "10px" }}>Date</th>
                      <th style={{ background: "var(--s1)", borderBottom: "1px solid var(--b1)", paddingBottom: "10px" }}>Dept.</th>
                      <th style={{ background: "var(--s1)", borderBottom: "1px solid var(--b1)", paddingBottom: "10px" }}>Status</th>
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
                          <tr 
                            key={inq.id} 
                            onClick={() => router.push(`/inquiries/${inq.id}`)}
                            className="hover:bg-row-hover transition-colors duration-150 group"
                            style={{ cursor: "pointer" }}
                          >
                            <td className="font-semibold text-tx group-hover:text-acc transition-colors duration-150">
                              {inq.eventName || "Unnamed Event"}
                            </td>
                            <td>{client?.name || inq.clientId}</td>
                            <td style={{ fontSize: "11px" }}>{inq.startDate}</td>
                            <td>
                              <Badge variant={
                                inq.department === "LED" ? "bl" : 
                                inq.department === "MERGED" ? "gy" : 
                                "gr" // VIDEO
                              }>
                                {inq.department || "VIDEO"}
                              </Badge>
                            </td>
                            <td>
                              <Badge variant={
                                inq.status === "Confirmed" ? "gr" : 
                                inq.status === "Cancelled" ? "rd" : 
                                "am" // Pending
                              }>
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

            {/* Recent Activity Section (New) */}
            <div className="card border border-b1" style={{ padding: "20px", margin: 0, borderRadius: "12px", background: "var(--s1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span className="card-t" style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx2)", textTransform: "capitalize", letterSpacing: "normal", marginBottom: 0 }}>
                  Recent Activity
                </span>
                <span style={{ fontSize: "10px", color: "var(--tx3)" }} className="flex items-center gap-1">
                  <Clock size={11} /> Live Feed
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {recentActivities.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--tx3)", fontSize: "12px" }}>
                    No recent activities recorded.
                  </div>
                ) : (
                  (showAllActivities ? recentActivities : recentActivities.slice(0, 5)).map((act, idx) => {
                    let Icon = CheckCircle2;
                    let iconColor = "#10b981"; // green
                    let iconBg = "rgba(16, 185, 129, 0.1)";

                    if (act.type === "inquiry") {
                      Icon = ClipboardList;
                      iconColor = "#3b82f6"; // blue
                      iconBg = "rgba(59, 130, 246, 0.1)";
                    } else if (act.type === "client") {
                      Icon = Users;
                      iconColor = "#a855f7"; // purple
                      iconBg = "rgba(168, 85, 247, 0.1)";
                    } else if (act.type === "quotation") {
                      Icon = FileCheck;
                      iconColor = "#eab308"; // yellow
                      iconBg = "rgba(234, 179, 8, 0.1)";
                    } else if (act.type === "equipment") {
                      Icon = Wrench;
                      iconColor = "#06b6d4"; // cyan
                      iconBg = "rgba(6, 182, 212, 0.1)";
                    }

                    return (
                      <div key={act.id} className="relative flex gap-3 items-start group">
                        {idx < (showAllActivities ? recentActivities.length : Math.min(5, recentActivities.length)) - 1 && (
                          <div
                            style={{
                              position: "absolute",
                              left: "14px",
                              top: "28px",
                              bottom: "-20px",
                              width: "1px",
                              background: "var(--b1)"
                            }}
                          />
                        )}

                        <div 
                          style={{ 
                            color: iconColor, 
                            background: iconBg, 
                            padding: "6px", 
                            borderRadius: "50%", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            zIndex: 2,
                          }}
                        >
                          <Icon size={15} />
                        </div>
                        
                        <div className="flex-1" style={{ marginTop: "2px" }}>
                          <p style={{ fontSize: "12.5px", color: "var(--tx)", fontWeight: 500, lineHeight: 1.4 }}>
                            {act.description}
                          </p>
                          <span style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "2px", display: "block" }}>
                            {getRelativeTime(act.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                {recentActivities.length > 5 && (
                  <button
                    onClick={() => setShowAllActivities((prev) => !prev)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--tx2)",
                      background: "transparent",
                      border: "1px solid var(--b1)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <ArrowRight size={12} style={{ transform: showAllActivities ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                    {showAllActivities ? "Show Less" : `Show All ${recentActivities.length}`}
                  </button>
                )}
                <Link
                  href="/activity"
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--acc)",
                    background: "transparent",
                    border: "1px solid var(--b1)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    textDecoration: "none",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <ArrowRight size={12} />
                  View Full Activity Page
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Today's Schedule + Quick Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Today's Schedule */}
            <div className="card border border-b1" style={{ padding: "20px", margin: 0, borderRadius: "12px", background: "var(--s1)" }}>
              <div className="card-t" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: 8, color: "var(--tx2)", textTransform: "capitalize", letterSpacing: "normal" }}>
                <CalendarCheck size={16} className="text-acc" /> Today&apos;s Schedule
              </div>
              
              {todayEvents.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "140px", textAlign: "center", color: "var(--tx3)" }}>
                  <div style={{ background: "var(--s2)", padding: "12px", borderRadius: "50%", marginBottom: "12px", border: "1px solid var(--b1)" }}>
                    <PartyPopper size={24} className="text-tx3" />
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx2)" }}>No events scheduled today</div>
                  <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "2px" }}>Enjoy your day!</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }} className="pl-1">
                  {todayEvents.map((evt, idx) => {
                    const eventColor = 
                      evt.type === "confirmed" ? "#10b981" : 
                      evt.type === "completed" ? "#6b7280" : 
                      evt.type === "quotation" ? "#3b82f6" : "#eab308";
                    return (
                      <div key={evt.id} className="relative flex gap-4">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div 
                            style={{ 
                              width: "10px", 
                              height: "10px", 
                              borderRadius: "50%", 
                              border: `2px solid ${eventColor}`, 
                              background: "var(--s1)", 
                              zIndex: 2,
                              marginTop: "4px"
                            }} 
                          />
                          {idx < todayEvents.length - 1 && (
                            <div style={{ width: "2px", flex: 1, background: "var(--b1)", zIndex: 1, marginTop: "4px" }} />
                          )}
                        </div>
                        
                        <div 
                          className="flex-1 transition-all duration-200 hover:border-hover-card-border"
                          style={{ 
                            padding: "10px 14px", 
                            background: "var(--s2)", 
                            borderRadius: "10px", 
                            border: "1px solid var(--b1)", 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center" 
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--tx)" }}>{evt.label}</div>
                            <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px", textTransform: "capitalize" }}>Type: {evt.type}</div>
                          </div>
                          <Badge variant={
                            evt.type === "confirmed" ? "gr" : 
                            evt.type === "completed" ? "gy" : 
                            evt.type === "quotation" ? "bl" : "am"
                          }>
                            Today
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card border border-b1" style={{ padding: "20px", margin: 0, borderRadius: "12px", background: "var(--s1)" }}>
              <div className="card-t" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "16px", color: "var(--tx2)", textTransform: "capitalize", letterSpacing: "normal" }}>Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {visibleQuickActions.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <Link 
                      key={qa.href} 
                      href={qa.href} 
                      className={`btn ${qa.className || ""} text-[12px] font-medium`} 
                      style={{ 
                        justifyContent: "flex-start", 
                        gap: 8, 
                        padding: "10px 12px",
                        borderRadius: "10px",
                        borderWidth: "1px",
                      }}
                    >
                      <Icon size={14} className="flex-shrink-0" /> 
                      <span className="truncate">{qa.label}</span>
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

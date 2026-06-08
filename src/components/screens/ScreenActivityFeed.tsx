"use client";

import { useMemo, useState } from "react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import {
  useInquiries,
  useQuotations,
  useInvoices,
  useClients,
} from "@/lib/store";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import {
  ClipboardList,
  Users,
  FileCheck,
  Wrench,
  CheckCircle2,
  Clock,
  Search,
  Filter,
} from "lucide-react";

type ActivityType = "inquiry" | "client" | "payment" | "equipment" | "quotation";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  timestampMs: number;
}

const TYPE_META: Record<
  ActivityType,
  { label: string; icon: typeof CheckCircle2; iconColor: string; iconBg: string }
> = {
  inquiry: {
    label: "Inquiry",
    icon: ClipboardList,
    iconColor: "#3b82f6",
    iconBg: "rgba(59, 130, 246, 0.1)",
  },
  client: {
    label: "Client",
    icon: Users,
    iconColor: "#a855f7",
    iconBg: "rgba(168, 85, 247, 0.1)",
  },
  payment: {
    label: "Payment",
    icon: CheckCircle2,
    iconColor: "#10b981",
    iconBg: "rgba(16, 185, 129, 0.1)",
  },
  equipment: {
    label: "Equipment",
    icon: Wrench,
    iconColor: "#06b6d4",
    iconBg: "rgba(6, 182, 212, 0.1)",
  },
  quotation: {
    label: "Quotation",
    icon: FileCheck,
    iconColor: "#eab308",
    iconBg: "rgba(234, 179, 8, 0.1)",
  },
};

const ALL_TYPES: ActivityType[] = ["inquiry", "client", "payment", "equipment", "quotation"];

function getRelativeTime(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs)) return dateStr;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatFullDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScreenActivityFeed() {
  const { inquiries, loading: inquiriesLoading } = useInquiries();
  const { quotations, loading: quotationsLoading } = useQuotations();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { clients } = useClients();

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActivityType[]>([]);

  const fmt = (n: number) => n.toLocaleString("en-IN");

  const allActivities = useMemo<Activity[]>(() => {
    const list: Activity[] = [];

    inquiries.forEach((inq) => {
      const client = clients.find((c) => c.id === inq.clientId);
      const clientName = client?.name || "Unknown Client";
      const timeMs = inq.createdAt ? new Date(inq.createdAt).getTime() : 0;
      list.push({
        id: `inq-${inq.id}`,
        type: "inquiry",
        title: "Inquiry Created",
        description: `New inquiry "${inq.eventName || "Unnamed Event"}" for ${clientName}`,
        timestamp: inq.createdAt,
        timestampMs: timeMs,
      });

      if (inq.status === "Confirmed") {
        const updateTime = inq.updatedAt || inq.createdAt;
        const updateMs = updateTime ? new Date(updateTime).getTime() : timeMs;
        list.push({
          id: `equip-${inq.id}`,
          type: "equipment",
          title: "Equipment Assigned",
          description: `Equipment & staff dispatched for "${inq.eventName || "Unnamed Event"}"`,
          timestamp: updateTime,
          timestampMs: updateMs + 1000,
        });
      }
    });

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

    return list
      .filter((a) => a.timestampMs > 0)
      .sort((a, b) => b.timestampMs - a.timestampMs);
  }, [inquiries, clients, quotations, invoices]);

  const filtered = useMemo(() => {
    let result = allActivities;
    if (activeFilters.length > 0) {
      result = result.filter((a) => activeFilters.includes(a.type));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allActivities, activeFilters, search]);

  const toggleFilter = (type: ActivityType) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const isLoading = inquiriesLoading || quotationsLoading || invoicesLoading;

  if (isLoading) {
    return (
      <ScreenFrame breadcrumb="Dashboard › Activity">
        <LoadingSkeleton rows={10} />
      </ScreenFrame>
    );
  }

  // Group activities by date label
  const groupedActivities: { dateLabel: string; items: Activity[] }[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  filtered.forEach((act) => {
    const dateKey = act.timestamp ? act.timestamp.split("T")[0] : "";
    let dateLabel = dateKey;
    if (dateKey === todayStr) dateLabel = "Today";
    else if (dateKey === yesterdayStr) dateLabel = "Yesterday";
    else if (dateKey) {
      dateLabel = new Date(dateKey).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    const last = groupedActivities[groupedActivities.length - 1];
    if (last && last.dateLabel === dateLabel) {
      last.items.push(act);
    } else {
      groupedActivities.push({ dateLabel, items: [act] });
    }
  });

  return (
    <>
      <SectionHeader
        title={<>Activity <strong>Feed</strong></>}
        description="Complete log of all CRM activity — inquiries, payments, clients, equipment, and quotations."
      />

      <ScreenFrame
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Activity Feed" },
        ]}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          {/* Search */}
          <div
            style={{
              position: "relative",
              flex: "1 1 220px",
              maxWidth: "360px",
            }}
          >
            <Search
              size={13}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--tx3)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search activities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "30px",
                paddingRight: "12px",
                paddingTop: "7px",
                paddingBottom: "7px",
                fontSize: "12px",
                border: "1px solid var(--b1)",
                borderRadius: "8px",
                background: "var(--s1)",
                color: "var(--tx)",
                outline: "none",
              }}
            />
          </div>

          {/* Filter chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "11px",
                color: "var(--tx3)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Filter size={11} /> Filter:
            </span>
            {ALL_TYPES.map((type) => {
              const meta = TYPE_META[type];
              const active = activeFilters.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 500,
                    borderRadius: "20px",
                    border: `1px solid ${active ? meta.iconColor : "var(--b1)"}`,
                    background: active ? meta.iconBg : "transparent",
                    color: active ? meta.iconColor : "var(--tx3)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 500,
                  borderRadius: "20px",
                  border: "1px solid var(--b1)",
                  background: "transparent",
                  color: "var(--tx3)",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Count badge */}
          <span
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              color: "var(--tx3)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexShrink: 0,
            }}
          >
            <Clock size={11} />
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {/* Activity timeline */}
        <div
          className="card border border-b1"
          style={{ padding: "24px", borderRadius: "12px", background: "var(--s1)" }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "48px 0",
                textAlign: "center",
                color: "var(--tx3)",
                fontSize: "13px",
              }}
            >
              No activities match your search or filters.
            </div>
          ) : (
            groupedActivities.map((group) => (
              <div key={group.dateLabel} style={{ marginBottom: "28px" }}>
                {/* Date label */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--tx3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {group.dateLabel}
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "var(--b1)" }} />
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--tx3)",
                      background: "var(--s2)",
                      padding: "2px 7px",
                      borderRadius: "10px",
                      border: "1px solid var(--b1)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {group.items.length} {group.items.length === 1 ? "event" : "events"}
                  </span>
                </div>

                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {group.items.map((act, idx) => {
                    const meta = TYPE_META[act.type];
                    const Icon = meta.icon;
                    const isLast = idx === group.items.length - 1;

                    return (
                      <div
                        key={act.id}
                        className="relative flex gap-4 group"
                        style={{ paddingBottom: isLast ? "0" : "20px" }}
                      >
                        {/* Vertical line */}
                        {!isLast && (
                          <div
                            style={{
                              position: "absolute",
                              left: "14px",
                              top: "28px",
                              bottom: "0",
                              width: "1px",
                              background: "var(--b1)",
                            }}
                          />
                        )}

                        {/* Icon */}
                        <div
                          style={{
                            color: meta.iconColor,
                            background: meta.iconBg,
                            padding: "6px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 2,
                            flexShrink: 0,
                            width: "28px",
                            height: "28px",
                          }}
                        >
                          <Icon size={14} />
                        </div>

                        {/* Content */}
                        <div
                          className="flex-1 transition-all duration-150"
                          style={{
                            background: "var(--s2)",
                            border: "1px solid var(--b1)",
                            borderRadius: "10px",
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "12px",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                marginBottom: "3px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  color: meta.iconColor,
                                  background: meta.iconBg,
                                  padding: "1px 6px",
                                  borderRadius: "10px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  flexShrink: 0,
                                }}
                              >
                                {meta.label}
                              </span>
                              <span
                                style={{
                                  fontSize: "12.5px",
                                  fontWeight: 600,
                                  color: "var(--tx)",
                                }}
                              >
                                {act.title}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "var(--tx2)",
                                lineHeight: 1.5,
                                margin: 0,
                              }}
                            >
                              {act.description}
                            </p>
                          </div>

                          <div
                            style={{
                              textAlign: "right",
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 500,
                                color: "var(--tx2)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {getRelativeTime(act.timestamp)}
                            </div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--tx3)",
                                marginTop: "2px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatFullDate(act.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScreenFrame>
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Settings, ChevronLeft, ChevronRight, ArrowRight, X, Calendar, Clock } from "lucide-react";

import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useCalendar, useInquiries, useClients, useQuotations, useInvoices } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import type { CalendarEvent } from "@/lib/store";
import { ShimmerBar } from "../ui/LoadingSkeleton";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLabelsFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EVENT_STYLES: Record<CalendarEvent["type"], { bar: string; bg: string; text: string; border: string; dot: string; badge: string }> = {
  inquiry:   { bar: "var(--sem-bl-tx)", bg: "var(--sem-bl-bg)",  text: "var(--sem-bl-tx)", border: "var(--sem-bl-bdr)",  dot: "var(--sem-bl-tx)", badge: "bl" },
  quotation: { bar: "var(--sem-am-tx)", bg: "var(--sem-am-bg)",  text: "var(--sem-am-tx)", border: "var(--sem-am-bdr)",  dot: "var(--sem-am-tx)", badge: "am" },
  confirmed: { bar: "var(--sem-gr-tx)", bg: "var(--sem-gr-bg)",  text: "var(--sem-gr-tx)", border: "var(--sem-gr-bdr)",  dot: "var(--sem-gr-tx)", badge: "gr" },
  completed: { bar: "var(--tx3)",       bg: "var(--sem-gy-bg)", text: "var(--sem-gy-tx)", border: "var(--b1)",             dot: "var(--tx3)",       badge: "gy" },
};

function parseEventId(id: string) {
  if (!id.startsWith("cal-")) return { groupKey: id, index: 0 };
  if (id.includes("-confirmed-")) {
    const parts = id.split("-confirmed-");
    return { groupKey: parts[0] + "-confirmed", index: parseInt(parts[1], 10) || 0 };
  }
  const lastDash = id.lastIndexOf("-");
  if (lastDash === -1) return { groupKey: id, index: 0 };
  return { groupKey: id.substring(0, lastDash), index: parseInt(id.substring(lastDash + 1), 10) || 0 };
}

export default function Screen03Calendar() {
  const { can } = useCurrentUser();
  const canCreateInquiry = can("inquiries.create");
  const { calendarEvents, loading } = useCalendar();
  const { inquiries } = useInquiries();
  const { clients } = useClients();
  const { quotations } = useQuotations();
  const { invoices } = useInvoices();
  const today = new Date();

  const [viewDate, setViewDate] = useState(today);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const targetInquiryId = useMemo(() => {
    if (!selectedEvent) return "";
    const id = selectedEvent.id;
    let cleanId = id;
    if (id.startsWith("cal-")) {
      cleanId = id.substring(4);
      if (cleanId.includes("-confirmed-")) {
        cleanId = cleanId.split("-confirmed-")[0];
      } else {
        const lastDash = cleanId.lastIndexOf("-");
        if (lastDash !== -1) cleanId = cleanId.substring(0, lastDash);
      }
    }
    const found = inquiries.find((inq) => inq.id === cleanId);
    if (found) return found.id;
    if (id.startsWith("cal-")) {
      const num = parseInt(id.replace("cal-", ""), 10);
      if (!isNaN(num)) {
        if (num >= 1 && num <= 3) return "inq-1";
        if (num === 4 || num === 5) return "inq-2";
        if (num === 6 || num === 7) return "inq-3";
        if (num === 8) return "inq-5";
        if (num === 9) return "inq-6";
        if (num === 10) return "inq-7";
      }
    }
    const labelLower = selectedEvent.label.toLowerCase();
    const match = inquiries.find((inq) => {
      const client = clients.find((c) => c.id === inq.clientId);
      if (client) {
        const cn = client.name.toLowerCase();
        return labelLower.includes(cn) || cn.includes(labelLower);
      }
      return inq.eventType.toLowerCase().includes(labelLower);
    });
    return match ? match.id : "";
  }, [selectedEvent, inquiries, clients]);

  const matchedQuote = useMemo(() =>
    targetInquiryId ? quotations.find((q) => q.inquiryId === targetInquiryId) ?? null : null,
    [targetInquiryId, quotations]);

  const matchedInvoice = useMemo(() =>
    targetInquiryId && matchedQuote ? invoices.find((inv) => inv.quotationId === matchedQuote.id) ?? null : null,
    [targetInquiryId, invoices, matchedQuote]);

  const navigate = (delta: number) => {
    const next = new Date(viewDate);
    if (viewMode === "month") next.setMonth(next.getMonth() + delta);
    else if (viewMode === "week") next.setDate(next.getDate() + delta * 7);
    else next.setDate(next.getDate() + delta);
    setViewDate(next);
  };

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();

  const headerText = useMemo(() => {
    if (viewMode === "month") return `${MONTHS[viewMonth]} ${viewYear}`;
    if (viewMode === "day") return `${dayLabelsFull[viewDate.getDay()]}, ${MONTHS_SHORT[viewMonth]} ${viewDate.getDate()}, ${viewYear}`;
    const d = new Date(viewDate);
    const start = new Date(d); start.setDate(d.getDate() - d.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const m1 = MONTHS_SHORT[start.getMonth()], m2 = MONTHS_SHORT[end.getMonth()];
    return m1 === m2
      ? `${m1} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
      : `${m1} ${start.getDate()} – ${m2} ${end.getDate()}, ${start.getFullYear()}`;
  }, [viewDate, viewMode, viewMonth, viewYear]);

  const visibleEvents = useMemo(() => {
    let start: Date, end: Date;
    if (viewMode === "month") {
      start = new Date(viewYear, viewMonth, 1);
      end = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);
    } else if (viewMode === "week") {
      const d = new Date(viewDate); d.setDate(d.getDate() - d.getDay());
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59);
    } else {
      start = new Date(viewYear, viewMonth, viewDate.getDate());
      end = new Date(viewYear, viewMonth, viewDate.getDate(), 23, 59, 59);
    }
    return calendarEvents.filter(e => {
      const d = new Date(e.year, e.month - 1, e.date);
      return d >= start && d <= end;
    });
  }, [calendarEvents, viewDate, viewMode, viewMonth, viewYear]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleEvents;
    return visibleEvents.filter(evt => {
      const labelMatch = evt.label.toLowerCase().includes(q);
      const typeMatch = evt.type.toLowerCase().includes(q);
      return labelMatch || typeMatch;
    });
  }, [visibleEvents, searchQuery]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach(e => {
      const key = `${e.year}-${e.month}-${e.date}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [filteredEvents]);

  const cells = useMemo(() => {
    if (viewMode === "month") {
      const startDay = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const arr: (null | { year: number; month: number; date: number })[] = [];
      for (let i = 0; i < startDay; i++) arr.push(null);
      for (let d = 1; d <= daysInMonth; d++) arr.push({ year: viewYear, month: viewMonth + 1, date: d });
      while (arr.length % 7 !== 0) arr.push(null);
      return arr;
    } else if (viewMode === "week") {
      const d = new Date(viewDate); d.setDate(d.getDate() - d.getDay());
      return Array.from({ length: 7 }, (_, i) => {
        const c = new Date(d); c.setDate(d.getDate() + i);
        return { year: c.getFullYear(), month: c.getMonth() + 1, date: c.getDate() };
      });
    } else {
      return [{ year: viewYear, month: viewMonth + 1, date: viewDate.getDate() }];
    }
  }, [viewDate, viewMode, viewMonth, viewYear]);

  const weeksData = useMemo(() => {
    if (viewMode === "day") return [];
    const arr = [];
    const weeksCount = cells.length / 7;
    for (let w = 0; w < weeksCount; w++) {
      const weekCells = cells.slice(w * 7, w * 7 + 7);
      const weekEvents: { evt: CalendarEvent; dayIndex: number }[] = [];
      weekCells.forEach((cell, dayIndex) => {
        if (!cell) return;
        const key = `${cell.year}-${cell.month}-${cell.date}`;
        (eventsByDate[key] || []).forEach(evt => weekEvents.push({ evt, dayIndex }));
      });

      const groups: Record<string, { groupKey: string; label: string; type: string; dayIndices: number[]; events: CalendarEvent[] }> = {};
      weekEvents.forEach(({ evt, dayIndex }) => {
        const { groupKey } = parseEventId(evt.id);
        if (!groups[groupKey]) groups[groupKey] = { groupKey, label: evt.label.replace(/^↔\s*/, ""), type: evt.type, dayIndices: [], events: [] };
        groups[groupKey].dayIndices.push(dayIndex);
        groups[groupKey].events.push(evt);
      });

      const segments: { groupKey: string; label: string; type: string; startCol: number; endCol: number; event: CalendarEvent }[] = [];
      Object.values(groups).forEach(group => {
        const sorted = [...group.dayIndices].sort((a, b) => a - b);
        let cur: number[] = [];
        sorted.forEach(idx => {
          if (!cur.length || idx === cur[cur.length - 1] + 1) { cur.push(idx); }
          else {
            segments.push({ groupKey: group.groupKey, label: group.label, type: group.type, startCol: cur[0] + 1, endCol: cur[cur.length - 1] + 1, event: group.events[0] });
            cur = [idx];
          }
        });
        if (cur.length) segments.push({ groupKey: group.groupKey, label: group.label, type: group.type, startCol: cur[0] + 1, endCol: cur[cur.length - 1] + 1, event: group.events[0] });
      });

      segments.sort((a, b) => (b.endCol - b.startCol) - (a.endCol - a.startCol) || a.label.localeCompare(b.label));
      const tracks: typeof segments[] = [];
      segments.forEach(seg => {
        let t = tracks.findIndex(track => !track.some(e => !(seg.endCol < e.startCol || seg.startCol > e.endCol)));
        if (t === -1) { tracks.push([seg]); t = tracks.length - 1; }
        else tracks[t].push(seg);
      });

      arr.push({
        weekIndex: w,
        cells: weekCells,
        segments: segments.map(seg => ({ ...seg, trackIndex: tracks.findIndex(t => t.includes(seg)) })),
        totalTracks: tracks.length,
      });
    }
    return arr;
  }, [cells, eventsByDate, viewMode]);

  const isToday = (y: number, m: number, d: number) =>
    d === today.getDate() && m - 1 === today.getMonth() && y === today.getFullYear();

  const isCurrentMonth = (m: number, y: number) => m - 1 === today.getMonth() && y === today.getFullYear();

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <SectionHeader
          title={<>Calendar <strong>view</strong></>}
          description="View and manage all scheduled events — inquiries, quotations, and confirmed bookings."
        />
        <ScreenFrame breadcrumb="Calendar" actions={<ShimmerBar width="280px" height="34px" radius="8px" />}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "16px",
            flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              {["Inquiry","Quotation sent","Confirmed", "Completed"].map((l, i) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShimmerBar width="8px" height="8px" radius="50%" style={{ animationDelay: `${i*40}ms` }} />
                  <ShimmerBar width="80px" height="10px" style={{ animationDelay: `${i*40+20}ms` }} />
                </div>
              ))}
            </div>
            <div>
              <ShimmerBar width="240px" height="32px" radius="8px" />
            </div>
          </div>
          <div style={{ border: "1px solid var(--b1)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: "var(--b1)", gap: "1px" }}>
              {dayLabels.map(l => (
                <div key={l} style={{ background: "var(--alt2)", padding: "10px", textAlign: "center" }}>
                  <ShimmerBar width="24px" height="10px" style={{ margin: "0 auto" }} />
                </div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} style={{ background: "var(--cal-cell)", minHeight: "120px", padding: "8px" }}>
                  <ShimmerBar width="20px" height="20px" radius="50%" style={{ marginLeft: "auto", animationDelay: `${i*15}ms` }} />
                  {(i === 8 || i === 15 || i === 22) && <ShimmerBar width="90%" height="18px" radius="6px" style={{ marginTop: "8px", animationDelay: `${i*15+100}ms` }} />}
                </div>
              ))}
            </div>
          </div>
        </ScreenFrame>
      </>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .cal-grid-cell {
          position: relative;
          transition: background-color 0.2s ease, box-shadow 0.2s ease;
        }
        .cal-grid-cell:hover {
          background-color: var(--hover-bg) !important;
        }
        .cal-grid-cell .create-inquiry-btn {
          opacity: 0;
          transform: scale(0.9);
          transition: opacity 0.2s ease, transform 0.2s ease, background-color 0.15s ease, color 0.15s ease;
        }
        .cal-grid-cell:hover .create-inquiry-btn {
          opacity: 1;
          transform: scale(1);
        }
        .cal-grid-cell .create-inquiry-btn:hover {
          background-color: var(--tx) !important;
          color: var(--s1) !important;
        }
        .cal-event-pill {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease;
        }
        .cal-event-pill:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow);
          filter: brightness(0.95);
        }
        .day-event-btn {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease;
        }
        .day-event-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow);
          filter: brightness(0.95);
        }
      `}</style>
      <SectionHeader
        title={<>Calendar <strong>view</strong></>}
        description="View and manage all scheduled events — inquiries, quotations, and confirmed bookings."
      />
      <ScreenFrame
        breadcrumb={<span style={{ fontWeight: 600, fontSize: "14px" }}>Calendar — <span style={{ color: "var(--acc)" }}>{headerText}</span></span>}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* View mode toggle */}
            <div style={{ display: "flex", border: "1px solid var(--b2)", borderRadius: "8px", overflow: "hidden", background: "var(--s1)" }}>
              {(["Day", "Week", "Month"] as const).map((mode) => {
                const key = mode.toLowerCase() as "day" | "week" | "month";
                const active = viewMode === key;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(key)}
                    style={{
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontWeight: active ? 600 : 400,
                      background: active ? "var(--tx)" : "transparent",
                      color: active ? "var(--s1)" : "var(--tx3)",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      borderRight: mode !== "Month" ? "1px solid var(--b2)" : "none",
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                className="btn"
                onClick={() => navigate(-1)}
                style={{ padding: "6px 10px", minWidth: "unset" }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="btn"
                onClick={() => setViewDate(new Date())}
                style={{ padding: "6px 14px", fontSize: "12px", fontWeight: 500 }}
              >
                Today
              </button>
              <button
                className="btn"
                onClick={() => navigate(1)}
                style={{ padding: "6px 10px", minWidth: "unset" }}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {canCreateInquiry && (
              <Link href="/inquiries/new" className="btn btn-primary" style={{ fontSize: "12px", fontWeight: 600 }}>
                + New inquiry
              </Link>
            )}
          </div>
        }
      >
        {/* Legend & Search bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "16px",
          flexWrap: "wrap"
        }}>
          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {(["inquiry","quotation","confirmed","completed"] as const).map(type => {
              const s = EVENT_STYLES[type];
              const labels: Record<string, string> = { inquiry: "Inquiry", quotation: "Quotation sent", confirmed: "Confirmed", completed: "Completed" };
              return (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: "11.5px", color: "var(--tx3)", fontWeight: 500 }}>{labels[type]}</span>
                </div>
              );
            })}
          </div>

          {/* Search Filter */}
          <div style={{ position: "relative", minWidth: "240px" }}>
            <input
              type="text"
              placeholder="Filter events..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="finp"
              style={{
                paddingLeft: "32px",
                paddingRight: "28px",
                height: "32px",
                fontSize: "12px",
                borderRadius: "8px",
                width: "100%",
              }}
            />
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--tx3)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--tx3)",
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Calendar grid */}
        <div style={{
          border: "1px solid var(--b1)",
          borderRadius: "12px",
          overflow: "hidden",
          background: "var(--b1)",
        }}>
          {/* Day headers */}
          {viewMode !== "day" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "1px", background: "var(--b1)" }}>
              {dayLabels.map((label, i) => (
                <div
                  key={label}
                  style={{
                    background: "var(--alt2)",
                    padding: "10px 8px",
                    textAlign: "center",
                    fontSize: "10.5px",
                    fontWeight: 600,
                    color: i === 0 || i === 6 ? "var(--tx3)" : "var(--tx2)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Day view */}
          {viewMode === "day" && cells.map((cell, i) => (
            <div key={i} style={{ background: "var(--s1)", minHeight: "400px", padding: "20px" }}>
              {cell && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--b1)" }}>
                    <div
                      style={{
                        width: "42px", height: "42px", borderRadius: "50%",
                        background: isToday(cell.year, cell.month, cell.date) ? "var(--tx)" : "var(--alt2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "18px", fontWeight: 700,
                        color: isToday(cell.year, cell.month, cell.date) ? "var(--s1)" : "var(--tx)",
                      }}
                    >
                      {cell.date}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--tx)" }}>
                        {dayLabelsFull[new Date(cell.year, cell.month - 1, cell.date).getDay()]}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--tx3)" }}>
                        {MONTHS[cell.month - 1]} {cell.year}
                      </div>
                    </div>
                    {canCreateInquiry && (
                      <Link
                        href={`/inquiries/new?date=${cell.year}-${String(cell.month).padStart(2, "0")}-${String(cell.date).padStart(2, "0")}`}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", fontWeight: 600 }}
                      >
                        + Create inquiry
                      </Link>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(eventsByDate[`${cell.year}-${cell.month}-${cell.date}`] || []).length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--tx3)", fontSize: "13px" }}>
                        No events today
                      </div>
                    ) : (
                      eventsByDate[`${cell.year}-${cell.month}-${cell.date}`].map(evt => {
                        const s = EVENT_STYLES[evt.type];
                        return (
                          <button
                            key={evt.id}
                            onClick={() => setSelectedEvent(evt)}
                            className="day-event-btn"
                            style={{
                              display: "flex", alignItems: "center", gap: "12px",
                              background: s.bg, border: `1px solid ${s.border}`,
                              borderLeft: `3px solid ${s.bar}`,
                              borderRadius: "8px", padding: "12px 14px",
                              textAlign: "left", cursor: "pointer",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: s.text }}>{evt.label}</div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Week / Month view */}
          {viewMode !== "day" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "1px", background: "var(--b1)" }}>
              {weeksData.map((week) => {
                const totalTracks = week.totalTracks;
                const rowHeight = Math.max(viewMode === "month" ? 120 : 320, 40 + totalTracks * 28);

                return (
                  <div key={`week-${week.weekIndex}`} style={{ display: "contents" }}>
                    {/* Cell backgrounds */}
                    {week.cells.map((cell, dIdx) => {
                      const todayCell = cell && isToday(cell.year, cell.month, cell.date);
                      const otherMonth = cell && !isCurrentMonth(cell.month, cell.year);
                      return (
                        <div
                          key={`cell-${week.weekIndex}-${dIdx}`}
                          className="cal-grid-cell"
                          style={{
                            background: todayCell ? "var(--cal-today)" : "var(--cal-cell)",
                            minHeight: `${rowHeight}px`,
                            padding: "8px",
                            position: "relative",
                            opacity: otherMonth ? 0.55 : 1,
                          }}
                        >
                          {cell && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              {canCreateInquiry ? (
                                <Link
                                  href={`/inquiries/new?date=${cell.year}-${String(cell.month).padStart(2, "0")}-${String(cell.date).padStart(2, "0")}`}
                                  className="create-inquiry-btn"
                                  title={`Create inquiry for ${cell.year}-${cell.month}-${cell.date}`}
                                  style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    background: "var(--b1)",
                                    color: "var(--tx)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    border: "none",
                                    cursor: "pointer",
                                    textDecoration: "none",
                                  }}
                                >
                                  +
                                </Link>
                              ) : (
                                <div />
                              )}
                              <span
                                style={{
                                  width: "26px", height: "26px",
                                  borderRadius: "50%",
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "12px",
                                  fontWeight: todayCell ? 700 : 400,
                                  background: todayCell ? "var(--tx)" : "transparent",
                                  color: todayCell ? "var(--s1)" : dIdx === 0 || dIdx === 6 ? "var(--tx3)" : "var(--tx2)",
                                }}
                              >
                                {cell.date}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Spanning event pills */}
                    <div
                      style={{
                        gridColumn: "1 / span 7",
                        position: "relative",
                        pointerEvents: "none",
                        height: "100%",
                      }}
                    >
                      {week.segments.map((seg, sIdx) => {
                        const s = EVENT_STYLES[seg.type as CalendarEvent["type"]] || EVENT_STYLES.inquiry;
                        const leftPct = (seg.startCol - 1) * (100 / 7);
                        const widthPct = (seg.endCol - seg.startCol + 1) * (100 / 7);
                        const isMultiDay = seg.endCol > seg.startCol;

                        return (
                          <button
                            key={`${seg.groupKey}-${sIdx}`}
                            onClick={() => setSelectedEvent(seg.event)}
                            className="cal-event-pill"
                            style={{
                              position: "absolute",
                              left: `calc(${leftPct}% + 3px)`,
                              width: `calc(${widthPct}% - 6px)`,
                              top: `${40 + seg.trackIndex * 28}px`,
                              height: "23px",
                              background: s.bg,
                              border: `1px solid ${s.border}`,
                              borderLeft: `3px solid ${s.bar}`,
                              borderRadius: isMultiDay ? "0 6px 6px 0" : "6px",
                              padding: "0 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: s.text,
                              textAlign: "left",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              pointerEvents: "auto",
                              cursor: "pointer",
                              zIndex: 5,
                            }}
                          >
                            {seg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScreenFrame>

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--modal-overlay)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--s1)",
              border: "1px solid var(--b1)",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              width: "340px",
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--b1)",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px",
                background: EVENT_STYLES[selectedEvent.type].bg,
                borderLeft: `4px solid ${EVENT_STYLES[selectedEvent.type].bar}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--tx)", lineHeight: 1.4, marginBottom: "6px" }}>
                  {selectedEvent.label}
                </div>
                <Badge variant={EVENT_STYLES[selectedEvent.type].badge as any}>
                  {selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1)}
                </Badge>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx3)", padding: "2px", flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Calendar size={13} style={{ color: "var(--tx3)", flexShrink: 0 }} />
                  <span style={{ fontSize: "12.5px", color: "var(--tx2)" }}>
                    {MONTHS[selectedEvent.month - 1]} {selectedEvent.date}, {selectedEvent.year}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn"
                    onClick={() => setSelectedEvent(null)}
                    style={{ flex: 1, justifyContent: "center", fontSize: "12px" }}
                  >
                    Close
                  </button>
                  <Link
                    href={targetInquiryId ? `/inquiries/${targetInquiryId}` : `/inquiries`}
                    className="btn btn-primary"
                    onClick={() => setSelectedEvent(null)}
                    style={{ flex: 1, justifyContent: "center", textAlign: "center", fontSize: "12px" }}
                  >
                    View inquiry <ArrowRight size={12} />
                  </Link>
                </div>

                {targetInquiryId && (matchedQuote || matchedInvoice) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--b1)", paddingTop: "10px", marginTop: "2px" }}>
                    {matchedQuote && (
                      <Link
                        href={`/quotations/${matchedQuote.id}/pdf`}
                        className="btn"
                        onClick={() => setSelectedEvent(null)}
                        style={{ justifyContent: "center", fontSize: "11.5px" }}
                      >
                        View Quotation PDF
                      </Link>
                    )}
                    {matchedInvoice && (
                      <Link
                        href={`/invoices/${matchedInvoice.id}`}
                        className="btn"
                        onClick={() => setSelectedEvent(null)}
                        style={{ justifyContent: "center", fontSize: "11.5px" }}
                      >
                        View Invoice
                      </Link>
                    )}
                    <Link
                      href={`/warehouse/check?inquiryId=${targetInquiryId}`}
                      className="btn"
                      onClick={() => setSelectedEvent(null)}
                      style={{ justifyContent: "center", fontSize: "11.5px" }}
                    >
                      Warehouse Check <Settings size={11} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

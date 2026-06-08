"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Settings, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useCalendar, useInquiries, useClients, useQuotations, useInvoices } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import type { CalendarEvent } from "@/lib/store";
import { ShimmerBar } from "../ui/LoadingSkeleton";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const eventColors: Record<CalendarEvent["type"], { bg: string; text: string; dot: string }> = {
  inquiry: { bg: "var(--sem-bl-bg)", text: "var(--sem-bl-tx)", dot: "var(--sem-bl-bg)" },
  quotation: { bg: "var(--sem-am-bg)", text: "var(--sem-am-tx)", dot: "var(--sem-am-bg)" },
  confirmed: { bg: "var(--sem-gr-bg)", text: "var(--sem-gr-tx)", dot: "var(--sem-gr-bg)" },
  completed: { bg: "var(--sem-gy-bg)", text: "var(--sem-gy-tx)", dot: "var(--sem-gy-bg)" },
};

function parseEventId(id: string) {
  if (!id.startsWith("cal-")) return { groupKey: id, index: 0 };
  
  if (id.includes("-confirmed-")) {
    const parts = id.split("-confirmed-");
    const groupKey = parts[0] + "-confirmed";
    const index = parseInt(parts[1], 10) || 0;
    return { groupKey, index };
  } else {
    const lastDash = id.lastIndexOf("-");
    if (lastDash === -1) return { groupKey: id, index: 0 };
    const groupKey = id.substring(0, lastDash);
    const index = parseInt(id.substring(lastDash + 1), 10) || 0;
    return { groupKey, index };
  }
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

  const targetInquiryId = useMemo(() => {
    if (!selectedEvent) return "";
    
    // 1. Try to parse inquiryId from event.id (e.g., cal-inq-xxx-0 -> inq-xxx)
    const id = selectedEvent.id;
    let cleanId = id;
    if (id.startsWith("cal-")) {
      cleanId = id.substring(4); // Remove "cal-"
      if (cleanId.includes("-confirmed-")) {
        cleanId = cleanId.split("-confirmed-")[0];
      } else {
        const lastDash = cleanId.lastIndexOf("-");
        if (lastDash !== -1) {
          cleanId = cleanId.substring(0, lastDash);
        }
      }
    }
    
    // Check if this is a valid inquiry ID
    const found = inquiries.find((inq) => inq.id === cleanId);
    if (found) return found.id;

    // 2. Fallback: Try to map legacy seed IDs or name matches
    // e.g. cal-1 -> inq-1, cal-2 -> inq-1, etc.
    if (id.startsWith("cal-")) {
      const numStr = id.replace("cal-", "");
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        if (num >= 1 && num <= 3) return "inq-1";
        if (num === 4 || num === 5) return "inq-2";
        if (num === 6 || num === 7) return "inq-3";
        if (num === 8) return "inq-5";
        if (num === 9) return "inq-6";
        if (num === 10) return "inq-7";
      }
    }

    // 3. Fallback: Search by label similarity
    const labelLower = selectedEvent.label.toLowerCase();
    const match = inquiries.find((inq) => {
      const client = clients.find((c) => c.id === inq.clientId);
      if (client) {
        const clientName = client.name.toLowerCase();
        return labelLower.includes(clientName) || clientName.includes(labelLower) ||
               inq.eventType.toLowerCase().includes(labelLower) || labelLower.includes(inq.eventType.toLowerCase());
      }
      return inq.eventType.toLowerCase().includes(labelLower) || labelLower.includes(inq.eventType.toLowerCase());
    });
    
    if (match) return match.id;

    return "";
  }, [selectedEvent, inquiries, clients]);

  const matchedQuote = useMemo(() => {
    if (!targetInquiryId) return null;
    return quotations.find((q) => q.inquiryId === targetInquiryId);
  }, [targetInquiryId, quotations]);

  const matchedInvoice = useMemo(() => {
    if (!targetInquiryId || !matchedQuote) return null;
    return invoices.find((inv) => inv.quotationId === matchedQuote.id);
  }, [targetInquiryId, invoices, matchedQuote]);

  const navigate = (delta: number) => {
    const nextDate = new Date(viewDate);
    if (viewMode === "month") {
      nextDate.setMonth(nextDate.getMonth() + delta);
    } else if (viewMode === "week") {
      nextDate.setDate(nextDate.getDate() + delta * 7);
    } else {
      nextDate.setDate(nextDate.getDate() + delta);
    }
    setViewDate(nextDate);
  };

  const goToday = () => setViewDate(new Date());

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();

  const headerText = useMemo(() => {
    if (viewMode === "month") {
      return `Calendar — ${MONTHS[viewMonth]} ${viewYear}`;
    } else if (viewMode === "day") {
      return `Calendar — ${MONTHS[viewMonth]} ${viewDate.getDate()}, ${viewYear}`;
    } else {
      const d = new Date(viewDate);
      const day = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      const m1 = MONTHS[start.getMonth()].substring(0, 3);
      const m2 = MONTHS[end.getMonth()].substring(0, 3);
      if (m1 === m2) {
        return `Calendar — ${m1} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      } else {
        return `Calendar — ${m1} ${start.getDate()} - ${m2} ${end.getDate()}, ${start.getFullYear()}`;
      }
    }
  }, [viewDate, viewMode, viewMonth, viewYear]);

  const visibleEvents = useMemo(() => {
    let start, end;
    if (viewMode === "month") {
      start = new Date(viewYear, viewMonth, 1);
      end = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);
    } else if (viewMode === "week") {
      const d = new Date(viewDate);
      d.setDate(d.getDate() - d.getDay());
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59);
    } else {
      start = new Date(viewYear, viewMonth, viewDate.getDate());
      end = new Date(viewYear, viewMonth, viewDate.getDate(), 23, 59, 59);
    }
    
    return calendarEvents.filter(e => {
       const eDate = new Date(e.year, e.month - 1, e.date);
       return eDate >= start && eDate <= end;
    });
  }, [calendarEvents, viewDate, viewMode, viewMonth, viewYear]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    visibleEvents.forEach((e) => {
      const key = `${e.year}-${e.month}-${e.date}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [visibleEvents]);

  const cells = useMemo(() => {
    if (viewMode === "month") {
      const startDay = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const arr = [];
      for (let i = 0; i < startDay; i++) arr.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        arr.push({ year: viewYear, month: viewMonth + 1, date: d });
      }
      while (arr.length % 7 !== 0) arr.push(null);
      return arr;
    } else if (viewMode === "week") {
      const d = new Date(viewDate);
      d.setDate(d.getDate() - d.getDay());
      const arr = [];
      for (let i = 0; i < 7; i++) {
        const curr = new Date(d);
        curr.setDate(d.getDate() + i);
        arr.push({ year: curr.getFullYear(), month: curr.getMonth() + 1, date: curr.getDate() });
      }
      return arr;
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
        const dayEvts = eventsByDate[key] || [];
        dayEvts.forEach((evt) => {
          weekEvents.push({ evt, dayIndex });
        });
      });
      
      const groups: Record<string, {
        groupKey: string;
        label: string;
        type: string;
        dayIndices: number[];
        events: CalendarEvent[];
      }> = {};
      
      weekEvents.forEach(({ evt, dayIndex }) => {
        const { groupKey } = parseEventId(evt.id);
        if (!groups[groupKey]) {
          groups[groupKey] = {
            groupKey,
            label: evt.label.replace(/^↔\s*/, ""),
            type: evt.type,
            dayIndices: [],
            events: [],
          };
        }
        groups[groupKey].dayIndices.push(dayIndex);
        groups[groupKey].events.push(evt);
      });
      
      const segments: {
        groupKey: string;
        label: string;
        type: string;
        startCol: number;
        endCol: number;
        event: CalendarEvent;
      }[] = [];
      
      Object.values(groups).forEach((group) => {
        const sortedIndices = [...group.dayIndices].sort((a, b) => a - b);
        let currentSegment: number[] = [];
        
        sortedIndices.forEach((idx) => {
          if (currentSegment.length === 0) {
            currentSegment.push(idx);
          } else if (idx === currentSegment[currentSegment.length - 1] + 1) {
            currentSegment.push(idx);
          } else {
            segments.push({
              groupKey: group.groupKey,
              label: group.label,
              type: group.type,
              startCol: currentSegment[0] + 1,
              endCol: currentSegment[currentSegment.length - 1] + 1,
              event: group.events[0],
            });
            currentSegment = [idx];
          }
        });
        
        if (currentSegment.length > 0) {
          segments.push({
            groupKey: group.groupKey,
            label: group.label,
            type: group.type,
            startCol: currentSegment[0] + 1,
            endCol: currentSegment[currentSegment.length - 1] + 1,
            event: group.events[0],
          });
        }
      });
      
      segments.sort((a, b) => {
        const spanA = a.endCol - a.startCol;
        const spanB = b.endCol - b.startCol;
        if (spanB !== spanA) return spanB - spanA;
        return a.label.localeCompare(b.label);
      });
      
      const tracks: typeof segments[] = [];
      segments.forEach((seg) => {
        let assignedTrack = -1;
        for (let t = 0; t < tracks.length; t++) {
          const isOverlap = tracks[t].some((existing) => {
            return !(seg.endCol < existing.startCol || seg.startCol > existing.endCol);
          });
          if (!isOverlap) {
            assignedTrack = t;
            break;
          }
        }
        if (assignedTrack === -1) {
          tracks.push([seg]);
        } else {
          tracks[assignedTrack].push(seg);
        }
      });
      
      const segmentsWithTrack = segments.map((seg) => {
        const trackIndex = tracks.findIndex((t) => t.includes(seg));
        return { ...seg, trackIndex };
      });
      
      arr.push({
        weekIndex: w,
        cells: weekCells,
        segments: segmentsWithTrack,
        totalTracks: tracks.length,
      });
    }
    
    return arr;
  }, [cells, eventsByDate, viewMode]);

  const isToday = (y: number, m: number, d: number) =>
    d === today.getDate() &&
    (m - 1) === today.getMonth() &&
    y === today.getFullYear();

  if (loading) {
    return (
      <>
        <SectionHeader
          title={<>Calendar <strong>view</strong></>}
          description="View and manage all scheduled events — inquiries, quotations, and confirmed bookings."
        />
        <ScreenFrame
          breadcrumb="Calendar — Loading..."
          actions={
            <>
              <div className="flex border border-b1 rounded-md overflow-hidden mr-2">
                <ShimmerBar width="50px" height="28px" style={{ animationDelay: "50ms" }} />
                <ShimmerBar width="50px" height="28px" style={{ animationDelay: "80ms" }} />
                <ShimmerBar width="50px" height="28px" style={{ animationDelay: "110ms" }} />
              </div>
              <ShimmerBar width="70px" height="36px" radius="8px" style={{ animationDelay: "140ms" }} />
              <ShimmerBar width="70px" height="36px" radius="8px" style={{ animationDelay: "170ms" }} />
              <ShimmerBar width="70px" height="36px" radius="8px" style={{ animationDelay: "200ms" }} />
              {canCreateInquiry && (
                <ShimmerBar width="110px" height="36px" radius="8px" style={{ animationDelay: "230ms", marginLeft: "8px" }} />
              )}
            </>
          }
        >
          {/* Legend */}
          <div className="flex gap-3 mb-[10px] text-[11px] items-center">
            {[{ label: "Inquiry" }, { label: "Quotation sent" }, { label: "Confirmed" }].map(({ label }, i) => (
              <div key={label} className="flex items-center gap-[5px]">
                <ShimmerBar width="10px" height="10px" radius="3px" style={{ animationDelay: `${i * 30 + 260}ms` }} />
                <ShimmerBar width="80px" height="10px" style={{ opacity: 0.6, animationDelay: `${i * 30 + 280}ms` }} />
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div
            className="grid gap-[1px] rounded-lg overflow-hidden grid-cols-7"
            style={{ background: "var(--b1)", border: "1px solid var(--b1)", marginTop: "16px" }}
          >
            {dayLabels.map((label, idx) => (
              <div
                key={`header-${idx}`}
                className="bg-s2 text-tx3 text-center font-semibold text-[10px] uppercase tracking-wider py-2"
                style={{ borderBottom: "1px solid var(--b1)" }}
              >
                {label}
              </div>
            ))}

            {Array.from({ length: 35 }).map((_, i) => {
              const col = (i % 7) + 1;
              const hasEvent = i === 10 || i === 12 || i === 18 || i === 24 || i === 25 || i === 26;
              const eventWidth = i === 24 || i === 25 ? "100%" : "85%";
              return (
                <div
                  key={i}
                  className="bg-s1"
                  style={{
                    minHeight: "110px",
                    padding: "8px",
                    borderBottom: "1px solid var(--b1)",
                    borderRight: col < 7 ? "1px solid var(--b1)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div className="flex justify-end">
                    <ShimmerBar width="16px" height="16px" radius="50%" style={{ opacity: 0.5, animationDelay: `${i * 30 + 300}ms` }} />
                  </div>
                  {hasEvent && (
                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <ShimmerBar width={eventWidth} height="18px" radius="4px" style={{ animationDelay: `${i * 30 + 350}ms`, opacity: 0.8 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScreenFrame>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Calendar <strong>view</strong></>}
        description="View and manage all scheduled events — inquiries, quotations, and confirmed bookings."
      />
      <ScreenFrame
        breadcrumb={<>{headerText}</>}
        actions={
          <>
            <div className="flex border border-b1 rounded-md overflow-hidden mr-2">
              <button 
                className={`text-[11px] font-medium transition-colors ${viewMode === "day" ? "bg-bl text-white" : "bg-s1 text-tx2 hover:bg-s2"}`}
                style={{ padding: "6px 12px" }}
                onClick={() => setViewMode("day")}
              >
                Day
              </button>
              <button 
                className={`text-[11px] font-medium border-l border-b1 transition-colors ${viewMode === "week" ? "bg-bl text-white border-l-bl" : "bg-s1 text-tx2 hover:bg-s2"}`}
                style={{ padding: "6px 12px" }}
                onClick={() => setViewMode("week")}
              >
                Week
              </button>
              <button 
                className={`text-[11px] font-medium border-l border-b1 transition-colors ${viewMode === "month" ? "bg-bl text-white border-l-bl" : "bg-s1 text-tx2 hover:bg-s2"}`}
                style={{ padding: "6px 12px" }}
                onClick={() => setViewMode("month")}
              >
                Month
              </button>
            </div>
            <button className="btn" onClick={() => navigate(-1)}>
              <ChevronLeft size={13} /> Prev
            </button>
            <button className="btn" onClick={goToday}>
              Today
            </button>
            <button className="btn" onClick={() => navigate(1)}>
              Next <ChevronRight size={13} />
            </button>
            {canCreateInquiry && (
              <Link href="/inquiries/new" className="btn btn-primary ml-2">
                + New inquiry
              </Link>
            )}
          </>
        }
      >
        {/* Legend */}
        <div className="flex gap-3 mb-[10px] text-[11px] items-center">
          {(
            [
              { type: "inquiry" as const, label: "Inquiry" },
              { type: "quotation" as const, label: "Quotation sent" },
              { type: "confirmed" as const, label: "Confirmed" },
            ] as const
          ).map(({ type, label }) => (
            <div key={type} className="flex items-center gap-[5px]">
              <div
                className="w-[10px] h-[10px] rounded-sm"
                style={{ background: eventColors[type].dot }}
              ></div>
              <span className="text-tx3">{label}</span>
            </div>
          ))}`
        </div>
        {/* Calendar Grid */}
        <div
          className={`grid gap-[1px] rounded-lg overflow-hidden ${viewMode === "day" ? "grid-cols-1" : "grid-cols-7"}`}
          style={{ background: "var(--b1)", border: "1px solid var(--b1)", marginTop: "16px" }}
        >
          {viewMode !== "day" && dayLabels.map((label, idx) => (
            <div
              key={`header-${idx}`}
              className="bg-s2 text-tx3 text-center font-semibold text-[10px] uppercase tracking-wider py-2"
              style={{
                gridRow: 1,
                gridColumn: idx + 1,
                borderBottom: "1px solid var(--b1)",
              }}
            >
              {label}
            </div>
          ))}

          {viewMode === "day" ? (
            cells.map((cell, i) => (
              <div key={i} className="bg-s1 relative" style={{ minHeight: "300px", padding: "8px" }}>
                {cell && (
                  <>
                    <div className="flex justify-start mb-4">
                      <span className="text-tx3 text-[14px] font-medium mr-2 self-center">
                        {dayLabels[new Date(cell.year, cell.month - 1, cell.date).getDay()]}, 
                      </span>
                      <span
                        className={`inline-flex items-center justify-center rounded-full font-medium ${isToday(cell.year, cell.month, cell.date) ? "shadow-sm" : "text-tx3"}`}
                        style={{
                          width: "32px",
                          height: "32px",
                          fontSize: "14px",
                          background: isToday(cell.year, cell.month, cell.date) ? "var(--cal-today-dot)" : "transparent",
                          color: isToday(cell.year, cell.month, cell.date) ? "var(--s1)" : "inherit"
                        }}
                      >
                        {cell.date}
                      </span>
                    </div>
                    <div className="flex flex-col" style={{ gap: "8px" }}>
                      {eventsByDate[`${cell.year}-${cell.month}-${cell.date}`]?.map((evt) => {
                        const colors = eventColors[evt.type];
                        return (
                          <button
                            key={evt.id}
                            className="w-full text-left truncate hover:opacity-80 transition-opacity cursor-pointer font-medium"
                            style={{ 
                              background: colors.bg, 
                              color: colors.text,
                              padding: "10px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              border: `1px solid ${colors.dot}40`
                            }}
                            onClick={() => setSelectedEvent(evt)}
                          >
                            {evt.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            weeksData.map((week, wIdx) => {
              const weekRow = wIdx + 2;
              const totalTracks = week.totalTracks;
              const weekHeight = Math.max(viewMode === "month" ? 110 : 300, 36 + totalTracks * 24);
              
              return (
                <div key={`week-${wIdx}`} style={{ display: "contents" }}>
                  {/* 1. Cell backgrounds */}
                  {week.cells.map((cell, dIdx) => {
                    const col = dIdx + 1;
                    return (
                      <div 
                        key={`cell-${wIdx}-${dIdx}`}
                        className="bg-s1 relative"
                        style={{
                          gridRow: weekRow,
                          gridColumn: col,
                          minHeight: `${weekHeight}px`,
                          padding: "8px",
                          borderBottom: "1px solid var(--b1)",
                          borderRight: dIdx < 6 ? "1px solid var(--b1)" : "none",
                        }}
                      >
                        {cell && (
                          <div className="flex justify-end mb-[6px]">
                            <span
                              className={`inline-flex items-center justify-center rounded-full font-medium ${isToday(cell.year, cell.month, cell.date) ? "shadow-sm" : "text-tx3"}`}
                              style={{
                                width: "24px",
                                height: "24px",
                                fontSize: "12px",
                                background: isToday(cell.year, cell.month, cell.date) ? "var(--cal-today-dot)" : "transparent",
                                color: isToday(cell.year, cell.month, cell.date) ? "var(--s1)" : "inherit"
                              }}
                            >
                              {cell.date}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 2. Spanning events container */}
                  <div
                    key={`events-overlay-${wIdx}`}
                    style={{
                      gridRow: weekRow,
                      gridColumn: "1 / span 7",
                      position: "relative",
                      pointerEvents: "none",
                      height: "100%",
                      width: "100%",
                    }}
                  >
                    {week.segments.map((seg, sIdx) => {
                      const colors = eventColors[seg.type as CalendarEvent["type"]] || eventColors.inquiry;
                      const leftPercent = (seg.startCol - 1) * 14.2857;
                      const widthPercent = (seg.endCol - seg.startCol + 1) * 14.2857;
                      
                      return (
                        <button
                          key={`${seg.groupKey}-${sIdx}`}
                          className="absolute text-left truncate hover:opacity-80 transition-opacity cursor-pointer font-medium"
                          style={{
                            left: `calc(${leftPercent}% + 4px)`,
                            width: `calc(${widthPercent}% - 8px)`,
                            top: `${36 + seg.trackIndex * 24}px`,
                            height: "20px",
                            background: colors.bg,
                            color: colors.text,
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            border: `1px solid ${colors.dot}40`,
                            pointerEvents: "auto",
                            zIndex: 5,
                          }}
                          onClick={() => setSelectedEvent(seg.event)}
                        >
                          {seg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScreenFrame>

      {/* Event detail popup */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "var(--modal-overlay)" }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-s1 border border-b1 rounded-xl shadow-2xl"
            style={{ padding: "24px", width: "320px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center" style={{ gap: "12px", marginBottom: "16px" }}>
              <div
                className="rounded-full shrink-0"
                style={{
                  width: "12px",
                  height: "12px",
                  background: eventColors[selectedEvent.type].dot,
                }}
              ></div>
              <div className="text-[15px] font-medium">{selectedEvent.label}</div>
            </div>
            <div className="flex flex-col text-[12px] text-tx2" style={{ gap: "8px" }}>
              <div className="row-item" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
                <span className="text-tx3">Date</span>
                <span>
                  {MONTHS[selectedEvent.month - 1]} {selectedEvent.date},{" "}
                  {selectedEvent.year}
                </span>
              </div>
              <div className="row-item" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
                <span className="text-tx3">Type</span>
                <Badge variant={selectedEvent.type === "inquiry" ? "bl" : selectedEvent.type === "quotation" ? "am" : selectedEvent.type === "confirmed" ? "gr" : "gy"}>
                  {selectedEvent.type.charAt(0).toUpperCase() +
                    selectedEvent.type.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col" style={{ gap: "8px", marginTop: "24px" }}>
              <div className="flex" style={{ gap: "8px" }}>
                <button
                  className="btn flex-1 justify-center"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </button>
                <Link
                  href={targetInquiryId ? `/inquiries/${targetInquiryId}` : `/inquiries`}
                  className="btn btn-primary flex-1 justify-center text-center"
                  onClick={() => setSelectedEvent(null)}
                >
                  View inquiry <ArrowRight size={12} />
                </Link>
              </div>
              {targetInquiryId && (
                <div className="flex flex-col" style={{ gap: "8px", borderTop: "1px solid var(--b1)", paddingTop: "12px", marginTop: "4px" }}>
                  {matchedQuote && (
                    <Link
                      href={`/quotations/${matchedQuote.id}/pdf`}
                      className="btn justify-center text-center text-[11px] py-1.5"
                      onClick={() => setSelectedEvent(null)}
                    >
                      View Quotation PDF ▤
                    </Link>
                  )}
                  {matchedInvoice && (
                    <Link
                      href={`/invoices/${matchedInvoice.id}`}
                      className="btn justify-center text-center text-[11px] py-1.5"
                      onClick={() => setSelectedEvent(null)}
                    >
                      View Invoice ⊡
                    </Link>
                  )}
                  <Link
                    href={`/warehouse/check?inquiryId=${targetInquiryId}`}
                    className="btn justify-center text-center text-[11px] py-1.5"
                    onClick={() => setSelectedEvent(null)}
                  >
                    Warehouse Check <Settings size={11} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

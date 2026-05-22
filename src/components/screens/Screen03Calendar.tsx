"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useCalendar } from "@/lib/store";
import type { CalendarEvent } from "@/lib/store";

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

export default function Screen03Calendar() {
  const { calendarEvents } = useCalendar();
  const today = new Date();
  
  const [viewDate, setViewDate] = useState(today);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

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

  const isToday = (y: number, m: number, d: number) =>
    d === today.getDate() &&
    (m - 1) === today.getMonth() &&
    y === today.getFullYear();

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
              ‹ Prev
            </button>
            <button className="btn" onClick={goToday}>
              Today
            </button>
            <button className="btn" onClick={() => navigate(1)}>
              Next ›
            </button>
            <Link href="/inquiries/new" className="btn btn-primary ml-2">
              + New inquiry
            </Link>
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
          ))}
        </div>

        {/* Calendar Grid */}
        <div
          className={`grid gap-[1px] rounded-lg overflow-hidden ${viewMode === "day" ? "grid-cols-1" : "grid-cols-7"}`}
          style={{ background: "var(--b1)", border: "1px solid var(--b1)" }}
        >
          {viewMode !== "day" && dayLabels.map((d, i) => (
            <div
              key={`hdr-${i}`}
              className="bg-s2 text-center text-tx2 font-medium tracking-wide uppercase"
              style={{ padding: "10px 4px", fontSize: "11px" }}
            >
              {d}
            </div>
          ))}
          {cells.map((cell, i) => (
            <div key={i} className="bg-s1 relative" style={{ minHeight: viewMode === "month" ? "110px" : "300px", padding: "8px" }}>
              {cell && (
                <>
                  <div className={`flex ${viewMode === 'day' ? 'justify-start mb-4' : 'justify-end mb-[6px]'}`}>
                    {viewMode === 'day' && (
                       <span className="text-tx3 text-[14px] font-medium mr-2 self-center">
                         {dayLabels[new Date(cell.year, cell.month - 1, cell.date).getDay()]}, 
                       </span>
                    )}
                    <span
                      className={`inline-flex items-center justify-center rounded-full font-medium ${isToday(cell.year, cell.month, cell.date) ? "shadow-sm" : "text-tx3"}`}
                      style={{
                        width: viewMode === "day" ? "32px" : "24px",
                        height: viewMode === "day" ? "32px" : "24px",
                        fontSize: viewMode === "day" ? "14px" : "12px",
                        background: isToday(cell.year, cell.month, cell.date) ? "var(--cal-today-dot)" : "transparent",
                        color: isToday(cell.year, cell.month, cell.date) ? "var(--s1)" : "inherit"
                      }}
                    >
                      {cell.date}
                    </span>
                  </div>
                  <div className="flex flex-col" style={{ gap: viewMode === "day" ? "8px" : "4px" }}>
                    {eventsByDate[`${cell.year}-${cell.month}-${cell.date}`]?.map((evt) => {
                      const colors = eventColors[evt.type];
                      return (
                        <button
                          key={evt.id}
                          className="w-full text-left truncate hover:opacity-80 transition-opacity cursor-pointer font-medium"
                          style={{ 
                            background: colors.bg, 
                            color: colors.text,
                            padding: viewMode === "day" ? "10px 12px" : "4px 8px",
                            borderRadius: "6px",
                            fontSize: viewMode === "day" ? "12px" : "10.5px",
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
          ))}
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
            <div className="flex" style={{ gap: "8px", marginTop: "24px" }}>
              <button
                className="btn flex-1 justify-center"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
              <Link
                href={`/inquiries?search=${encodeURIComponent(selectedEvent.label)}`}
                className="btn btn-primary flex-1 justify-center text-center"
                onClick={() => setSelectedEvent(null)}
              >
                View inquiry →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

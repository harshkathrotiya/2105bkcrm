"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
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
  const { calendarEvents, getCalendarEvents } = useCalendar();
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const navigate = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  };

  const goToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  const events = useMemo(() => getCalendarEvents(viewMonth + 1, viewYear), [getCalendarEvents, viewMonth, viewYear]);
  const eventsByDate = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const startDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  return (
    <>
      <SectionHeader
        title={<>Calendar <strong>view</strong></>}
        description="View and manage all scheduled events — inquiries, quotations, and confirmed bookings."
      />
      <ScreenFrame
        breadcrumb={<>Calendar — {MONTHS[viewMonth]} {viewYear}</>}
        actions={
          <>
            <button className="btn" onClick={() => navigate(-1)}>
              ‹ Prev
            </button>
            <button className="btn" onClick={goToday}>
              Today
            </button>
            <button className="btn" onClick={() => navigate(1)}>
              Next ›
            </button>
            <Link href="/inquiries/new" className="btn btn-primary">
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
          className="grid grid-cols-7 gap-[1px] rounded-lg overflow-hidden"
          style={{ background: "var(--b1)", border: "1px solid var(--b1)" }}
        >
          {dayLabels.map((d, i) => (
            <div
              key={`hdr-${i}`}
              className="bg-s2 p-[6px] text-center text-[10px] text-tx3"
            >
              {d}
            </div>
          ))}
          {cells.map((day, i) => (
            <div key={i} className="bg-s1 min-h-[72px] p-[5px]">
              {day && (
                <>
                  <div
                    className={`text-[11px] mb-[3px] ${
                      isToday(day)
                        ? "font-medium"
                        : "text-tx3"
                    }`}
                  >
                    <span
                      className={
                        isToday(day)
                          ? "inline-flex items-center justify-center w-[20px] h-[20px] rounded-full"
                          : ""
                      }
                      style={
                        isToday(day)
                          ? {
                              background: "var(--cal-today-dot)",
                            }
                          : undefined
                      }
                    >
                      {day}
                    </span>
                  </div>
                  {eventsByDate[day]?.map((evt) => {
                    const colors = eventColors[evt.type];
                    return (
                      <button
                        key={evt.id}
                        className="w-full text-left text-[9px] rounded-sm px-[4px] py-[2px] mb-[2px] hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ background: colors.bg, color: colors.text }}
                        onClick={() => setSelectedEvent(evt)}
                      >
                        {evt.label}
                      </button>
                    );
                  })}
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
            className="bg-s1 border border-b1 rounded-xl p-6 w-[320px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: eventColors[selectedEvent.type].dot,
                }}
              ></div>
              <div className="text-[15px] font-medium">{selectedEvent.label}</div>
            </div>
            <div className="space-y-2 text-[12px] text-tx2">
              <div className="row-item !py-2">
                <span className="text-tx3">Date</span>
                <span>
                  {MONTHS[selectedEvent.month - 1]} {selectedEvent.date},{" "}
                  {selectedEvent.year}
                </span>
              </div>
              <div className="row-item !py-2">
                <span className="text-tx3">Type</span>
                <span style={{ color: eventColors[selectedEvent.type].text }}>
                  {selectedEvent.type.charAt(0).toUpperCase() +
                    selectedEvent.type.slice(1)}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
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

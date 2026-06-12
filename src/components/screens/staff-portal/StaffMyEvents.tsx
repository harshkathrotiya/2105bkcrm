"use client";

import { useEffect, useState, useMemo } from "react";
import { Calendar, Clock, MapPin, IndianRupee, ChevronLeft, ChevronRight, CheckCircle2, X } from "lucide-react";

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
    end_time: string;
    status: string;
    department: string;
  };
}

const STATUS_COLOR: Record<string, { bg: string; dot: string; text: string; bar: string; border: string }> = {
  New:       { bg: "#EFF6FF", dot: "#3B82F6", text: "#1D4ED8", bar: "#3B82F6", border: "#BFDBFE" },
  Quoted:    { bg: "#FFFBEB", dot: "#F59E0B", text: "#B45309", bar: "#F59E0B", border: "#FDE68A" },
  Confirmed: { bg: "#DCFCE7", dot: "#22C55E", text: "#15803D", bar: "#22C55E", border: "#BBF7D0" },
  Cancelled: { bg: "#FEE2E2", dot: "#EF4444", text: "#DC2626", bar: "#EF4444", border: "#FECACA" },
};

const FALLBACK = { bg: "#F1F5F9", dot: "#94A3B8", text: "#475569", bar: "#94A3B8", border: "#E2E8F0" };

type ViewMode = "month" | "week" | "day";

const MONTH_NAMES  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_FULL     = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function parseLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function weekSunday(d: Date) {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r;
}

export default function StaffMyEvents() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayYMD = toYMD(today);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Assignment | null>(null);

  useEffect(() => {
    fetch("/api/staff/my-assignments", { credentials: "same-origin" })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAssignments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // dayMap: ymd → assignments active that day
  const dayMap = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    for (const a of assignments) {
      const cur = parseLocal(a.inquiry.start_date);
      const end = parseLocal(a.inquiry.end_date);
      while (cur <= end) {
        const k = toYMD(cur);
        if (!map[k]) map[k] = [];
        map[k].push(a);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [assignments]);

  // Navigation
  const navigate = (dir: -1 | 1) => {
    setCursor(prev => {
      if (view === "month") { const d = new Date(prev); d.setMonth(d.getMonth() + dir); return d; }
      if (view === "week")  return addDays(prev, dir * 7);
      return addDays(prev, dir);
    });
  };
  const goToday = () => {
    if (view === "month") setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    else if (view === "week") setCursor(weekSunday(today));
    else setCursor(new Date(today));
  };
  const switchView = (v: ViewMode) => {
    setView(v);
    if (v === "month") setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    else if (v === "week") setCursor(weekSunday(today));
    else setCursor(new Date(today));
  };

  // Header label
  const headerLabel = useMemo(() => {
    if (view === "month") return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "day")   return `${DAY_FULL[cursor.getDay()]}, ${MONTH_SHORT[cursor.getMonth()]} ${cursor.getDate()}, ${cursor.getFullYear()}`;
    const end = addDays(cursor, 6);
    return cursor.getMonth() === end.getMonth()
      ? `${MONTH_SHORT[cursor.getMonth()]} ${cursor.getDate()} – ${end.getDate()}, ${cursor.getFullYear()}`
      : `${MONTH_SHORT[cursor.getMonth()]} ${cursor.getDate()} – ${MONTH_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }, [view, cursor]);

  // Month cells
  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
    const days  = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  // Week days
  const weekDays = useMemo(() => {
    const sun = view === "week" ? cursor : weekSunday(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(sun, i));
  }, [view, cursor]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "28px 32px" }}>
      <style>{`
        .stf-cal-cell { transition: background 0.15s; }
        .stf-cal-cell:hover { background: #F0F9FF !important; }
        .stf-event-pill { transition: transform 0.15s, box-shadow 0.15s; cursor: pointer; }
        .stf-event-pill:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        {/* Left: title + period */}
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
          My Schedule —{" "}
          <span style={{ color: "#3B82F6" }}>{headerLabel}</span>
        </div>

        {/* Right: view toggle + nav + today */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Day / Week / Month toggle */}
          <div style={{ display: "flex", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
            {(["Day","Week","Month"] as const).map((label, i) => {
              const v = label.toLowerCase() as ViewMode;
              const active = view === v;
              return (
                <button key={v} onClick={() => switchView(v)} style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: active ? 600 : 400,
                  background: active ? "#0F172A" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#64748B",
                  border: "none", borderRight: i < 2 ? "1px solid #E2E8F0" : "none",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Prev / Today / Next */}
          <button onClick={() => navigate(-1)} style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #E2E8F0", background: "#FAFAFA", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={14} color="#64748B" />
          </button>
          <button onClick={goToday} style={{ height: 30, padding: "0 12px", borderRadius: 7, border: "1px solid #E2E8F0", background: "#FAFAFA", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#475569" }}>
            Today
          </button>
          <button onClick={() => navigate(1)} style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #E2E8F0", background: "#FAFAFA", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={14} color="#64748B" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#64748B", fontWeight: 500 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />{s}
          </div>
        ))}
      </div>

      {/* ── Calendar grid card ── */}
      <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", background: "#E2E8F0" }}>

        {/* Day headers (month + week) */}
        {view !== "day" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: "#E2E8F0" }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ background: "#F8FAFC", padding: "10px 8px", textAlign: "center", fontSize: 10.5, fontWeight: 600, color: i === 0 || i === 6 ? "#94A3B8" : "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {d}
              </div>
            ))}
          </div>
        )}

        {/* ── MONTH VIEW ── */}
        {view === "month" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: "#E2E8F0" }}>
            {loading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} style={{ background: "#FAFAFA", minHeight: 120, padding: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#F1F5F9", marginLeft: "auto" }} />
                  </div>
                ))
              : monthCells.map((day, i) => {
                  if (day === null) return <div key={i} style={{ background: "#FAFAFA", minHeight: 120 }} />;
                  const ymd = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const evs = dayMap[ymd] ?? [];
                  const isToday = ymd === todayYMD;
                  return (
                    <div key={i} className="stf-cal-cell" style={{ background: isToday ? "#F0F7FF" : "#FFFFFF", minHeight: 120, padding: 8, position: "relative" }}>
                      {/* Date number top-right */}
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isToday ? 700 : 400, background: isToday ? "#0F172A" : "transparent", color: isToday ? "#FFFFFF" : i % 7 === 0 || i % 7 === 6 ? "#94A3B8" : "#475569" }}>
                          {day}
                        </span>
                      </div>
                      {/* Event pills */}
                      {evs.slice(0, 3).map((a, di) => {
                        const c = STATUS_COLOR[a.inquiry.status] ?? FALLBACK;
                        return (
                          <button key={di} onClick={() => setSelected(a)} className="stf-event-pill" style={{ display: "block", width: "100%", background: c.bg, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.bar}`, borderRadius: 6, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: c.text, textAlign: "left", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginBottom: 2 }}>
                            {a.inquiry.event_name || a.inquiry.event_type}
                          </button>
                        );
                      })}
                      {evs.length > 3 && <div style={{ fontSize: 10, color: "#64748B", paddingLeft: 2 }}>+{evs.length - 3} more</div>}
                    </div>
                  );
                })}
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {view === "week" && (
          <>
            {/* Week date headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: "#E2E8F0" }}>
              {weekDays.map((d, i) => {
                const isToday = toYMD(d) === todayYMD;
                return (
                  <div key={i} style={{ background: "#F8FAFC", padding: "10px 4px", textAlign: "center", borderTop: isToday ? "2px solid #3B82F6" : "2px solid transparent" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{DAY_NAMES[d.getDay()]}</div>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", margin: "0 auto", background: isToday ? "#0F172A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? "#FFFFFF" : "#0F172A" }}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: "#E2E8F0" }}>
              {weekDays.map((d, i) => {
                const ymd = toYMD(d);
                const evs = dayMap[ymd] ?? [];
                const isToday = ymd === todayYMD;
                return (
                  <div key={i} className="stf-cal-cell" style={{ background: isToday ? "#F0F7FF" : "#FFFFFF", minHeight: 200, padding: "8px 6px" }}>
                    {loading
                      ? <div style={{ height: 36, background: "#F1F5F9", borderRadius: 6 }} />
                      : evs.map((a, di) => {
                          const c = STATUS_COLOR[a.inquiry.status] ?? FALLBACK;
                          return (
                            <button key={di} onClick={() => setSelected(a)} className="stf-event-pill" style={{ display: "block", width: "100%", background: c.bg, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.bar}`, borderRadius: 6, padding: "4px 7px", fontSize: 11, fontWeight: 600, color: c.text, textAlign: "left", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginBottom: 3 }}>
                              {a.inquiry.event_name || a.inquiry.event_type}
                            </button>
                          );
                        })}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── DAY VIEW ── */}
        {view === "day" && (
          <div style={{ background: "#FFFFFF", minHeight: 400, padding: 24 }}>
            {/* Day header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: toYMD(cursor) === todayYMD ? "#0F172A" : "#F1F5F9", color: toYMD(cursor) === todayYMD ? "#FFFFFF" : "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                {cursor.getDate()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>{DAY_FULL[cursor.getDay()]}</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</div>
              </div>
            </div>
            {/* Events */}
            {loading ? (
              <div style={{ height: 60, background: "#F8FAFC", borderRadius: 10 }} />
            ) : (dayMap[toYMD(cursor)] ?? []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#94A3B8" }}>
                <Calendar size={28} color="#CBD5E1" style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>No events on this day</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(dayMap[toYMD(cursor)] ?? []).map((a, i) => {
                  const c = STATUS_COLOR[a.inquiry.status] ?? FALLBACK;
                  return (
                    <button key={i} onClick={() => setSelected(a)} className="stf-event-pill" style={{ display: "flex", alignItems: "flex-start", gap: 12, background: c.bg, border: `1px solid ${c.border}`, borderLeft: `4px solid ${c.bar}`, borderRadius: 10, padding: "14px 16px", textAlign: "left", width: "100%" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{a.inquiry.event_name || a.inquiry.event_type}</div>
                        {a.positionName && <div style={{ fontSize: 11, color: c.text, fontWeight: 600 }}>{a.positionName}</div>}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#475569" }}><Clock size={11} color="#94A3B8" /> {a.reportingTime}</span>
                          {a.inquiry.venue && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#475569" }}><MapPin size={11} color="#94A3B8" /> {a.inquiry.venue}</span>}
                        </div>
                      </div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.7)", color: c.text, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{a.inquiry.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Event detail modal ── */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", width: "100%", maxWidth: 360, overflow: "hidden" }}>
            {/* Header */}
            {(() => {
              const c = STATUS_COLOR[selected.inquiry.status] ?? FALLBACK;
              return (
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", background: c.bg, borderLeft: `4px solid ${c.bar}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{selected.inquiry.event_name || selected.inquiry.event_type}</div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.7)", color: c.text, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{selected.inquiry.status}
                    </span>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, flexShrink: 0 }}><X size={16} /></button>
                </div>
              );
            })()}
            {/* Body */}
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {selected.positionName && (
                <div style={{ fontSize: 12, color: "#3B82F6", fontWeight: 600, background: "#EFF6FF", borderRadius: 6, padding: "3px 9px", display: "inline-block" }}>{selected.positionName}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
                <Calendar size={13} color="#94A3B8" />
                <span><strong>{selected.inquiry.start_date}</strong>{selected.inquiry.end_date !== selected.inquiry.start_date ? ` – ${selected.inquiry.end_date}` : ""}</span>
                <span style={{ color: "#CBD5E1" }}>·</span>
                <span style={{ color: "#64748B" }}>{selected.daysAssigned} day{selected.daysAssigned > 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
                <Clock size={13} color="#94A3B8" />
                Report at <strong style={{ marginLeft: 2 }}>{selected.reportingTime}</strong>
              </div>
              {selected.inquiry.venue && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
                  <MapPin size={13} color="#94A3B8" />{selected.inquiry.venue}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
                <IndianRupee size={13} color="#94A3B8" />
                ₹{selected.ratePerDay.toLocaleString("en-IN")}/day × {selected.daysAssigned} =
                <strong style={{ marginLeft: 2 }}>₹{selected.totalAmount.toLocaleString("en-IN")}</strong>
              </div>
              {selected.pendingAmount > 0 ? (
                <div style={{ background: "#FEE2E2", color: "#DC2626", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600 }}>
                  ₹{selected.pendingAmount.toLocaleString("en-IN")} pending payment
                </div>
              ) : selected.paidAmount > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#DCFCE7", color: "#15803D", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600 }}>
                  <CheckCircle2 size={13} /> Fully paid
                </div>
              ) : null}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9" }}>
              <button onClick={() => setSelected(null)} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#475569" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

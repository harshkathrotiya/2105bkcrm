"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { CheckCircle, AlertCircle, Trash2, Plus } from "lucide-react";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import ScreenFrame from "@/components/ui/ScreenFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import type { LedExecutionView, LedScreenPosition, LedDayStatus, LedScreenStatus } from "@/lib/types";

const STATUS_STYLE: Record<LedScreenStatus, { bg: string; color: string; label: string }> = {
  OFF:   { bg: "#F1F5F9", color: "#64748B", label: "OFF" },
  SETUP: { bg: "#FFFBEB", color: "#B45309", label: "SETUP" },
  LIVE:  { bg: "#F0FDF4", color: "#15803D", label: "LIVE" },
  ISSUE: { bg: "#FFF5F5", color: "#DC2626", label: "ISSUE" },
};

const CYCLE: Record<string, LedScreenStatus> = {
  OFF: "SETUP",
  SETUP: "LIVE",
  LIVE: "ISSUE",
  ISSUE: "OFF",
};

const fmt = (n: number) => n.toLocaleString("en-IN");

export default function LedExecutionScreen({ inquiryId }: { inquiryId: string }) {
  const { success, error } = useToast();
  const [data, setData] = useState<LedExecutionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [issueText, setIssueText] = useState("");
  const [logText, setLogText] = useState("");
  const [addingIssue, setAddingIssue] = useState(false);
  const [addingLog, setAddingLog] = useState(false);
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function load() {
    setLoading(true);
    try {
      const d = await api.fetchLedExecution(inquiryId);
      setData(d);
    } catch {
      error("Failed to load execution data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [inquiryId]);

  const groupedByPlace = useMemo(() => {
    if (!data) return new Map<string, LedScreenPosition[]>();
    const map = new Map<string, LedScreenPosition[]>();
    for (const p of data.positions) {
      if (!map.has(p.place)) map.set(p.place, []);
      map.get(p.place)!.push(p);
    }
    return map;
  }, [data]);

  function getDayStatus(positionNo: number, dayIndex: number): LedDayStatus | undefined {
    return data?.dayStatuses.find((ds) => ds.positionNo === positionNo && ds.dayIndex === dayIndex);
  }

  function getScreenStatus(positionNo: number): LedScreenStatus {
    return getDayStatus(positionNo, activeDay)?.status ?? "OFF";
  }

  function getNotes(positionNo: number): string {
    return getDayStatus(positionNo, activeDay)?.notes ?? "";
  }

  const kpis = useMemo(() => {
    if (!data) return { live: 0, setup: 0, issues: 0, daysDone: 0 };
    const dayStatuses = data.dayStatuses.filter((ds) => ds.dayIndex === activeDay);
    const live = dayStatuses.filter((ds) => ds.status === "LIVE").length;
    const setup = dayStatuses.filter((ds) => ds.status === "SETUP").length;
    const issues = dayStatuses.filter((ds) => ds.status === "ISSUE").length;
    const totalDays = data.eventDays + 1;
    const daysDone = Array.from({ length: totalDays }, (_, i) => i)
      .filter((i) => data.dayStatuses.find((ds) => ds.dayIndex === i && ds.dayDone)).length;
    return { live, setup, issues, daysDone };
  }, [data, activeDay]);

  const isDayDone = useMemo(() => {
    if (!data) return false;
    return data.dayStatuses.some((ds) => ds.dayIndex === activeDay && ds.dayDone);
  }, [data, activeDay]);

  async function handleStatusClick(positionNo: number) {
    const current = getScreenStatus(positionNo);
    const next = CYCLE[current];
    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const existing = prev.dayStatuses.find((ds) => ds.positionNo === positionNo && ds.dayIndex === activeDay);
      if (existing) {
        return { ...prev, dayStatuses: prev.dayStatuses.map((ds) => ds.positionNo === positionNo && ds.dayIndex === activeDay ? { ...ds, status: next } : ds) };
      }
      return {
        ...prev,
        dayStatuses: [...prev.dayStatuses, {
          id: -Math.random(),
          inquiryId,
          positionNo,
          dayIndex: activeDay,
          status: next,
          notes: "",
          dayDone: false,
        }],
      };
    });
    try {
      await api.updateLedScreenStatus(inquiryId, positionNo, activeDay, next);
    } catch {
      error("Failed to update status");
      load();
    }
  }

  function handleNotesChange(positionNo: number, notes: string) {
    setData((prev) => {
      if (!prev) return prev;
      const existing = prev.dayStatuses.find((ds) => ds.positionNo === positionNo && ds.dayIndex === activeDay);
      if (existing) {
        return { ...prev, dayStatuses: prev.dayStatuses.map((ds) => ds.positionNo === positionNo && ds.dayIndex === activeDay ? { ...ds, notes } : ds) };
      }
      return {
        ...prev,
        dayStatuses: [...prev.dayStatuses, {
          id: -Math.random(),
          inquiryId,
          positionNo,
          dayIndex: activeDay,
          status: "OFF",
          notes,
          dayDone: false,
        }],
      };
    });
    const key = `${positionNo}-${activeDay}`;
    if (notesTimers.current[key]) clearTimeout(notesTimers.current[key]);
    notesTimers.current[key] = setTimeout(async () => {
      const status = getScreenStatus(positionNo);
      try {
        await api.updateLedScreenStatus(inquiryId, positionNo, activeDay, status, notes);
      } catch {
        // silent
      }
    }, 800);
  }

  async function handleAllLive() {
    try {
      await api.setAllLedScreensLive(inquiryId, activeDay);
      success("All screens set to LIVE");
      load();
    } catch {
      error("Failed to set all live");
    }
  }

  async function handleToggleDayDone() {
    try {
      await api.toggleLedDayDone(inquiryId, activeDay);
      load();
    } catch {
      error("Failed to toggle day done");
    }
  }

  async function handleAddIssue() {
    if (!issueText.trim()) return;
    setAddingIssue(true);
    try {
      await api.addLedIssue(inquiryId, issueText.trim());
      success("Issue reported");
      setIssueText("");
      load();
    } catch {
      error("Failed to add issue");
    } finally {
      setAddingIssue(false);
    }
  }

  async function handleDeleteIssue(id: number) {
    try {
      await api.deleteLedIssue(inquiryId, id);
      load();
    } catch {
      error("Failed to delete issue");
    }
  }

  async function handleAddLog() {
    if (!logText.trim()) return;
    setAddingLog(true);
    try {
      await api.addLedLog(inquiryId, logText.trim());
      success("Log entry added");
      setLogText("");
      load();
    } catch {
      error("Failed to add log");
    } finally {
      setAddingLog(false);
    }
  }

  if (loading && !data) {
    return (
      <>
        <SectionHeader title="Event Execution" description="Loading…" />
        <ScreenFrame breadcrumbs={[{ label: "LED Inquiries", href: "/led/inquiries" }, { label: "Execution" }]}>
          <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading execution data…</div>
        </ScreenFrame>
      </>
    );
  }

  const totalDays = data ? data.eventDays + 1 : 1;

  return (
    <>
      <SectionHeader title="Event Execution" description={`Day-by-day screen status tracking`} />
      <ScreenFrame breadcrumbs={[
        { label: "LED Inquiries", href: "/led/inquiries" },
        { label: inquiryId, href: `/led/inquiries/${inquiryId}` },
        { label: "Execution" },
      ]}>
        {/* Day tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
          {Array.from({ length: totalDays }, (_, i) => {
            const done = data?.dayStatuses.some((ds) => ds.dayIndex === i && ds.dayDone);
            return (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: activeDay === i ? "2px solid #3B82F6" : "1px solid #E2E8F0",
                  background: activeDay === i ? "#EFF6FF" : "#FFFFFF",
                  color: activeDay === i ? "#1D4ED8" : "#475569",
                  fontWeight: activeDay === i ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {i === 0 ? "Setup" : `Day ${i}`}
                {done && <CheckCircle size={12} color="#16A34A" />}
              </button>
            );
          })}
        </div>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Screens Live", value: String(kpis.live), color: "#16A34A" },
            { label: "In Setup", value: String(kpis.setup), color: "#D97706" },
            { label: "Issues", value: String(kpis.issues), color: kpis.issues > 0 ? "#DC2626" : "#64748B" },
            { label: "Days Done", value: String(kpis.daysDone), color: "#3B82F6" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
          {/* Left — day content */}
          <div>
            {/* Day action buttons */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button
                onClick={handleAllLive}
                style={{ padding: "9px 16px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                All Live
              </button>
              <button
                onClick={handleToggleDayDone}
                style={{
                  padding: "9px 16px",
                  background: isDayDone ? "#16A34A" : "#F1F5F9",
                  color: isDayDone ? "#fff" : "#475569",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isDayDone && <CheckCircle size={14} />}
                {isDayDone ? "Day Done" : "Mark Day Done"}
              </button>
            </div>

            {/* Place-wise tables */}
            {data && Array.from(groupedByPlace.entries()).map(([place, pList]) => (
              <div key={place} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ background: "#F1F5F9", padding: "10px 16px", borderBottom: "1px solid #E2E8F0", fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {place}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC" }}>
                        {["No.", "Location", "Type", "Size", "Status", "Notes"].map((h, i) => (
                          <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pList.map((pos) => {
                        const status = getScreenStatus(pos.positionNo);
                        const notes = getNotes(pos.positionNo);
                        const ss = STATUS_STYLE[status];
                        return (
                          <tr key={pos.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "10px 14px", fontSize: 12, color: "#94A3B8" }}>{pos.positionNo}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#0F172A", fontWeight: 500 }}>{pos.location}</td>
                            <td style={{ padding: "10px 14px", fontSize: 12, color: "#475569" }}>{pos.ledType}</td>
                            <td style={{ padding: "10px 14px", fontSize: 12, color: "#334155" }}>{pos.targetHeightFt}×{pos.targetWidthFt}ft</td>
                            <td style={{ padding: "10px 14px" }}>
                              <button
                                onClick={() => handleStatusClick(pos.positionNo)}
                                style={{
                                  padding: "5px 12px",
                                  background: ss.bg,
                                  color: ss.color,
                                  border: `1px solid ${ss.color}33`,
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  letterSpacing: "0.03em",
                                }}
                              >
                                {ss.label}
                              </button>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <input
                                style={{ fontSize: 12, padding: "4px 8px", border: "1px solid var(--b1)", borderRadius: 5, background: "var(--s1)", color: "var(--tx)", width: 160 }}
                                placeholder="Notes…"
                                value={notes}
                                onChange={(e) => handleNotesChange(pos.positionNo, e.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Right column — issues + logs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Issues log */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} color="#DC2626" />
                Issues Log
              </div>
              {data?.issues.length === 0 && (
                <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 10 }}>No issues reported.</div>
              )}
              {data?.issues.slice().reverse().map((issue) => (
                <div key={issue.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, borderBottom: "1px solid #F8FAFC", paddingBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#0F172A" }}>{issue.text}</div>
                    <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{issue.loggedAt}</div>
                  </div>
                  <button onClick={() => handleDeleteIssue(issue.id)}
                    style={{ padding: "2px 4px", border: "none", background: "none", cursor: "pointer", color: "#94A3B8" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input
                  style={{ flex: 1, fontSize: 12, padding: "5px 8px", border: "1px solid var(--b1)", borderRadius: 6, background: "var(--s1)", color: "var(--tx)" }}
                  placeholder="Describe issue…"
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddIssue(); }}
                />
                <button onClick={handleAddIssue} disabled={addingIssue || !issueText.trim()}
                  style={{ padding: "5px 8px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Operations log */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>Operations Log</div>
              {data?.logs.length === 0 && (
                <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 10 }}>No log entries.</div>
              )}
              {data?.logs.map((log) => (
                <div key={log.id} style={{ display: "flex", gap: 8, marginBottom: 8, borderBottom: "1px solid #F8FAFC", paddingBottom: 8 }}>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: "#94A3B8", whiteSpace: "nowrap" }}>{log.logTime}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#334155" }}>{log.text}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input
                  style={{ flex: 1, fontSize: 12, padding: "5px 8px", border: "1px solid var(--b1)", borderRadius: 6, background: "var(--s1)", color: "var(--tx)" }}
                  placeholder="Add log entry…"
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddLog(); }}
                />
                <button onClick={handleAddLog} disabled={addingLog || !logText.trim()}
                  style={{ padding: "5px 8px", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

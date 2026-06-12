"use client";

import { useState, useEffect, useMemo } from "react";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import ScreenFrame from "@/components/ui/ScreenFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import type { LedScreenPosition, LedType, Staff, Inquiry } from "@/lib/types";

const LED_TYPE_COLORS: Record<LedType, { bg: string; color: string }> = {
  P4:        { bg: "#E6F1FB", color: "#0C447C" },
  P3:        { bg: "#E1F5EE", color: "#085041" },
  P2:        { bg: "#FAEEDA", color: "#633806" },
  FLOOR:     { bg: "#FAECE7", color: "#712B13" },
  P4_CURVED: { bg: "#F0EBF8", color: "#5B21B6" },
};

function LedTypeBadge({ type }: { type: LedType }) {
  const c = LED_TYPE_COLORS[type] ?? { bg: "#F1F5F9", color: "#475569" };
  return (
    <span style={{ display: "inline-block", background: c.bg, color: c.color, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>
      {type}
    </span>
  );
}

const fmt = (n: number) => n.toLocaleString("en-IN");

export default function LedOperatorScreen({ inquiryId }: { inquiryId: string }) {
  const { success, error } = useToast();
  const [positions, setPositions] = useState<LedScreenPosition[]>([]);
  const [staffList, setStaffList] = useState<(Staff & { status: string; pendingPayment: number })[]>([]);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const [posData, staffData, inqData] = await Promise.all([
        api.fetchLedPositions(inquiryId),
        api.fetchStaff({ department: "LED" }),
        api.fetchInquiry(inquiryId),
      ]);
      setPositions(posData.positions);
      setStaffList(staffData);
      setInquiry(inqData);
    } catch {
      error("Failed to load operator data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [inquiryId]);

  const eventDays = useMemo(() => {
    if (!inquiry) return 1;
    return Math.max(1, Math.round((new Date(inquiry.endDate).getTime() - new Date(inquiry.startDate).getTime()) / 86400000) + 1);
  }, [inquiry]);

  const groupedByPlace = useMemo(() => {
    const map = new Map<string, LedScreenPosition[]>();
    for (const p of positions) {
      if (!map.has(p.place)) map.set(p.place, []);
      map.get(p.place)!.push(p);
    }
    return map;
  }, [positions]);

  const inHouseStaff = staffList.filter((s) => s.staffType === "INHOUSE");
  const externalStaff = staffList.filter((s) => s.staffType === "EXTERNAL");

  const kpis = useMemo(() => {
    const total = positions.length;
    const assigned = positions.filter((p) => p.operatorStaffId).length;
    const inHouse = positions.filter((p) => p.operatorSource === "IN_HOUSE").length;
    const external = positions.filter((p) => p.operatorSource === "EXTERNAL").length;
    const remaining = total - assigned;
    return { total, assigned, inHouse, external, remaining };
  }, [positions]);

  // Unique assigned staff pool
  const assignedStaffPool = useMemo(() => {
    const map = new Map<number, { staff: Staff; positions: LedScreenPosition[] }>();
    for (const pos of positions) {
      if (pos.operatorStaffId && pos.operatorStaff) {
        if (!map.has(pos.operatorStaffId)) {
          map.set(pos.operatorStaffId, { staff: pos.operatorStaff, positions: [] });
        }
        map.get(pos.operatorStaffId)!.positions.push(pos);
      }
    }
    return Array.from(map.values());
  }, [positions]);

  async function handleOperatorChange(posId: number, value: string) {
    if (!value) return;
    const [staffId, source] = value.split("|");
    setSaving((p) => ({ ...p, [posId]: true }));
    try {
      await api.assignLedOperator(
        inquiryId,
        posId,
        staffId === "null" ? null : Number(staffId),
        source as "IN_HOUSE" | "EXTERNAL"
      );
      success("Operator assigned");
      load();
    } catch {
      error("Failed to assign operator");
    } finally {
      setSaving((p) => ({ ...p, [posId]: false }));
    }
  }

  const dateRange = inquiry
    ? inquiry.startDate === inquiry.endDate ? inquiry.startDate : `${inquiry.startDate} → ${inquiry.endDate}`
    : "";

  return (
    <>
      <SectionHeader title="Operator Assignment" description={inquiry ? `${inquiry.eventName} · ${dateRange}` : "Loading…"} />
      <ScreenFrame breadcrumbs={[
        { label: "LED Inquiries", href: "/led/inquiries" },
        { label: inquiry?.eventName ?? "Inquiry", href: `/led/inquiries/${inquiryId}` },
        { label: "Operators" },
      ]}>
        {/* Event info bar */}
        {inquiry && (
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "#334155" }}>
            <span><strong>{inquiry.eventName}</strong></span>
            <span>· {dateRange}</span>
            <span>· {eventDays} day{eventDays !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Positions", value: loading ? "—" : String(kpis.total), color: "#0F172A" },
            { label: "Assigned", value: loading ? "—" : String(kpis.assigned), color: "#3B82F6" },
            { label: "In-house", value: loading ? "—" : String(kpis.inHouse), color: "#16A34A" },
            { label: "External", value: loading ? "—" : String(kpis.external), color: "#D97706" },
            { label: "Remaining", value: loading ? "—" : String(kpis.remaining), color: kpis.remaining > 0 ? "#DC2626" : "#16A34A" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
          {/* Left — place-wise tables */}
          <div>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading…</div>
            ) : Array.from(groupedByPlace.entries()).map(([place, pList]) => (
              <div key={place} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ background: "#F1F5F9", padding: "10px 16px", borderBottom: "1px solid #E2E8F0", fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {place}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC" }}>
                        {["No.", "Location", "Type", "H×W", "Qty", "Operator", "Source", "Pay/day"].map((h, i) => (
                          <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pList.map((pos) => {
                        const assignedStaff = staffList.find((s) => s.id === pos.operatorStaffId);
                        const curVal = pos.operatorStaffId
                          ? `${pos.operatorStaffId}|${pos.operatorSource}`
                          : "";
                        return (
                          <tr key={pos.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "10px 14px", fontSize: 12, color: "#94A3B8" }}>{pos.positionNo}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#0F172A", fontWeight: 500 }}>{pos.location}</td>
                            <td style={{ padding: "10px 14px" }}><LedTypeBadge type={pos.ledType} /></td>
                            <td style={{ padding: "10px 14px", fontSize: 12, color: "#334155" }}>{pos.targetHeightFt}×{pos.targetWidthFt}ft</td>
                            <td style={{ padding: "10px 14px", fontSize: 12, color: "#334155" }}>{pos.quantity}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <select
                                style={{ fontSize: 12, padding: "5px 8px", border: "1px solid var(--b1)", borderRadius: 6, background: "var(--s1)", color: "var(--tx)", minWidth: 160, cursor: "pointer" }}
                                value={curVal}
                                disabled={saving[pos.id]}
                                onChange={(e) => handleOperatorChange(pos.id, e.target.value)}
                              >
                                <option value="">— Unassigned —</option>
                                {inHouseStaff.length > 0 && (
                                  <optgroup label="In-house">
                                    {inHouseStaff.map((s) => (
                                      <option key={s.id} value={`${s.id}|IN_HOUSE`}>{s.name}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {externalStaff.length > 0 && (
                                  <optgroup label="External">
                                    {externalStaff.map((s) => (
                                      <option key={s.id} value={`${s.id}|EXTERNAL`}>{s.name}</option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              {pos.operatorSource ? (
                                <span style={{
                                  display: "inline-block",
                                  background: pos.operatorSource === "IN_HOUSE" ? "#F0FDF4" : "#FFFBEB",
                                  color: pos.operatorSource === "IN_HOUSE" ? "#15803D" : "#B45309",
                                  borderRadius: 999,
                                  padding: "2px 8px",
                                  fontSize: 11,
                                  fontWeight: 500,
                                }}>
                                  {pos.operatorSource === "IN_HOUSE" ? "In-house" : "External"}
                                </span>
                              ) : <span style={{ color: "#CBD5E1", fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 12, color: "#334155" }}>
                              {assignedStaff?.ratePerDay ? `₹${fmt(assignedStaff.ratePerDay)}` : "—"}
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

          {/* Right column — Staff pool + payment summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Staff pool */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>Assigned Staff</div>
              {assignedStaffPool.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94A3B8" }}>No staff assigned yet.</div>
              ) : (
                assignedStaffPool.map(({ staff, positions: staffPositions }) => (
                  <div key={staff.id} style={{ padding: "10px 0", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{staff.name}</div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{staff.role}</div>
                      {staff.ratePerDay && <div style={{ fontSize: 11, color: "#64748B" }}>₹{fmt(staff.ratePerDay)}/day</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ background: "#EFF6FF", color: "#1D4ED8", borderRadius: 999, padding: "2px 7px", fontSize: 11, fontWeight: 500 }}>
                        {staffPositions.length} pos
                      </span>
                      <span style={{
                        background: staff.staffType === "INHOUSE" ? "#F0FDF4" : "#FFFBEB",
                        color: staff.staffType === "INHOUSE" ? "#15803D" : "#B45309",
                        borderRadius: 999, padding: "2px 7px", fontSize: 11, fontWeight: 500,
                      }}>
                        {staff.staffType === "INHOUSE" ? "In-house" : "External"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment summary */}
            {assignedStaffPool.length > 0 && (
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>Payment Summary</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Name", "Days", "Rate", "Total"].map((h) => (
                        <th key={h} style={{ padding: "6px 0", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignedStaffPool.map(({ staff }) => {
                      const rate = staff.ratePerDay ?? 0;
                      const total = rate * eventDays;
                      return (
                        <tr key={staff.id} style={{ borderBottom: "1px solid #F8FAFC" }}>
                          <td style={{ padding: "8px 0", fontSize: 12, color: "#0F172A" }}>{staff.name}</td>
                          <td style={{ padding: "8px 0", fontSize: 12, color: "#334155" }}>{eventDays}</td>
                          <td style={{ padding: "8px 0", fontSize: 12, color: "#334155" }}>₹{fmt(rate)}</td>
                          <td style={{ padding: "8px 0", fontSize: 12, fontWeight: 600, color: "#0F172A" }}>₹{fmt(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 10, marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                  <span>Total Staff Cost</span>
                  <span style={{ color: "#DC2626" }}>₹{fmt(assignedStaffPool.reduce((s, { staff }) => s + (staff.ratePerDay ?? 0) * eventDays, 0))}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { Trash2, Plus } from "lucide-react";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import ScreenFrame from "@/components/ui/ScreenFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import type { LedScreenPosition, LedType, Inquiry } from "@/lib/types";

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

const EMPTY_FORM = {
  place: "",
  location: "",
  ledType: "P4" as LedType,
  targetHeightFt: 8,
  targetWidthFt: 14,
  quantity: 1,
  cabinetHeightMm: 576,
  cabinetWidthMm: 576,
};

export default function LedPositionsScreen({ inquiryId }: { inquiryId: string }) {
  const { success, error } = useToast();
  const [positions, setPositions] = useState<LedScreenPosition[]>([]);
  const [summary, setSummary] = useState<{ totalPositions: number; totalSqftPerDay: number; places: string[] }>({ totalPositions: 0, totalSqftPerDay: 0, places: [] });
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [posData, inqData] = await Promise.all([
        api.fetchLedPositions(inquiryId),
        api.fetchInquiry(inquiryId),
      ]);
      setPositions(posData.positions);
      setSummary(posData.summary);
      setInquiry(inqData);
    } catch {
      error("Failed to load positions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [inquiryId]);

  const groupedByPlace = useMemo(() => {
    const map = new Map<string, LedScreenPosition[]>();
    for (const p of positions) {
      if (!map.has(p.place)) map.set(p.place, []);
      map.get(p.place)!.push(p);
    }
    return map;
  }, [positions]);

  const existingPlaces = useMemo(() => Array.from(new Set(positions.map((p) => p.place))), [positions]);

  // Live preview
  const previewSqft = form.targetHeightFt * form.targetWidthFt * form.quantity;
  const hCabs = form.cabinetHeightMm > 0 ? Math.round((form.targetHeightFt * 304.8) / form.cabinetHeightMm) : 0;
  const wCabs = form.cabinetWidthMm > 0 ? Math.round((form.targetWidthFt * 304.8) / form.cabinetWidthMm) : 0;
  const clearHMm = hCabs * form.cabinetHeightMm;
  const clearWMm = wCabs * form.cabinetWidthMm;
  const clearHFt = clearHMm / 304.8;
  const clearWFt = clearWMm / 304.8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.place.trim()) { error("Place is required"); return; }
    if (!form.location.trim()) { error("Location is required"); return; }
    setSubmitting(true);
    try {
      await api.createLedPosition(inquiryId, {
        positionNo: positions.length + 1,
        place: form.place.trim(),
        location: form.location.trim(),
        ledType: form.ledType,
        targetHeightFt: form.targetHeightFt,
        targetWidthFt: form.targetWidthFt,
        quantity: form.quantity,
        cabinetHeightMm: form.cabinetHeightMm,
        cabinetWidthMm: form.cabinetWidthMm,
        operatorStaffId: null,
        operatorSource: null,
      });
      success("Position added");
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      load();
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Failed to add position");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(posId: number) {
    if (!confirm("Delete this position?")) return;
    try {
      await api.deleteLedPosition(inquiryId, posId);
      success("Position deleted");
      load();
    } catch {
      error("Failed to delete position");
    }
  }

  const dateRange = inquiry
    ? inquiry.startDate === inquiry.endDate ? inquiry.startDate : `${inquiry.startDate} → ${inquiry.endDate}`
    : "";

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    fontSize: 13,
    padding: "6px 10px",
    border: "1px solid var(--b1)",
    borderRadius: 6,
    background: "var(--s1)",
    color: "var(--tx)",
    width: "100%",
    outline: "none",
    ...style,
  });

  return (
    <>
      <SectionHeader title="LED Screen Positions" description={inquiry ? `${inquiry.eventName} · ${dateRange}` : "Loading…"} />
      <ScreenFrame breadcrumbs={[
        { label: "LED Inquiries", href: "/led/inquiries" },
        { label: inquiry?.eventName ?? "Inquiry", href: `/led/inquiries/${inquiryId}` },
        { label: "Positions" },
      ]}>
        {/* Event info bar */}
        {inquiry && (
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "#334155" }}>
            <span><strong>{inquiry.eventName}</strong></span>
            <span>· {dateRange}</span>
            {inquiry.ratePerSqft && <span>· ₹{fmt(inquiry.ratePerSqft)}/sq.ft</span>}
          </div>
        )}

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Positions", value: loading ? "—" : fmt(summary.totalPositions), color: "#0F172A" },
            { label: "Total sq.ft/day", value: loading ? "—" : fmt(summary.totalSqftPerDay), color: "#3B82F6" },
            { label: "Places", value: loading ? "—" : String(summary.places.length), color: "#7C3AED" },
            { label: "Required Billing", value: loading || !inquiry?.ratePerSqft ? "—" : `₹${fmt(summary.totalSqftPerDay * (inquiry.ratePerSqft ?? 0))}`, color: "#059669" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Place-wise tables */}
        {loading ? (
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 32, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading positions…</div>
        ) : positions.length === 0 ? (
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "40px 20px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
            No positions added yet. Use the form below to add.
          </div>
        ) : (
          Array.from(groupedByPlace.entries()).map(([place, pList]) => (
            <div key={place} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ background: "#F1F5F9", padding: "10px 16px", borderBottom: "1px solid #E2E8F0", fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {place} <span style={{ fontWeight: 400, color: "#94A3B8" }}>({pList.length} position{pList.length !== 1 ? "s" : ""})</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["No.", "Location", "Type", "Target H×W", "Qty", "Sq.ft", "Clear H×W", "Operator", ""].map((h, i) => (
                        <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pList.map((pos) => (
                      <tr key={pos.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>{pos.positionNo}</td>
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "#0F172A", fontWeight: 500 }}>{pos.location}</td>
                        <td style={{ padding: "10px 14px" }}><LedTypeBadge type={pos.ledType} /></td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#334155" }}>{pos.targetHeightFt}×{pos.targetWidthFt}ft</td>
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "#334155" }}>{pos.quantity}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#334155" }}>{fmt(pos.totalSqft ?? pos.targetHeightFt * pos.targetWidthFt * pos.quantity)}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#334155" }}>
                          <div>{(pos.clearHeightFt ?? 0).toFixed(2)}ft × {(pos.clearWidthFt ?? 0).toFixed(2)}ft</div>
                          <div style={{ fontSize: 10, color: "#94A3B8" }}>({pos.clearHeightMm ?? 0}mm × {pos.clearWidthMm ?? 0}mm)</div>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: pos.operatorStaff ? "#0F172A" : "#94A3B8" }}>
                          {pos.operatorStaff ? pos.operatorStaff.name : "—"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <button
                            onClick={() => handleDelete(pos.id)}
                            style={{ padding: "4px 6px", border: "1px solid #FEE2E2", borderRadius: 5, background: "#FFF5F5", color: "#DC2626", cursor: "pointer" }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {/* Add position form */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", marginTop: 16 }}>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#0F172A" }}
          >
            <Plus size={16} color="#3B82F6" />
            Add Position
          </button>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ padding: "0 20px 20px", borderTop: "1px solid #E2E8F0" }}>
              <div style={{ paddingTop: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Place</label>
                  <input
                    list="places-list"
                    style={inp()}
                    placeholder="e.g. Main Stage"
                    value={form.place}
                    onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
                  />
                  <datalist id="places-list">
                    {existingPlaces.map((p) => <option key={p} value={p} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Location</label>
                  <input style={inp()} placeholder="e.g. On Stage Center"
                    value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>LED Type</label>
                  <select style={inp()} value={form.ledType} onChange={(e) => setForm((f) => ({ ...f, ledType: e.target.value as LedType }))}>
                    <option value="P4">P4</option>
                    <option value="P3">P3</option>
                    <option value="P2">P2</option>
                    <option value="FLOOR">FLOOR</option>
                    <option value="P4_CURVED">P4_CURVED</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Target H (ft)</label>
                  <input type="number" step="0.5" style={inp()} value={form.targetHeightFt}
                    onChange={(e) => setForm((f) => ({ ...f, targetHeightFt: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Target W (ft)</label>
                  <input type="number" step="0.5" style={inp()} value={form.targetWidthFt}
                    onChange={(e) => setForm((f) => ({ ...f, targetWidthFt: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Qty</label>
                  <input type="number" style={inp()} value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Cabinet H (mm)</label>
                  <input type="number" style={inp()} value={form.cabinetHeightMm}
                    onChange={(e) => setForm((f) => ({ ...f, cabinetHeightMm: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Cabinet W (mm)</label>
                  <input type="number" style={inp()} value={form.cabinetWidthMm}
                    onChange={(e) => setForm((f) => ({ ...f, cabinetWidthMm: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Live preview */}
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</div>
                <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#334155", flexWrap: "wrap" }}>
                  <span>Sq.ft: <strong>{previewSqft.toFixed(1)}</strong></span>
                  <span>H Cabs: <strong>{hCabs}</strong> ({clearHMm}mm = {clearHFt.toFixed(2)}ft)</span>
                  <span>W Cabs: <strong>{wCabs}</strong> ({clearWMm}mm = {clearWFt.toFixed(2)}ft)</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button type="submit" disabled={submitting} className="btn" style={{ opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? "Adding…" : "Add Position"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: "8px 14px", border: "1px solid var(--b1)", borderRadius: 8, background: "var(--s1)", color: "var(--tx2)", cursor: "pointer", fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </ScreenFrame>
    </>
  );
}

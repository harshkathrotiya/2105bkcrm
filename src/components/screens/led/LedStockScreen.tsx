"use client";

import { useState, useEffect, useMemo } from "react";
import { Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import ScreenFrame from "@/components/ui/ScreenFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import type { LedCompanyLot, LedType } from "@/lib/types";

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
    <span style={{ display: "inline-block", background: c.bg, color: c.color, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 600, letterSpacing: "0.03em" }}>
      {type}
    </span>
  );
}

const fmt = (n: number) => n.toLocaleString("en-IN");

const EMPTY_FORM = {
  name: "",
  ledType: "P4" as LedType,
  cabinetHeightMm: 576,
  cabinetWidthMm: 576,
  cabinetsPerBox: 5,
  totalCabinets: 0,
};

export default function LedStockScreen() {
  const { success, error } = useToast();
  const [lots, setLots] = useState<LedCompanyLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.fetchLedLots();
      setLots(data);
    } catch {
      error("Failed to load LED lots");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    const companies = lots.length;
    const totalCabinets = lots.reduce((s, l) => s + l.totalCabinets, 0);
    const totalSqft = lots.reduce((s, l) => s + (l.sqftForPricing ?? l.totalCabinets * 4), 0);
    const totalBoxes = lots.reduce((s, l) => s + (l.totalBoxes ?? Math.ceil(l.totalCabinets / l.cabinetsPerBox)), 0);
    return { companies, totalCabinets, totalSqft, totalBoxes };
  }, [lots]);

  // Live preview calculations
  const previewSqft = form.totalCabinets * 4;
  const previewBoxes = form.cabinetsPerBox > 0 ? Math.ceil(form.totalCabinets / form.cabinetsPerBox) : 0;

  // 8×14 ft example
  const ex8ft = form.cabinetHeightMm > 0 ? Math.round((8 * 304.8) / form.cabinetHeightMm) : 0;
  const ex14ft = form.cabinetWidthMm > 0 ? Math.round((14 * 304.8) / form.cabinetWidthMm) : 0;
  const ex8mm = ex8ft * form.cabinetHeightMm;
  const ex14mm = ex14ft * form.cabinetWidthMm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { error("Company name is required"); return; }
    if (form.totalCabinets < 1) { error("Total cabinets must be > 0"); return; }
    setSubmitting(true);
    try {
      await api.createLedLot({
        name: form.name.trim(),
        ledType: form.ledType,
        cabinetHeightMm: form.cabinetHeightMm,
        cabinetWidthMm: form.cabinetWidthMm,
        cabinetsPerBox: form.cabinetsPerBox,
        totalCabinets: form.totalCabinets,
      });
      success("Lot added successfully");
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Failed to add lot");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete lot "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteLedLot(id);
      success("Lot deleted");
      load();
    } catch {
      error("Failed to delete lot");
    }
  }

  const inp = (style?: React.CSSProperties) => ({
    fontSize: 13,
    padding: "6px 10px",
    border: "1px solid var(--b1)",
    borderRadius: 6,
    background: "var(--s1)",
    color: "var(--tx)",
    width: "100%",
    outline: "none",
    ...style,
  } as React.CSSProperties);

  return (
    <>
      <SectionHeader title="LED Warehouse Stock" description="Manage BK Media LED inventory lots" />
      <ScreenFrame breadcrumbs={[{ label: "LED", href: "/led/inquiries" }, { label: "Stock" }]}>
        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Companies", value: loading ? "—" : fmt(kpis.companies), color: "#0F172A" },
            { label: "Total Cabinets", value: loading ? "—" : fmt(kpis.totalCabinets), color: "#3B82F6" },
            { label: "Total sq.ft", value: loading ? "—" : fmt(kpis.totalSqft), color: "#7C3AED" },
            { label: "Total Boxes", value: loading ? "—" : fmt(kpis.totalBoxes), color: "#059669" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Two column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
          {/* Left — lots list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>
              Company Lots
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 400, marginLeft: 8 }}>({lots.length})</span>
            </div>

            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, height: 90 }} />
              ))
            ) : lots.length === 0 ? (
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "32px 20px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                No lots yet. Add one using the form.
              </div>
            ) : (
              lots.map((lot) => {
                const sqft = lot.sqftForPricing ?? lot.totalCabinets * 4;
                const boxes = lot.totalBoxes ?? Math.ceil(lot.totalCabinets / lot.cabinetsPerBox);
                return (
                  <div key={lot.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{lot.name}</span>
                        <LedTypeBadge type={lot.ledType} />
                      </div>
                      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
                        Cabinet: {lot.cabinetHeightMm}×{lot.cabinetWidthMm}mm · {lot.cabinetsPerBox}/box
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>
                        Total: {fmt(lot.totalCabinets)} cabs · {fmt(sqft)} sq.ft · {fmt(boxes)} boxes
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(lot.id, lot.name)}
                      style={{ padding: "6px 8px", border: "1px solid #FEE2E2", borderRadius: 6, background: "#FFF5F5", color: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center" }}
                      title="Delete lot"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Right — Add form */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "sticky", top: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Add New Lot</div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Company Name</label>
                <input
                  style={inp()}
                  placeholder="e.g. Nova LED"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Cabs / Box</label>
                  <input type="number" style={inp()} value={form.cabinetsPerBox}
                    onChange={(e) => setForm((f) => ({ ...f, cabinetsPerBox: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Total Cabinets</label>
                  <input type="number" style={inp()} value={form.totalCabinets}
                    onChange={(e) => setForm((f) => ({ ...f, totalCabinets: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Live preview */}
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px", marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</div>
                <div style={{ fontSize: 12, color: "#0F172A", marginBottom: 4 }}>
                  Sq.ft for pricing: <strong>{fmt(previewSqft)}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#0F172A", marginBottom: 8 }}>
                  Total boxes: <strong>{fmt(previewBoxes)}</strong>
                </div>
                <div style={{ fontSize: 11, color: "#64748B", borderTop: "1px solid #E2E8F0", paddingTop: 8, marginTop: 4 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>8×14 ft example:</div>
                  <div>H: {ex8ft} cabs = {ex8mm}mm = {(ex8mm / 304.8).toFixed(2)}ft</div>
                  <div>W: {ex14ft} cabs = {ex14mm}mm = {(ex14mm / 304.8).toFixed(2)}ft</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn"
                style={{ marginTop: 4, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Adding…" : "Add Company Lot"}
              </button>
            </form>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

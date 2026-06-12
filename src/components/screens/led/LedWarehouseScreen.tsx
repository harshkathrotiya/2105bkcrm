"use client";

import { useState, useEffect } from "react";
import { Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import ScreenFrame from "@/components/ui/ScreenFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import type { LedWarehouseView, LedType, Inquiry } from "@/lib/types";

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

const EMPTY_VENDOR = {
  vendorName: "",
  ledType: "P4" as LedType,
  sqft: 0,
  ratePerSqftPerDay: 0,
};

export default function LedWarehouseScreen({ inquiryId }: { inquiryId: string }) {
  const { success, error } = useToast();
  const [data, setData] = useState<LedWarehouseView | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorForm, setVendorForm] = useState({ ...EMPTY_VENDOR });
  const [addingVendor, setAddingVendor] = useState(false);
  // allocation inputs: lotId -> value
  const [allocInputs, setAllocInputs] = useState<Record<number, number>>({});

  async function load() {
    setLoading(true);
    try {
      const [wh, inq] = await Promise.all([
        api.fetchLedWarehouse(inquiryId),
        api.fetchInquiry(inquiryId),
      ]);
      setData(wh);
      setInquiry(inq);
      // init alloc inputs from current allocations
      const inputs: Record<number, number> = {};
      for (const l of wh.lots) {
        inputs[l.lot.id] = l.allocatedSqft;
      }
      setAllocInputs(inputs);
    } catch {
      error("Failed to load warehouse data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [inquiryId]);

  async function handleAllocChange(lotId: number, value: number) {
    setAllocInputs((p) => ({ ...p, [lotId]: value }));
  }

  async function handleAllocSave(lotId: number) {
    const value = allocInputs[lotId] ?? 0;
    try {
      await api.upsertLedAllocation(inquiryId, lotId, value);
      success("Allocation updated");
      load();
    } catch {
      error("Failed to update allocation");
    }
  }

  async function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorForm.vendorName.trim()) { error("Vendor name required"); return; }
    if (vendorForm.sqft < 1) { error("Sq.ft must be > 0"); return; }
    setAddingVendor(true);
    try {
      await api.createLedVendor(inquiryId, {
        vendorName: vendorForm.vendorName.trim(),
        ledType: vendorForm.ledType,
        sqft: vendorForm.sqft,
        ratePerSqftPerDay: vendorForm.ratePerSqftPerDay,
      });
      success("Vendor added");
      setVendorForm({ ...EMPTY_VENDOR });
      load();
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Failed to add vendor");
    } finally {
      setAddingVendor(false);
    }
  }

  async function handleDeleteVendor(vendorId: number) {
    if (!confirm("Remove this vendor?")) return;
    try {
      await api.deleteLedVendor(inquiryId, vendorId);
      success("Vendor removed");
      load();
    } catch {
      error("Failed to remove vendor");
    }
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    fontSize: 13,
    padding: "6px 10px",
    border: "1px solid var(--b1)",
    borderRadius: 6,
    background: "var(--s1)",
    color: "var(--tx)",
    outline: "none",
    ...style,
  });

  const dateRange = inquiry
    ? inquiry.startDate === inquiry.endDate ? inquiry.startDate : `${inquiry.startDate} → ${inquiry.endDate}`
    : "";

  if (loading) {
    return (
      <>
        <SectionHeader title="LED Warehouse" description="Loading…" />
        <ScreenFrame breadcrumbs={[{ label: "LED Inquiries", href: "/led/inquiries" }, { label: "Warehouse" }]}>
          <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading warehouse data…</div>
        </ScreenFrame>
      </>
    );
  }

  if (!data) return null;

  const coverageColor = data.coveragePct >= 100 ? "#16A34A" : data.coveragePct >= 70 ? "#D97706" : "#DC2626";
  const clientBilling = data.requiredSqft * data.ratePerSqft * data.eventDays;
  const netMargin = clientBilling - data.vendorCost;

  return (
    <>
      <SectionHeader title="Warehouse Availability" description={inquiry ? `${inquiry.eventName} · ${dateRange}` : ""} />
      <ScreenFrame breadcrumbs={[
        { label: "LED Inquiries", href: "/led/inquiries" },
        { label: inquiry?.eventName ?? "Inquiry", href: `/led/inquiries/${inquiryId}` },
        { label: "Warehouse" },
      ]}>
        {/* Event info bar */}
        {inquiry && (
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "#334155" }}>
            <span><strong>{inquiry.eventName}</strong></span>
            <span>· {dateRange}</span>
            <span>· Required: {fmt(data.requiredSqft)} sq.ft</span>
            {inquiry.ratePerSqft && <span>· ₹{fmt(inquiry.ratePerSqft)}/sq.ft</span>}
          </div>
        )}

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "BK Media Allocated", value: `${fmt(data.bkMediaTotal)} sq.ft`, color: data.bkMediaTotal > 0 ? "#16A34A" : "#0F172A" },
            { label: "Vendor Arranged", value: `${fmt(data.vendorTotal)} sq.ft`, color: "#D97706" },
            { label: "Shortfall", value: `${fmt(data.shortfall)} sq.ft`, color: data.shortfall > 0 ? "#DC2626" : "#16A34A" },
            { label: "Vendor Cost", value: `₹${fmt(data.vendorCost)}`, color: "#D97706" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* BK Media lots */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 10 }}>BK Media Lots</div>
              {data.lots.map((l) => {
                const sqft = l.lot.sqftForPricing ?? l.lot.totalCabinets * 4;
                const pct = sqft > 0 ? Math.round((l.allocatedSqft / sqft) * 100) : 0;
                return (
                  <div key={l.lot.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{l.lot.name}</span>
                      <LedTypeBadge type={l.lot.ledType} />
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>
                      Total: {fmt(sqft)} sq.ft · Allocated: {fmt(l.allocatedSqft)} · Remaining: {fmt(l.remainingSqft)}
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "#16A34A" : "#3B82F6", borderRadius: 999 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ fontSize: 12, color: "#64748B", flexShrink: 0 }}>Allocate for event:</label>
                      <input
                        type="number"
                        style={inp({ width: 100 })}
                        value={allocInputs[l.lot.id] ?? 0}
                        max={sqft}
                        onChange={(e) => handleAllocChange(l.lot.id, Number(e.target.value))}
                        onBlur={() => handleAllocSave(l.lot.id)}
                      />
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>sq.ft</span>
                      <button
                        onClick={() => handleAllocSave(l.lot.id)}
                        style={{ padding: "4px 10px", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 5, fontSize: 12, cursor: "pointer" }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add vendor form */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 14 }}>Add Vendor Arrangement</div>
              <form onSubmit={handleAddVendor}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Vendor Name</label>
                    <input style={inp({ width: "100%" })} placeholder="Vendor name"
                      value={vendorForm.vendorName} onChange={(e) => setVendorForm((f) => ({ ...f, vendorName: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>LED Type</label>
                    <select style={inp({ width: "100%" })} value={vendorForm.ledType} onChange={(e) => setVendorForm((f) => ({ ...f, ledType: e.target.value as LedType }))}>
                      <option value="P4">P4</option>
                      <option value="P3">P3</option>
                      <option value="P2">P2</option>
                      <option value="FLOOR">FLOOR</option>
                      <option value="P4_CURVED">P4_CURVED</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Sq.ft</label>
                    <input type="number" style={inp({ width: "100%" })} value={vendorForm.sqft}
                      onChange={(e) => setVendorForm((f) => ({ ...f, sqft: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Rate/sq.ft/day (₹)</label>
                    <input type="number" style={inp({ width: "100%" })} value={vendorForm.ratePerSqftPerDay}
                      onChange={(e) => setVendorForm((f) => ({ ...f, ratePerSqftPerDay: Number(e.target.value) }))} />
                  </div>
                </div>
                <button type="submit" disabled={addingVendor} className="btn" style={{ opacity: addingVendor ? 0.7 : 1 }}>
                  {addingVendor ? "Adding…" : "Add Vendor"}
                </button>
              </form>
            </div>

            {/* Vendors list */}
            {data.vendors.length > 0 && (
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Vendor Arrangements</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["Vendor", "Type", "Sq.ft", "Rate/day", "Total Cost", ""].map((h, i) => (
                        <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.vendors.map((v) => {
                      const cost = v.sqft * v.ratePerSqftPerDay * data.eventDays;
                      return (
                        <tr key={v.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#0F172A", fontWeight: 500 }}>{v.vendorName}</td>
                          <td style={{ padding: "10px 14px" }}><LedTypeBadge type={v.ledType} /></td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#334155" }}>{fmt(v.sqft)}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#334155" }}>₹{fmt(v.ratePerSqftPerDay)}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#D97706", fontWeight: 600 }}>₹{fmt(cost)}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <button onClick={() => handleDeleteVendor(v.id)}
                              style={{ padding: "4px 6px", border: "1px solid #FEE2E2", borderRadius: 5, background: "#FFF5F5", color: "#DC2626", cursor: "pointer" }}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* P&L summary card */}
            <div style={{ background: "#0F172A", borderRadius: 14, padding: "20px 22px", color: "#F8FAFC" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>P&L Summary</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#94A3B8" }}>Client Billing</span>
                  <span style={{ color: "#4ADE80", fontWeight: 600 }}>+ ₹{fmt(clientBilling)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#94A3B8" }}>Vendor Cost</span>
                  <span style={{ color: "#F87171", fontWeight: 600 }}>− ₹{fmt(data.vendorCost)}</span>
                </div>
                <div style={{ borderTop: "1px solid #334155", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#CBD5E1", fontWeight: 600 }}>Net Margin</span>
                  <span style={{ color: netMargin >= 0 ? "#4ADE80" : "#F87171", fontWeight: 700, fontSize: 16 }}>₹{fmt(netMargin)}</span>
                </div>
              </div>
            </div>

            {/* Coverage summary card */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>Coverage Summary</div>
              <div style={{ height: 8, background: "#E2E8F0", borderRadius: 999, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(data.coveragePct, 100)}%`, background: coverageColor, borderRadius: 999, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 12, color: "#64748B", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Coverage</span>
                <span style={{ fontWeight: 600, color: coverageColor }}>{data.coveragePct.toFixed(1)}%</span>
              </div>
              {[
                { label: "Required", value: `${fmt(data.requiredSqft)} sq.ft` },
                { label: "BK Media", value: `${fmt(data.bkMediaTotal)} sq.ft` },
                { label: "Vendor", value: `${fmt(data.vendorTotal)} sq.ft` },
                { label: "Shortfall", value: `${fmt(data.shortfall)} sq.ft` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid #F1F5F9" }}>
                  <span style={{ color: "#64748B" }}>{label}</span>
                  <span style={{ color: "#0F172A", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Shortfall notice */}
            {data.shortfall > 0 ? (
              <div style={{ background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#DC2626" }}>Shortfall: {fmt(data.shortfall)} sq.ft</div>
                  <div style={{ fontSize: 12, color: "#7F1D1D", marginTop: 2 }}>Arrange more stock before proceeding.</div>
                </div>
              </div>
            ) : (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle size={16} color="#16A34A" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>Full coverage achieved!</span>
              </div>
            )}

            {/* Proceed button */}
            <button
              disabled={data.shortfall > 0}
              style={{
                padding: "12px 20px",
                background: data.shortfall > 0 ? "#E2E8F0" : "#16A34A",
                color: data.shortfall > 0 ? "#94A3B8" : "#FFFFFF",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: data.shortfall > 0 ? "not-allowed" : "pointer",
              }}
              onClick={() => { if (data.shortfall === 0) window.location.href = `/led/inquiries/${inquiryId}/operators`; }}
            >
              Proceed to Operators →
            </button>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

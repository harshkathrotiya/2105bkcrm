"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useQuotations, useInquiries, useClients } from "@/lib/store";
import type { QuotationRow } from "@/lib/store";
import { generateId } from "@/lib/types";
import { generateQuoteNo, calcDays } from "@/lib/utils";

// ── Full position list per FRD appendix ──────────────────────────────────────
const POSITION_MAP: Record<string, { equip: string; rate: number }> = {
  "Center Tally":        { equip: "FS6",            rate: 20000 },
  "Center Semi Wide":    { equip: "FS6",            rate: 20000 },
  "Center Full Wide":    { equip: "Z150",           rate:  8000 },
  "Left Side":           { equip: "FS6",            rate: 20000 },
  "Right Side":          { equip: "FS6",            rate: 20000 },
  "Wireless 1":          { equip: "FX3 + Wireless", rate: 10000 },
  "Wireless 2":          { equip: "FX3 + Wireless", rate: 10000 },
  "Wireless 3":          { equip: "FX3 + Wireless", rate: 10000 },
  "Wireless 4":          { equip: "FX3 + Wireless", rate: 10000 },
  "Photo 1":             { equip: "DSLR",           rate:  8000 },
  "Photo 2":             { equip: "DSLR",           rate:  8000 },
  "Photo 3":             { equip: "DSLR",           rate:  8000 },
  "Photo 4":             { equip: "DSLR",           rate:  8000 },
  "Source PC":           { equip: "PC",             rate:  5000 },
  "Youtube Live":        { equip: "Live PC",        rate:  5000 },
  "Editor":              { equip: "Editor",         rate:  5000 },
  "Photo Editor":        { equip: "Photo Editor",   rate:  5000 },
  "Video Crane 32 Feet": { equip: "Crane 32 Feet",  rate: 15000 },
  "Drone":               { equip: "Drone",          rate: 12000 },
  "FPV":                 { equip: "FPV",            rate: 15000 },
};

const POSITIONS = Object.keys(POSITION_MAP);

function makeRow(no: number, days: number): QuotationRow {
  const pos = POSITIONS[0];
  const { equip, rate } = POSITION_MAP[pos];
  return { no, position: pos, equip, rate, days, amount: rate * days };
}

export default function Screen05QuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { quotations, dispatchQuotations } = useQuotations();
  const { inquiries } = useInquiries();
  const { clients } = useClients();

  // Pre-select inquiry from URL param
  const preselectedId = searchParams.get("inquiryId") ?? "";
  const defaultInquiryId =
    preselectedId && inquiries.find((i) => i.id === preselectedId)
      ? preselectedId
      : inquiries[0]?.id ?? "";

  const [selectedInquiryId, setSelectedInquiryId] = useState(defaultInquiryId);
  const [saving, setSaving] = useState(false);

  const selectedInquiry = inquiries.find((i) => i.id === selectedInquiryId);
  const selectedClient = selectedInquiry
    ? clients.find((c) => c.id === selectedInquiry.clientId)
    : null;

  // Days from inquiry
  const eventDays = useMemo(
    () => selectedInquiry ? calcDays(selectedInquiry.startDate, selectedInquiry.endDate) : 1,
    [selectedInquiry]
  );

  // Existing quotation for this inquiry (non-revised)
  const existingQuotation = useMemo(
    () => quotations.find((q) => q.inquiryId === selectedInquiryId && q.status !== "Revised"),
    [quotations, selectedInquiryId]
  );

  // Rows — auto-fill days from inquiry when inquiry changes
  const [rows, setRows] = useState<QuotationRow[]>(() => {
    if (existingQuotation) return existingQuotation.equipment;
    return [
      { no: 1, position: "Center Tally",        equip: "FS6",            rate: 20000, days: eventDays, amount: 20000 * eventDays },
      { no: 2, position: "Center Semi Wide",     equip: "FS6",            rate: 20000, days: eventDays, amount: 20000 * eventDays },
      { no: 3, position: "Wireless 1",           equip: "FX3 + Wireless", rate: 10000, days: eventDays, amount: 10000 * eventDays },
      { no: 4, position: "Photo 1",              equip: "DSLR",           rate:  8000, days: eventDays, amount:  8000 * eventDays },
      { no: 5, position: "Video Crane 32 Feet",  equip: "Crane 32 Feet",  rate: 15000, days: eventDays, amount: 15000 * eventDays },
    ];
  });

  const handleInquiryChange = (id: string) => {
    setSelectedInquiryId(id);
    const inq = inquiries.find((i) => i.id === id);
    const days = inq ? calcDays(inq.startDate, inq.endDate) : 1;
    const q = quotations.find((qt) => qt.inquiryId === id && qt.status !== "Revised");
    if (q) {
      setRows(q.equipment);
    } else {
      setRows([
        { no: 1, position: "Center Tally",        equip: "FS6",            rate: 20000, days, amount: 20000 * days },
        { no: 2, position: "Center Semi Wide",     equip: "FS6",            rate: 20000, days, amount: 20000 * days },
        { no: 3, position: "Wireless 1",           equip: "FX3 + Wireless", rate: 10000, days, amount: 10000 * days },
        { no: 4, position: "Photo 1",              equip: "DSLR",           rate:  8000, days, amount:  8000 * days },
        { no: 5, position: "Video Crane 32 Feet",  equip: "Crane 32 Feet",  rate: 15000, days, amount: 15000 * days },
      ]);
    }
  };

  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const cgst = Math.round(subtotal * 0.09);
  const sgst = Math.round(subtotal * 0.09);
  const total = subtotal + cgst + sgst;

  const updateRow = (no: number, field: keyof QuotationRow, value: string | number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.no !== no) return row;
        const updated = { ...row, [field]: value };
        if (field === "position") {
          const m = POSITION_MAP[value as string];
          if (m) { updated.equip = m.equip; updated.rate = m.rate; }
        }
        updated.amount = updated.rate * updated.days;
        return updated;
      })
    );
  };

  const addRow = () => {
    const maxNo = rows.reduce((m, r) => Math.max(m, r.no), 0);
    setRows((prev) => [...prev, makeRow(maxNo + 1, eventDays)]);
  };

  const removeRow = (no: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.no !== no).map((r, i) => ({ ...r, no: i + 1 })));
  };

  const allQuoteNos = quotations.map((q) => q.quoteNo);

  const handleSave = async () => {
    if (!selectedInquiry || !selectedClient || saving) return;
    setSaving(true);

    const now = new Date();
    const startDate = selectedInquiry.startDate;
    const endDate = selectedInquiry.endDate;
    const days = calcDays(startDate, endDate);

    const quoteData = {
      equipment: rows, subtotal, cgst, sgst, total,
      status: "Draft" as const,
      sentAt: null as string | null,
      approvedAt: null as string | null,
    };

    try {
      if (existingQuotation) {
        // Update existing — keep same quoteNo
        await dispatchQuotations({
          type: "UPDATE_QUOTATION",
          payload: { id: existingQuotation.id, ...quoteData },
        });
        router.push(`/quotations/${existingQuotation.id}/pdf`);
      } else {
        // Enforce: one active quotation per inquiry — mark any remaining
        // non-Revised quotations for this inquiry as Revised before creating
        const activeQuotes = quotations.filter(
          (q) => q.inquiryId === selectedInquiry.id && q.status !== "Revised"
        );
        for (const aq of activeQuotes) {
          await dispatchQuotations({
            type: "UPDATE_QUOTATION",
            payload: { id: aq.id, status: "Revised" },
          });
        }

        const newId = `quote-${generateId()}`;
        const quoteNo = generateQuoteNo(allQuoteNos, now);
        await dispatchQuotations({
          type: "ADD_QUOTATION",
          payload: {
            id: newId,
            inquiryId: selectedInquiry.id,
            clientName: selectedClient.name,
            eventName: selectedInquiry.eventType,
            quoteNo,
            startDate,
            endDate,
            days,
            venue: selectedInquiry.venue,
            ...quoteData,
            createdAt: now.toISOString().split("T")[0],
          },
        });
        router.push(`/quotations/${newId}/pdf`);
      }
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("en-IN");

  return (
    <>
      <SectionHeader
        title={<>Quotation <strong>form</strong></>}
        description="Create equipment quotations from inquiries with auto-filled rates and live GST calculations."
      />
      <ScreenFrame
        breadcrumb={<>Inquiries › {selectedInquiry?.eventType ?? "—"} › Quotation</>}
        actions={
          <button
            className={`btn btn-success ${!selectedInquiry || saving ? "opacity-50" : ""}`}
            onClick={handleSave}
            disabled={!selectedInquiry || saving}
          >
            {saving ? "Saving..." : existingQuotation ? "Update quotation ↗" : "Save quotation ↗"}
          </button>
        }
      >
        {/* Inquiry selector */}
        <div className="card !p-3 mb-[14px]">
          <div className="flex gap-2 items-center">
            <div className="text-[11px] text-tx3 whitespace-nowrap">Base on inquiry:</div>
            <select
              className="fsel flex-1"
              value={selectedInquiryId}
              onChange={(e) => handleInquiryChange(e.target.value)}
            >
              {inquiries.map((inq) => {
                const c = clients.find((cl) => cl.id === inq.clientId);
                return (
                  <option key={inq.id} value={inq.id}>
                    {c?.name ?? "Unknown"} — {inq.eventType} ({inq.startDate})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Info strip */}
        <div className="bg-s2 rounded-lg p-[10px_14px] mb-[14px] grid grid-cols-3 gap-2">
          <div>
            <div className="text-[10px] text-tx3 mb-[2px]">Client</div>
            <div className="text-[12px] font-medium">{selectedClient?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-tx3 mb-[2px]">Event</div>
            <div className="text-[12px] font-medium">{selectedInquiry?.eventType ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-tx3 mb-[2px]">Quote no.</div>
            <div className="text-[12px] font-medium font-mono text-bl">
              {existingQuotation?.quoteNo ?? "Auto-generated on save"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-tx3 mb-[2px]">Dates</div>
            <div className="text-[12px] font-medium">
              {selectedInquiry
                ? `${new Date(selectedInquiry.startDate).getDate()}–${new Date(selectedInquiry.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-tx3 mb-[2px]">Days</div>
            <div className="text-[12px] font-medium text-bl">{eventDays} days</div>
          </div>
          <div>
            <div className="text-[10px] text-tx3 mb-[2px]">Status</div>
            <Badge variant={existingQuotation ? "am" : "gy"}>
              {existingQuotation ? existingQuotation.status : "New"}
            </Badge>
          </div>
        </div>

        <div className="two-col">
          {/* Left — equipment table */}
          <div>
            <div className="card">
              <div className="card-t">
                Equipment table
                <button className="btn ml-auto text-[10px]" onClick={addRow}>+ Add row</button>
              </div>
              <div className="overflow-x-auto">
                <table className="tbl" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>No.</th>
                      <th style={{ width: 160 }}>Position</th>
                      <th style={{ width: 130 }}>Equipment</th>
                      <th style={{ width: 90, textAlign: "right" }}>Rate/day (₹)</th>
                      <th style={{ width: 70, textAlign: "center" }}>Days</th>
                      <th style={{ width: 90, textAlign: "right" }}>Amount (₹)</th>
                      <th style={{ width: 28 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.no}>
                        <td className="text-tx3">{row.no}</td>
                        <td>
                          <select
                            className="fsel text-[10px]"
                            value={row.position}
                            onChange={(e) => updateRow(row.no, "position", e.target.value)}
                          >
                            {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                          </select>
                        </td>
                        <td>
                          <div
                            className="finp text-[10px]"
                            style={{ background: "var(--sem-gy-bg)", color: "var(--sem-gy-tx)" }}
                          >
                            {row.equip}
                          </div>
                        </td>
                        <td>
                          <input
                            className="finp text-[10px] text-right"
                            type="number"
                            min={1}
                            value={row.rate}
                            onChange={(e) => updateRow(row.no, "rate", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            className="finp text-[10px] text-center"
                            type="number"
                            min={1}
                            value={row.days}
                            style={{ minWidth: 58 }}
                            onChange={(e) => updateRow(row.no, "days", Math.max(1, Number(e.target.value) || 1))}
                          />
                        </td>
                        <td className="text-right font-medium text-gr font-mono text-[11px]">
                          ₹{fmt(row.amount)}
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: 9, padding: "2px 5px" }}
                            onClick={() => removeRow(row.no)}
                            disabled={rows.length <= 1}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn w-full mt-2 justify-center text-bl" onClick={addRow}>
                + Add equipment row
              </button>
            </div>
          </div>

          {/* Right — calculation */}
          <div>
            <div className="card">
              <div className="card-t">Calculation</div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Subtotal</span>
                <span className="font-mono font-medium">₹{fmt(subtotal)}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">CGST 9%</span>
                <span className="font-mono">₹{fmt(cgst)}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">SGST 9%</span>
                <span className="font-mono">₹{fmt(sgst)}</span>
              </div>
              <div className="flex justify-between pt-[10px] text-[14px] font-medium border-t border-b1 mt-[4px]">
                <span>Total</span>
                <span className="text-bl font-mono">₹{fmt(total)}</span>
              </div>
            </div>
            <div className="card">
              <div className="card-t">Note</div>
              <div className="text-[11px] text-tx3 leading-[1.7]">
                Client PDF માં ફક્ત:<br />
                Position · Equipment · Days<br />
                <span className="text-rd">Rate / Amount client ને show નહીં થાય</span>
              </div>
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

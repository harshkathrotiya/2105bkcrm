"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useQuotations, useInquiries, useClients, useKits, useEquipment } from "@/lib/store";
import type { QuotationRow } from "@/lib/store";
import type { Equipment, Kit } from "@/lib/types";
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
const EQUIPMENT_LIST = Array.from(new Set(Object.values(POSITION_MAP).map((m) => m.equip)));

function makeRow(no: number, days: number): QuotationRow {
  return { no, position: "", equip: "", rate: 0, days, amount: 0 };
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  placement = "bottom",
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; group?: string }[];
  placeholder?: string;
  className?: string;
  placement?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find(o => o.value === value)?.label || value;

  // Build grouped list when options carry a group property
  const hasGroups = options.some(o => o.group);
  const groupedFiltered = hasGroups
    ? Array.from(new Set(filtered.map(o => o.group || "")))
        .map(group => ({ group, items: filtered.filter(o => (o.group || "") === group) }))
        .filter(g => g.items.length > 0)
    : null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className="fsel cursor-pointer flex justify-between items-center bg-s1"
        onClick={() => { setOpen(!open); setSearch(""); }}
      >
        <span className={`flex-1 min-w-0 text-left whitespace-nowrap overflow-hidden text-ellipsis ${value ? "" : "text-tx3"}`}>
          {value ? selectedLabel : placeholder}
        </span>
        <span className="text-[10px] text-tx3 opacity-50 ml-2 shrink-0">▼</span>
      </div>
      
      {open && (
        <div 
          className="absolute z-[999] left-0 w-full bg-s1 border border-b1 rounded-md shadow-lg flex flex-col min-w-[200px]" 
          style={{ 
            ...(placement === "top" ? { bottom: "100%", marginBottom: "4px" } : { top: "100%", marginTop: "4px" }),
            overflow: "hidden", 
            maxHeight: "260px" 
          }}
        >
          <div className="border-b border-b1 shrink-0 bg-s1" style={{ padding: "8px" }}>
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              className="w-full text-[11px] outline-none border border-b1 rounded bg-s1"
              style={{ padding: "6px 8px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div className="text-center text-tx3 text-[10px]" style={{ padding: "12px" }}>No results</div>
            ) : groupedFiltered ? (
              groupedFiltered.map(({ group, items }) => (
                <div key={group}>
                  <div style={{
                    padding: "5px 12px 3px",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    color: "var(--tx3)",
                    background: "var(--alt2)",
                    borderBottom: "1px solid var(--b1)",
                  }}>
                    {group}
                  </div>
                  {items.map((opt) => (
                    <div
                      key={opt.value}
                      className={`text-[11px] cursor-pointer transition-colors ${opt.value === value ? "bg-bl/[0.05] text-bl font-medium" : "text-tx hover:bg-s2"}`}
                      style={{ padding: "7px 14px" }}
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  className={`text-[11px] cursor-pointer transition-colors ${opt.value === value ? "bg-bl/[0.05] text-bl font-medium" : "text-tx hover:bg-s2"}`}
                  style={{ padding: "8px 12px" }}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Screen05QuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { quotations, dispatchQuotations } = useQuotations();
  const { inquiries } = useInquiries();
  const { clients } = useClients();
  const { kits } = useKits();
  const { equipment: allEquipment } = useEquipment();

  // Build live grouped equipment options from DB:
  // Group 1 — Kits, Group 2 — Individual available items
  const liveEquipOptions = useMemo(() => {
    const kitOpts = kits.map((k: Kit) => ({
      value: k.name,
      label: `📷 ${k.name}`,
      group: "Kits",
    }));
    const eqOpts = allEquipment
      .filter((e: Equipment) => e.status === "AVAILABLE" || e.status === "IN_USE")
      .map((e: Equipment) => ({
        value: e.productName,
        label: `🎥 ${e.productName}${e.serialNumber ? ` (${e.serialNumber})` : ""}`,
        group: "Equipment Items",
      }));
    // Deduplicate by value
    const seen = new Set<string>();
    const all = [...kitOpts, ...eqOpts].filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
    // Fallback to EQUIPMENT_LIST if DB not loaded yet
    if (all.length === 0) return EQUIPMENT_LIST.map((e) => ({ value: e, label: e, group: "" }));
    return all;
  }, [kits, allEquipment]);

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
        <div className="card" style={{ padding: "12px", marginBottom: "14px" }}>
          <div className="flex gap-2 items-center">
            <div className="text-[11px] text-tx3 whitespace-nowrap">Base on inquiry:</div>
            <SearchableSelect
              className="flex-1"
              value={selectedInquiryId}
              onChange={(val) => handleInquiryChange(val)}
              options={inquiries.map((inq) => {
                const c = clients.find((cl) => cl.id === inq.clientId);
                return {
                  value: inq.id,
                  label: `${c?.name ?? "Unknown"} — ${inq.eventType} (${inq.startDate})`
                };
              })}
              placeholder="Select an inquiry..."
            />
          </div>
        </div>

        {/* Info strip */}
        <div className="bg-s2 rounded-lg grid grid-cols-3" style={{ padding: "16px", marginBottom: "14px", gap: "24px 16px" }}>
          <div>
            <div className="text-[10px] text-tx3" style={{ marginBottom: "2px" }}>Client</div>
            <div className="text-[12px] font-medium">{selectedClient?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-tx3" style={{ marginBottom: "2px" }}>Event</div>
            <div className="text-[12px] font-medium">{selectedInquiry?.eventType ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-tx3" style={{ marginBottom: "2px" }}>Quote no.</div>
            <div className="text-[12px] font-medium font-mono text-bl">
              {existingQuotation?.quoteNo ?? "Auto-generated on save"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-tx3" style={{ marginBottom: "2px" }}>Dates</div>
            <div className="text-[12px] font-medium">
              {selectedInquiry
                ? `${new Date(selectedInquiry.startDate).getDate()}–${new Date(selectedInquiry.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-tx3" style={{ marginBottom: "2px" }}>Days</div>
            <div className="text-[12px] font-medium text-bl">{eventDays} days</div>
          </div>
          <div>
            <div className="text-[10px] text-tx3" style={{ marginBottom: "2px" }}>Status</div>
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
                <span>Equipment table</span>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "var(--sem-gr-bg)",
                    color: "var(--gr)",
                    border: "1px solid var(--sem-gr-bdr)",
                    marginLeft: "8px",
                  }}
                >
                  ● Live DB
                </span>
                <button className="btn ml-auto text-[10px]" onClick={addRow}>+ Add row</button>
              </div>
              <div className="overflow-x-auto" style={{ overflow: "visible" }}>
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
                    {rows.map((row) => {
                      const placement = rows.length > 2 && (row.no >= 4 || row.no === rows.length) ? "top" : "bottom";
                      return (
                        <tr key={row.no}>
                          <td className="text-tx3">{row.no}</td>
                          <td>
                            <SearchableSelect
                              className="text-[10px]"
                              value={row.position}
                              onChange={(val) => updateRow(row.no, "position", val)}
                              options={POSITIONS.map(p => ({ value: p, label: p }))}
                              placeholder="Select position"
                              placement={placement}
                            />
                          </td>
                          <td>
                            <SearchableSelect
                              className="text-[10px]"
                              value={row.equip}
                              onChange={(val) => updateRow(row.no, "equip", val)}
                              options={liveEquipOptions}
                              placeholder="Select kit / equipment"
                              placement={placement}
                            />
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
                      );
                    })}
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

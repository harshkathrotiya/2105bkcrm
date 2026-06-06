"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import SearchableSelect from "../ui/SearchableSelect";
import { useQuotations, useInquiries, useClients, useKits, useEquipment } from "@/lib/store";
import type { QuotationRow } from "@/lib/store";
import type { Equipment, Kit } from "@/lib/types";
import { generateId } from "@/lib/types";
import { generateQuoteNo, calcDays } from "@/lib/utils";
import { computeGst } from "@/lib/pricing";
import * as api from "@/lib/api";
import { useToast } from "../ui/Toast";
import { useCurrentUser } from "@/lib/use-current-user";



// Service labels and LED types used in auto-generated rows — not real DB equipment/kits
// but must appear as valid selections in the Equipment/Kits dropdown.
const SPECIAL_EQUIP_OPTIONS = [
  { value: "Service",       label: "Service",       group: "Special" },
  { value: "Operator",      label: "Operator",      group: "Special" },
  { value: "P4 LED",        label: "P4 LED",        group: "Special" },
  { value: "P3 LED",        label: "P3 LED",        group: "Special" },
  { value: "P2 LED",        label: "P2 LED",        group: "Special" },
  { value: "FLOOR LED",     label: "FLOOR LED",     group: "Special" },
  { value: "P4_CURVED LED", label: "P4_CURVED LED", group: "Special" },
];

function makeRow(no: number, days: number): QuotationRow {
  return { no, position: "", equip: "", rate: 0, days, amount: 0 };
}

export default function Screen05QuotationForm() {
  const router = useRouter();
  const toast = useToast();
  const { can } = useCurrentUser();
  const searchParams = useSearchParams();
  const { quotations, dispatchQuotations } = useQuotations();
  const { inquiries, dispatchInquiries } = useInquiries();
  const { clients } = useClients();
  const { kits } = useKits();
  const { equipment: allEquipment } = useEquipment();

  // ── Dynamic positions loaded from DB ────────────────────────────────────────
  const [positionMap, setPositionMap] = useState<Record<string, { equip: string; rate: number }>>({});
  const [positionsLoaded, setPositionsLoaded] = useState(false);
  const [addingPosition, setAddingPosition] = useState(false);
  const [newPosition, setNewPosition] = useState("");
  const [newPositionEquip, setNewPositionEquip] = useState("");
  const [newPositionRate, setNewPositionRate] = useState<number>(0);

  const positions = useMemo(() => Object.keys(positionMap), [positionMap]);

  useEffect(() => {
    let active = true;
    api.fetchOptions("QUOTATION_POSITION")
      .then((opts) => {
        if (!active) return;
        const map: Record<string, { equip: string; rate: number }> = {};
        for (const o of opts) {
          map[o.value] = { equip: o.metaEquip || "", rate: o.metaRate || 0 };
        }
        setPositionMap(map);
        setPositionsLoaded(true);
      })
      .catch(() => { if (active) setPositionsLoaded(true); });
    return () => { active = false; };
  }, []);

  const handleAddPosition = async () => {
    const value = newPosition.trim();
    if (!value) return;
    try {
      await api.addOption("QUOTATION_POSITION", value, {
        equip: newPositionEquip.trim() || undefined,
        rate: newPositionRate > 0 ? newPositionRate : undefined,
      });
      setPositionMap((prev) => ({ ...prev, [value]: { equip: newPositionEquip.trim(), rate: newPositionRate } }));
      setNewPosition("");
      setNewPositionEquip("");
      setNewPositionRate(0);
      setAddingPosition(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add position");
    }
  };

  // ── Client-specific equipment rates ─────────────────────────────────────────
  const equipNameToId = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of allEquipment) {
      if (!(e.productName in m)) m[e.productName] = e.id;
    }
    return m;
  }, [allEquipment]);
  // equipment id -> rate for the selected client (override or default)
  const [clientRateMap, setClientRateMap] = useState<Record<number, number>>({});
  // kit name -> rate (via kit's mainBodyId equipment rate)
  const kitNameToRate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const k of kits) {
      if (k.mainBodyId != null && clientRateMap[k.mainBodyId] != null) {
        m[k.name] = clientRateMap[k.mainBodyId];
      }
    }
    return m;
  }, [kits, clientRateMap]);

  // Build live grouped equipment options from DB:
  // Group 0 — Special, Group 1 — Kits, Group 2 — Individual available items
  const liveEquipOptions = useMemo(() => {
    const kitOpts = kits.map((k: Kit) => ({
      value: k.name,
      label: `${k.name}`,
      group: "Kits",
    }));
    const eqOpts = allEquipment
      .filter((e: Equipment) => e.status === "AVAILABLE" || e.status === "IN_USE")
      .map((e: Equipment) => ({
        value: e.productName,
        label: `${e.productName}${e.serialNumber ? ` (${e.serialNumber})` : ""}`,
        group: "Equipment Items",
      }));
    // Deduplicate by value (special entries first so they're preserved)
    const seen = new Set<string>();
    const all = [...SPECIAL_EQUIP_OPTIONS, ...kitOpts, ...eqOpts].filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
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
  const selectedClientId = selectedClient?.id;

  // Build the effective rate map: equipment default rates overlaid with this client's overrides
  useEffect(() => {
    // Base: every equipment's default rate
    const base: Record<number, number> = {};
    for (const e of allEquipment) {
      if (e.defaultRate != null) base[e.id] = e.defaultRate;
    }
    if (!selectedClientId) {
      setClientRateMap(base);
      return;
    }
    let active = true;
    api.fetchClientRates(selectedClientId)
      .then((rates) => {
        if (!active) return;
        const merged = { ...base };
        for (const r of rates) merged[r.equipmentId] = r.rate;
        setClientRateMap(merged);
      })
      .catch(() => { if (active) setClientRateMap(base); });
    return () => { active = false; };
  }, [selectedClientId, allEquipment]);

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

  const makePositionRow = (no: number, posName: string, days: number): QuotationRow => {
    const meta = positionMap[posName] ?? { equip: "", rate: 0 };
    return { no, position: posName, equip: meta.equip, rate: meta.rate, days, amount: meta.rate * days };
  };

  const getDefaultRows = (inq: any, days: number): QuotationRow[] => {
    if (!inq) return [];
    const dept = inq.department || "VIDEO";
    if (dept === "LED") {
      const area = inq.screenWidth && inq.screenHeight ? inq.screenWidth * inq.screenHeight : 0;
      const rateSetting = inq.ratePerSqft || 50;
      const rate = rateSetting * area;
      const desc = `LED Screen ${inq.screenWidth || 0}x${inq.screenHeight || 0} ${inq.ledType || "P4"} (${inq.location || "INDOOR"})${inq.stageType ? ` at ${inq.stageType}` : ""}`;
      return [
        { no: 1, position: desc, equip: `${inq.ledType || "P4"} LED`, rate, days, amount: rate * days },
        makePositionRow(2, "Installation & de-installation charges", 1),
        makePositionRow(3, "Content management operator", days),
      ];
    } else if (dept === "MERGED") {
      const area = inq.screenWidth && inq.screenHeight ? inq.screenWidth * inq.screenHeight : 0;
      const rateSetting = inq.ratePerSqft || 50;
      const rate = rateSetting * area;
      const desc = `LED Screen ${inq.screenWidth || 0}x${inq.screenHeight || 0} ${inq.ledType || "P4"} (${inq.location || "INDOOR"})${inq.stageType ? ` at ${inq.stageType}` : ""}`;
      return [
        makePositionRow(1, "Center Tally", days),
        makePositionRow(2, "Center Semi Wide", days),
        makePositionRow(3, "Wireless 1", days),
        makePositionRow(4, "Photo 1", days),
        makePositionRow(5, "Video Crane 32 Feet", days),
        { no: 6, position: desc, equip: `${inq.ledType || "P4"} LED`, rate, days, amount: rate * days },
        makePositionRow(7, "Installation & de-installation charges", 1),
        makePositionRow(8, "Content management operator", days),
      ];
    } else {
      return [
        makePositionRow(1, "Center Tally", days),
        makePositionRow(2, "Center Semi Wide", days),
        makePositionRow(3, "Wireless 1", days),
        makePositionRow(4, "Photo 1", days),
        makePositionRow(5, "Video Crane 32 Feet", days),
      ];
    }
  };

  // Rows — start empty for new quotations; populated once positionMap loads from DB
  const [rows, setRows] = useState<QuotationRow[]>(() => {
    if (existingQuotation) return existingQuotation.equipment;
    return [];
  });

  // Once positionMap is loaded from DB, populate default rows for new quotations
  useEffect(() => {
    if (!positionsLoaded) return;
    if (existingQuotation) return; // editing — keep existing rows
    const inq = inquiries.find((i) => i.id === selectedInquiryId);
    setRows(getDefaultRows(inq, eventDays));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsLoaded]);

  const canWrite = existingQuotation ? can("quotations.edit") : can("quotations.create");

  // LED config states
  const [screenWidth, setScreenWidth] = useState("");
  const [screenHeight, setScreenHeight] = useState("");
  const [ledType, setLedType] = useState("P4");
  const [location, setLocation] = useState("INDOOR");
  const [stageType, setStageType] = useState("");
  const [ratePerSqft, setRatePerSqft] = useState(50);
  const [ledRates, setLedRates] = useState<Record<string, number>>({
    P4: 50, P3: 65, P2: 85, FLOOR: 90, P4_CURVED: 60,
  });

  const screenArea = screenWidth && screenHeight ? parseFloat(screenWidth) * parseFloat(screenHeight) : 0;
  const totalCabinets = Math.ceil(screenArea / 4);

  // Initialize LED states from inquiry or existing quotation
  useEffect(() => {
    if (selectedInquiry) {
      setScreenWidth(selectedInquiry.screenWidth ? String(selectedInquiry.screenWidth) : "");
      setScreenHeight(selectedInquiry.screenHeight ? String(selectedInquiry.screenHeight) : "");
      const type = selectedInquiry.ledType || "P4";
      setLedType(type);
      setLocation(selectedInquiry.location || "INDOOR");
      setStageType(selectedInquiry.stageType || "");
      
      const baseRates = { P4: 50, P3: 65, P2: 85, FLOOR: 90, P4_CURVED: 60 };
      if (selectedInquiry.ratePerSqft) {
        setLedRates({
          ...baseRates,
          [type]: selectedInquiry.ratePerSqft
        });
        setRatePerSqft(selectedInquiry.ratePerSqft);
      } else {
        setLedRates(baseRates);
        setRatePerSqft(baseRates[type as keyof typeof baseRates] ?? 50);
      }
    }
  }, [selectedInquiryId]); // Only trigger when inquiry changes

  // Auto-update rate when LED type changes
  useEffect(() => {
    setRatePerSqft(ledRates[ledType] ?? 50);
  }, [ledType, ledRates]);

  // Synchronize LED states back to quotation rows
  useEffect(() => {
    const isLedOrMerged = selectedInquiry?.department === "LED" || selectedInquiry?.department === "MERGED";
    if (!isLedOrMerged) return;

    const area = screenWidth && screenHeight ? parseFloat(screenWidth) * parseFloat(screenHeight) : 0;
    const rate = ratePerSqft * area;
    const desc = `LED Screen ${screenWidth || 0}x${screenHeight || 0} ${ledType} (${location})${stageType ? ` at ${stageType}` : ""}`;

    setRows((prev) => {
      // Find row indexes
      const ledRowIdx = prev.findIndex(r => r.equip.includes("LED") || r.equip.toLowerCase() === "led screen");

      const nextRows = [...prev];

      // 1. Sync or add LED Screen row
      if (ledRowIdx !== -1) {
        nextRows[ledRowIdx] = {
          ...nextRows[ledRowIdx],
          position: desc,
          equip: `${ledType} LED`,
          rate: rate,
          days: eventDays,
          amount: rate * eventDays,
        };
      } else {
        const maxNo = nextRows.reduce((m, r) => Math.max(m, r.no), 0);
        nextRows.push({
          no: maxNo + 1,
          position: desc,
          equip: `${ledType} LED`,
          rate: rate,
          days: eventDays,
          amount: rate * eventDays,
        });
      }

      // 2. Sync or add Installation row
      const updatedInstallRowIdx = nextRows.findIndex(r => r.position.toLowerCase().includes("installation"));
      if (updatedInstallRowIdx !== -1) {
        nextRows[updatedInstallRowIdx] = {
          ...nextRows[updatedInstallRowIdx],
          rate: 5000,
          days: 1,
          amount: 5000,
        };
      } else {
        const maxNo = nextRows.reduce((m, r) => Math.max(m, r.no), 0);
        nextRows.push({
          no: maxNo + 1,
          position: "Installation & de-installation charges",
          equip: "Service",
          rate: 5000,
          days: 1,
          amount: 5000,
        });
      }

      // 3. Sync or add Operator row
      const updatedOperatorRowIdx = nextRows.findIndex(r => r.position.toLowerCase().includes("operator"));
      if (updatedOperatorRowIdx !== -1) {
        nextRows[updatedOperatorRowIdx] = {
          ...nextRows[updatedOperatorRowIdx],
          rate: 2000,
          days: eventDays,
          amount: 2000 * eventDays,
        };
      } else {
        const maxNo = nextRows.reduce((m, r) => Math.max(m, r.no), 0);
        nextRows.push({
          no: maxNo + 1,
          position: "Content management operator",
          equip: "Operator",
          rate: 2000,
          days: eventDays,
          amount: 2000 * eventDays,
        });
      }

      // Re-index row numbers
      return nextRows.map((r, i) => ({ ...r, no: i + 1 }));
    });
  }, [screenWidth, screenHeight, ledType, location, stageType, ratePerSqft, selectedInquiry, eventDays]);

  // getDefaultRows and rows state moved above

  const handleInquiryChange = (id: string) => {
    setSelectedInquiryId(id);
    const inq = inquiries.find((i) => i.id === id);
    const days = inq ? calcDays(inq.startDate, inq.endDate) : 1;
    const q = quotations.find((qt) => qt.inquiryId === id && qt.status !== "Revised");
    if (q) {
      setRows(q.equipment);
    } else {
      setRows(getDefaultRows(inq, days));
    }
  };

  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const { cgst, sgst, total } = computeGst(subtotal);

  const updateRow = (no: number, field: keyof QuotationRow, value: string | number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.no !== no) return row;
        const updated = { ...row, [field]: value };
        if (field === "equip") {
          const name = value as string;
          const eqId = equipNameToId[name];
          if (eqId != null && clientRateMap[eqId] != null) {
            updated.rate = clientRateMap[eqId];
          } else if (kitNameToRate[name] != null) {
            updated.rate = kitNameToRate[name];
          }
        }
        // When creating (not editing), cap days at eventDays
        if (field === "days" && !existingQuotation) {
          updated.days = Math.min(Number(value), eventDays);
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

    // Validate rows on frontend before submitting
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.position?.trim()) {
        toast.error(`Row #${row.no}: Please select a Position.`);
        setSaving(false);
        return;
      }
      if (!row.equip?.trim()) {
        toast.error(`Row #${row.no}: Please select a Kit or Equipment.`);
        setSaving(false);
        return;
      }
      if (typeof row.rate !== "number" || row.rate < 0) {
        toast.error(`Row #${row.no}: Rate must be a non-negative number.`);
        setSaving(false);
        return;
      }
      // When creating, days cannot exceed event duration
      if (!existingQuotation && row.days > days) {
        toast.error(`Row #${row.no}: Days (${row.days}) cannot exceed event duration (${days} days).`);
        setSaving(false);
        return;
      }
    }

    const quoteData = {
      equipment: rows, subtotal, cgst, sgst, total,
      status: "Draft" as const,
      sentAt: null as string | null,
      approvedAt: null as string | null,
    };

    try {
      const isLedOrMerged = selectedInquiry.department === "LED" || selectedInquiry.department === "MERGED";
      if (isLedOrMerged) {
        const area = screenWidth && screenHeight ? parseFloat(screenWidth) * parseFloat(screenHeight) : 0;
        const cabinets = Math.ceil(area / 4);
        await dispatchInquiries({
          type: "UPDATE_INQUIRY",
          payload: {
            id: selectedInquiry.id,
            screenWidth: screenWidth ? parseFloat(screenWidth) : null,
            screenHeight: screenHeight ? parseFloat(screenHeight) : null,
            screenAreaSqft: area > 0 ? area : null,
            totalCabinets: area > 0 ? cabinets : null,
            ledType: ledType,
            ratePerSqft: ratePerSqft,
            location: location,
            stageType: stageType || null,
          }
        });
      }

      if (existingQuotation) {
        // Update existing — keep same quoteNo
        await dispatchQuotations({
          type: "UPDATE_QUOTATION",
          payload: { id: existingQuotation.id, ...quoteData },
        });
        toast.success("Quotation updated. Open the PDF from the inquiry's Quotation tab.");
        // Return to the inquiry hub rather than the PDF — avoids the
        // PDF → breadcrumb-back detour; the PDF is one click away in the hub.
        router.push(`/inquiries/${selectedInquiry.id}`);
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
            eventName: selectedInquiry.eventName || selectedInquiry.eventType,
            quoteNo,
            startDate,
            endDate,
            days,
            venue: selectedInquiry.venue,
            ...quoteData,
            createdAt: now.toISOString().split("T")[0],
          },
        });
        // Advance inquiry status to Quoted if it was still New
        if (selectedInquiry.status === "New") {
          await dispatchInquiries({
            type: "UPDATE_INQUIRY",
            payload: { id: selectedInquiry.id, status: "Quoted" },
          });
        }
        toast.success("Quotation created. Open the PDF from the inquiry's Quotation tab.");
        // Return to the inquiry hub rather than the PDF — keeps the user in the
        // pipeline flow; the new quotation's PDF is one click away in the hub.
        router.push(`/inquiries/${selectedInquiry.id}`);
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
        breadcrumbs={[
          { label: "Inquiries", href: "/inquiries" },
          { label: selectedInquiry?.eventName || selectedInquiry?.eventType || "—", href: selectedInquiry ? `/inquiries/${selectedInquiry.id}` : undefined },
          { label: "Quotation" },
        ]}
        actions={
          canWrite ? (
            <button
              className={`btn btn-success ${!selectedInquiry || saving ? "opacity-50" : ""}`}
              onClick={handleSave}
              disabled={!selectedInquiry || saving}
            >
              {saving ? "Saving..." : existingQuotation ? "Update quotation ↗" : "Save quotation ↗"}
            </button>
          ) : (
            <span className="text-[11px] text-tx3">View only — you don&apos;t have {existingQuotation ? "edit" : "create"} access.</span>
          )
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
                  label: `${inq.eventName || inq.eventType} — ${c?.name ?? "Unknown"} (${inq.startDate})`
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
            <div className="text-[12px] font-medium">{(selectedInquiry?.eventName || selectedInquiry?.eventType) ?? "—"}</div>
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

        {/* LED Screen Configuration (Editable) */}
        {selectedInquiry && (selectedInquiry.department === 'LED' || selectedInquiry.department === 'MERGED') && (
          <fieldset disabled={!canWrite} className="card" style={{ padding: "16px", marginBottom: "14px", border: "1px solid var(--sem-bl-bdr)", minInlineSize: "auto" }}>
            <div className="text-[12px] font-medium text-bl" style={{ marginBottom: "12px" }}>LED Screen Configuration</div>
            <div className="fgrid">
              <div className="field">
                <div className="flbl">Screen Width (ft) *</div>
                <input
                  className="finp"
                  type="number"
                  min="1"
                  value={screenWidth}
                  onChange={(e) => setScreenWidth(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
              <div className="field">
                <div className="flbl">Screen Height (ft) *</div>
                <input
                  className="finp"
                  type="number"
                  min="1"
                  value={screenHeight}
                  onChange={(e) => setScreenHeight(e.target.value)}
                  placeholder="e.g. 8"
                />
              </div>
              <div className="field span2">
                <div className="flbl">LED Type *</div>
                <select
                  className="fsel"
                  value={ledType}
                  onChange={(e) => setLedType(e.target.value)}
                >
                  {['P4', 'P3', 'P2', 'FLOOR', 'P4_CURVED'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <div className="flbl">Location</div>
                <select
                  className="fsel"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="INDOOR">Indoor</option>
                  <option value="OUTDOOR">Outdoor</option>
                </select>
              </div>
              <div className="field">
                <div className="flbl">Stage Type</div>
                <input
                  className="finp"
                  value={stageType}
                  onChange={(e) => setStageType(e.target.value)}
                  placeholder="e.g. Main stage"
                />
              </div>
              <div className="field span2">
                <div className="flbl">Rate per sq.ft (₹)</div>
                <input
                  className="finp"
                  type="number"
                  min="1"
                  value={ratePerSqft}
                  onChange={(e) => setRatePerSqft(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div style={{ marginTop: "16px", borderTop: "1px dashed var(--b1)", paddingTop: "12px" }}>
              <div className="text-[11px] font-medium text-tx2" style={{ marginBottom: "8px" }}>LED Type Rate Settings (Editable per Quotation)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                {Object.entries(ledRates).map(([type, rate]) => (
                  <div key={type} className="field">
                    <div className="flbl" style={{ fontSize: "9px" }}>{type} Rate</div>
                    <input
                      type="number"
                      className="finp text-[10px]"
                      value={rate}
                      onChange={(e) => {
                        const newVal = Number(e.target.value) || 0;
                        setLedRates(prev => ({ ...prev, [type]: newVal }));
                        if (ledType === type) {
                          setRatePerSqft(newVal);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            {screenArea > 0 && (
              <div className="flex gap-4 mt-3" style={{ background: 'var(--sem-bl-bg)', color: 'var(--sem-bl-tx)', borderRadius: '6px', padding: '8px 12px', fontSize: '11px' }}>
                <span>Area: <strong>{screenArea.toFixed(1)} sq.ft</strong></span>
                <span>Cabinets: <strong>{totalCabinets} pcs</strong></span>
                <span className="ml-auto">Estimated amount: <strong>₹{(screenArea * ratePerSqft * eventDays).toLocaleString('en-IN')}</strong></span>
              </div>
            )}
          </fieldset>
        )}

        <div className="two-col">
          {/* Left — equipment table */}
          <fieldset disabled={!canWrite} style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto" }}>
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
                    background: "var(--bdg-gy-bg)",
                    color: "var(--bdg-gy-tx)",
                    border: "1px solid var(--b1)",
                    marginLeft: "8px",
                  }}
                >
                  ● Live DB
                </span>
                {addingPosition ? (
                  <div className="ml-auto" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      className="finp text-[10px]"
                      autoFocus
                      placeholder="Position name *"
                      value={newPosition}
                      onChange={(e) => setNewPosition(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleAddPosition(); }
                        if (e.key === "Escape") { setAddingPosition(false); setNewPosition(""); setNewPositionEquip(""); setNewPositionRate(0); }
                      }}
                      style={{ width: 140 }}
                    />
                    <input
                      className="finp text-[10px]"
                      placeholder="Equipment (optional)"
                      value={newPositionEquip}
                      onChange={(e) => setNewPositionEquip(e.target.value)}
                      style={{ width: 130 }}
                    />
                    <input
                      className="finp text-[10px]"
                      type="number"
                      min={0}
                      placeholder="Rate/day"
                      value={newPositionRate || ""}
                      onChange={(e) => setNewPositionRate(Number(e.target.value) || 0)}
                      style={{ width: 80 }}
                    />
                    <button className="btn btn-primary text-[10px]" onClick={handleAddPosition}>Add</button>
                    <button className="btn text-[10px]" onClick={() => { setAddingPosition(false); setNewPosition(""); setNewPositionEquip(""); setNewPositionRate(0); }}>✕</button>
                  </div>
                ) : (
                  <button className="btn ml-auto text-[10px]" onClick={() => setAddingPosition(true)}>+ Add position</button>
                )}
                <button className="btn text-[10px]" onClick={addRow}>+ Add row</button>
              </div>
              <div className="overflow-x-auto" style={{ overflow: "visible" }}>
                <table className="tbl" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>No.</th>
                      <th style={{ width: 160 }}>Position</th>
                      <th style={{ width: 130 }}>Equipment/Kits</th>
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
                            {/* LED description rows have a free-form position (not in the positions list) */}
                            {row.equip.endsWith(" LED") ? (
                              <input
                                className="finp text-[10px]"
                                value={row.position}
                                onChange={(e) => updateRow(row.no, "position", e.target.value)}
                                placeholder="LED screen description"
                              />
                            ) : (
                              <SearchableSelect
                                className="text-[10px]"
                                value={row.position}
                                onChange={(val) => updateRow(row.no, "position", val)}
                                options={positions.map(p => ({ value: p, label: p }))}
                                placeholder={positionsLoaded ? "Select position" : "Loading positions…"}
                                placement={placement}
                              />
                            )}
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
                              max={!existingQuotation ? eventDays : undefined}
                              title={!existingQuotation ? `Max ${eventDays} days (event duration)` : undefined}
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
          </fieldset>

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

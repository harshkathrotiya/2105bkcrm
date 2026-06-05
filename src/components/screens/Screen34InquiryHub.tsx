"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import SearchableSelect from "../ui/SearchableSelect";
import {
  useInquiries,
  useQuotations,
  useInvoices,
  useClients,
  useCalendar,
  useKits,
  useEquipment,
} from "@/lib/store";
import type { QuotationRow } from "@/lib/store";
import type { Equipment, Kit } from "@/lib/types";
import { generateId } from "@/lib/types";
import { generateQuoteNo, calcDays } from "@/lib/utils";
import { computeGst } from "@/lib/pricing";
import * as api from "@/lib/api";
import { approveQuotation } from "@/lib/approve-quotation";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import QuotationPDFModal from "../ui/QuotationPDFModal";
import Screen17WarehouseCheck from "./Screen17WarehouseCheck";
import Screen23AssignPosition from "./Screen23AssignPosition";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  FileText, Receipt, Users, Building2, Wallet, CalendarDays, Pencil,
  ArrowRight, CheckCircle2, AlertCircle, ChevronRight, Trash2,
} from "lucide-react";

const fmt = (n: number) => (n ?? 0).toLocaleString("en-IN");

type Tab = "overview" | "quotation" | "warehouse" | "crew" | "preview" | "invoice";

// ── Default position list (copy from Screen05) ──────────────────────────────
const DEFAULT_POSITION_MAP: Record<string, { equip: string; rate: number }> = {
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
  "Editor":              { equip: "Video Editing System", rate:  5000 },
  "Photo Editor":        { equip: "Photo Editing Laptop", rate:  5000 },
  "Video Crane 32 Feet": { equip: "Crane 32 Feet",  rate: 15000 },
  "Drone":               { equip: "Drone",          rate: 12000 },
  "FPV":                 { equip: "FPV",            rate: 15000 },
};

const EQUIPMENT_LIST = Array.from(new Set(Object.values(DEFAULT_POSITION_MAP).map((m) => m.equip)));

function makeRow(no: number, days: number): QuotationRow {
  return { no, position: "", equip: "", rate: 0, days, amount: 0 };
}

// ── Step definitions ─────────────────────────────────────────────────────────
const STEP_KEYS: Tab[] = ["overview", "quotation", "warehouse", "crew", "preview", "invoice"];
const STEP_LABELS: Record<Tab, string> = {
  overview: "Overview",
  quotation: "Quotation",
  warehouse: "Warehouse",
  crew: "Crew",
  preview: "Preview",
  invoice: "Invoice",
};

export default function Screen34InquiryHub({ inquiryId, activeTab }: { inquiryId: string; activeTab?: Tab }) {
  const router = useRouter();
  const toast = useToast();
  const { can } = useCurrentUser();
  const { inquiries, loading: inqLoading, dispatchInquiries } = useInquiries();
  const { quotations, dispatchQuotations, loading: quoLoading } = useQuotations();
  const { invoices, dispatchInvoices, loading: invLoading } = useInvoices();
  const { clients } = useClients();
  const { calendarEvents, dispatchCalendar } = useCalendar();
  const { kits } = useKits();
  const { equipment: allEquipment } = useEquipment();

  // ── Hub state ────────────────────────────────────────────────────────────────
  const tab: Tab = activeTab || "overview";

  // setTab navigates to the sub-route URL so the active tab persists on refresh
  const setTab = (next: Tab) => {
    const base = `/inquiries/${inquiryId}`;
    router.push(next === "overview" ? base : `${base}/${next}`);
  };
  const [assignments, setAssignments] = useState<any[]>([]);
  const [approving, setApproving] = useState(false);
  const [videoPercent, setVideoPercent] = useState(82);
  const [showApprove, setShowApprove] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // ── Quotation form state (embedded from Screen05) ────────────────────────────
  const [positionMap, setPositionMap] = useState<Record<string, { equip: string; rate: number }>>(DEFAULT_POSITION_MAP);
  const [addingPosition, setAddingPosition] = useState(false);
  const [newPosition, setNewPosition] = useState("");
  const [editingPosition, setEditingPosition] = useState<string | null>(null); // the old value being renamed
  const [editPositionName, setEditPositionName] = useState("");
  const [showPosDropdown, setShowPosDropdown] = useState<number | null>(null); // row.no of open dropdown
  const posDropdownRef = useRef<HTMLDivElement>(null);
  const [clientRateMap, setClientRateMap] = useState<Record<number, number>>({});
  const [screenWidth, setScreenWidth] = useState("");
  const [screenHeight, setScreenHeight] = useState("");
  const [ledType, setLedType] = useState("P4");
  const [location, setLocation] = useState("INDOOR");
  const [stageType, setStageType] = useState("");
  const [ratePerSqft, setRatePerSqft] = useState(50);
  const [ledRates, setLedRates] = useState<Record<string, number>>({
    P4: 50, P3: 65, P2: 85, FLOOR: 90, P4_CURVED: 60,
  });
  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Derived inquiry data ─────────────────────────────────────────────────────
  const inquiry = inquiries.find((i) => i.id === inquiryId);
  const client = inquiry ? clients.find((c) => c.id === inquiry.clientId) : undefined;

  const quotation = useMemo(
    () => quotations.find((q) => q.inquiryId === inquiryId && q.status !== "Revised"),
    [quotations, inquiryId]
  );
  const invoice = useMemo(
    () => (quotation ? invoices.find((inv) => inv.quotationId === quotation.id) : undefined),
    [invoices, quotation]
  );

  // Crew assignments
  // Only fetch crew assignments when a crew-relevant tab is opened
  const assignmentsFetchedRef = useRef(false);
  const crewTabs = ["crew", "overview", "preview"];
  useEffect(() => {
    if (!crewTabs.includes(tab) && !assignmentsFetchedRef.current) return;
    assignmentsFetchedRef.current = true;
    let active = true;
    api.fetchStaffAssignments(inquiryId)
      .then((a) => { if (active) setAssignments(a); })
      .catch(() => { if (active) setAssignments([]); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId, tab]);

  const crewCost = useMemo(() => assignments.reduce((s, a) => s + (a.totalAmount || 0), 0), [assignments]);

  // ── Quotation form helpers ───────────────────────────────────────────────────
  const positions = useMemo(() => Object.keys(positionMap), [positionMap]);

  // Only fetch position options when the quotation tab is first opened
  const positionsFetchedRef = useRef(false);
  useEffect(() => {
    if (tab !== "quotation" || positionsFetchedRef.current) return;
    positionsFetchedRef.current = true;
    let active = true;
    api.fetchOptions("QUOTATION_POSITION")
      .then((opts) => {
        if (!active || opts.length === 0) return;
        const map: Record<string, { equip: string; rate: number }> = {};
        for (const o of opts) {
          let eq = o.metaEquip || "";
          if (eq === "Photo Editor") eq = "Photo Editing Laptop";
          if (eq === "Editor") eq = "Video Editing System";
          map[o.value] = { equip: eq, rate: o.metaRate || 0 };
        }
        setPositionMap(map);
      })
      .catch(() => { /* keep defaults */ });
    return () => { active = false; };
  }, [tab]);

  useEffect(() => {
    if (showPosDropdown === null) return;
    function handler(e: MouseEvent) {
      if (posDropdownRef.current && !posDropdownRef.current.contains(e.target as Node))
        setShowPosDropdown(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPosDropdown]);

  const handleAddPosition = async () => {
    const value = newPosition.trim();
    if (!value) return;
    try {
      await api.addOption("QUOTATION_POSITION", value);
      setPositionMap((prev) => ({ ...prev, [value]: { equip: "", rate: 0 } }));
      setNewPosition("");
      setAddingPosition(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add position");
    }
  };

  const handleEditPosition = async () => {
    const oldValue = editingPosition;
    const newValue = editPositionName.trim();
    if (!oldValue || !newValue || oldValue === newValue) { setEditingPosition(null); return; }
    try {
      await api.updateOption("QUOTATION_POSITION", oldValue, newValue);
      setPositionMap((prev) => {
        const updated: Record<string, { equip: string; rate: number }> = {};
        for (const [k, v] of Object.entries(prev)) updated[k === oldValue ? newValue : k] = v;
        return updated;
      });
      // update any rows that used the old position name
      setRows((prev) => prev.map((r) => r.position === oldValue ? { ...r, position: newValue } : r));
      setEditingPosition(null);
      toast.success("Position renamed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename position");
    }
  };

  const confirm = useConfirm();
  const handleDeletePosition = async (value: string) => {
    const ok = await confirm({
      message: `Remove position "${value}" from the list? Existing rows using it won't be affected.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.removeOption("QUOTATION_POSITION", value);
      setPositionMap((prev) => {
        const next = { ...prev };
        delete next[value];
        return next;
      });
      toast.success("Position removed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove position");
    }
  };

  const equipNameToId = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of allEquipment) {
      if (!(e.productName in m)) m[e.productName] = e.id;
    }
    return m;
  }, [allEquipment]);

  const liveEquipOptions = useMemo(() => {
    const kitOpts = kits.map((k: Kit) => ({ value: k.name, label: `${k.name}`, group: "Kits" }));
    const eqOpts = allEquipment
      .filter((e: Equipment) => e.status === "AVAILABLE" || e.status === "IN_USE")
      .map((e: Equipment) => ({
        value: e.productName,
        label: `${e.productName}${e.serialNumber ? ` (${e.serialNumber})` : ""}`,
        group: "Equipment Items",
      }));
    const seen = new Set<string>();
    const all = [...kitOpts, ...eqOpts].filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
    if (all.length === 0) return EQUIPMENT_LIST.map((e) => ({ value: e, label: e, group: "" }));
    return all;
  }, [kits, allEquipment]);

  const selectedClientId = client?.id;

  // Build effective rate map — only re-fetch when client changes, not on every
  // equipment store update (allEquipment changes reference on each context load).
  const equipmentBaseRates = useMemo(() => {
    const base: Record<number, number> = {};
    for (const e of allEquipment) {
      if (e.defaultRate != null) base[e.id] = e.defaultRate;
    }
    return base;
  }, [allEquipment]);

  useEffect(() => {
    if (!selectedClientId) {
      setClientRateMap(equipmentBaseRates);
      return;
    }
    let active = true;
    api.fetchClientRates(selectedClientId)
      .then((rates) => {
        if (!active) return;
        const merged = { ...equipmentBaseRates };
        for (const r of rates) merged[r.equipmentId] = r.rate;
        setClientRateMap(merged);
      })
      .catch(() => { if (active) setClientRateMap(equipmentBaseRates); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]); // intentionally omit equipmentBaseRates — client change is the trigger

  const eventDays = useMemo(
    () => inquiry ? calcDays(inquiry.startDate, inquiry.endDate) : 1,
    [inquiry]
  );

  const existingQuotation = useMemo(
    () => quotations.find((q) => q.inquiryId === inquiryId && q.status !== "Revised"),
    [quotations, inquiryId]
  );

  const canWrite = existingQuotation ? can("quotations.edit") : can("quotations.create");
  const canEditInquiry = can("inquiries.edit");

  // Initialize LED states from inquiry — only when quotation tab is active
  useEffect(() => {
    if (tab !== "quotation" || !inquiry) return;
    if (inquiry) {
      setScreenWidth(inquiry.screenWidth ? String(inquiry.screenWidth) : "");
      setScreenHeight(inquiry.screenHeight ? String(inquiry.screenHeight) : "");
      const type = inquiry.ledType || "P4";
      setLedType(type);
      setLocation(inquiry.location || "INDOOR");
      setStageType(inquiry.stageType || "");
      const baseRates = { P4: 50, P3: 65, P2: 85, FLOOR: 90, P4_CURVED: 60 };
      if (inquiry.ratePerSqft) {
        setLedRates({ ...baseRates, [type]: inquiry.ratePerSqft });
        setRatePerSqft(inquiry.ratePerSqft);
      } else {
        setLedRates(baseRates);
        setRatePerSqft(baseRates[type as keyof typeof baseRates] ?? 50);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId, tab]); // tab added so it runs when quotation tab first opens

  // Auto-update rate when LED type changes
  useEffect(() => {
    setRatePerSqft(ledRates[ledType] ?? 50);
  }, [ledType, ledRates]);

  // Sync LED states to rows — only active on quotation tab
  useEffect(() => {
    if (tab !== "quotation") return;
    const isLedOrMerged = inquiry?.department === "LED" || inquiry?.department === "MERGED";
    if (!isLedOrMerged) return;
    const area = screenWidth && screenHeight ? parseFloat(screenWidth) * parseFloat(screenHeight) : 0;
    const rate = ratePerSqft * area;
    const desc = `LED Screen ${screenWidth || 0}x${screenHeight || 0} ${ledType} (${location})${stageType ? ` at ${stageType}` : ""}`;

    setRows((prev) => {
      const ledRowIdx = prev.findIndex(r => r.equip.includes("LED") || r.equip.toLowerCase() === "led screen");
      const installRowIdx = prev.findIndex(r => r.position.toLowerCase().includes("installation"));
      const operatorRowIdx = prev.findIndex(r => r.position.toLowerCase().includes("operator"));
      const nextRows = [...prev];

      if (ledRowIdx !== -1) {
        nextRows[ledRowIdx] = { ...nextRows[ledRowIdx], position: desc, equip: `${ledType} LED`, rate, days: eventDays, amount: rate * eventDays };
      } else {
        const maxNo = nextRows.reduce((m, r) => Math.max(m, r.no), 0);
        nextRows.push({ no: maxNo + 1, position: desc, equip: `${ledType} LED`, rate, days: eventDays, amount: rate * eventDays });
      }

      const updatedInstallRowIdx = nextRows.findIndex(r => r.position.toLowerCase().includes("installation"));
      if (updatedInstallRowIdx !== -1) {
        nextRows[updatedInstallRowIdx] = { ...nextRows[updatedInstallRowIdx], rate: 5000, days: 1, amount: 5000 };
      } else {
        const maxNo = nextRows.reduce((m, r) => Math.max(m, r.no), 0);
        nextRows.push({ no: maxNo + 1, position: "Installation & de-installation charges", equip: "Service", rate: 5000, days: 1, amount: 5000 });
      }

      const updatedOperatorRowIdx = nextRows.findIndex(r => r.position.toLowerCase().includes("operator"));
      if (updatedOperatorRowIdx !== -1) {
        nextRows[updatedOperatorRowIdx] = { ...nextRows[updatedOperatorRowIdx], rate: 2000, days: eventDays, amount: 2000 * eventDays };
      } else {
        const maxNo = nextRows.reduce((m, r) => Math.max(m, r.no), 0);
        nextRows.push({ no: maxNo + 1, position: "Content management operator", equip: "Operator", rate: 2000, days: eventDays, amount: 2000 * eventDays });
      }

      return nextRows.map((r, i) => ({ ...r, no: i + 1 }));
    });
  }, [screenWidth, screenHeight, ledType, location, stageType, ratePerSqft, inquiry, eventDays]);

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
        { no: 2, position: "Installation & de-installation charges", equip: "Service", rate: 5000, days: 1, amount: 5000 },
        { no: 3, position: "Content management operator", equip: "Operator", rate: 2000, days, amount: 2000 * days },
      ];
    } else if (dept === "MERGED") {
      const area = inq.screenWidth && inq.screenHeight ? inq.screenWidth * inq.screenHeight : 0;
      const rateSetting = inq.ratePerSqft || 50;
      const rate = rateSetting * area;
      const desc = `LED Screen ${inq.screenWidth || 0}x${inq.screenHeight || 0} ${inq.ledType || "P4"} (${inq.location || "INDOOR"})${inq.stageType ? ` at ${inq.stageType}` : ""}`;
      return [
        { no: 1, position: "Center Tally",       equip: "FS6",            rate: 20000, days, amount: 20000 * days },
        { no: 2, position: "Center Semi Wide",    equip: "FS6",            rate: 20000, days, amount: 20000 * days },
        { no: 3, position: "Wireless 1",          equip: "FX3 + Wireless", rate: 10000, days, amount: 10000 * days },
        { no: 4, position: "Photo 1",             equip: "DSLR",           rate:  8000, days, amount:  8000 * days },
        { no: 5, position: "Video Crane 32 Feet", equip: "Crane 32 Feet",  rate: 15000, days, amount: 15000 * days },
        { no: 6, position: desc, equip: `${inq.ledType || "P4"} LED`, rate, days, amount: rate * days },
        { no: 7, position: "Installation & de-installation charges", equip: "Service", rate: 5000, days: 1, amount: 5000 },
        { no: 8, position: "Content management operator", equip: "Operator", rate: 2000, days, amount: 2000 * days },
      ];
    } else {
      return [
        { no: 1, position: "Center Tally",        equip: "FS6",            rate: 20000, days, amount: 20000 * days },
        { no: 2, position: "Center Semi Wide",     equip: "FS6",            rate: 20000, days, amount: 20000 * days },
        { no: 3, position: "Wireless 1",           equip: "FX3 + Wireless", rate: 10000, days, amount: 10000 * days },
        { no: 4, position: "Photo 1",              equip: "DSLR",           rate:  8000, days, amount:  8000 * days },
        { no: 5, position: "Video Crane 32 Feet",  equip: "Crane 32 Feet",  rate: 15000, days, amount: 15000 * days },
      ];
    }
  };

  // Initialize rows from existing quotation or defaults
  useEffect(() => {
    if (existingQuotation) {
      setRows(existingQuotation.equipment);
    } else if (inquiry) {
      setRows(getDefaultRows(inquiry, eventDays));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId, existingQuotation?.id]);

  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const { cgst, sgst, total } = computeGst(subtotal);

  const updateRow = (no: number, field: keyof QuotationRow, value: string | number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.no !== no) return row;
        const updated = { ...row, [field]: value };
        if (field === "position") {
          const m = positionMap[value as string];
          if (m) { updated.equip = m.equip; updated.rate = m.rate; }
        }
        if (field === "equip") {
          const eqId = equipNameToId[value as string];
          if (eqId != null && clientRateMap[eqId] != null) {
            updated.rate = clientRateMap[eqId];
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

  const screenArea = screenWidth && screenHeight ? parseFloat(screenWidth) * parseFloat(screenHeight) : 0;
  const totalCabinets = Math.ceil(screenArea / 4);

  const handleSave = async () => {
    if (!inquiry || !client || saving) return;
    setSaving(true);

    const now = new Date();
    const startDate = inquiry.startDate;
    const endDate = inquiry.endDate;
    const days = calcDays(startDate, endDate);

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
      const isLedOrMerged = inquiry.department === "LED" || inquiry.department === "MERGED";
      if (isLedOrMerged) {
        const area = screenWidth && screenHeight ? parseFloat(screenWidth) * parseFloat(screenHeight) : 0;
        const cabinets = Math.ceil(area / 4);
        await dispatchInquiries({
          type: "UPDATE_INQUIRY",
          payload: {
            id: inquiry.id,
            screenWidth: screenWidth ? parseFloat(screenWidth) : null,
            screenHeight: screenHeight ? parseFloat(screenHeight) : null,
            screenAreaSqft: area > 0 ? area : null,
            totalCabinets: area > 0 ? cabinets : null,
            ledType,
            ratePerSqft,
            location,
            stageType: stageType || null,
          },
        });
      }

      if (existingQuotation) {
        await dispatchQuotations({
          type: "UPDATE_QUOTATION",
          payload: { id: existingQuotation.id, ...quoteData },
        });
        toast.success("Quotation updated.");
      } else {
        const activeQuotes = quotations.filter(
          (q) => q.inquiryId === inquiry.id && q.status !== "Revised"
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
            inquiryId: inquiry.id,
            clientName: client.name,
            eventName: inquiry.eventName || inquiry.eventType,
            quoteNo,
            startDate,
            endDate,
            days,
            venue: inquiry.venue,
            ...quoteData,
            createdAt: now.toISOString().split("T")[0],
          },
        });
        if (inquiry.status === "New") {
          await dispatchInquiries({
            type: "UPDATE_INQUIRY",
            payload: { id: inquiry.id, status: "Quoted" },
          });
        }
        toast.success("Quotation created.");
      }
      // Advance to warehouse step instead of router.push
      setTab("warehouse");
    } finally {
      setSaving(false);
    }
  };

  // ── Approve logic ────────────────────────────────────────────────────────────
  const isLed = inquiry ? (inquiry.department === "LED" || inquiry.department === "MERGED") : false;

  const doApprove = async () => {
    if (!quotation || approving || !inquiry) return;
    setApproving(true);
    try {
      await approveQuotation({
        quotation, inquiry, invoices, calendarEvents, videoPercent,
        dispatchQuotations, dispatchInquiries, dispatchInvoices, dispatchCalendar,
      });
      setShowApprove(false);
      toast.success("Quotation approved — invoice generated!");
      // Small delay so the store updates before we switch tabs
      setTimeout(() => setTab("invoice"), 150);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  // ── Revert approval ─────────────────────────────────────────────────────────
  const [reverting, setReverting] = useState(false);

  const doRevert = async () => {
    if (!quotation || !inquiry || reverting) return;
    const ok = await confirm({
      title: "Revert approval?",
      message: invoice
        ? `This will set the quotation back to Draft, revert the inquiry to Quoted, and DELETE the auto-generated invoice (${invoice.invoiceNo}). This cannot be undone if payments have been recorded.`
        : "This will set the quotation back to Draft and revert the inquiry to Quoted.",
      confirmLabel: "Yes, revert",
      danger: true,
    });
    if (!ok) return;
    setReverting(true);
    try {
      // 1. Delete invoice if it exists and is unpaid
      if (invoice) {
        await dispatchInvoices({ type: "DELETE_INVOICE", payload: { id: invoice.id } });
      }
      // 2. Revert quotation to Draft
      await dispatchQuotations({
        type: "UPDATE_QUOTATION",
        payload: { id: quotation.id, status: "Draft", approvedAt: null },
      });
      // 3. Revert inquiry to Quoted
      await dispatchInquiries({
        type: "UPDATE_INQUIRY",
        payload: { id: inquiry.id, status: "Quoted" },
      });
      // 4. Rebuild calendar events back to "inquiry" type
      const toDelete = calendarEvents.filter((e) => e.id.startsWith(`cal-${inquiry.id}-confirmed-`));
      if (toDelete.length > 0) {
        await dispatchCalendar({ type: "BULK_DELETE_CALENDAR_EVENTS", payload: toDelete.map((e) => e.id) });
      }
      const startDt = new Date(quotation.startDate);
      const endDt = new Date(quotation.endDate);
      const toAdd: any[] = [];
      let idx = 0;
      for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
        toAdd.push({
          id: `cal-${inquiry.id}-${idx++}`,
          date: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear(),
          label: `${quotation.eventName || inquiry.eventType} — ${quotation.clientName}`,
          type: "inquiry",
        });
      }
      if (toAdd.length > 0) {
        await dispatchCalendar({ type: "BULK_ADD_CALENDAR_EVENTS", payload: toAdd });
      }
      toast.success("Approval reverted — quotation is back to Draft.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to revert approval");
    } finally {
      setReverting(false);
    }
  };

  // ── Step completion ──────────────────────────────────────────────────────────
  const stepDone: Record<Tab, boolean> = {
    overview:  true,
    quotation: !!quotation,
    warehouse: !!quotation,
    crew:      assignments.length > 0,
    preview:   quotation?.status === "Approved",
    invoice:   !!invoice,
  };

  const STEPS = STEP_KEYS.map((key, i) => ({
    key,
    label: STEP_LABELS[key],
    done: stepDone[key],
    index: i,
  }));

  const currentStepIndex = STEP_KEYS.indexOf(tab);

  const goNext = () => {
    if (currentStepIndex < STEP_KEYS.length - 1) setTab(STEP_KEYS[currentStepIndex + 1]);
  };
  const goPrev = () => {
    if (currentStepIndex > 0) setTab(STEP_KEYS[currentStepIndex - 1]);
  };

  const loading = inqLoading || quoLoading || invLoading;

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton rows={8} message="Loading inquiry…" />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--tx3)" }}>
        <div style={{ fontSize: 14, marginBottom: 12 }}>Inquiry not found.</div>
        <Link href="/inquiries" className="btn btn-primary">← Back to inquiries</Link>
      </div>
    );
  }

  // ── Bottom nav helper ────────────────────────────────────────────────────────
  const canGoNext = (() => {
    if (tab === "quotation") return !!quotation;
    if (tab === "preview") return quotation?.status === "Approved";
    return true;
  })();

  const nextLabel = currentStepIndex < STEP_KEYS.length - 1
    ? `Next: ${STEP_LABELS[STEP_KEYS[currentStepIndex + 1]]} →`
    : "Done";

  const bottomNav = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--b1)" }}>
      <div>
        {currentStepIndex > 0 && (
          <button className="btn" onClick={goPrev} style={{ fontSize: 12 }}>
            ← Previous
          </button>
        )}
      </div>
      <span style={{ fontSize: 11, color: "var(--tx3)" }}>
        Step {currentStepIndex + 1} of {STEP_KEYS.length}
      </span>
      <div>
        {currentStepIndex < STEP_KEYS.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={goNext}
            disabled={!canGoNext}
            style={{ fontSize: 12, opacity: canGoNext ? 1 : 0.45 }}
          >
            {nextLabel}
          </button>
        ) : (
          <Link href="/inquiries" className="btn btn-success" style={{ fontSize: 12 }}>
            Done
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>

      {/* ── Title header ── */}
      <div style={{ padding: "18px 24px 0", background: "var(--bg)" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--tx3)", marginBottom: 8 }}>
          <Link href="/inquiries" style={{ color: "var(--tx3)", textDecoration: "none" }} className="hover:text-tx">Inquiries</Link>
          <ChevronRight size={12} style={{ opacity: 0.5 }} />
          <span style={{ color: "var(--tx2)" }}>{inquiry.eventName || inquiry.eventType}</span>
        </div>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--tx)", lineHeight: 1.2 }}>
              <span style={{ fontWeight: 400, color: "var(--tx2)" }}>{inquiry.eventName || inquiry.eventType}</span>
              {" · "}
              <strong>{client?.name || "Client"}</strong>
            </h1>
            <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 4 }}>
              {inquiry.startDate}{inquiry.endDate && inquiry.endDate !== inquiry.startDate ? ` → ${inquiry.endDate}` : ""}
              {inquiry.venue ? ` · ${inquiry.venue}` : ""}
            </div>
            {/* Underline accent */}
            <div style={{ width: 36, height: 3, background: "var(--acc)", borderRadius: 2, marginTop: 8 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge variant={inquiry.status === "Confirmed" ? "gr" : inquiry.status === "Cancelled" ? "rd" : "bl"}>
              {inquiry.status}
            </Badge>
            {canEditInquiry && (
              <Link href={`/inquiries/new?id=${inquiry.id}`} className="btn text-[11px]">
                <Pencil size={12} /> Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Step tab bar (like reference) ── */}
      <div style={{
        display: "flex", alignItems: "stretch", gap: 0,
        borderBottom: "1px solid var(--b1)",
        background: "var(--s1)",
        marginTop: 18,
        overflowX: "auto",
        paddingLeft: 24,
      }}>
        {STEPS.map((s, i) => {
          const isActive = tab === s.key;
          const isDone = s.done;
          const Icon = [CalendarDays, FileText, Building2, Users, CheckCircle2, Receipt][i];
          return (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                padding: "14px 22px",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid var(--acc)" : "2px solid transparent",
                cursor: "pointer",
                color: isActive ? "var(--tx)" : isDone ? "var(--gr)" : "var(--tx3)",
                fontWeight: isActive ? 600 : 450,
                fontSize: 12,
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                position: "relative",
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{s.label}</span>
              {isDone && !isActive && (
                <span style={{
                  position: "absolute", top: 8, right: 10,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--gr)",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Step content (full width, no card border) ── */}
      <div style={{ padding: "24px 24px 40px" }}>

        {/* ── STEP 1: OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
              <div className="card" style={{ margin: 0 }}>
                <div className="card-t">Event details</div>
                <Row k="Client" v={client?.name} />
                <Row k="Event" v={inquiry.eventName || inquiry.eventType} />
                <Row k="Type" v={inquiry.eventType} />
                <Row k="Department" v={inquiry.department} />
                <Row k="Dates" v={`${inquiry.startDate} → ${inquiry.endDate || inquiry.startDate}`} />
                <Row k="Time" v={`${inquiry.startTime || "—"} – ${inquiry.endTime || "—"}`} />
                <Row k="Venue" v={inquiry.venue || "—"} />
                {inquiry.notes && <Row k="Notes" v={inquiry.notes} />}
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div className="card-t">Status summary</div>
                <Row k="Quotation" v={quotation ? `${quotation.quoteNo} · ${quotation.status}` : "Not created"} />
                <Row k="Quote total" v={quotation ? `₹${fmt(quotation.total)}` : "—"} />
                <Row k="Invoice" v={invoice ? `${invoice.invoiceNo} · ${invoice.status}` : "Not created"} />
                <Row k="Balance due" v={invoice ? `₹${fmt(invoice.balance)}` : "—"} />
                <Row k="Crew assigned" v={`${assignments.length} · ₹${fmt(crewCost)}`} />
              </div>
            </div>
            {bottomNav()}
          </div>
        )}

        {/* ── STEP 2: QUOTATION (embedded form) ── */}
        {tab === "quotation" && (
          <div>
            {/* Info strip */}
            <div className="bg-s2 rounded-lg grid grid-cols-3" style={{ padding: "16px", marginBottom: "14px", gap: "24px 16px" }}>
              <div>
                <div className="text-[10px] text-tx3" style={{ marginBottom: "2px" }}>Client</div>
                <div className="text-[12px] font-medium">{client?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-tx3" style={{ marginBottom: "2px" }}>Event</div>
                <div className="text-[12px] font-medium">{(inquiry.eventName || inquiry.eventType) ?? "—"}</div>
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
                  {`${new Date(inquiry.startDate).getDate()}–${new Date(inquiry.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
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

            {/* LED Screen Configuration */}
            {(inquiry.department === "LED" || inquiry.department === "MERGED") && (
              <fieldset disabled={!canWrite} className="card" style={{ padding: "16px", marginBottom: "14px", border: "1px solid var(--sem-bl-bdr)", minInlineSize: "auto" }}>
                <div className="text-[12px] font-medium text-bl" style={{ marginBottom: "12px" }}>LED Screen Configuration</div>
                <div className="fgrid">
                  <div className="field">
                    <div className="flbl">Screen Width (ft) *</div>
                    <input className="finp" type="number" min="1" value={screenWidth} onChange={(e) => setScreenWidth(e.target.value)} placeholder="e.g. 10" />
                  </div>
                  <div className="field">
                    <div className="flbl">Screen Height (ft) *</div>
                    <input className="finp" type="number" min="1" value={screenHeight} onChange={(e) => setScreenHeight(e.target.value)} placeholder="e.g. 8" />
                  </div>
                  <div className="field span2">
                    <div className="flbl">LED Type *</div>
                    <select className="fsel" value={ledType} onChange={(e) => setLedType(e.target.value)}>
                      {["P4", "P3", "P2", "FLOOR", "P4_CURVED"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <div className="flbl">Location</div>
                    <select className="fsel" value={location} onChange={(e) => setLocation(e.target.value)}>
                      <option value="INDOOR">Indoor</option>
                      <option value="OUTDOOR">Outdoor</option>
                    </select>
                  </div>
                  <div className="field">
                    <div className="flbl">Stage Type</div>
                    <input className="finp" value={stageType} onChange={(e) => setStageType(e.target.value)} placeholder="e.g. Main stage" />
                  </div>
                  <div className="field span2">
                    <div className="flbl">Rate per sq.ft (₹)</div>
                    <input className="finp" type="number" min="1" value={ratePerSqft} onChange={(e) => setRatePerSqft(Number(e.target.value) || 0)} />
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
                            if (ledType === type) setRatePerSqft(newVal);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {screenArea > 0 && (
                  <div className="flex gap-4 mt-3" style={{ background: "var(--sem-bl-bg)", color: "var(--sem-bl-tx)", borderRadius: "6px", padding: "8px 12px", fontSize: "11px" }}>
                    <span>Area: <strong>{screenArea.toFixed(1)} sq.ft</strong></span>
                    <span>Cabinets: <strong>{totalCabinets} pcs</strong></span>
                    <span className="ml-auto">Estimated amount: <strong>₹{(screenArea * ratePerSqft * eventDays).toLocaleString("en-IN")}</strong></span>
                  </div>
                )}
              </fieldset>
            )}

            <div className="two-col">
              {/* Equipment table */}
              <fieldset disabled={!canWrite} style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto" }}>
                <div className="card">
                  <div className="card-t">
                    <span>Equipment table</span>
                    <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.04em", padding: "2px 6px", borderRadius: "4px", background: "var(--sem-gr-bg)", color: "var(--gr)", border: "1px solid var(--sem-gr-bdr)", marginLeft: "8px" }}>
                      ● Live DB
                    </span>
                    {addingPosition ? (
                      <div className="ml-auto" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          className="finp text-[10px]"
                          autoFocus
                          placeholder="New position name"
                          value={newPosition}
                          onChange={(e) => setNewPosition(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleAddPosition(); }
                            if (e.key === "Escape") { setAddingPosition(false); setNewPosition(""); }
                          }}
                          style={{ width: 150 }}
                        />
                        <button className="btn btn-primary text-[10px]" onClick={handleAddPosition}>Add</button>
                        <button className="btn text-[10px]" onClick={() => { setAddingPosition(false); setNewPosition(""); }}>✕</button>
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
                              <td style={{ position: "relative" }}>
                                {editingPosition && row.position === editingPosition ? (
                                  <div style={{ display: "flex", gap: 4 }}>
                                    <input
                                      className="finp text-[10px]"
                                      autoFocus
                                      value={editPositionName}
                                      onChange={(e) => setEditPositionName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") { e.preventDefault(); handleEditPosition(); }
                                        if (e.key === "Escape") setEditingPosition(null);
                                      }}
                                    />
                                    <button className="btn btn-primary text-[9px]" onClick={handleEditPosition}>Save</button>
                                    <button className="btn text-[9px]" onClick={() => setEditingPosition(null)}>✕</button>
                                  </div>
                                ) : (
                                  <div ref={showPosDropdown === row.no ? posDropdownRef : undefined} style={{ position: "relative" }}>
                                    <div
                                      className="fsel text-[10px]"
                                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "5px 8px" }}
                                      onClick={() => setShowPosDropdown(showPosDropdown === row.no ? null : row.no)}
                                    >
                                      <span style={{ color: row.position ? "var(--tx)" : "var(--tx3)" }}>
                                        {row.position || "Select position"}
                                      </span>
                                      <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
                                    </div>
                                    {showPosDropdown === row.no && (
                                      <div style={{
                                        position: "absolute", zIndex: 999,
                                        top: "100%", left: 0, minWidth: "100%",
                                        marginTop: 3, padding: 6,
                                        background: "var(--s1)", border: "1px solid var(--b1)",
                                        borderRadius: 8, boxShadow: "var(--shadow-lg)",
                                        maxHeight: 220, overflowY: "auto",
                                      }}>
                                        {positions.map((p) => (
                                          <div
                                            key={p}
                                            style={{
                                              display: "flex", alignItems: "center", justifyContent: "space-between",
                                              padding: "6px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11,
                                              background: row.position === p ? "var(--s2)" : "transparent",
                                              fontWeight: row.position === p ? 600 : 400,
                                            }}
                                            className="hover:bg-s2"
                                            onClick={() => { updateRow(row.no, "position", p); setShowPosDropdown(null); }}
                                          >
                                            <span style={{ color: "var(--tx)", flex: 1 }}>{p}</span>
                                            <div
                                              style={{ display: "flex", gap: 4, marginLeft: 6 }}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <button
                                                className="btn"
                                                style={{ padding: "2px 5px", fontSize: 9 }}
                                                title="Rename"
                                                onClick={() => {
                                                  setEditingPosition(p);
                                                  setEditPositionName(p);
                                                  updateRow(row.no, "position", p);
                                                  setShowPosDropdown(null);
                                                }}
                                              >
                                                <Pencil size={10} />
                                              </button>
                                              <button
                                                className="btn"
                                                style={{ padding: "2px 5px", fontSize: 9, color: "var(--rd)" }}
                                                title="Delete"
                                                onClick={() => { setShowPosDropdown(null); handleDeletePosition(p); }}
                                              >
                                                <Trash2 size={10} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
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

              {/* Calculation panel */}
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

            {/* Save button */}
            <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center" }}>
              {canWrite ? (
                <button
                  className={`btn btn-success${!inquiry || saving ? " opacity-50" : ""}`}
                  onClick={handleSave}
                  disabled={!inquiry || saving}
                  style={{ fontSize: 13 }}
                >
                  {saving ? "Saving…" : existingQuotation ? "Update quotation ↗" : "Save quotation ↗"}
                </button>
              ) : (
                <span className="text-[11px] text-tx3">View only — you don&apos;t have {existingQuotation ? "edit" : "create"} access.</span>
              )}
              {existingQuotation && (
                <button className="btn text-[12px]" onClick={() => setShowPdfModal(true)}>
                  <FileText size={13} /> View PDF
                </button>
              )}
            </div>

            {bottomNav()}
          </div>
        )}

        {/* ── STEP 3: WAREHOUSE ── */}
        {tab === "warehouse" && (
          <div>
            {!quotation ? (
              <div className="card" style={{ margin: 0 }}>
                <Empty
                  msg="Equipment needs come from the quotation. Create a quotation first."
                  icon={<Building2 size={26} />}
                  action={{ label: "Go to Quotation", onClick: () => setTab("quotation") }}
                />
              </div>
            ) : (
              <Screen17WarehouseCheck inquiryIdProp={inquiry.id} embedded />
            )}
            {bottomNav()}
          </div>
        )}

        {/* ── STEP 4: CREW ── */}
        {tab === "crew" && (
          <div>
            {!quotation ? (
              <div className="card" style={{ margin: 0 }}>
                <Empty
                  msg="Crew positions come from the quotation. Create a quotation first."
                  icon={<Users size={26} />}
                  action={{ label: "Go to Quotation", onClick: () => setTab("quotation") }}
                />
              </div>
            ) : (
              <Screen23AssignPosition inquiryIdProp={inquiry.id} embedded />
            )}
            {bottomNav()}
          </div>
        )}

        {/* ── STEP 5: PREVIEW ── */}
        {tab === "preview" && (
          <div>

            {/* ── Row 1: Event + Quotation ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

              {/* Event details — full */}
              <div className="card" style={{ margin: 0 }}>
                <div className="card-t">① Event details</div>
                <Row k="Client" v={client?.name} />
                <Row k="Event name" v={inquiry.eventName || "—"} />
                <Row k="Type" v={inquiry.eventType} />
                <Row k="Department" v={inquiry.department} />
                <Row k="Dates" v={`${inquiry.startDate} → ${inquiry.endDate || inquiry.startDate}`} />
                <Row k="Time" v={`${inquiry.startTime || "—"} – ${inquiry.endTime || "—"}`} />
                <Row k="Venue" v={inquiry.venue || "—"} />
                {inquiry.notes && <Row k="Notes" v={inquiry.notes} />}
                <div style={{ marginTop: 8 }}>
                  <button className="btn text-[11px]" onClick={() => setTab("overview")}>
                    ✎ Edit inquiry
                  </button>
                </div>
              </div>

              {/* Quotation — full line items */}
              <div className="card" style={{ margin: 0 }}>
                <div className="card-t" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>② Quotation</span>
                  {quotation && <Badge variant={quotation.status === "Approved" ? "gr" : quotation.status === "Sent" ? "am" : "gy"}>{quotation.status}</Badge>}
                </div>
                {!quotation ? (
                  <Empty msg="No quotation yet." action={{ label: "Create quotation", onClick: () => setTab("quotation") }} />
                ) : (
                  <>
                    <Row k="Quote no." v={quotation.quoteNo} />
                    <Row k="Date" v={quotation.createdAt} />
                    {/* Line items */}
                    <div style={{ margin: "10px 0 6px", fontSize: 10, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Line items</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {quotation.equipment.map((row) => (
                        <div key={row.no} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "3px 0", borderBottom: "1px solid var(--b1)" }}>
                          <span style={{ color: "var(--tx2)" }}>{row.no}. {row.position}</span>
                          <span style={{ color: "var(--tx3)", fontFamily: "var(--font-mono)" }}>{row.days}d</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span className="text-tx3">Subtotal</span><span className="font-mono">₹{fmt(quotation.subtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span className="text-tx3">GST (18%)</span><span className="font-mono">₹{fmt(quotation.cgst + quotation.sgst)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, paddingTop: 6, borderTop: "1px solid var(--b1)", marginTop: 4 }}>
                      <span>Total</span><span className="font-mono text-bl">₹{fmt(quotation.total)}</span>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                      <button className="btn text-[11px]" onClick={() => setTab("quotation")}>✎ Edit</button>
                      <button className="btn text-[11px]" onClick={() => setShowPdfModal(true)}>📄 View PDF</button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Row 2: Crew + Warehouse ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

              {/* Crew breakdown */}
              <div className="card" style={{ margin: 0 }}>
                <div className="card-t">③ Crew assignments</div>
                {assignments.length === 0 ? (
                  <Empty msg="No crew assigned." action={{ label: "Assign crew", onClick: () => setTab("crew") }} />
                ) : (
                  <>
                    <table className="tbl" style={{ marginBottom: 8 }}>
                      <thead><tr><th>Staff</th><th>Position</th><th className="text-right">Amount</th></tr></thead>
                      <tbody>
                        {assignments.map((a) => (
                          <tr key={a.id}>
                            <td style={{ fontSize: 11.5 }}>{a.staffName}</td>
                            <td style={{ fontSize: 11.5, color: "var(--tx3)" }}>{a.positionName || "—"}</td>
                            <td className="text-right font-mono" style={{ fontSize: 11.5 }}>₹{fmt(a.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Total: <span className="font-mono text-bl">₹{fmt(crewCost)}</span></span>
                      <button className="btn text-[11px]" onClick={() => setTab("crew")}>✎ Manage</button>
                    </div>
                  </>
                )}
              </div>

              {/* Warehouse + Invoice status */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-t">④ Warehouse</div>
                  <div style={{ fontSize: 12, color: "var(--tx3)", padding: "6px 0 8px" }}>
                    Equipment bookings and dispatch logistics.
                  </div>
                  <button className="btn text-[11px]" onClick={() => setTab("warehouse")}>Open warehouse →</button>
                </div>
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-t">⑥ Invoice</div>
                  {invoice ? (
                    <>
                      <Row k="Invoice no." v={invoice.invoiceNo} />
                      <Row k="Status" v={invoice.status} />
                      <Row k="Advance" v={`₹${fmt(invoice.advance)} ${invoice.advanceReceived ? "✓ received" : "pending"}`} />
                      <Row k="Balance" v={`₹${fmt(invoice.balance)} ${invoice.balanceReceived ? "✓ received" : "pending"}`} />
                      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                        <Link href={`/invoices/${invoice.id}`} className="btn text-[11px]">View invoice</Link>
                        <Link href={`/invoices/${invoice.id}/payment`} className="btn btn-primary text-[11px]">Record payment</Link>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--tx3)", padding: "6px 0" }}>Generated after approval.</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Approval / Re-approve panel ── */}
            <div className="card" style={{ margin: 0, marginBottom: 16 }}>
              <div className="card-t">⑤ Approval &amp; invoice generation</div>

              {!quotation ? (
                <div style={{ fontSize: 12, color: "var(--tx3)", padding: "8px 0" }}>
                  Create a quotation first before approving.
                </div>
              ) : quotation.status === "Approved" ? (
                /* Already approved — show status + revert option */
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <Badge variant="gr">✓ Approved</Badge>
                    <span style={{ fontSize: 12, color: "var(--tx3)" }}>
                      {quotation.approvedAt ? `Approved on ${quotation.approvedAt}` : "Approved"}
                      {invoice ? ` · Invoice ${invoice.invoiceNo} generated` : ""}
                    </span>
                  </div>

                  {/* Two options: revise (safe) or revert (destructive) */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {/* Option 1 — create a revision (non-destructive, keeps invoice) */}
                    <div style={{ flex: 1, minWidth: 200, padding: "12px 14px", background: "var(--s2)", borderRadius: 8, border: "1px solid var(--b1)" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)", marginBottom: 4 }}>Edit quotation (safe)</div>
                      <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 10 }}>
                        Creates a new revision draft you can edit. The existing invoice stays.
                      </div>
                      <button className="btn text-[11px]" onClick={() => setTab("quotation")}>
                        ← Go to Quotation · Create revision
                      </button>
                    </div>

                    {/* Option 2 — fully revert (destructive) */}
                    <div style={{ flex: 1, minWidth: 200, padding: "12px 14px", background: "var(--sem-rd-bg)", borderRadius: 8, border: "1px solid var(--sem-rd-bdr)" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--sem-rd-tx)", marginBottom: 4 }}>Revert approval</div>
                      <div style={{ fontSize: 11, color: "var(--sem-rd-tx)", opacity: 0.8, marginBottom: 10 }}>
                        Sets quotation back to Draft{invoice ? ` and deletes invoice ${invoice.invoiceNo}` : ""}. Use only if no payments recorded.
                      </div>
                      <button
                        className="btn"
                        style={{ fontSize: 11, color: "var(--rd)", borderColor: "var(--sem-rd-bdr)" }}
                        onClick={doRevert}
                        disabled={reverting || (invoice?.advanceReceived || invoice?.balanceReceived) ? true : false}
                      >
                        {reverting ? "Reverting…" : "↩ Revert to Draft"}
                      </button>
                      {(invoice?.advanceReceived || invoice?.balanceReceived) && (
                        <div style={{ fontSize: 10, color: "var(--sem-rd-tx)", marginTop: 6 }}>
                          Cannot revert — payment already recorded.
                        </div>
                      )}
                    </div>
                  </div>

                  {invoice && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      <Link href={`/invoices/${invoice.id}`} className="btn btn-primary text-[12px]">
                        <Receipt size={13} /> View invoice →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                /* Not yet approved */
                <div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 12 }}>
                    Approving will: confirm the inquiry, lock the quotation, create calendar events, and auto-generate an invoice with 50% advance.
                  </div>
                  {!showApprove ? (
                    <button className="btn btn-success" onClick={() => setShowApprove(true)}>
                      <CheckCircle2 size={14} /> Approve &amp; generate invoice
                    </button>
                  ) : (
                    <div style={{ background: "var(--s2)", borderRadius: 8, padding: 14 }}>
                      {!isLed && (
                        <div className="field" style={{ marginBottom: 12 }}>
                          <div className="flbl">Video / Photo split</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <input
                              type="number" className="finp" style={{ width: 80 }} min={0} max={100}
                              value={videoPercent}
                              onChange={(e) => setVideoPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                            />
                            <span className="text-[11px] text-tx3">
                              % Video · {100 - videoPercent}% Photo
                              {quotation.subtotal > 0 && (
                                <span style={{ marginLeft: 8, color: "var(--tx2)" }}>
                                  (₹{fmt(Math.round(quotation.subtotal * videoPercent / 100))} + ₹{fmt(Math.round(quotation.subtotal * (100 - videoPercent) / 100))})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: 11.5, color: "var(--tx3)", marginBottom: 12 }}>
                        Invoice will be: <strong>₹{fmt(Math.round(quotation.total * 0.5))}</strong> advance + <strong>₹{fmt(quotation.total - Math.round(quotation.total * 0.5))}</strong> balance
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-success" onClick={doApprove} disabled={approving}>
                          {approving ? "Approving…" : "✓ Confirm approval"}
                        </button>
                        <button className="btn" onClick={() => setShowApprove(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {bottomNav()}
          </div>
        )}

        {/* ── STEP 6: INVOICE ── */}
        {tab === "invoice" && (
          <div>
            {!invoice ? (
              <div className="card" style={{ margin: 0 }}>
                <div className="card-t">Invoice</div>
                <Empty
                  msg={quotation?.status === "Approved" ? "Quotation approved — invoice generating, please wait a moment…" : "Invoice is created when the quotation is approved in Step 5."}
                  action={quotation?.status !== "Approved" ? { label: "Go to Preview & Approve", onClick: () => setTab("preview") } : undefined}
                />
                {quotation?.status === "Approved" && (
                  <div style={{ textAlign: "center", padding: "0 0 16px" }}>
                    <button className="btn text-[12px]" onClick={() => router.refresh()}>
                      ↻ Refresh
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Invoice summary */}
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-t" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Invoice details</span>
                    <Badge variant={invoice.status === "Paid" ? "gr" : invoice.status === "Partial paid" ? "am" : "rd"}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <Row k="Invoice no." v={invoice.invoiceNo} />
                  <Row k="Event" v={invoice.eventName} />
                  <Row k="Client" v={invoice.clientName} />
                  <Row k="Dates" v={`${invoice.startDate} → ${invoice.endDate}`} />
                  <Row k="Venue" v={invoice.venue} />
                  <div style={{ margin: "12px 0 4px", height: 1, background: "var(--b1)" }} />
                  <Row k="Invoice total" v={`₹${fmt(invoice.advance + invoice.balance)}`} />
                </div>

                {/* Payment breakdown */}
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-t">Payment breakdown</div>

                  {/* Advance */}
                  <div style={{ padding: "10px 0", borderBottom: "1px solid var(--b1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Advance — 50%</span>
                      <Badge variant={invoice.advanceReceived ? "gr" : "rd"}>
                        {invoice.advanceReceived ? "Received" : "Pending"}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: invoice.advanceReceived ? "var(--gr)" : "var(--acc)" }}>
                      ₹{fmt(invoice.advance)}
                    </div>
                    {invoice.advanceReceived && invoice.advanceReceivedAt && (
                      <div style={{ fontSize: 10.5, color: "var(--tx3)", marginTop: 2 }}>
                        Received {invoice.advanceReceivedAt} · {invoice.advanceMethod}
                      </div>
                    )}
                  </div>

                  {/* Balance */}
                  <div style={{ padding: "10px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Balance — 50%</span>
                      <Badge variant={invoice.balanceReceived ? "gr" : "rd"}>
                        {invoice.balanceReceived ? "Received" : "Pending"}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: invoice.balanceReceived ? "var(--gr)" : "var(--tx3)" }}>
                      ₹{fmt(invoice.balance)}
                    </div>
                    {invoice.balanceReceived && invoice.balanceReceivedAt && (
                      <div style={{ fontSize: 10.5, color: "var(--tx3)", marginTop: 2 }}>
                        Received {invoice.balanceReceivedAt} · {invoice.balanceMethod}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--b1)" }}>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="btn btn-primary justify-center text-center"
                      style={{ fontSize: 13 }}
                    >
                      <Receipt size={14} /> Open full invoice
                    </Link>
                    <Link
                      href={`/invoices/${invoice.id}/payment`}
                      className="btn btn-success justify-center text-center"
                      style={{ fontSize: 13 }}
                    >
                      <Wallet size={14} /> Record payment
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {bottomNav()}
          </div>
        )}
      </div>{/* end step content */}

      {/* Quotation PDF modal */}
      {showPdfModal && quotation && (
        <QuotationPDFModal
          quotationId={quotation.id}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="row-item">
      <span className="text-[11px] text-tx3">{k}</span>
      <span className="text-[12px]" style={{ fontWeight: 500 }}>{v || "—"}</span>
    </div>
  );
}

function Empty({ msg, action, icon }: { msg: string; action?: { label: string; href?: string; onClick?: () => void }; icon?: React.ReactNode }) {
  return (
    <div style={{ padding: "24px 8px", textAlign: "center", color: "var(--tx3)" }}>
      {icon && <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", opacity: 0.6 }}>{icon}</div>}
      {!icon && <AlertCircle size={22} style={{ opacity: 0.5, marginBottom: 8 }} />}
      <div style={{ fontSize: 12.5, color: "var(--tx2)", marginBottom: action ? 12 : 0 }}>{msg}</div>
      {action && (action.href
        ? <Link href={action.href} className="btn btn-primary text-[12px]">{action.label}</Link>
        : <button className="btn btn-primary text-[12px]" onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}

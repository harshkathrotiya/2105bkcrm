"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import SearchableSelect from "../ui/SearchableSelect";
import { useClients, useInquiries, useCalendar, useQuotations, useInvoices } from "@/lib/store";
import { calcDays, calcHours, timeToMinutes } from "@/lib/utils";
import { generateId } from "@/lib/types";
import { useCurrentUser } from "@/lib/use-current-user";
import Button from "../ui/Button";
import * as api from "@/lib/api";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";

const TIME_OPTIONS = [
  "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
];

export default function Screen04NewInquiry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, user } = useCurrentUser();
  const { clients } = useClients();
  const { inquiries, dispatchInquiries } = useInquiries();
  const { calendarEvents, dispatchCalendar } = useCalendar();
  const { quotations } = useQuotations();
  const { invoices } = useInvoices();
  const toast = useToast();
  const confirm = useConfirm();

  const preselectedClientId = searchParams.get("clientId") ?? "";
  const defaultClientId =
    preselectedClientId && clients.find((c) => c.id === preselectedClientId)
      ? preselectedClientId
      : "";

  const today = new Date().toISOString().split("T")[0];
  const queryDate = searchParams.get("date");
  const defaultDate = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : today;

  // Dynamic event types
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [addingEventType, setAddingEventType] = useState(false);
  const [newEventType, setNewEventType] = useState("");
  const [editingEventType, setEditingEventType] = useState(false);
  const [editEventTypeName, setEditEventTypeName] = useState("");
  const eventTypeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (eventTypeRef.current && !eventTypeRef.current.contains(e.target as Node)) {
        setShowEventTypeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;
    api.fetchOptions("EVENT_TYPE")
      .then((opts) => {
        if (!active) return;
        const values = opts.map((o) => o.value);
        setEventTypes(values);
        // Set default only if no value yet (not editing)
        setEventType((cur) => cur || "");
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleAddEventType = async () => {
    const value = newEventType.trim();
    if (!value) return;
    try {
      await api.addOption("EVENT_TYPE", value);
      setEventTypes((prev) => prev.includes(value) ? prev : [...prev, value]);
      setEventType(value);
      setNewEventType("");
      setAddingEventType(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add event type");
    }
  };

  const handleEditEventType = async () => {
    const oldValue = eventType;
    const newValue = editEventTypeName.trim();
    if (!newValue || oldValue === newValue) { setEditingEventType(false); return; }
    try {
      await api.updateOption("EVENT_TYPE", oldValue, newValue);
      setEventTypes((prev) => prev.map((t) => t === oldValue ? newValue : t));
      setEventType(newValue);
      setEditingEventType(false);
      toast.success("Event type updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update event type");
    }
  };

  const handleRemoveEventType = async (value: string) => {
    if (!value) return;
    const ok = await confirm({
      message: `Remove event type "${value}"? Existing inquiries will keep their current type.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.removeOption("EVENT_TYPE", value);
      setEventTypes((prev) => {
        const remaining = prev.filter((t) => t !== value);
        setEventType((cur) => cur === value ? (remaining[0] ?? "") : cur);
        return remaining;
      });
      toast.success("Event type removed!");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove event type");
    }
  };

  const [clientId, setClientId] = useState(defaultClientId);
  const [eventType, setEventType] = useState("");
  const [eventName, setEventName] = useState("");
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("09:00 PM");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Department & LED states — default to the logged-in dept head's department
  const defaultDept = (user?.role === "Department Head" && user?.department === "LED") ? "LED" : "VIDEO";
  const [department, setDepartment] = useState<'VIDEO' | 'LED' | 'MERGED'>(defaultDept);
  const [screenWidth, setScreenWidth] = useState('');
  const [screenHeight, setScreenHeight] = useState('');
  const [ledType, setLedType] = useState('P4');
  const [location, setLocation] = useState('INDOOR');
  const [stageType, setStageType] = useState('');
  const [ratePerSqft, setRatePerSqft] = useState(50);

  const LED_TYPE_RATES: Record<string, number> = {
    P4: 50, P3: 65, P2: 85, FLOOR: 90, P4_CURVED: 60,
  };


  const editInquiryId = searchParams.get("id") ?? searchParams.get("inquiryId") ?? "";
  const editInquiry = useMemo(() => {
    return inquiries.find((i) => i.id === editInquiryId);
  }, [inquiries, editInquiryId]);

  const isEditing = !!editInquiry;
  const hasWritePermission = isEditing ? can("inquiries.edit") : can("inquiries.create");

  useEffect(() => {
    if (editInquiry) {
      setClientId(editInquiry.clientId);
      setEventType(editInquiry.eventType);
      setEventName(editInquiry.eventName || editInquiry.eventType);
      setStartDate(editInquiry.startDate);
      setEndDate(editInquiry.endDate);
      setStartTime(editInquiry.startTime || "09:00 AM");
      setEndTime(editInquiry.endTime || "09:00 PM");
      setVenue(editInquiry.venue || "");
      setNotes(editInquiry.notes || "");
      if ((editInquiry as any).department) setDepartment((editInquiry as any).department);
      if ((editInquiry as any).screenWidth) setScreenWidth(String((editInquiry as any).screenWidth));
      if ((editInquiry as any).screenHeight) setScreenHeight(String((editInquiry as any).screenHeight));
      if ((editInquiry as any).ledType) setLedType((editInquiry as any).ledType);
      if ((editInquiry as any).location) setLocation((editInquiry as any).location);
      if ((editInquiry as any).stageType) setStageType((editInquiry as any).stageType || '');
      if ((editInquiry as any).ratePerSqft) setRatePerSqft((editInquiry as any).ratePerSqft);
    }
  }, [editInquiry]);

  // Auto-update rate when LED type changes
  useEffect(() => { setRatePerSqft(LED_TYPE_RATES[ledType] ?? 50); }, [ledType]);

  // Clear LED fields when department changes to VIDEO
  useEffect(() => {
    if (department === 'VIDEO') {
      setScreenWidth('');
      setScreenHeight('');
      setStageType('');
    }
  }, [department]);

  const selectedClient = clients.find((c) => c.id === clientId);

  // Pipeline: find quotation & invoice linked to this inquiry
  const linkedQuotation = useMemo(
    () => editInquiryId ? quotations.find((q) => q.inquiryId === editInquiryId && q.status !== "Revised") : null,
    [quotations, editInquiryId]
  );
  const linkedInvoice = useMemo(
    () => linkedQuotation ? invoices.find((inv) => inv.quotationId === linkedQuotation.id) : null,
    [invoices, linkedQuotation]
  );

  const duration = useMemo(() => calcDays(startDate, endDate), [startDate, endDate]);
  const hours = useMemo(() => calcHours(startTime, endTime, duration), [startTime, endTime, duration]);

  const screenArea = screenWidth && screenHeight ? parseFloat(screenWidth) * parseFloat(screenHeight) : 0;
  const totalCabinets = Math.ceil(screenArea / 4);
  const estimatedAmount = screenArea * ratePerSqft * duration;

  // Validation
  const dateError = endDate < startDate;
  const timeError =
    endDate === startDate && timeToMinutes(endTime) <= timeToMinutes(startTime);
  const venueError = venue.trim().length > 0 && venue.trim().length < 3;

  const isLedOrMerged = department === 'LED' || department === 'MERGED';
  const ledFieldsValid = !isLedOrMerged || (
    screenWidth && parseFloat(screenWidth) > 0 &&
    screenHeight && parseFloat(screenHeight) > 0
  );

  const canSave = !!(
    clientId &&
    eventType &&
    eventName.trim() &&
    startDate &&
    endDate &&
    venue.trim().length >= 3 &&
    !dateError &&
    !timeError &&
    ledFieldsValid
  );

  const handleReset = () => {
    setClientId(defaultClientId);
    setEventType(eventTypes[0] ?? "");
    setEventName("");
    setStartDate(today);
    setEndDate(today);
    setStartTime("09:00 AM");
    setEndTime("09:00 PM");
    setVenue("");
    setNotes("");
    setScreenWidth('');
    setScreenHeight('');
    setStageType('');
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    const inquiryId = editInquiry ? editInquiry.id : `inq-${generateId()}`;

    if (editInquiry) {
      // 1. Delete old calendar events first using captured details
      const oldClientId = editInquiry.clientId;
      const oldStartDate = editInquiry.startDate;
      const oldEndDate = editInquiry.endDate;
      const oldClient = clients.find((c) => c.id === oldClientId);
      const oldClientName = oldClient?.name ?? "Event";

      const eventsToDelete = calendarEvents.filter((evt) => {
        // Matches new ID format (both inquiry and confirmed events start with `cal-${inquiryId}-`)
        if (evt.id.startsWith(`cal-${inquiryId}-`)) return true;
        
        // Fallback for legacy format: check type, label and date range
        if (evt.type === "inquiry" || evt.type === "confirmed") {
          const isLabelMatch = evt.label === oldClientName || evt.label === `↔ ${oldClientName}`;
          if (isLabelMatch) {
            const eDateStr = `${evt.year}-${String(evt.month).padStart(2, "0")}-${String(evt.date).padStart(2, "0")}`;
            return eDateStr >= oldStartDate && eDateStr <= oldEndDate;
          }
        }
        return false;
      });

      if (eventsToDelete.length > 0) {
        await dispatchCalendar({
          type: "BULK_DELETE_CALENDAR_EVENTS",
          payload: eventsToDelete.map((evt) => evt.id),
        });
      }

      const ledPayload = (department !== 'VIDEO') ? {
        screenWidth: screenWidth ? parseFloat(screenWidth) : null,
        screenHeight: screenHeight ? parseFloat(screenHeight) : null,
        screenAreaSqft: screenWidth && screenHeight ? parseFloat(screenWidth) * parseFloat(screenHeight) : null,
        totalCabinets: screenWidth && screenHeight ? Math.ceil(parseFloat(screenWidth) * parseFloat(screenHeight) / 4) : null,
        ledType,
        ratePerSqft: LED_TYPE_RATES[ledType] ?? ratePerSqft,
        location,
        stageType: stageType || null,
      } : {
        screenWidth: null,
        screenHeight: null,
        screenAreaSqft: null,
        totalCabinets: null,
        ledType: null,
        ratePerSqft: null,
        location: "INDOOR",
        stageType: null,
      };

      // 2. Update existing inquiry
      await dispatchInquiries({
        type: "UPDATE_INQUIRY",
        payload: {
          id: inquiryId,
          clientId,
          eventType,
          eventName: eventName.trim(),
          startDate,
          endDate,
          startTime,
          endTime,
          venue,
          notes,
          department,
          ...ledPayload,
        },
      });
    } else {
      const ledPayload = (department !== 'VIDEO') ? {
        screenWidth: screenWidth ? parseFloat(screenWidth) : null,
        screenHeight: screenHeight ? parseFloat(screenHeight) : null,
        screenAreaSqft: screenWidth && screenHeight ? parseFloat(screenWidth) * parseFloat(screenHeight) : null,
        totalCabinets: screenWidth && screenHeight ? Math.ceil(parseFloat(screenWidth) * parseFloat(screenHeight) / 4) : null,
        ledType,
        ratePerSqft: LED_TYPE_RATES[ledType] ?? ratePerSqft,
        location,
        stageType: stageType || null,
      } : {
        screenWidth: null,
        screenHeight: null,
        screenAreaSqft: null,
        totalCabinets: null,
        ledType: null,
        ratePerSqft: null,
        location: "INDOOR",
        stageType: null,
      };

      // Create new inquiry
      await dispatchInquiries({
        type: "ADD_INQUIRY",
        payload: {
          id: inquiryId,
          clientId,
          eventType,
          eventName: eventName.trim(),
          startDate,
          endDate,
          startTime,
          endTime,
          venue,
          notes,
          status: "New",
          createdAt: today,
          department,
          ...ledPayload,
        },
      });
    }

    // Add calendar events for every day of the event (1-indexed month)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const eventDisplayName = `${eventName || eventType} — ${selectedClient?.name ?? "Event"}`;
    let idx = 0;
    const calType = editInquiry && editInquiry.status === "Confirmed" ? "confirmed" : "inquiry";
    const eventsToAdd = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const isFirst = idx === 0;
      eventsToAdd.push({
        id: calType === "confirmed" ? `cal-${inquiryId}-confirmed-${idx}` : `cal-${inquiryId}-${idx}`,
        date: d.getDate(),
        month: d.getMonth() + 1, // 1-indexed
        year: d.getFullYear(),
        label: isFirst ? eventDisplayName : `↔ ${eventDisplayName}`,
        type: calType,
      });
      idx++;
    }

    if (eventsToAdd.length > 0) {
      await dispatchCalendar({
        type: "BULK_ADD_CALENDAR_EVENTS",
        payload: eventsToAdd,
      });
    }

    router.push("/inquiries");
  };

  return (
    <>
      <SectionHeader
        title={editInquiry ? <>Edit <strong>inquiry</strong></> : <>New <strong>inquiry</strong></>}
        description={editInquiry ? "Update inquiry details below." : "Create a new event inquiry — select a client, set dates, and add event details."}
      />
      <ScreenFrame
        breadcrumbs={editInquiry
          ? [{ label: "Inquiries", href: "/inquiries" }, { label: "Edit inquiry" }]
          : [{ label: "Inquiries", href: "/inquiries" }, { label: "New inquiry" }]
        }
        actions={
          hasWritePermission ? (
            <>
              {!editInquiry && (
                <button className="btn" onClick={handleReset} disabled={saving}>Reset</button>
              )}
              <Button variant="success" loading={saving} disabled={!canSave} onClick={handleSave}>
                {editInquiry ? "Update inquiry" : "Save inquiry"}
              </Button>
            </>
          ) : (
            <span className="text-[11px] text-tx3">View only — you don&apos;t have {isEditing ? "edit" : "create"} access.</span>
          )
        }
      >
        <div className="two-col">
          {/* Left — form */}
          <fieldset disabled={!hasWritePermission} style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto" }}>
            {/* Department selector */}
            <div className="card" style={{ marginBottom: '14px', padding: '12px' }}>
              <div className="flbl" style={{ marginBottom: '8px' }}>Department *</div>
              <div className="flex gap-2">
                {(['VIDEO', 'LED', 'MERGED'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`btn flex-1 justify-center text-[11px] ${department === d ? 'btn-primary' : ''}`}
                    onClick={() => setDepartment(d)}
                  >
                    {d === 'VIDEO' ? 'Video' : d === 'LED' ? 'LED' : 'Both (Video + LED)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-t">Inquiry details</div>
              <div className="fgrid">

                {/* Client selector */}
                <div className="field span2">
                  <div className="flex items-center justify-between mb-[5px]">
                    <div className="flbl">Select client *</div>
                    <Link href="/clients/new" className="text-[10px] text-bl hover:underline">
                      + New client
                    </Link>
                  </div>
                  <SearchableSelect
                    value={clientId}
                    onChange={setClientId}
                    placeholder="Search client by name or contact..."
                    options={clients.map((c) => ({
                      value: c.id,
                      label: `${c.name} — ${c.contact}`,
                    }))}
                  />
                  {selectedClient && (
                    <div className="bg-s2 rounded-md text-[11px] flex items-center" style={{ padding: "7px 10px", marginTop: "5px", gap: "10px" }}>
                      <div
                        className="avatar-sm shrink-0 flex items-center justify-center"
                        style={{ background: selectedClient.bg, color: selectedClient.fg }}
                      >
                        {selectedClient.initials}
                      </div>
                      <div>
                        <div className="font-medium text-tx">{selectedClient.name}</div>
                        <div className="text-tx3 mt-[1px]">+91 {selectedClient.mobile}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Event type */}
                <div className="field span2">
                  <div className="flbl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Event type *</span>
                    {!addingEventType && !editingEventType && (
                      <button type="button" className="btn" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => setAddingEventType(true)}>
                        + Add type
                      </button>
                    )}
                  </div>
                  {addingEventType ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="finp" autoFocus placeholder="New event type"
                        value={newEventType} onChange={(e) => setNewEventType(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEventType(); } if (e.key === "Escape") { setAddingEventType(false); setNewEventType(""); } }}
                      />
                      <button type="button" className="btn btn-primary" style={{ fontSize: 11 }} onClick={handleAddEventType}>Add</button>
                      <button type="button" className="btn" style={{ fontSize: 11 }} onClick={() => { setAddingEventType(false); setNewEventType(""); }}>Cancel</button>
                    </div>
                  ) : editingEventType ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="finp" autoFocus placeholder="Edit event type name"
                        value={editEventTypeName} onChange={(e) => setEditEventTypeName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEditEventType(); } if (e.key === "Escape") { setEditingEventType(false); setEditEventTypeName(""); } }}
                      />
                      <button type="button" className="btn btn-primary" style={{ fontSize: 11 }} onClick={handleEditEventType}>Save</button>
                      <button type="button" className="btn" style={{ fontSize: 11 }} onClick={() => { setEditingEventType(false); setEditEventTypeName(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <div ref={eventTypeRef} style={{ position: "relative" }}>
                      <div className="fsel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowEventTypeDropdown(!showEventTypeDropdown)}>
                        <span>{eventType || "-- Select Event Type --"}</span>
                        <span style={{ fontSize: 10, color: "var(--tx3)", opacity: 0.7 }}>▼</span>
                      </div>
                      {showEventTypeDropdown && (
                        <div className="absolute z-[999] left-0 w-full bg-s1 border border-b1 rounded-md shadow-lg flex flex-col" style={{ top: "100%", marginTop: 4, padding: "6px", maxHeight: 250, overflowY: "auto" }}>
                          {eventType && !eventTypes.includes(eventType) && (
                            <div className="flex items-center justify-between px-3 py-2 text-[12px] cursor-pointer hover:bg-s2 transition-colors text-tx font-medium rounded" onClick={() => setShowEventTypeDropdown(false)}>
                              <span>{eventType}</span>
                            </div>
                          )}
                          {eventTypes.map((t) => (
                            <div key={t} className={`flex items-center justify-between px-3 py-2 text-[12px] cursor-pointer hover:bg-s2 transition-colors rounded ${eventType === t ? "bg-s2 font-medium" : "text-tx"}`} onClick={() => { setEventType(t); setShowEventTypeDropdown(false); }}>
                              <span>{t}</span>
                              <div className="flex items-center gap-3 pr-2" onClick={(e) => e.stopPropagation()}>
                                <button type="button" className="p-1 hover:bg-s3 rounded text-tx3 hover:text-bl transition-all" title="Rename" onClick={() => { setEditingEventType(true); setEditEventTypeName(t); setEventType(t); setShowEventTypeDropdown(false); }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" className="p-1 hover:bg-s3 rounded text-tx3 hover:text-rd transition-all" title="Delete" onClick={() => handleRemoveEventType(t)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Event Name */}
                <div className="field span2">
                  <div className="flbl">Event name *</div>
                  <input
                    type="text"
                    className="finp"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. Ambani Wedding, GIFT Summit"
                  />
                </div>

                {/* Start date & time */}
                <div className="field span2">
                  <div className="flbl">Start date & time *</div>
                  <div className="grid grid-cols-[1fr_110px] gap-[6px]">
                    <input
                      type="date"
                      className="finp"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value > endDate) setEndDate(e.target.value);
                      }}
                    />
                    <select
                      className="fsel"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    >
                      {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* End date & time */}
                <div className="field span2">
                  <div className="flbl">End date & time *</div>
                  <div className="grid grid-cols-[1fr_110px] gap-[6px]">
                    <input
                      type="date"
                      className={`finp ${dateError ? "border-rd" : ""}`}
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                    <select
                      className={`fsel ${timeError ? "border-rd" : ""}`}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    >
                      {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {(dateError || timeError) && (
                    <div className="text-[10px] text-rd mt-[4px]">
                      End date/time must be after start
                    </div>
                  )}
                </div>

                {/* Duration info bar */}
                <div className="field span2">
                  <div
                    className="rounded-md flex items-center flex-wrap"
                    style={{ background: "var(--sem-bl-bg)", color: "var(--sem-bl-tx)", padding: "8px 12px", gap: "12px" }}
                  >
                    <span className="flex items-center" style={{ gap: "6px" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <strong>{duration} day{duration !== 1 ? "s" : ""}</strong>
                    </span>
                    <div className="rounded-full bg-current opacity-30" style={{ width: "3px", height: "3px" }}></div>
                    <span className="flex items-center" style={{ gap: "6px" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <strong>{hours} hours</strong>
                    </span>
                    <div className="rounded-full bg-current opacity-30" style={{ width: "3px", height: "3px" }}></div>
                    <span className="flex items-center" style={{ gap: "6px" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 10"></polyline>
                      </svg>
                      <strong>{startTime} → {endTime}</strong>
                    </span>
                  </div>
                </div>

                {/* Venue */}
                <div className="field span2">
                  <div className="flbl">Venue *</div>
                  <input
                    className={`finp ${venueError ? "border-rd" : ""}`}
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Grand Bhagwati, Ahmedabad"
                  />
                  {venueError && (
                    <div className="text-[10px] text-rd mt-[3px]">Venue must be at least 3 characters</div>
                  )}
                </div>

                {/* Notes */}
                <div className="field span2">
                  <div className="flbl">Special notes (optional)</div>
                  <textarea
                    className="ftxt"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requirements..."
                  />
                </div>
              </div>
            </div>

            {/* LED Screen Configuration Card */}
            {(department === 'LED' || department === 'MERGED') && (
              <div className="card" style={{ marginTop: '14px' }}>
                <div className="card-t">LED Screen Configuration</div>
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
                      {["P4", "P3", "P2", "FLOOR", "P4_CURVED"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
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
                {screenArea > 0 && (
                  <div className="flex gap-4 mt-3 text-[11px]" style={{ background: "var(--sem-bl-bg)", color: "var(--sem-bl-tx)", borderRadius: "6px", padding: "8px 12px" }}>
                    <span>Area: <strong>{screenArea.toFixed(1)} sq.ft</strong></span>
                    <span>Cabinets: <strong>{totalCabinets} pcs</strong></span>
                    <span className="ml-auto">Estimated amount: <strong>₹{estimatedAmount.toLocaleString("en-IN")}</strong></span>
                  </div>
                )}
              </div>
            )}

          </fieldset>

          {/* Right — summary */}
          <div>
            <div className="card">
              <div className="card-t">Summary</div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Client</span>
                <span className="text-[11px] font-medium">{selectedClient?.name ?? "—"}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Event type</span>
                <span className="text-[11px]">{eventType}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Start</span>
                <span className="text-[11px]">
                  {startDate ? new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}, {startTime}
                </span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">End</span>
                <span className="text-[11px]">
                  {endDate ? new Date(endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}, {endTime}
                </span>
              </div>
              <div className="row-item">
                <span className="text-[11px] font-medium">Duration</span>
                <span className="text-[13px] font-medium text-bl">
                  {duration} day{duration !== 1 ? "s" : ""} · {hours}h
                </span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Venue</span>
                <span className="text-[11px] text-right max-w-[150px] truncate">{venue || "—"}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-t">Date preview</div>
              <div className="flex items-center justify-center gap-[14px] py-[10px]">
                <div className="text-center">
                  <div className="text-[10px] text-tx3">
                    {startDate ? new Date(startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}
                  </div>
                  <div className="text-[28px] font-medium text-bl leading-none mt-[2px]">
                    {startDate ? new Date(startDate).getDate() : "—"}
                  </div>
                </div>
                <div className="text-[18px] text-tx3">→</div>
                <div className="text-center">
                  <div className="text-[10px] text-tx3">
                    {endDate ? new Date(endDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}
                  </div>
                  <div className="text-[28px] font-medium text-bl leading-none mt-[2px]">
                    {endDate ? new Date(endDate).getDate() : "—"}
                  </div>
                </div>
                <div
                  className="rounded-lg flex flex-col items-center justify-center"
                  style={{ background: "var(--sem-bl-bg)", color: "var(--sem-bl-tx)", padding: "8px 14px" }}
                >
                  <div className="text-[22px] font-medium leading-none" style={{ marginBottom: "4px" }}>{duration}</div>
                  <div className="text-[10px] leading-none">day{duration !== 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>

            {/* Pipeline next-step CTAs */}
            {editInquiry && (
              <div className="card" style={{ marginTop: "0" }}>
                <div className="card-t">Next steps</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <Link
                    href={`/quotations/new?inquiryId=${editInquiry.id}`}
                    className={`btn w-full justify-center ${linkedQuotation ? "" : "btn-primary"}`}
                  >
                    {linkedQuotation ? "View quotation →" : "+ Create quotation"}
                  </Link>
                  {linkedQuotation && !linkedInvoice && (
                    <Link
                      href={`/inquiries/${editInquiryId}`}
                      className="btn btn-warning w-full justify-center"
                    >
                      Approval & invoice →
                    </Link>
                  )}
                  {linkedInvoice && (
                    <Link
                      href={`/invoices/${linkedInvoice.id}`}
                      className="btn btn-primary w-full justify-center"
                    >
                      View invoice →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

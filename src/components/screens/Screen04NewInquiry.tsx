"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import { useClients, useInquiries, useCalendar } from "@/lib/store";
import { calcDays, calcHours, timeToMinutes } from "@/lib/utils";
import { generateId } from "@/lib/types";

const TIME_OPTIONS = [
  "06:00 AM","07:00 AM","08:00 AM","09:00 AM","10:00 AM","11:00 AM",
  "12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM",
  "06:00 PM","07:00 PM","08:00 PM","09:00 PM","10:00 PM","11:00 PM",
];

const EVENT_TYPES = [
  "Corporate event",
  "Religious event",
  "Wedding",
  "Conference / Summit",
  "Concert / Show",
  "Government event",
  "Other",
];

export default function Screen04NewInquiry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clients } = useClients();
  const { dispatchInquiries } = useInquiries();
  const { dispatchCalendar } = useCalendar();

  const preselectedClientId = searchParams.get("clientId") ?? "";
  const defaultClientId =
    preselectedClientId && clients.find((c) => c.id === preselectedClientId)
      ? preselectedClientId
      : clients[0]?.id ?? "";

  const today = new Date().toISOString().split("T")[0];

  const [clientId, setClientId] = useState(defaultClientId);
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("09:00 PM");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);

  const duration = useMemo(() => calcDays(startDate, endDate), [startDate, endDate]);
  const hours = useMemo(() => calcHours(startTime, endTime, duration), [startTime, endTime, duration]);

  // Validation
  const dateError = endDate < startDate;
  const timeError =
    endDate === startDate && timeToMinutes(endTime) <= timeToMinutes(startTime);
  const venueError = venue.trim().length > 0 && venue.trim().length < 3;

  const canSave = !!(
    clientId &&
    eventType &&
    startDate &&
    endDate &&
    venue.trim().length >= 3 &&
    !dateError &&
    !timeError
  );

  const handleReset = () => {
    setClientId(defaultClientId);
    setEventType(EVENT_TYPES[0]);
    setStartDate(today);
    setEndDate(today);
    setStartTime("09:00 AM");
    setEndTime("09:00 PM");
    setVenue("");
    setNotes("");
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    const inquiryId = `inq-${generateId()}`;

    await dispatchInquiries({
      type: "ADD_INQUIRY",
      payload: {
        id: inquiryId,
        clientId,
        eventType,
        startDate,
        endDate,
        startTime,
        endTime,
        venue,
        notes,
        status: "New",
        createdAt: today,
      },
    });

    // Add calendar events for every day of the event (1-indexed month)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const clientName = selectedClient?.name ?? "Event";
    const now = Date.now();
    let idx = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const isFirst = idx === 0;
      await dispatchCalendar({
        type: "ADD_CALENDAR_EVENT",
        payload: {
          id: `cal-${now}-${idx}`,
          date: d.getDate(),
          month: d.getMonth() + 1, // 1-indexed
          year: d.getFullYear(),
          label: isFirst ? clientName : `↔ ${clientName}`,
          type: "inquiry",
        },
      });
      idx++;
    }

    router.push("/inquiries");
  };

  return (
    <>
      <SectionHeader
        title={<>New <strong>inquiry</strong></>}
        description="Create a new event inquiry — select a client, set dates, and add event details."
      />
      <ScreenFrame
        breadcrumb={<>Inquiries › New inquiry</>}
        actions={
          <>
            <button className="btn" onClick={handleReset} disabled={saving}>Reset</button>
            <button
              className={`btn btn-success ${!canSave || saving ? "opacity-50" : ""}`}
              onClick={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? "Saving..." : "Save inquiry ↗"}
            </button>
          </>
        }
      >
        <div className="two-col">
          {/* Left — form */}
          <div>
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
                  <select
                    className="fsel"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.contact}
                      </option>
                    ))}
                  </select>
                  {selectedClient && (
                    <div className="bg-s2 rounded-md p-[7px_10px] mt-[5px] text-[11px] flex items-center gap-[10px]">
                      <div
                        className="avatar-sm shrink-0"
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
                  <div className="flbl">Event type *</div>
                  <select
                    className="fsel"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                  >
                    {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
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
                    className="rounded-md p-[8px_12px] flex items-center gap-3 text-[11px] flex-wrap"
                    style={{ background: "var(--sem-bl-bg)", color: "var(--sem-bl-tx)" }}
                  >
                    <span>📅 <strong>{duration} day{duration !== 1 ? "s" : ""}</strong></span>
                    <span className="opacity-30">·</span>
                    <span>⏱ <strong>{hours} hours</strong></span>
                    <span className="opacity-30">·</span>
                    <span>🕐 <strong>{startTime} → {endTime}</strong></span>
                  </div>
                </div>

                {/* Venue */}
                <div className="field span2">
                  <div className="flbl">Venue * (min 3 chars)</div>
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
          </div>

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
                  className="rounded-lg p-[8px_14px] text-center"
                  style={{ background: "var(--sem-bl-bg)", color: "var(--sem-bl-tx)" }}
                >
                  <div className="text-[22px] font-medium leading-none">{duration}</div>
                  <div className="text-[10px] mt-[2px]">days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

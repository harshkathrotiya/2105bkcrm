"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useToast } from "../ui/Toast";

interface Props {
  inquiryId: string;
  staffId: string;
}

export default function Screen30StaffBrief({ inquiryId, staffId }: Props) {
  const router = useRouter();
  const toastApi = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });

  useEffect(() => {
    if (!inquiryId || !staffId) return;

    let active = true;
    async function loadBrief() {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports/staff-brief?inquiryId=${inquiryId}&staffId=${staffId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load brief");
        if (active) setData(json);
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBrief();
    return () => { active = false; };
  }, [inquiryId, staffId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // Compile brief message based on design handover template
  const briefMessage = useMemo(() => {
    if (!data) return "";
    const { inquiry, staff, assignment, eventScale } = data;
    if (!assignment) return "";

    return `*📋 Event Brief — BK Media*

Namaste ${staff.name} bhai 🙏
Tamara next event ni details:

📅 *Date:* ${formatDate(inquiry.startDate)} – ${formatDate(inquiry.endDate)}
⏰ *Reporting time:* ${assignment.reportingTime || "09:00 AM"}
📍 *Venue:* ${inquiry.venue}
🎯 *Your position:* ${assignment.positionName || "Operator"}
*Equipment:* ${staff.withEquipment ? (staff.equipmentDesc || "Own Gear") : "Provided by BK Media"}
👔 *Event:* ${inquiry.eventName || inquiry.eventType} — ${inquiry.client.name}

*Event scale:*
👥 Total staff: ${eventScale.totalStaff}
Camera positions: ${eventScale.cameraCount}
🎛 Control room: ${eventScale.hasControlRoom ? "Yes" : "No"}
🏗 Crane: ${eventScale.hasCrane ? "Yes" : "No"}

*Important:*
• ID card / Aadhar sathe aavo
• Venue parking available
• Meals arranged by client

Koi sawaal hoy to call karo: +91 98250 00000`;
  }, [data]);

  const handleBroadcast = async () => {
    setBroadcasting(true);
    try {
      const res = await fetch("/api/reports/staff-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId,
          staffId,
          messageText: briefMessage,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Broadcast failed");

      setToast({ show: true, msg: "WhatsApp Event Brief broadcasted successfully (simulated)!" });
      setTimeout(() => setToast({ show: false, msg: "" }), 3000);
    } catch (err: any) {
      toastApi.error(err.message || "Failed to trigger simulated broadcast");
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) {
    return (
      <ScreenFrame breadcrumb="Staff › Event Brief › Loading...">
        <LoadingSkeleton rows={6} message="Generating staff assignments details and templated WhatsApp payloads..." />
      </ScreenFrame>
    );
  }

  if (error || !data) {
    return (
      <ScreenFrame breadcrumb="Staff › Event Brief › Error">
        <div className="text-center py-12 text-tx3">
          {error || "Could not retrieve staff brief details."}
          <div className="mt-4">
            <button className="btn" onClick={() => router.back()}>← Go Back</button>
          </div>
        </div>
      </ScreenFrame>
    );
  }

  const { inquiry, staff, assignment, eventScale } = data;

  if (!assignment) {
    return (
      <ScreenFrame breadcrumb={`Staff › ${staff.name} › Brief`}>
        <div className="text-center py-12 text-tx3">
          No assignment record found for <strong>{staff.name}</strong> on this event.
          <div className="mt-4">
            <button className="btn" onClick={() => router.back()}>← Go Back</button>
          </div>
        </div>
      </ScreenFrame>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Staff Event <strong>Brief</strong></>}
        description={`Event assignment information sheet for operator ${staff.name}.`}
      />
      <ScreenFrame
        breadcrumb={
          <>
            <span className="text-tx2">Staff</span> › {staff.name} › Event Brief
          </>
        }
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" onClick={() => window.print()}>⎙ Print / Save PDF</button>
            <button className="btn btn-primary" onClick={handleBroadcast} disabled={broadcasting}>
              {broadcasting ? "Broadcasting..." : "📲 WhatsApp Broadcast"}
            </button>
            <button className="btn" onClick={() => router.back()}>Back</button>
          </div>
        }
      >
        <div className="two-col" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
          {/* Left Column: Brief details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Operator info */}
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">Operator &amp; Role Summary</div>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: "var(--sem-bl-bg)", color: "var(--sem-bl-tx)", border: "1px solid var(--sem-bl-bdr)" }}
                >
                  {staff.name.split(" ").map((n: any) => n[0]).join("").toUpperCase().slice(0,2)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{staff.name}</h3>
                  <span style={{ fontSize: "11.5px", color: "var(--tx2)" }}>{staff.role} ({staff.staffType})</span>
                  <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "2px" }}>+91 {staff.phone}</div>
                </div>
              </div>
            </div>

            {/* Event Assignment Info */}
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">Logistics and Assignment Schedule</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="row-item">
                  <span className="text-tx2">Assigned Position</span>
                  <Badge variant="gr">{assignment.positionName || "Operator"}</Badge>
                </div>
                <div className="row-item">
                  <span className="text-tx2">Reporting Time</span>
                  <strong className="font-mono text-tx">{assignment.reportingTime || "09:00 AM"}</strong>
                </div>
                <div className="row-item">
                  <span className="text-tx2">Dates Range</span>
                  <span className="text-tx">{formatDate(inquiry.startDate)} – {formatDate(inquiry.endDate)}</span>
                </div>
                <div className="row-item">
                  <span className="text-tx2">Venue Details</span>
                  <span className="text-tx font-medium text-right max-w-[200px] truncate">{inquiry.venue}</span>
                </div>
                <div className="row-item">
                  <span className="text-tx2">Event Name / Type</span>
                  <span className="text-tx">{inquiry.eventName || inquiry.eventType}</span>
                </div>
              </div>
            </div>

            {/* Event Scale */}
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">On-Site Infrastructure Scale</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "var(--s2)", padding: "10px", borderRadius: "6px", border: "1px solid var(--b1)" }}>
                  <span className="text-[10px] text-tx3 uppercase block">Roster Staff Size</span>
                  <strong className="text-[14px] text-tx mt-1 block">{eventScale.totalStaff} Crew members</strong>
                </div>
                <div style={{ background: "var(--s2)", padding: "10px", borderRadius: "6px", border: "1px solid var(--b1)" }}>
                  <span className="text-[10px] text-tx3 uppercase block">Camera Placements</span>
                  <strong className="text-[14px] text-tx mt-1 block">{eventScale.cameraCount} Positions</strong>
                </div>
                <div style={{ background: "var(--s2)", padding: "10px", borderRadius: "6px", border: "1px solid var(--b1)" }}>
                  <span className="text-[10px] text-tx3 uppercase block">PCR Control Room</span>
                  <div style={{ marginTop: "4px" }}>
                    <Badge variant="gr">Required</Badge>
                  </div>
                </div>
                <div style={{ background: "var(--s2)", padding: "10px", borderRadius: "6px", border: "1px solid var(--b1)" }}>
                  <span className="text-[10px] text-tx3 uppercase block">Crane Jibs</span>
                  <div style={{ marginTop: "4px" }}>
                    <Badge variant={eventScale.hasCrane ? "gr" : "gy"}>
                      {eventScale.hasCrane ? "Required" : "Not Booked"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: WhatsApp template preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">WhatsApp Push Message Preview</div>
              
              <div 
                style={{ 
                  background: "#075e54", // WhatsApp branding background
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #128c7e"
                }}
              >
                {/* Chat bubble */}
                <div 
                  style={{ 
                    background: "var(--bg)", 
                    color: "var(--tx)",
                    padding: "12px 14px",
                    borderRadius: "8px 8px 8px 0",
                    fontSize: "12px",
                    lineHeight: "1.55",
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    border: "1px solid var(--b1)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
                  }}
                >
                  {briefMessage}
                </div>
              </div>
              <div className="text-[10px] text-tx3 text-center mt-2">
                Simulated broadcasts write payloads to <code>public/whatsapp-simulation.log</code>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Alert */}
        {toast.show && (
          <div
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium shadow-lg"
            style={{ background: "var(--sem-gr-bg)", border: "1px solid var(--sem-gr-bdr)", color: "var(--sem-gr-tx)" }}
          >
            <span>✓</span>
            <span>{toast.msg}</span>
          </div>
        )}
      </ScreenFrame>
    </>
  );
}

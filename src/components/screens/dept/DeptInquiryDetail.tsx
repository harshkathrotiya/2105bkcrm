"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, MapPin, Building2, Users,
  FileText, ArrowLeft, Truck,
} from "lucide-react";
import SectionHeader from "../../ui/SectionHeader";
import ScreenFrame from "../../ui/ScreenFrame";
import Badge from "../../ui/Badge";
import LoadingSkeleton from "../../ui/LoadingSkeleton";
import Screen23AssignPosition from "../Screen23AssignPosition";
import { useInquiries } from "@/lib/store";

const STATUS_BADGE: Record<string, "gr" | "am" | "bl" | "rd" | "gy"> = {
  New: "bl", Quoted: "am", Confirmed: "gr", Cancelled: "rd",
};

type Tab = "details" | "crew";

function Row({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid var(--tbl-line)" }}>
      <div className="text-[11px] text-tx3 font-medium" style={{ width: 140, flexShrink: 0, display: "flex", alignItems: "center", gap: "4px" }}>
        {icon}{label}
      </div>
      <div className="text-[13px] text-tx">{value}</div>
    </div>
  );
}

export default function DeptInquiryDetail({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const { inquiries, loading } = useInquiries();
  const [tab, setTab] = useState<Tab>("details");

  const inq = useMemo(
    () => inquiries.find((i) => i.id === inquiryId),
    [inquiries, inquiryId]
  );

  if (loading) {
    return (
      <div className="m-8">
        <LoadingSkeleton type="detail" message="Loading inquiry…" />
      </div>
    );
  }

  if (!inq) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div className="text-[13px] text-tx3">Inquiry not found.</div>
      </div>
    );
  }

  const dateRange = inq.startDate === inq.endDate
    ? inq.startDate
    : `${inq.startDate} → ${inq.endDate}`;

  const timeRange = inq.startTime && inq.endTime
    ? `${inq.startTime} – ${inq.endTime}`
    : inq.startTime || null;

  return (
    <>
      <SectionHeader
        title={<>{inq.eventName || inq.eventType || <em>Untitled</em>}</>}
        description={`${inq.eventType} · ${dateRange}`}
      />
      <ScreenFrame
        breadcrumbs={[
          { label: "Inquiries", href: "/inquiries" },
          { label: inq.eventName || "Detail" },
        ]}
        actions={
          <button className="btn" onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeft size={13} /> Back
          </button>
        }
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--b1)", marginBottom: "20px" }}>
          {(["details", "crew"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "10px 16px",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: tab === t ? "2px solid var(--acc)" : "2px solid transparent",
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? "var(--tx)" : "var(--tx3)",
                background: "none",
                cursor: "pointer",
                fontSize: 13,
                textTransform: "capitalize",
              }}
            >
              {t === "details" ? "Details" : "Crew Assignment"}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {tab === "details" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px", alignItems: "start" }}>
            <div className="card !p-5">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div className="card-t">Event Details</div>
                <Badge variant={STATUS_BADGE[inq.status] ?? "gy"}>{inq.status}</Badge>
              </div>

              <Row label="Event Name" value={inq.eventName} />
              <Row label="Event Type" value={inq.eventType} />
              <Row label="Department" value={inq.department} />
              <Row label="Date" value={dateRange} icon={<Calendar size={11} />} />
              {timeRange && <Row label="Time" value={timeRange} icon={<Clock size={11} />} />}
              {inq.venue && <Row label="Venue" value={inq.venue} icon={<MapPin size={11} />} />}
              {inq.location && <Row label="Location" value={inq.location} icon={<Building2 size={11} />} />}
              {inq.crewCount != null && <Row label="Crew Count" value={String(inq.crewCount)} icon={<Users size={11} />} />}
              {inq.stageType && <Row label="Stage Type" value={inq.stageType} />}

              {inq.notes && (
                <div style={{ padding: "10px 0" }}>
                  <div className="text-[11px] text-tx3 font-medium" style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
                    <FileText size={11} /> Notes
                  </div>
                  <div className="text-[12px] text-tx" style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{inq.notes}</div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(inq.dispatchDate || inq.vehicle1Number || inq.vehicle1Driver) && (
                <div className="card !p-4">
                  <div className="card-t" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Truck size={13} /> Dispatch
                  </div>
                  <Row label="Dispatch Date" value={inq.dispatchDate} />
                  <Row label="Dispatch Time" value={inq.dispatchTime} />
                  {inq.vehicle1Number && <Row label="Vehicle 1" value={`${inq.vehicle1Number}${inq.vehicle1Driver ? ` · ${inq.vehicle1Driver}` : ""}`} />}
                  {inq.vehicle2Number && <Row label="Vehicle 2" value={`${inq.vehicle2Number}${inq.vehicle2Driver ? ` · ${inq.vehicle2Driver}` : ""}`} />}
                </div>
              )}

              {(inq.screenWidth || inq.ledType) && (
                <div className="card !p-4">
                  <div className="card-t" style={{ marginBottom: "12px" }}>LED Setup</div>
                  <Row label="LED Type" value={inq.ledType} />
                  {inq.screenWidth && inq.screenHeight && (
                    <Row label="Screen Size" value={`${inq.screenWidth} × ${inq.screenHeight} ft`} />
                  )}
                  <Row label="Area" value={inq.screenAreaSqft ? `${inq.screenAreaSqft} sqft` : null} />
                  <Row label="Cabinets" value={inq.totalCabinets ? String(inq.totalCabinets) : null} />
                  <Row label="Rate/sqft" value={inq.ratePerSqft ? `₹${inq.ratePerSqft}` : null} />
                </div>
              )}

              <div className="card !p-4">
                <div className="card-t" style={{ marginBottom: "12px" }}>Info</div>
                <Row label="Created" value={inq.createdAt} />
                {inq.updatedAt && <Row label="Updated" value={inq.updatedAt} />}
              </div>
            </div>
          </div>
        )}

        {/* Crew tab */}
        {tab === "crew" && (
          <Screen23AssignPosition inquiryIdProp={inquiryId} embedded />
        )}
      </ScreenFrame>
    </>
  );
}

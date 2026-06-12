"use client";

import { useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useInquiries } from "@/lib/store";
import Badge from "@/components/ui/Badge";
import ScreenFrame from "@/components/ui/ScreenFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import LedPositionsScreen from "./LedPositionsScreen";
import LedWarehouseScreen from "./LedWarehouseScreen";
import LedOperatorScreen from "./LedOperatorScreen";
import LedExecutionScreen from "./LedExecutionScreen";
import LedExpenseScreen from "./LedExpenseScreen";

const STATUS_BADGE: Record<string, "gr" | "am" | "bl" | "rd" | "gy"> = {
  New: "bl", Quoted: "am", Confirmed: "gr", Cancelled: "rd",
};

type Tab = "overview" | "positions" | "warehouse" | "operators" | "execution" | "expenses";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "positions", label: "Positions" },
  { key: "warehouse", label: "Warehouse" },
  { key: "operators", label: "Operators" },
  { key: "execution", label: "Execution" },
  { key: "expenses", label: "Expenses" },
];

const fmt = (n: number) => n.toLocaleString("en-IN");

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
      <div style={{ width: 140, flexShrink: 0, fontSize: 11, color: "#64748B", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#0F172A" }}>{value}</div>
    </div>
  );
}

export default function LedInquiryHub({ inquiryId }: { inquiryId: string }) {
  const { inquiries, loading } = useInquiries();
  const [tab, setTab] = useState<Tab>("overview");

  const inquiry = useMemo(() => inquiries.find((i) => i.id === inquiryId), [inquiries, inquiryId]);

  const dateRange = inquiry
    ? inquiry.startDate === inquiry.endDate ? inquiry.startDate : `${inquiry.startDate} → ${inquiry.endDate}`
    : "";

  const eventDays = useMemo(() => {
    if (!inquiry) return 1;
    return Math.max(1, Math.round((new Date(inquiry.endDate).getTime() - new Date(inquiry.startDate).getTime()) / 86400000) + 1);
  }, [inquiry]);

  // Tab switcher bar — always shown at top
  const tabBar = (
    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--b1)", marginBottom: 24 }}>
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          style={{
            padding: "10px 16px",
            border: "none",
            borderBottom: tab === t.key ? "2px solid #3B82F6" : "2px solid transparent",
            fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? "#1D4ED8" : "#64748B",
            background: "none",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  // Non-overview tabs: render sub-screen directly with the tab bar above it
  if (tab !== "overview") {
    return (
      <div>
        <SectionHeader
          title={inquiry?.eventName ?? "LED Inquiry"}
          description={inquiry ? `${inquiry.eventType} · ${dateRange}` : "Loading…"}
        />
        <div style={{ padding: "0 0 0 0" }}>
          <div style={{ padding: "12px 24px 0" }}>{tabBar}</div>
          {tab === "positions" && <LedPositionsScreen inquiryId={inquiryId} />}
          {tab === "warehouse" && <LedWarehouseScreen inquiryId={inquiryId} />}
          {tab === "operators" && <LedOperatorScreen inquiryId={inquiryId} />}
          {tab === "execution" && <LedExecutionScreen inquiryId={inquiryId} />}
          {tab === "expenses" && <LedExpenseScreen inquiryId={inquiryId} />}
        </div>
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        title={inquiry?.eventName ?? "LED Inquiry"}
        description={inquiry ? `${inquiry.eventType} · ${dateRange}` : "Loading…"}
      />
      <ScreenFrame breadcrumbs={[
        { label: "LED Inquiries", href: "/led/inquiries" },
        { label: inquiry?.eventName ?? "Hub" },
      ]}>
        {tabBar}

        {/* Overview tab content */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
            {/* Event info card */}
            <div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Event Information</div>
                  {inquiry && <Badge variant={STATUS_BADGE[inquiry.status] ?? "gy"}>{inquiry.status}</Badge>}
                </div>
                {loading ? (
                  <div style={{ fontSize: 13, color: "#94A3B8" }}>Loading…</div>
                ) : !inquiry ? (
                  <div style={{ fontSize: 13, color: "#94A3B8" }}>Inquiry not found.</div>
                ) : (
                  <>
                    <InfoRow label="Event Name" value={inquiry.eventName} />
                    <InfoRow label="Event Type" value={inquiry.eventType} />
                    <InfoRow label="Dates" value={dateRange} />
                    <InfoRow label="Duration" value={`${eventDays} day${eventDays !== 1 ? "s" : ""}`} />
                    <InfoRow label="Venue" value={inquiry.venue} />
                    <InfoRow label="Location" value={inquiry.location} />
                  </>
                )}
              </div>

              {/* LED info card */}
              {inquiry && (inquiry.ledType || inquiry.screenAreaSqft || inquiry.ratePerSqft) && (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 14 }}>LED Setup</div>
                  <InfoRow label="LED Type" value={inquiry.ledType} />
                  {inquiry.screenWidth && inquiry.screenHeight && (
                    <InfoRow label="Screen Area" value={`${inquiry.screenWidth} × ${inquiry.screenHeight} ft`} />
                  )}
                  <InfoRow label="Sq.ft" value={inquiry.screenAreaSqft ? `${fmt(inquiry.screenAreaSqft)} sq.ft` : null} />
                  <InfoRow label="Rate / sq.ft" value={inquiry.ratePerSqft ? `₹${fmt(inquiry.ratePerSqft)}` : null} />
                  {inquiry.screenAreaSqft && inquiry.ratePerSqft && (
                    <InfoRow label="Required Billing" value={`₹${fmt(inquiry.screenAreaSqft * inquiry.ratePerSqft * eventDays)}`} />
                  )}
                </div>
              )}
            </div>

            {/* Right column — workflow progress + quick actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 14 }}>Workflow Steps</div>
                {[
                  { key: "positions", label: "Define Screen Positions", done: false },
                  { key: "warehouse", label: "Arrange Warehouse Stock", done: false },
                  { key: "operators", label: "Assign Operators", done: false },
                  { key: "execution", label: "Event Execution", done: false },
                  { key: "expenses", label: "Expense Report", done: false },
                ].map((step) => (
                  <button
                    key={step.key}
                    onClick={() => setTab(step.key as Tab)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "10px 12px",
                      marginBottom: 6,
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#0F172A",
                    }}
                  >
                    <span>{step.label}</span>
                    <ArrowRight size={13} color="#64748B" />
                  </button>
                ))}
              </div>

              {inquiry && (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>Quick Links</div>
                  {[
                    { label: "Positions →", tab: "positions" as Tab },
                    { label: "Warehouse →", tab: "warehouse" as Tab },
                    { label: "Operators →", tab: "operators" as Tab },
                    { label: "Execution →", tab: "execution" as Tab },
                    { label: "Expenses →", tab: "expenses" as Tab },
                  ].map(({ label, tab: t }) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 0", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#3B82F6", fontWeight: 500, borderBottom: "1px solid #F8FAFC" }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </ScreenFrame>
    </>
  );
}

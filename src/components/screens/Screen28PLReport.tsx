"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import * as api from "@/lib/api";

interface Props {
  inquiryId: string;
}

export default function Screen28PLReport({ inquiryId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inquiryId) return;

    let active = true;
    async function loadReport() {
      try {
        setLoading(true);
        const json = await api.fetchPLReport(inquiryId);
        if (active) setData(json);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();
    return () => { active = false; };
  }, [inquiryId]);

  const fmt = (n: number) => n.toLocaleString("en-IN");

  if (loading) {
    return (
      <ScreenFrame breadcrumb="Reports › P&L Report › Loading...">
        <LoadingSkeleton rows={6} />
      </ScreenFrame>
    );
  }

  if (error || !data) {
    return (
      <ScreenFrame breadcrumb="Reports › P&L Report › Error">
        <div className="text-center py-12 text-tx3">
          {error || "Could not generate P&L report details."}
          <div className="mt-4">
            <button className="btn" onClick={() => router.back()}><ArrowLeft size={13} /> Go Back</button>
          </div>
        </div>
      </ScreenFrame>
    );
  }

  const { inquiry, quotation, revenue, subtotalRevenue, cgst, sgst, totalStaffCost, totalVendorCost, totalRentalCost = 0, totalExpense, netProfit, profitMargin } = data;

  const isProfitable = netProfit >= 0;

  return (
    <>
      <SectionHeader
        title={<>Profit &amp; Loss <strong>Analysis</strong></>}
        description={`Revenue margins and operational margins for event ${inquiryId}.`}
      />
      <ScreenFrame
        breadcrumb={
          <>
            <span className="text-tx2">Inquiries</span> › {inquiryId} › P&amp;L Analysis
          </>
        }
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" onClick={() => window.print()}>⎙ Print / Save PDF</button>
            <Link href={`/inquiries`} className="btn">Back to List</Link>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Main Profitability KPI Card */}
          <div 
            className="card" 
            style={{ 
              background: isProfitable ? "linear-gradient(135deg, var(--sem-gr-bg), var(--s1))" : "linear-gradient(135deg, var(--sem-rd-bg), var(--s1))",
              border: `1px solid ${isProfitable ? "var(--sem-gr-bdr)" : "var(--sem-rd-bdr)"}`,
              padding: "24px",
              marginBottom: 0
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <span className="text-[10px] text-tx3 uppercase tracking-wider block">Net Event Profit (Excluding Taxes)</span>
                <h2 className="text-[32px] font-bold mt-1 font-mono" style={{ color: isProfitable ? "var(--sem-gr-tx)" : "var(--sem-rd-tx)", margin: 0, lineHeight: 1.1 }}>
                  ₹{fmt(netProfit)}
                </h2>
                <span className="text-[12px] text-tx3 mt-1 block">
                  Profit margin calculated on subtotal value of <strong>₹{fmt(subtotalRevenue)}</strong>
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="text-[10px] text-tx3 uppercase tracking-wider block">Profit Margin Percentage</span>
                <div 
                  className="badge font-mono"
                  style={{ 
                    fontSize: "20px", 
                    padding: "8px 18px", 
                    background: isProfitable ? "var(--sem-gr-bdr)" : "var(--sem-rd-bdr)",
                    color: isProfitable ? "var(--sem-gr-tx)" : "var(--sem-rd-tx)",
                    borderRadius: "8px",
                    fontWeight: 600,
                    marginTop: "6px"
                  }}
                >
                  {profitMargin.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Sheets */}
          <div className="two-col" style={{ gridTemplateColumns: "1.1fr 1fr" }}>
            
            {/* Revenue Ledger */}
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">Approved Quotation Revenue</div>
              {quotation ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="row-item">
                    <span className="text-tx2">Quotation Reference</span>
                    <strong className="font-mono text-bl">{quotation.quoteNo}</strong>
                  </div>
                  <div className="row-item">
                    <span className="text-tx2">Subtotal Value (Revenue base)</span>
                    <strong className="font-mono text-tx">₹{fmt(quotation.subtotal)}</strong>
                  </div>
                  <div className="row-item">
                    <span className="text-tx2">CGST (Gujarat State 9%)</span>
                    <span className="font-mono text-tx3">₹{fmt(quotation.cgst)}</span>
                  </div>
                  <div className="row-item">
                    <span className="text-tx2">SGST (Gujarat State 9%)</span>
                    <span className="font-mono text-tx3">₹{fmt(quotation.sgst)}</span>
                  </div>
                  <div className="divider" style={{ margin: "4px 0" }}></div>
                  <div className="row-item">
                    <span className="text-tx font-medium">Gross Revenue (Taxes Included)</span>
                    <strong className="font-mono text-[15px] text-gr">₹{fmt(quotation.total)}</strong>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-tx3 italic">No quotation generated. Revenue is ₹0.</div>
              )}
            </div>

            {/* Expense Ledger */}
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">Operational Expenses Summary</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="row-item">
                  <span className="text-tx2">Staff Crew Payroll Costs</span>
                  <span className="font-mono text-tx font-medium">₹{fmt(totalStaffCost)}</span>
                </div>
                <div className="row-item">
                  <span className="text-tx2">Equipment Vendor Outsourcing</span>
                  <span className="font-mono text-tx font-medium">₹{fmt(totalVendorCost)}</span>
                </div>
                {totalRentalCost > 0 && (
                  <div className="row-item">
                    <span className="text-tx2">Staff Equipment Rental (owner-paid)</span>
                    <span className="font-mono text-tx font-medium">₹{fmt(totalRentalCost)}</span>
                  </div>
                )}
                <div className="divider" style={{ margin: "4px 0" }}></div>
                <div className="row-item">
                  <span className="text-tx font-medium">Total Operational Outflow</span>
                  <strong className="font-mono text-[15px] text-rd">₹{fmt(totalExpense)}</strong>
                </div>
              </div>
            </div>

          </div>

        </div>
      </ScreenFrame>
    </>
  );
}

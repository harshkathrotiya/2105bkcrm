"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import * as api from "@/lib/api";
import type { Equipment } from "@/lib/types";

export default function Screen19AssetReportPDF() {
  const router = useRouter();
  const [summary, setSummary] = useState<api.EquipmentSummary | null>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        // Fetch asset summaries and all active equipment (set limit high to retrieve all items)
        const [sumData, eqResult] = await Promise.all([
          api.fetchAssetSummary(),
          api.fetchEquipment({ limit: 1000 }),
        ]);
        setSummary(sumData);
        // Filter out retired items just in case, though fetchEquipment does this
        setEquipmentList(eqResult.items.filter(eq => eq.status !== "RETIRED"));
      } catch (err: any) {
        console.error("Failed to load asset report data:", err);
        setError(err.message || "Failed to load asset report data");
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
        <LoadingSkeleton rows={10} message="Compiling physical asset valuations and category logs..." />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--rd)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3" style={{ display: "block" }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <h3>Report Generation Failed</h3>
        <p style={{ color: "var(--tx3)", fontSize: "13px" }}>{error || "Could not retrieve asset data."}</p>
        <button type="button" className="btn mt-4" onClick={() => router.back()}>
          ← Go Back
        </button>
      </div>
    );
  }

  const currentDateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Map category code to human-readable labels
  const categoryLabels: Record<string, string> = {
    CAMERA: "Cameras",
    VIDEO_MIXER: "Video Mixers",
    VIDEO_RECORDER: "Recorders",
    AUDIO_MIXER: "Audio Mixers",
    WIRELESS_TX: "Wireless TX",
    UPS: "UPS Batteries",
    ACCESSORY: "Accessories & Cables",
  };

  return (
    <div className="print-wrapper" style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Print Controls (Hidden on Print) */}
      <style>{`
        @media print {
          .site-hdr, .app-sidebar, .no-print {
            display: none !important;
          }
          html, body, .app-layout, .app-body, .app-content, .print-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
            color: #000 !important;
          }
          #asset-report-pdf-content {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            position: relative !important;
            width: 100% !important;
          }
          .pdf-frame {
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            color: #000 !important;
          }
          @page {
            margin: 10mm;
            size: A4;
          }
        }
      `}</style>
      
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          background: "var(--alt)",
          padding: "12px 18px",
          borderRadius: "8px",
          border: "1px solid var(--b1)",
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={() => router.back()}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          ← Back to Equipment
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            ⎙ Print Report / Save PDF
          </button>
        </div>
      </div>

      {/* PDF Document Container */}
      <div className="pdf-frame" id="asset-report-pdf-content">
        {/* PDF Header */}
        <div className="pdf-hdr">
          <div>
            <div className="pdf-co">BK MEDIA GROUP</div>
            <div className="pdf-co-sub">
              Mumbai HQ • Video Production & Broadcast Division<br />
              Equipment Inventory Control & Valuation System
            </div>
          </div>
          <div className="pdf-doc">
            <div className="pdf-doc-lbl">Asset Report</div>
            <div className="pdf-doc-num">VAL-REP-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</div>
            <div className="pdf-doc-sub">Generated: {currentDateStr}</div>
          </div>
        </div>

        {/* Audit Details Strip */}
        <div className="pdf-strip">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "16px" }}>
            <div>
              <div className="psi-l">Total Assets catalogued</div>
              <div className="psi-v">{summary.totalCount} units</div>
            </div>
            <div>
              <div className="psi-l">Total Seeded Value</div>
              <div className="psi-v">₹{summary.totalValue.toLocaleString("en-IN")}</div>
            </div>
            <div>
              <div className="psi-l">Active Operations Department</div>
              <div className="psi-v">Video Broadcast & Event Equipment</div>
            </div>
          </div>
        </div>

        {/* Category Breakdown Table */}
        <h4 style={{ margin: "16px 0 8px 0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          1. Valuation Breakdown by Category
        </h4>
        <table className="pdf-tbl">
          <thead>
            <tr>
              <th>Asset Category</th>
              <th style={{ textAlign: "right" }}>Total Quantity</th>
              <th style={{ textAlign: "right" }}>Total Acquisition Cost (INR)</th>
              <th style={{ textAlign: "right" }}>Percentage Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary.categories).map(([key, data]) => {
              const valPercent = summary.totalValue > 0 ? (data.value / summary.totalValue) * 100 : 0;
              return (
                <tr key={key}>
                  <td><strong>{categoryLabels[key] || key}</strong></td>
                  <td style={{ textAlign: "right" }}>{data.count}</td>
                  <td style={{ textAlign: "right" }}>₹{data.value.toLocaleString("en-IN")}</td>
                  <td style={{ textAlign: "right" }}>{valPercent.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div className="pdf-totals" style={{ marginBottom: "20px" }}>
          <div className="pdf-totals-box">
            <div className="pdf-trow">
              <span>Subtotal Valuations</span>
              <span>₹{summary.totalValue.toLocaleString("en-IN")}</span>
            </div>
            <div className="pdf-trow">
              <span>Depreciation / Adjustment</span>
              <span>₹0.00</span>
            </div>
            <div className="pdf-trow">
              <span>Net Valuation</span>
              <span>₹{summary.totalValue.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Equipment Details Inventory List */}
        <h4 style={{ margin: "24px 0 8px 0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          2. Granular Physical Asset Ledger
        </h4>
        <table className="pdf-tbl" style={{ fontSize: "8.5px" }}>
          <thead>
            <tr>
              <th style={{ width: "40px" }}>ID</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Serial Number</th>
              <th>Location / Custody</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th style={{ textAlign: "right" }}>Price (INR)</th>
              <th style={{ width: "90px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {equipmentList.map((eq) => (
              <tr key={eq.id}>
                <td>#{eq.id}</td>
                <td><strong>{eq.productName}</strong></td>
                <td>{categoryLabels[eq.category] || eq.category}</td>
                <td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{eq.serialNumber || "—"}</td>
                <td>{eq.respPerson || "Warehouse"}</td>
                <td style={{ textAlign: "right" }}>{eq.quantity}</td>
                <td style={{ textAlign: "right" }}>₹{(eq.purchasePrice || 0).toLocaleString("en-IN")}</td>
                <td>{eq.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PDF Sign-off Footer */}
        <div className="pdf-footer">
          <div className="pdf-sign">
            <div className="pdf-sign-line"></div>
            <div className="pdf-sign-lbl">Prepared By: Operations Lead</div>
          </div>
          <div className="pdf-sign">
            <div className="pdf-sign-line"></div>
            <div className="pdf-sign-lbl">Audited By: Warehouse Inspector</div>
          </div>
          <div className="pdf-sign">
            <div className="pdf-sign-line"></div>
            <div className="pdf-sign-lbl">Approved By: Head of Production</div>
          </div>
        </div>
      </div>
    </div>
  );
}

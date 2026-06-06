"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import * as api from "@/lib/api";
import type { Equipment } from "@/lib/types";
import { useToast } from "../ui/Toast";

export default function Screen19AssetReportPDF() {
  const router = useRouter();
  const toast = useToast();
  const [summary, setSummary] = useState<api.EquipmentSummary | null>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");

  useEffect(() => {
    const loadReportData = async () => {
      try {
        await Promise.resolve(); // yields execution to make state changes async and prevent rendering cascade
        setLoading(true);
        setDocumentNumber(`VAL-REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
        
        // Fetch asset summaries and all active equipment (set limit high to retrieve all items)
        const [sumData, eqResult] = await Promise.all([
          api.fetchAssetSummary(),
          api.fetchEquipment({ limit: 1000 }),
        ]);
        setSummary(sumData);
        // Filter out retired/sold items just in case, though fetchEquipment does this
        setEquipmentList(eqResult.items.filter(eq => eq.status !== "RETIRED" && eq.status !== "SOLD"));
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

  // ── CSV Export (uses data already loaded on the page) ────────────────
  const handleExportCsv = () => {
    setExporting(true);
    try {
      const headers = [
        "id",
        "product_name",
        "category",
        "quantity",
        "serial_number",
        "body_name",
        "kit_id",
        "resp_person",
        "purchase_date",
        "purchase_from",
        "bill_number",
        "purchase_price",
        "status",
        "notes",
      ];

      const escapeCell = (val: string | number | null | undefined) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = equipmentList.map((eq) => [
        escapeCell(eq.id),
        escapeCell(eq.productName),
        escapeCell(eq.category),
        escapeCell(eq.quantity),
        escapeCell(eq.serialNumber),
        escapeCell(eq.bodyName),
        escapeCell(eq.kitId),
        escapeCell(eq.respPerson),
        escapeCell(eq.purchaseDate),
        escapeCell(eq.purchaseFrom),
        escapeCell(eq.billNumber),
        escapeCell(eq.purchasePrice),
        escapeCell(eq.status),
        escapeCell(eq.notes),
      ].join(","));

      // UTF-8 BOM so Excel opens it correctly
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `bk-asset-report-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("CSV export failed:", err);
      toast.error("Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
        <LoadingSkeleton rows={10} />
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
          <ArrowLeft size={13} /> Go Back
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
          /* Hide non-printing UI chrome */
          .site-hdr,
          .app-sidebar,
          .no-print {
            display: none !important;
          }

          /* Strip flex/height constraints that create phantom whitespace pages */
          html,
          body {
            height: auto !important;
            min-height: unset !important;
            overflow: visible !important;
          }
          .app-layout {
            display: block !important;
            min-height: unset !important;
            height: auto !important;
          }
          .app-body {
            display: block !important;
            flex: unset !important;
            height: auto !important;
          }
          .app-content {
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          .print-wrapper {
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            height: auto !important;
          }

          /* PDF content colours and clean rendering */
          .pdf-frame {
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            color: #000 !important;
          }
          #asset-report-pdf-content {
            background: #fff !important;
            color: #000 !important;
          }

          @page {
            margin: 15mm;
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
          <ArrowLeft size={13} /> Back to Equipment
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn"
            onClick={handleExportCsv}
            disabled={exporting || equipmentList.length === 0}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {exporting ? "Exporting…" : <><Upload size={13} /> Export CSV</>}
          </button>
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
            <div style={{ color: "var(--rd)", fontSize: "10px", fontWeight: 600, marginTop: "2px", letterSpacing: "0.5px" }}>Internal — Confidential</div>
            <div className="pdf-doc-num">{documentNumber}</div>
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

        <div style={{ textAlign: "center", fontSize: "10px", color: "var(--tx3)", marginTop: "30px", fontWeight: "600", letterSpacing: "1px" }}>
          *** Internal — Confidential ***
        </div>
      </div>
    </div>
  );
}

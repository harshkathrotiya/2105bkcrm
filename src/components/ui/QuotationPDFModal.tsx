"use client";

import { useEffect } from "react";
import Link from "next/link";
import Badge from "./Badge";
import { useQuotations, useInquiries } from "@/lib/store";
import { X, Download } from "lucide-react";

const equipmentDescriptions: Record<string, string> = {
  FS6: "Sony FS6 professional video camera",
  "FX3 + Wireless": "Sony FX3 with wireless transmitter",
  DSLR: "DSLR professional photography",
  "Crane 32 Feet": "32 foot videography crane",
  "Crane 48 Feet": "48 foot videography crane",
  "RS4 Gimbal": "DJI RS4 gimbal stabilizer",
  "DJI Mavic 3": "DJI Mavic 3 drone",
  "Z150": "Sony Z150 professional camera",
  PC: "Source PC for live streaming",
  "Live PC": "Live streaming PC",
  Editor: "Video editor workstation",
  "Photo Editor": "Photo editor workstation",
  Drone: "Aerial drone camera",
  FPV: "First-person view drone",
};

const fmt = (n: number) => (n ?? 0).toLocaleString("en-IN");

interface Props {
  quotationId: string;
  onClose: () => void;
}

export default function QuotationPDFModal({ quotationId, onClose }: Props) {
  const { quotations } = useQuotations();
  const { inquiries } = useInquiries();

  const quotation = quotations.find((q) => q.id === quotationId);
  const inquiry = quotation ? inquiries.find((i) => i.id === quotation.inquiryId) : null;
  const isLed = inquiry?.department === "LED";
  const isMerged = inquiry?.department === "MERGED";

  // All quotations for the same inquiry (for revision history)
  const revisions = quotation
    ? quotations
        .filter((q) => q.inquiryId === quotation.inquiryId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleDownload = () => window.print();

  if (!quotation) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal panel */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1001,
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "24px 16px", overflowY: "auto",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{
            width: "100%", maxWidth: 960,
            background: "var(--s1)", borderRadius: 14,
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          {/* Modal header bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 20px", borderBottom: "1px solid var(--b1)",
            background: "var(--alt)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="text-[13px] font-medium text-tx">{quotation.quoteNo}</span>
              <span className="text-[11px] text-tx3">· Quotation PDF</span>
              {quotation.status === "Approved" && <Badge variant="gr">Approved</Badge>}
              {quotation.status === "Sent" && <Badge variant="am">Sent</Badge>}
              {quotation.status === "Draft" && <Badge variant="gy">Draft</Badge>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn text-[11px]"
                onClick={handleDownload}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <Download size={13} /> Download PDF
              </button>
              <button
                onClick={onClose}
                className="btn"
                style={{ padding: "6px 10px" }}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Modal body — PDF left + actions right */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 0 }}>

            {/* PDF content */}
            <div style={{ padding: "20px", overflowY: "auto", maxHeight: "80vh" }}>
              {/* Internal warning */}
              <div style={{
                display: "flex", alignItems: "center", padding: "8px 12px",
                background: "var(--sem-notif-bg)", border: "1px solid var(--sem-notif-bdr)",
                color: "var(--acc)", borderRadius: 7, fontSize: 11, marginBottom: 16,
              }}>
                ⚠ Internal: Client ને item rates show નહીં થાય — Position + Equipment + Days only
              </div>

              <div className="pdf-frame" id="quotation-pdf-content">
                <div className="pdf-hdr">
                  <div>
                    <div className="pdf-co">BK Media</div>
                    <div className="pdf-co-sub">
                      Media Production Services · Vadodara, Gujarat<br />
                      +91 98250 00000 · info@bkmedia.in · GST: 24XXXXX1234X1ZX
                    </div>
                  </div>
                  <div className="pdf-doc">
                    <div className="pdf-doc-lbl">Quotation</div>
                    <div className="pdf-doc-num">{quotation.quoteNo}</div>
                    <div className="pdf-doc-sub">
                      Date: {new Date(quotation.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="pdf-doc-sub">Valid: 15 days</div>
                  </div>
                </div>

                <div className="text-[11px] mb-2 text-[#333]">
                  <strong>{quotation.clientName}</strong> — Attn: Client
                </div>

                <div className="pdf-strip grid-cols-4">
                  <div><div className="psi-l">Event</div><div className="psi-v">{quotation.eventName}</div></div>
                  <div>
                    <div className="psi-l">Dates</div>
                    <div className="psi-v">
                      {new Date(quotation.startDate).getDate()}–
                      {new Date(quotation.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div><div className="psi-l">Days</div><div className="psi-v">{quotation.days} days</div></div>
                  <div><div className="psi-l">Venue</div><div className="psi-v">{quotation.venue}</div></div>
                </div>

                {/* Items table */}
                {isLed ? (
                  <table className="pdf-tbl">
                    <thead><tr>
                      <th style={{ width: 28 }}>No.</th><th>Description</th>
                      <th style={{ width: 110, textAlign: "center" }}>Area (sq.ft)</th>
                      <th style={{ width: 46, textAlign: "center" }}>Days</th>
                      <th style={{ width: 100, textAlign: "right" }}>Amount (₹)</th>
                    </tr></thead>
                    <tbody>
                      {quotation.equipment.map((row, idx) => {
                        const area = inquiry?.screenAreaSqft || (inquiry?.screenWidth && inquiry?.screenHeight ? inquiry.screenWidth * inquiry.screenHeight : 0) || 0;
                        return (
                          <tr key={row.no}>
                            <td>{idx + 1}</td><td>{row.position}</td>
                            <td style={{ textAlign: "center" }}>{area ? `${area.toFixed(1)} sq.ft` : "—"}</td>
                            <td style={{ textAlign: "center" }}>{row.days}</td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>₹{fmt(row.amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : isMerged ? (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 8, borderBottom: "1.5px solid var(--b1)", paddingBottom: 4 }}>
                      Video Services
                    </div>
                    <table className="pdf-tbl" style={{ marginBottom: 20 }}>
                      <thead><tr>
                        <th style={{ width: 28 }}>No.</th><th>Position</th><th>Equipment description</th>
                        <th style={{ width: 46, textAlign: "center" }}>Days</th>
                      </tr></thead>
                      <tbody>
                        {quotation.equipment.filter(r => !r.equip.includes("LED")).map((row, idx) => (
                          <tr key={row.no}>
                            <td>{idx + 1}</td><td>{row.position}</td>
                            <td>{equipmentDescriptions[row.equip] ?? row.equip}</td>
                            <td style={{ textAlign: "center" }}>{row.days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 8, borderBottom: "1.5px solid var(--b1)", paddingBottom: 4 }}>
                      LED Services
                    </div>
                    <table className="pdf-tbl">
                      <thead><tr>
                        <th style={{ width: 28 }}>No.</th><th>Description</th>
                        <th style={{ width: 110, textAlign: "center" }}>Area (sq.ft)</th>
                        <th style={{ width: 46, textAlign: "center" }}>Days</th>
                        <th style={{ width: 100, textAlign: "right" }}>Amount (₹)</th>
                      </tr></thead>
                      <tbody>
                        {quotation.equipment.filter(r => r.equip.includes("LED")).map((row, idx) => {
                          const area = inquiry?.screenAreaSqft || (inquiry?.screenWidth && inquiry?.screenHeight ? inquiry.screenWidth * inquiry.screenHeight : 0) || 0;
                          return (
                            <tr key={row.no}>
                              <td>{idx + 1}</td><td>{row.position}</td>
                              <td style={{ textAlign: "center" }}>{area ? `${area.toFixed(1)} sq.ft` : "—"}</td>
                              <td style={{ textAlign: "center" }}>{row.days}</td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>₹{fmt(row.amount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <table className="pdf-tbl">
                    <thead><tr>
                      <th style={{ width: 28 }}>No.</th><th>Position</th><th>Equipment description</th>
                      <th style={{ width: 46, textAlign: "center" }}>Days</th>
                    </tr></thead>
                    <tbody>
                      {quotation.equipment.map((row) => (
                        <tr key={row.no}>
                          <td>{row.no}</td><td>{row.position}</td>
                          <td>{row.equip.includes("LED") ? `${row.equip} Screen` : (equipmentDescriptions[row.equip] ?? row.equip)}</td>
                          <td style={{ textAlign: "center" }}>{row.days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="pdf-totals">
                  <div className="pdf-totals-box">
                    <div className="pdf-trow"><span>Subtotal</span><span>₹{fmt(quotation.subtotal)}</span></div>
                    <div className="pdf-trow"><span>CGST @ 9%</span><span>₹{fmt(quotation.cgst)}</span></div>
                    <div className="pdf-trow"><span>SGST @ 9%</span><span>₹{fmt(quotation.sgst)}</span></div>
                    <div className="pdf-trow"><span>Total</span><span style={{ color: "#1050A0" }}>₹{fmt(quotation.total)}</span></div>
                  </div>
                </div>

                {(isLed || isMerged) && (
                  <div className="text-[10px] text-rd font-medium border border-rd/20 bg-rd/[0.03] rounded p-2 my-3 text-center">
                    Terms: De-installation only after receipt of full payment.
                  </div>
                )}

                <div className="pdf-footer">
                  <div className="pdf-sign"><div className="pdf-sign-line" /><div className="pdf-sign-lbl">BK Media — Authorised</div></div>
                  <div className="w-10 h-10 rounded-full border-[1.5px] border-[#888] flex items-center justify-center text-[8px] font-bold text-[#888]">STAMP</div>
                  <div className="pdf-sign"><div className="pdf-sign-line" /><div className="pdf-sign-lbl">Client acceptance</div></div>
                </div>
              </div>
            </div>

            {/* Right — actions panel */}
            <div style={{
              borderLeft: "1px solid var(--b1)", padding: "20px 16px",
              display: "flex", flexDirection: "column", gap: 12,
              background: "var(--alt)",
            }}>
              {/* Status */}
              <div>
                <div className="card-t" style={{ marginBottom: 10 }}>Status &amp; actions</div>
                <div className="row-item"><span className="text-[11px] text-tx3">Created</span><span className="text-[11px]">{new Date(quotation.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>
                <div className="row-item"><span className="text-[11px] text-tx3">Sent</span><span className="text-[11px] text-tx3">{quotation.sentAt ? new Date(quotation.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not yet"}</span></div>
                <div className="row-item"><span className="text-[11px] text-tx3">Approved</span><span className="text-[11px] text-tx3">{quotation.approvedAt ? new Date(quotation.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not yet"}</span></div>
              </div>

              {/* Revision history */}
              {revisions.length > 0 && (
                <>
                  <div className="divider" />
                  <div>
                    <div className="card-t" style={{ marginBottom: 8 }}>Revision history</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {[...revisions].reverse().map((rev) => {
                        const isCurrent = rev.id === quotation.id;
                        return (
                          <Link
                            key={rev.id}
                            href={`/quotations/${rev.id}/pdf`}
                            onClick={onClose}
                            className={`flex items-center justify-between rounded-md transition-colors ${isCurrent ? "bg-bl/10 border border-bl/20" : "hover:bg-hover-bg"}`}
                            style={{ padding: "6px 10px" }}
                          >
                            <span className={`font-mono text-[11px] ${isCurrent ? "text-bl font-medium" : "text-tx2"}`}>{rev.quoteNo}</span>
                            <Badge variant={rev.status === "Approved" ? "gr" : rev.status === "Revised" ? "bl" : rev.status === "Sent" ? "am" : "gy"}>
                              {rev.status}
                            </Badge>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #quotation-pdf-content, #quotation-pdf-content * { visibility: visible; }
          #quotation-pdf-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .pdf-frame { box-shadow: none !important; border: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>
    </>
  );
}

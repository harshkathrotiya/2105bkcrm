"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useQuotations, useInquiries } from "@/lib/store";
import { generateRevisionNo } from "@/lib/utils";

interface Props {
  quotationId: string;
}

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

export default function Screen06QuotationPDF({ quotationId }: Props) {
  const router = useRouter();
  const { quotations, dispatchQuotations } = useQuotations();
  const { inquiries } = useInquiries();
  const quotation = quotations.find((q) => q.id === quotationId);
  const inquiry = quotation ? inquiries.find((i) => i.id === quotation.inquiryId) : null;
  const isLed = inquiry?.department === "LED";
  const isMerged = inquiry?.department === "MERGED";

  // All quotations for the same inquiry (current + revisions)
  const revisions = quotation
    ? quotations
        .filter((q) => q.inquiryId === quotation.inquiryId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
    : [];

  const statusBadge = (() => {
    switch (quotation?.status) {
      case "Approved":
        return <Badge variant="gr">Approved</Badge>;
      case "Sent":
        return <Badge variant="am">Sent</Badge>;
      case "Revised":
        return <Badge variant="bl">Revised</Badge>;
      default:
        return <Badge variant="am">Draft</Badge>;
    }
  })();

  const handleMarkApproved = () => {
    if (!quotation) return;
    dispatchQuotations({
      type: "UPDATE_QUOTATION",
      payload: {
        id: quotation.id,
        status: "Approved",
        approvedAt: new Date().toISOString().split("T")[0],
      },
    });
  };

  const handleRevise = () => {
    if (!quotation) return;

    const allQuoteNos = quotations.map((q) => q.quoteNo);
    const newQuoteNo = generateRevisionNo(quotation.quoteNo, allQuoteNos);
    const newId = `quote-${Date.now()}`;

    // Mark current as Revised
    dispatchQuotations({
      type: "UPDATE_QUOTATION",
      payload: {
        id: quotation.id,
        status: "Revised",
      },
    });

    // Create new revision with same data
    dispatchQuotations({
      type: "ADD_QUOTATION",
      payload: {
        id: newId,
        inquiryId: quotation.inquiryId,
        clientName: quotation.clientName,
        eventName: quotation.eventName,
        quoteNo: newQuoteNo,
        startDate: quotation.startDate,
        endDate: quotation.endDate,
        days: quotation.days,
        venue: quotation.venue,
        status: "Draft",
        equipment: quotation.equipment.map((row) => ({ ...row })),
        subtotal: quotation.subtotal,
        cgst: quotation.cgst,
        sgst: quotation.sgst,
        total: quotation.total,
        createdAt: new Date().toISOString().split("T")[0],
        sentAt: null,
        approvedAt: null,
      },
    });

    // Navigate to the form so they can edit the new revision before generating the PDF
    router.push(`/quotations/new?inquiryId=${quotation.inquiryId}`);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const fmt = (n: number) => n.toLocaleString("en-IN");

  if (!quotation) {
    return (
      <>
        <SectionHeader title={<>Quotation <strong>PDF preview</strong></>} />
        <div className="sf"><div className="cnt">No quotation found.</div></div>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Quotation <strong>PDF preview</strong></>}
        description="Preview the client-facing quotation PDF — rates are hidden from the client view."
      />
      <ScreenFrame
        breadcrumb={
          <>
            <span className="text-tx2">{quotation.quoteNo}</span> › Quotation PDF
          </>
        }
        actions={
          <>
            {statusBadge}
            <Link href={`/staff/assign?inquiryId=${quotation.inquiryId}`} className="btn">
              Crew
            </Link>
            <Link href={`/warehouse/check?inquiryId=${quotation.inquiryId}`} className="btn">
              Warehouse
            </Link>
            <button className="btn" onClick={handleRevise}>
              + Revise
            </button>
            <button
              className="btn btn-success"
              onClick={handleMarkApproved}
              disabled={quotation.status === "Approved"}
            >
              ✓ Mark approved
            </button>
            <button
              className="btn"
              onClick={() => {
                dispatchQuotations({
                  type: "UPDATE_QUOTATION",
                  payload: {
                    id: quotation.id,
                    sentAt: new Date().toISOString().split("T")[0],
                    status: "Sent",
                  },
                });
              }}
            >
              WhatsApp ↗
            </button>
            <button className="btn btn-primary" onClick={handleDownloadPDF}>
              Download PDF
            </button>
          </>
        }
      >
        {/* Warning */}
        <div
          className="rounded-lg text-[11px]"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
            lineHeight: "1.4",
            background: "var(--sem-notif-bg)",
            border: "1px solid var(--sem-notif-bdr)",
            color: "var(--acc)",
            marginBottom: "20px",
          }}
        >
          ⚠ Internal: Client ને item rates show નહીં થાય — Position + Equipment +
          Days only
        </div>

        <div className="two-col">
          {/* PDF Preview */}
          <div>
            <div className="pdf-frame" id="quotation-pdf-content">
              <div className="pdf-hdr">
                <div>
                  <div className="pdf-co">BK Media</div>
                  <div className="pdf-co-sub">
                    Media Production Services · Vadodara, Gujarat
                    <br />
                    +91 98250 00000 · info@bkmedia.in · GST: 24XXXXX1234X1ZX
                  </div>
                </div>
                <div className="pdf-doc">
                  <div className="pdf-doc-lbl">Quotation</div>
                  <div className="pdf-doc-num">{quotation.quoteNo}</div>
                  <div className="pdf-doc-sub">
                    Date:{" "}
                    {new Date(quotation.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="pdf-doc-sub">Valid: 15 days</div>
                </div>
              </div>

              <div className="text-[11px] mb-2 text-[#333]">
                <strong>{quotation.clientName}</strong> — Attn: Client
              </div>

              <div className="pdf-strip grid-cols-4">
                <div>
                  <div className="psi-l">Event</div>
                  <div className="psi-v">{quotation.eventName}</div>
                </div>
                <div>
                  <div className="psi-l">Dates</div>
                  <div className="psi-v">
                    {new Date(quotation.startDate).getDate()}–
                    {new Date(quotation.endDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div>
                  <div className="psi-l">Days</div>
                  <div className="psi-v">{quotation.days} days</div>
                </div>
                <div>
                  <div className="psi-l">Venue</div>
                  <div className="psi-v">{quotation.venue}</div>
                </div>
              </div>

              {/* Items table */}
              {isLed ? (
                <table className="pdf-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>No.</th>
                      <th>Description</th>
                      <th style={{ width: 110, textAlign: "center" }}>Area (sq.ft)</th>
                      <th style={{ width: 70, textAlign: "right" }}>Rate/sq.ft</th>
                      <th style={{ width: 46, textAlign: "center" }}>Days</th>
                      <th style={{ width: 100, textAlign: "right" }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.equipment.map((row, idx) => {
                      const area = inquiry?.screenAreaSqft || (inquiry?.screenWidth && inquiry?.screenHeight ? inquiry.screenWidth * inquiry.screenHeight : 0) || 0;
                      return (
                        <tr key={row.no}>
                          <td>{idx + 1}</td>
                          <td>{row.position}</td>
                          <td style={{ textAlign: "center" }}>{area ? `${area.toFixed(1)} sq.ft` : "—"}</td>
                          <td style={{ textAlign: "right" }}>₹{row.rate}</td>
                          <td style={{ textAlign: "center" }}>{row.days}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>₹{fmt(row.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : isMerged ? (
                <div>
                  <div style={{ fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", color: "var(--tx3)", marginBottom: "8px", borderBottom: "1.5px solid var(--b1)", paddingBottom: "4px" }}>
                    Video Services
                  </div>
                  <table className="pdf-tbl" style={{ marginBottom: "20px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 28 }}>No.</th>
                        <th>Position</th>
                        <th>Equipment description</th>
                        <th style={{ width: 46, textAlign: "center" }}>Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.equipment
                        .filter(row => !row.equip.includes("LED"))
                        .map((row, idx) => (
                          <tr key={row.no}>
                            <td>{idx + 1}</td>
                            <td>{row.position}</td>
                            <td>{equipmentDescriptions[row.equip] ?? row.equip}</td>
                            <td style={{ textAlign: "center" }}>{row.days}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  <div style={{ fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", color: "var(--tx3)", marginBottom: "8px", borderBottom: "1.5px solid var(--b1)", paddingBottom: "4px" }}>
                     LED Services
                  </div>
                  <table className="pdf-tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 28 }}>No.</th>
                        <th>Description</th>
                        <th style={{ width: 110, textAlign: "center" }}>Area (sq.ft)</th>
                        <th style={{ width: 46, textAlign: "center" }}>Days</th>
                        <th style={{ width: 100, textAlign: "right" }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.equipment
                        .filter(row => row.equip.includes("LED"))
                        .map((row, idx) => {
                          const area = inquiry?.screenAreaSqft || (inquiry?.screenWidth && inquiry?.screenHeight ? inquiry.screenWidth * inquiry.screenHeight : 0) || 0;
                          return (
                            <tr key={row.no}>
                              <td>{idx + 1}</td>
                              <td>{row.position}</td>
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
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>No.</th>
                      <th>Position</th>
                      <th>Equipment description</th>
                      <th style={{ width: 46, textAlign: "center" }}>Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.equipment.map((row) => (
                      <tr key={row.no}>
                        <td>{row.no}</td>
                        <td>{row.position}</td>
                        <td>
                          {row.equip.includes("LED") ? `${row.equip} Screen` : (equipmentDescriptions[row.equip] ?? row.equip)}
                        </td>
                        <td style={{ textAlign: "center" }}>{row.days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="pdf-totals">
                <div className="pdf-totals-box">
                  <div className="pdf-trow">
                    <span>Subtotal</span>
                    <span>₹{fmt(quotation.subtotal)}</span>
                  </div>
                  <div className="pdf-trow">
                    <span>CGST @ 9%</span>
                    <span>₹{fmt(quotation.cgst)}</span>
                  </div>
                  <div className="pdf-trow">
                    <span>SGST @ 9%</span>
                    <span>₹{fmt(quotation.sgst)}</span>
                  </div>
                  <div className="pdf-trow">
                    <span>Total</span>
                    <span style={{ color: "#1050A0" }}>
                      ₹{fmt(quotation.total)}
                    </span>
                  </div>
                </div>
              </div>

              {(isLed || isMerged) && (
                <div className="text-[10px] text-rd font-medium border border-rd/20 bg-rd/[0.03] rounded p-2 my-3 text-center">
                  Terms: De-installation only after receipt of full payment.
                </div>
              )}

              <div className="pdf-footer">
                <div className="pdf-sign">
                  <div className="pdf-sign-line"></div>
                  <div className="pdf-sign-lbl">
                    BK Media — Authorised
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border-[1.5px] border-[#888] flex items-center justify-center text-[8px] font-bold text-[#888]">
                  STAMP
                </div>
                <div className="pdf-sign">
                  <div className="pdf-sign-line"></div>
                  <div className="pdf-sign-lbl">
                    Client acceptance
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Status & actions */}
          <div>
            <div className="card">
              <div className="card-t">Status & actions</div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Created</span>
                <span className="text-[11px]">
                  {new Date(quotation.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Sent</span>
                <span className="text-[11px] text-tx3">
                  {quotation.sentAt
                    ? new Date(quotation.sentAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Not yet"}
                </span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Approved</span>
                <span className="text-[11px] text-tx3">
                  {quotation.approvedAt
                    ? new Date(quotation.approvedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Not yet"}
                </span>
              </div>
              <div className="divider"></div>
              <div className="flex flex-col gap-[6px]">
                <button
                  className="btn justify-center"
                  onClick={() => {
                    dispatchQuotations({
                      type: "UPDATE_QUOTATION",
                      payload: {
                        id: quotation.id,
                        sentAt: new Date().toISOString().split("T")[0],
                        status: "Sent",
                      },
                    });
                  }}
                >
                  WhatsApp send ↗
                </button>
                <button
                  className="btn justify-center"
                  onClick={() => {
                    dispatchQuotations({
                      type: "UPDATE_QUOTATION",
                      payload: {
                        id: quotation.id,
                        sentAt: new Date().toISOString().split("T")[0],
                        status: "Sent",
                      },
                    });
                  }}
                >
                  Email send ↗
                </button>
                <button
                  className="btn btn-success justify-center"
                  onClick={handleMarkApproved}
                  disabled={quotation.status === "Approved"}
                >
                  ✓ Mark approved
                </button>
                <button
                  className="btn justify-center"
                  onClick={handleRevise}
                >
                  + Create revision
                </button>
                <Link
                  href={`/inquiries/${quotation.inquiryId}`}
                  className="btn btn-primary justify-center text-center"
                >
                  Go to approval
                </Link>
              </div>
            </div>

            {/* Revision history */}
            <div className="card">
              <div className="card-t">Revision history</div>
              {revisions.length === 0 ? (
                <div className="text-[11px] text-tx3">No revisions yet</div>
              ) : (
                <div className="flex flex-col gap-[4px]">
                  {/* Show from latest to oldest */}
                  {[...revisions].reverse().map((rev) => {
                    const isCurrent = rev.id === quotation.id;
                    return (
                      <Link
                        key={rev.id}
                        href={`/quotations/${rev.id}/pdf`}
                        className={`flex items-center justify-between rounded-md transition-colors ${
                          isCurrent
                            ? "bg-bl/10 border border-bl/20"
                            : "hover:bg-hover-bg"
                        }`}
                        style={{ padding: "8px 12px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className={`font-mono text-[11px] ${
                            isCurrent ? "text-bl font-medium" : "text-tx2"
                          }`}
                        >
                          {rev.quoteNo}
                        </span>
                        <div className="flex items-center gap-[6px]">
                          {isCurrent && (
                            <span className="text-[9px] text-bl font-medium">
                              Current
                            </span>
                          )}
                          <Badge
                            variant={
                              rev.status === "Approved"
                                ? "gr"
                                : rev.status === "Revised"
                                ? "bl"
                                : rev.status === "Sent"
                                ? "am"
                                : "gy"
                            }
                          >
                            {rev.status}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScreenFrame>

      {/* Print styles injected for PDF download */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #quotation-pdf-content,
          #quotation-pdf-content * {
            visibility: visible;
          }
          #quotation-pdf-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .pdf-frame {
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}

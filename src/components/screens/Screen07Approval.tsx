"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import Timeline from "../ui/Timeline";
import { useQuotations, useInquiries, useInvoices, useCalendar } from "@/lib/store";
import { generateInvoiceNo } from "@/lib/utils";

interface Props {
  quotationId: string;
}

export default function Screen07Approval({ quotationId }: Props) {
  const router = useRouter();
  const { quotations, dispatchQuotations } = useQuotations();
  const { inquiries, dispatchInquiries } = useInquiries();
  const { invoices, dispatchInvoices } = useInvoices();
  const { calendarEvents, dispatchCalendar } = useCalendar();
  const quotation = quotations.find((q) => q.id === quotationId);
  const [approvalDate, setApprovalDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [signedCopyName, setSignedCopyName] = useState("");
  const [signedCopyBase64, setSignedCopyBase64] = useState("");
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const isApproved = approved || quotation?.status === "Approved";

  const handleApprove = async () => {
    if (!quotation || isApproved || approving) return;

    setApproving(true);

    const existingInvoice = invoices.find((inv) => inv.quotationId === quotation.id);
    const invoiceId = existingInvoice?.id || `inv-${Date.now()}`;
    setCreatedInvoiceId(invoiceId);
    
    const shouldConfirmBooking = quotation.status !== "Approved";

    if (shouldConfirmBooking) {
      await dispatchQuotations({
        type: "UPDATE_QUOTATION",
        payload: {
          id: quotation.id,
          status: "Approved",
          approvedAt: approvalDate,
          signedCopyUrl: signedCopyBase64 || undefined,
          signedCopyName: signedCopyName || undefined,
        },
      });

      const inquiry = inquiries.find((i) => i.id === quotation.inquiryId);
      if (inquiry) {
        await dispatchInquiries({
          type: "UPDATE_INQUIRY",
          payload: {
            id: inquiry.id,
            status: "Confirmed",
          },
        });
      }

      // Delete old inquiry calendar events first
      const eventsToDelete = calendarEvents.filter((evt) =>
        evt.id.startsWith(`cal-${quotation.inquiryId}-`)
      );
      if (eventsToDelete.length > 0) {
        await dispatchCalendar({
          type: "BULK_DELETE_CALENDAR_EVENTS",
          payload: eventsToDelete.map((evt) => evt.id),
        });
      }

      const inquiryObj = inquiries.find((i) => i.id === quotation.inquiryId);
      const eventDisplayName = `${quotation.eventName || inquiryObj?.eventType || "Event"} — ${quotation.clientName}`;
      
      const startDt = new Date(quotation.startDate);
      const endDt = new Date(quotation.endDate);
      const calType = "confirmed" as const;
      let idx = 0;
      const eventsToAdd = [];
      for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
        eventsToAdd.push({
          id: `cal-${quotation.inquiryId}-confirmed-${idx++}`,
          date: d.getDate(),
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          label: eventDisplayName,
          type: calType,
        });
      }
      if (eventsToAdd.length > 0) {
        await dispatchCalendar({
          type: "BULK_ADD_CALENDAR_EVENTS",
          payload: eventsToAdd,
        });
      }
    }

    if (!existingInvoice) {
      const inquiry = inquiries.find((i) => i.id === quotation.inquiryId);
      const isLedOrMerged = inquiry?.department === "LED" || inquiry?.department === "MERGED";

      const advance = Math.round(quotation.total * 0.5);
      const grossForInvoice = quotation.total;
      const videographyAmount = isLedOrMerged ? grossForInvoice : Math.round(grossForInvoice * 0.82);
      const photographyAmount = isLedOrMerged ? 0 : grossForInvoice - videographyAmount;

      await dispatchInvoices({
        type: "ADD_INVOICE",
        payload: {
          id: invoiceId,
          quotationId: quotation.id,
          invoiceNo: generateInvoiceNo(invoices.map((inv) => inv.invoiceNo)),
          clientName: quotation.clientName,
          eventName: quotation.eventName,
          startDate: quotation.startDate,
          endDate: quotation.endDate,
          venue: quotation.venue,
          videographyAmount,
          photographyAmount,
          advance,
          balance: quotation.total - advance,
          status: "Unpaid",
          advanceReceived: false,
          advanceReceivedAt: null,
          advanceRef: "",
          advanceMethod: "",
          balanceReceived: false,
          balanceReceivedAt: null,
          balanceRef: "",
          balanceMethod: "",
          hddDelivered: false,
          deinstallDone: isLedOrMerged ? false : undefined,
          createdAt: approvalDate,
          dueDate: new Date(
            new Date(approvalDate).getTime() + 7 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
        },
      });
    }

    setApproved(true);
  };

  const handleCreateInvoice = async () => {
    if (!quotation || creatingInvoice) return;
    setCreatingInvoice(true);
    try {
      const invoiceId = `inv-${Date.now()}`;
      setCreatedInvoiceId(invoiceId);

      const inquiry = inquiries.find((i) => i.id === quotation.inquiryId);
      const isLedOrMerged = inquiry?.department === "LED" || inquiry?.department === "MERGED";

      const advance = Math.round(quotation.total * 0.5);
      const grossForInvoice = quotation.total;
      const videographyAmount = isLedOrMerged ? grossForInvoice : Math.round(grossForInvoice * 0.82);
      const photographyAmount = isLedOrMerged ? 0 : grossForInvoice - videographyAmount;

      await dispatchInvoices({
        type: "ADD_INVOICE",
        payload: {
          id: invoiceId,
          quotationId: quotation.id,
          invoiceNo: generateInvoiceNo(invoices.map((inv) => inv.invoiceNo)),
          clientName: quotation.clientName,
          eventName: quotation.eventName,
          startDate: quotation.startDate,
          endDate: quotation.endDate,
          venue: quotation.venue,
          videographyAmount,
          photographyAmount,
          advance,
          balance: quotation.total - advance,
          status: "Unpaid",
          advanceReceived: false,
          advanceReceivedAt: null,
          advanceRef: "",
          advanceMethod: "",
          balanceReceived: false,
          balanceReceivedAt: null,
          balanceRef: "",
          balanceMethod: "",
          hddDelivered: false,
          deinstallDone: isLedOrMerged ? false : undefined,
          createdAt: new Date().toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Find the invoice that was generated from this quotation
  const invoice = invoices.find((inv) => inv.quotationId === quotation?.id);

  const fmt = (n: number) => n.toLocaleString("en-IN");

  if (!quotation) {
    return (
      <>
        <SectionHeader title={<>Quotation <strong>approval</strong></>} />
        <div className="sf"><div className="cnt">No quotation found.</div></div>
      </>
    );
  }

  if (isApproved) {
    const hasInvoice = !!(createdInvoiceId || invoice?.id);
    return (
      <>
        <SectionHeader
          title={<>Quotation <strong>approval</strong></>}
        />
        <div className="sf">
          <div className="cnt flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gr)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <div className="text-[16px] font-medium text-gr mb-1">
                Quotation approved successfully!
              </div>
              <div className="text-[12px] text-tx3 mb-4">
                {hasInvoice ? "Invoice has been generated" : "Invoice is not yet generated"}
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  className="btn btn-success"
                  onClick={() => router.push(`/warehouse/check?inquiryId=${quotation.inquiryId}`)}
                >
                  ⧉ Warehouse Check
                </button>
                {hasInvoice ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const targetId = createdInvoiceId || invoice?.id;
                      if (targetId) {
                        router.push(`/invoices/${targetId}`);
                      } else {
                        router.push("/invoices");
                      }
                    }}
                  >
                    View invoice
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-warning"
                    onClick={handleCreateInvoice}
                    disabled={creatingInvoice}
                  >
                    {creatingInvoice ? "Generating..." : "+ Create Invoice"}
                  </button>
                )}
                <button className="btn" onClick={() => router.push(`/quotations/${quotation.id}/pdf`)}>
                  Back to quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Quotation <strong>approval</strong></>}
        description="Review and approve quotations — generates invoices and tracks payment automatically."
      />
      <ScreenFrame
        breadcrumb={
          <>
            <span className="text-tx2">{quotation.quoteNo}</span> › Approval
          </>
        }
        actions={
          <>
            <Badge variant="am">Sent to client</Badge>
            <button className="btn btn-success" onClick={handleApprove} disabled={approving}>
              {approving ? "Approving..." : "✓ Mark approved"}
            </button>
          </>
        }
      >
        {/* Flow steps */}
        <div className="flow">
          <span className="flow-step flow-done">Inquiry</span>
          <span className="flow-arr">›</span>
          <span className="flow-step flow-done">Quotation</span>
          <span className="flow-arr">›</span>
          <span className="flow-step flow-curr">Approval</span>
          <span className="flow-arr">›</span>
          <span className="flow-step flow-next">Invoice</span>
          <span className="flow-arr">›</span>
          <span className="flow-step flow-next">Payment</span>
        </div>

        <div className="two-col">
          {/* Left - Summary & Approve form */}
          <div>
            <div className="card">
              <div className="card-t">Quotation summary</div>
              <div className="quotation-summary-panel bg-s2 rounded-lg">
                <div className="row-item">
                  <span className="text-[11px] text-tx3">Client</span>
                  <span className="text-[12px] font-medium">
                    {quotation.clientName}
                  </span>
                </div>
                <div className="row-item">
                  <span className="text-[11px] text-tx3">Quotation no.</span>
                  <span className="font-mono text-[11px] text-bl">
                    {quotation.quoteNo}
                  </span>
                </div>
                <div className="row-item">
                  <span className="text-[11px] text-tx3">Total amount</span>
                  <span className="font-mono text-[14px] font-medium text-gr">
                    ₹{fmt(quotation.total)}
                  </span>
                </div>
                <div className="row-item">
                  <span className="text-[11px] text-tx3">Sent on</span>
                  <span className="text-[11px]">
                    {new Date(quotation.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="row-item">
                  <span className="text-[11px] text-tx3">Valid till</span>
                  <span className="text-[11px]">
                    {new Date(
                      new Date(quotation.createdAt).getTime() +
                        15 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="card approval-card">
              <div className="card-t">Mark as approved</div>
              <div className="fgrid">
                <div className="field span2">
                  <div className="flbl">Approval date</div>
                  <input
                    type="date"
                    className="finp"
                    value={approvalDate}
                    onChange={(e) => setApprovalDate(e.target.value)}
                  />
                </div>
                <div className="field span2">
                  <div className="flbl">
                    Signed copy upload (optional)
                  </div>
                  <label className="approval-upload">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setSignedCopyName(file?.name ?? "");
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setSignedCopyBase64(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        } else {
                          setSignedCopyBase64("");
                        }
                      }}
                    />
                    <span className="approval-upload-title">
                      {signedCopyName || "Upload signed quotation PDF"}
                    </span>
                    <span className="approval-upload-meta">
                      PDF or image file
                    </span>
                  </label>
                </div>
                <div className="field span2">
                  <div className="flbl">Notes</div>
                  <textarea
                    className="ftxt"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn btn-success approval-submit w-full justify-center text-[12px]"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? "Approving..." : "✓ Confirm approval → Generate invoice"}
              </button>
            </div>
          </div>

          {/* Right - Timeline & Advance */}
          <div>
            <div className="card">
              <div className="card-t">Timeline</div>
              <Timeline
                items={(() => {
                  const inquiry = inquiries.find((i) => i.id === quotation.inquiryId);
                  const items = [];
                  if (inquiry) {
                    items.push({
                      title: "Inquiry created",
                      time: new Date(inquiry.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + " · " + (inquiry.startTime || "10:00 AM"),
                      color: "var(--sem-gr-tx)",
                    });
                  }
                  items.push({
                    title: "Quotation generated",
                    time: new Date(quotation.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + " · 11:00 AM",
                    color: "var(--sem-gr-tx)",
                  });
                  items.push({
                    title: quotation.sentAt ? "Sent to client" : "Approval pending...",
                    time: quotation.sentAt ? new Date(quotation.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Waiting",
                    color: quotation.sentAt ? "var(--sem-am-tx)" : "var(--tx3)",
                  });
                  return items;
                })()}
              />
            </div>
            <div className="card">
              <div className="card-t">Advance payment</div>
              <div className="text-[11px] text-tx3 mb-2">
                Approval confirm → advance payment track
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">50% advance</span>
                <span className="font-mono font-medium text-acc">
                  ₹{fmt(Math.round(quotation.total * 0.5))}
                </span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Advance status</span>
                <Badge variant="am">Pending</Badge>
              </div>
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}

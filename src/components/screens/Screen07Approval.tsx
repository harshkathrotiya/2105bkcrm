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
  const { dispatchCalendar } = useCalendar();
  const quotation = quotations.find((q) => q.id === quotationId);
  const [approvalDate, setApprovalDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [approved, setApproved] = useState(false);

  const isApproved = approved || quotation?.status === "Approved";

  const handleApprove = () => {
    if (!quotation || isApproved) return;

    // Duplicate guard — prevent creating multiple invoices
    if (invoices.some((inv) => inv.quotationId === quotation.id)) {
      return;
    }

    // Update quotation status
    dispatchQuotations({
      type: "UPDATE_QUOTATION",
      payload: {
        id: quotation.id,
        status: "Approved",
        approvedAt: approvalDate,
      },
    });

    // Also update the inquiry
    const inquiry = inquiries.find((i) => i.id === quotation.inquiryId);
    if (inquiry) {
    dispatchInquiries({
      type: "UPDATE_INQUIRY",
        payload: {
          id: inquiry.id,
          status: "Confirmed",
        },
      });
    }

    // Add calendar events for the confirmed event dates
    const startDt = new Date(quotation.startDate);
    const endDt = new Date(quotation.endDate);
    const calType = "confirmed" as const;
    const now = Date.now();
    let idx = 0;
    for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
      dispatchCalendar({
        type: "ADD_CALENDAR_EVENT",
        payload: {
          id: `cal-${now}-${idx++}`,
          date: d.getDate(),
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          label: quotation.clientName,
          type: calType,
        },
      });
    }

    // Generate invoice — derive descriptive line items from quotation total
    const advance = Math.round(quotation.total * 0.5);
    const grossForInvoice = quotation.total;
    const videographyAmount = Math.round(grossForInvoice * 0.82);
    const photographyAmount = grossForInvoice - videographyAmount;
    dispatchInvoices({
      type: "ADD_INVOICE",
      payload: {
        id: `inv-${Date.now()}`,
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
        createdAt: approvalDate,
        dueDate: new Date(
          new Date(approvalDate).getTime() + 7 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0],
      },
    });

    setApproved(true);
    router.push(`/warehouse/check?inquiryId=${quotation.inquiryId}`);
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
                Invoice has been generated
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  className="btn btn-success"
                  onClick={() => router.push(`/warehouse/check?inquiryId=${quotation.inquiryId}`)}
                >
                  ⧉ Warehouse Check
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => invoice ? router.push(`/invoices/${invoice.id}`) : router.push("/invoices")}
                >
                  View invoice
                </button>
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
            <button className="btn btn-success" onClick={handleApprove}>
              ✓ Mark approved
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
              <div className="bg-s2 rounded-lg p-[12px_14px] mb-[10px]">
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

            <div className="card">
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
                  <div className="h-[52px] bg-s2 border border-dashed border-b2 rounded-lg flex items-center justify-center text-[11px] text-tx3">
                    ↑ Upload signed quotation PDF
                  </div>
                </div>
                <div className="field span2">
                  <div className="flbl">Notes</div>
                  <textarea
                    className="ftxt"
                    style={{ minHeight: 44 }}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn btn-success w-full justify-center mt-[10px] text-[12px]"
                onClick={handleApprove}
              >
                ✓ Confirm approval → Generate invoice
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

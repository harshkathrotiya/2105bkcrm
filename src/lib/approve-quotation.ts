/**
 * approve-quotation.ts — shared logic for approving a quotation and generating
 * its invoice. Extracted from the old standalone Approval screen so the inquiry
 * hub (and any other entry point) use identical, single-source-of-truth logic.
 */

import { generateInvoiceNo } from "@/lib/utils";
import type { Quotation, Inquiry, Invoice, CalendarEvent } from "@/lib/types";

export interface ApproveOptions {
  quotation: Quotation;
  inquiry?: Inquiry;
  invoices: Invoice[];
  calendarEvents: CalendarEvent[];
  /** 0–100; videography share of subtotal for VIDEO dept (ignored for LED/MERGED) */
  videoPercent?: number;
  approvalDate?: string;
  signedCopyUrl?: string;
  signedCopyName?: string;
  // dispatchers from the stores
  dispatchQuotations: (action: any) => Promise<any> | any;
  dispatchInquiries: (action: any) => Promise<any> | any;
  dispatchInvoices: (action: any) => Promise<any> | any;
  dispatchCalendar: (action: any) => Promise<any> | any;
}

export interface ApproveResult {
  invoiceId: string;
  invoiceCreated: boolean;
}

/**
 * Build the invoice payload for a quotation (50% advance, video/photo split).
 * Pure — no side effects — so it can be unit-reasoned and reused.
 */
export function buildInvoicePayload(
  quotation: Quotation,
  inquiry: Inquiry | undefined,
  existingInvoiceNos: string[],
  videoPercent: number,
  createdAt: string,
  invoiceId: string
): Invoice {
  const isLedOrMerged = inquiry?.department === "LED" || inquiry?.department === "MERGED";
  const advance = Math.round(quotation.total * 0.5);
  const subtotal = quotation.subtotal;
  const videographyAmount = isLedOrMerged ? subtotal : Math.round((subtotal * videoPercent) / 100);
  const photographyAmount = isLedOrMerged ? 0 : subtotal - videographyAmount;

  return {
    id: invoiceId,
    quotationId: quotation.id,
    invoiceNo: generateInvoiceNo(existingInvoiceNos),
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
    createdAt,
    dueDate: new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  };
}

/**
 * Approve a quotation:
 *  - marks quotation Approved (with signed copy if given)
 *  - confirms the inquiry
 *  - rebuilds the inquiry's "confirmed" calendar events
 *  - generates the invoice (50% advance, video/photo split) if not already present
 * Idempotent-ish: re-running on an already-approved quote won't duplicate the invoice.
 */
export async function approveQuotation(opts: ApproveOptions): Promise<ApproveResult> {
  const {
    quotation, inquiry, invoices, calendarEvents,
    videoPercent = 82,
    approvalDate = new Date().toISOString().split("T")[0],
    signedCopyUrl, signedCopyName,
    dispatchQuotations, dispatchInquiries, dispatchInvoices, dispatchCalendar,
  } = opts;

  const existingInvoice = invoices.find((inv) => inv.quotationId === quotation.id);
  const invoiceId = existingInvoice?.id || `inv-${Date.now()}`;
  const shouldConfirm = quotation.status !== "Approved";

  if (shouldConfirm) {
    await dispatchQuotations({
      type: "UPDATE_QUOTATION",
      payload: {
        id: quotation.id,
        status: "Approved",
        approvedAt: approvalDate,
        signedCopyUrl: signedCopyUrl || undefined,
        signedCopyName: signedCopyName || undefined,
      },
    });

    if (inquiry) {
      await dispatchInquiries({
        type: "UPDATE_INQUIRY",
        payload: { id: inquiry.id, status: "Confirmed" },
      });
    }

    // Rebuild this inquiry's calendar events as "confirmed"
    const toDelete = calendarEvents.filter((e) => e.id.startsWith(`cal-${quotation.inquiryId}-`));
    if (toDelete.length > 0) {
      await dispatchCalendar({ type: "BULK_DELETE_CALENDAR_EVENTS", payload: toDelete.map((e) => e.id) });
    }

    const eventDisplayName = `${quotation.eventName || inquiry?.eventType || "Event"} — ${quotation.clientName}`;
    const startDt = new Date(quotation.startDate);
    const endDt = new Date(quotation.endDate);
    const toAdd: CalendarEvent[] = [];
    let idx = 0;
    for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
      toAdd.push({
        id: `cal-${quotation.inquiryId}-confirmed-${idx++}`,
        date: d.getDate(),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: eventDisplayName,
        type: "confirmed",
      });
    }
    if (toAdd.length > 0) {
      await dispatchCalendar({ type: "BULK_ADD_CALENDAR_EVENTS", payload: toAdd });
    }
  }

  let invoiceCreated = false;
  if (!existingInvoice) {
    const payload = buildInvoicePayload(
      quotation, inquiry, invoices.map((inv) => inv.invoiceNo), videoPercent, approvalDate, invoiceId
    );
    await dispatchInvoices({ type: "ADD_INVOICE", payload });
    invoiceCreated = true;
  }

  return { invoiceId, invoiceCreated };
}

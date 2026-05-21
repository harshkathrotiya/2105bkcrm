/**
 * queries/quotations.ts — typed DB helpers for the quotations table
 */

import { db } from "@/lib/db";
import type { Quotation, QuotationRow } from "@/lib/types";

interface QuotationDbRow {
  id: string;
  inquiry_id: string;
  client_name: string;
  event_name: string;
  quote_no: string;
  start_date: string;
  end_date: string;
  days: number;
  venue: string;
  status: "Draft" | "Sent" | "Approved" | "Revised";
  equipment: string; // JSON
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  created_at: string;
  updated_at: string | null;
  sent_at: string | null;
  approved_at: string | null;
}

function rowToQuotation(row: QuotationDbRow): Quotation {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    clientName: row.client_name,
    eventName: row.event_name,
    quoteNo: row.quote_no,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    venue: row.venue,
    status: row.status,
    equipment: JSON.parse(row.equipment) as QuotationRow[],
    subtotal: row.subtotal,
    cgst: row.cgst,
    sgst: row.sgst,
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    sentAt: row.sent_at,
    approvedAt: row.approved_at,
  };
}

export function getAllQuotations(): Quotation[] {
  const rows = db
    .prepare("SELECT * FROM quotations ORDER BY created_at DESC")
    .all() as QuotationDbRow[];
  return rows.map(rowToQuotation);
}

export function getQuotationById(id: string): Quotation | undefined {
  const row = db
    .prepare("SELECT * FROM quotations WHERE id = ?")
    .get(id) as QuotationDbRow | undefined;
  return row ? rowToQuotation(row) : undefined;
}

export function createQuotation(quotation: Quotation): Quotation {
  db.prepare(`
    INSERT INTO quotations
      (id,inquiry_id,client_name,event_name,quote_no,start_date,end_date,
       days,venue,status,equipment,subtotal,cgst,sgst,total,
       created_at,sent_at,approved_at)
    VALUES
      (@id,@inquiryId,@clientName,@eventName,@quoteNo,@startDate,@endDate,
       @days,@venue,@status,@equipment,@subtotal,@cgst,@sgst,@total,
       @createdAt,@sentAt,@approvedAt)
  `).run({
    id: quotation.id,
    inquiryId: quotation.inquiryId,
    clientName: quotation.clientName,
    eventName: quotation.eventName,
    quoteNo: quotation.quoteNo,
    startDate: quotation.startDate,
    endDate: quotation.endDate,
    days: quotation.days,
    venue: quotation.venue,
    status: quotation.status,
    equipment: JSON.stringify(quotation.equipment),
    subtotal: quotation.subtotal,
    cgst: quotation.cgst,
    sgst: quotation.sgst,
    total: quotation.total,
    createdAt: quotation.createdAt,
    sentAt: quotation.sentAt,
    approvedAt: quotation.approvedAt,
  });
  return quotation;
}

export function updateQuotation(
  id: string,
  patch: Partial<Omit<Quotation, "id">>
): Quotation | undefined {
  const existing = getQuotationById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  db.prepare(`
    UPDATE quotations SET
      inquiry_id=@inquiryId, client_name=@clientName, event_name=@eventName,
      quote_no=@quoteNo, start_date=@startDate, end_date=@endDate,
      days=@days, venue=@venue, status=@status, equipment=@equipment,
      subtotal=@subtotal, cgst=@cgst, sgst=@sgst, total=@total,
      updated_at=@updatedAt, sent_at=@sentAt, approved_at=@approvedAt
    WHERE id=@id
  `).run({
    id,
    inquiryId: merged.inquiryId,
    clientName: merged.clientName,
    eventName: merged.eventName,
    quoteNo: merged.quoteNo,
    startDate: merged.startDate,
    endDate: merged.endDate,
    days: merged.days,
    venue: merged.venue,
    status: merged.status,
    equipment: JSON.stringify(merged.equipment),
    subtotal: merged.subtotal,
    cgst: merged.cgst,
    sgst: merged.sgst,
    total: merged.total,
    updatedAt: merged.updatedAt ?? null,
    sentAt: merged.sentAt,
    approvedAt: merged.approvedAt,
  });

  return getQuotationById(id);
}

export function deleteQuotation(id: string): boolean {
  const result = db.prepare("DELETE FROM quotations WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * queries/quotations.ts — typed DB helpers for the quotations table using Prisma
 */

import { db } from "@/lib/db";
import type { Quotation, QuotationRow } from "@/lib/types";

export async function getAllQuotations(): Promise<Quotation[]> {
  const rows = await db.quotation.findMany({
    orderBy: { created_at: "desc" },
  });
  return rows.map((r: any) => ({
    id: r.id,
    inquiryId: r.inquiry_id,
    clientName: r.client_name,
    eventName: r.event_name,
    quoteNo: r.quote_no,
    startDate: r.start_date,
    endDate: r.end_date,
    days: r.days,
    venue: r.venue,
    status: r.status as "Draft" | "Sent" | "Approved" | "Revised",
    equipment: JSON.parse(r.equipment) as QuotationRow[],
    subtotal: r.subtotal,
    cgst: r.cgst,
    sgst: r.sgst,
    total: r.total,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
    sentAt: r.sent_at,
    approvedAt: r.approved_at,
    revisionNumber: r.revision_number,
    signedCopyUrl: r.signed_copy_url,
  }));
}

export async function getQuotationById(id: string): Promise<Quotation | undefined> {
  const row = await db.quotation.findUnique({
    where: { id },
  });
  if (!row) return undefined;
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
    status: row.status as "Draft" | "Sent" | "Approved" | "Revised",
    equipment: JSON.parse(row.equipment) as QuotationRow[],
    subtotal: row.subtotal,
    cgst: row.cgst,
    sgst: row.sgst,
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    sentAt: row.sent_at,
    approvedAt: row.approved_at,
    revisionNumber: row.revision_number,
    signedCopyUrl: row.signed_copy_url,
  };
}

export async function createQuotation(quotation: Quotation): Promise<Quotation> {
  await db.quotation.create({
    data: {
      id: quotation.id,
      inquiry_id: quotation.inquiryId,
      client_name: quotation.clientName,
      event_name: quotation.eventName,
      quote_no: quotation.quoteNo,
      start_date: quotation.startDate,
      end_date: quotation.endDate,
      days: quotation.days,
      venue: quotation.venue,
      status: quotation.status,
      equipment: JSON.stringify(quotation.equipment),
      subtotal: quotation.subtotal,
      cgst: quotation.cgst,
      sgst: quotation.sgst,
      total: quotation.total,
      created_at: quotation.createdAt,
      sent_at: quotation.sentAt,
      approved_at: quotation.approvedAt,
      revision_number: quotation.revisionNumber ?? 0,
      signed_copy_url: quotation.signedCopyUrl ?? "",
    },
  });
  return quotation;
}

export async function updateQuotation(
  id: string,
  patch: Partial<Omit<Quotation, "id">>
): Promise<Quotation | undefined> {
  const existing = await getQuotationById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  await db.quotation.update({
    where: { id },
    data: {
      inquiry_id: merged.inquiryId,
      client_name: merged.clientName,
      event_name: merged.eventName,
      quote_no: merged.quoteNo,
      start_date: merged.startDate,
      end_date: merged.endDate,
      days: merged.days,
      venue: merged.venue,
      status: merged.status,
      equipment: JSON.stringify(merged.equipment),
      subtotal: merged.subtotal,
      cgst: merged.cgst,
      sgst: merged.sgst,
      total: merged.total,
      updated_at: merged.updatedAt ?? null,
      sent_at: merged.sentAt,
      approved_at: merged.approvedAt,
      revision_number: merged.revisionNumber ?? 0,
      signed_copy_url: merged.signedCopyUrl ?? "",
    },
  });

  return await getQuotationById(id);
}

export async function deleteQuotation(id: string): Promise<boolean> {
  try {
    await db.quotation.delete({ where: { id } });
    return true;
  } catch (err) {
    return false;
  }
}

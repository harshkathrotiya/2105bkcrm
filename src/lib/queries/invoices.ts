/**
 * queries/invoices.ts — typed DB helpers for the invoices table using Prisma
 */

import { db } from "@/lib/db";
import type { Invoice } from "@/lib/types";

export async function getAllInvoices(): Promise<Invoice[]> {
  const rows = await db.invoice.findMany({
    orderBy: { created_at: "desc" },
  });
  return rows.map((r: any) => ({
    id: r.id,
    quotationId: r.quotation_id,
    invoiceNo: r.invoice_no,
    clientName: r.client_name,
    eventName: r.event_name,
    startDate: r.start_date,
    endDate: r.end_date,
    venue: r.venue,
    videographyAmount: r.videography_amount,
    photographyAmount: r.photography_amount,
    advance: r.advance,
    balance: r.balance,
    status: r.status as "Unpaid" | "Partial paid" | "Paid",
    advanceReceived: r.advance_received === 1,
    advanceReceivedAt: r.advance_received_at,
    advanceRef: r.advance_ref,
    advanceMethod: r.advance_method,
    balanceReceived: r.balance_received === 1,
    balanceReceivedAt: r.balance_received_at,
    balanceRef: r.balance_ref,
    balanceMethod: r.balance_method,
    hddDelivered: r.hdd_delivered === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
    dueDate: r.due_date,
  }));
}

export async function getInvoiceById(id: string): Promise<Invoice | undefined> {
  const row = await db.invoice.findUnique({
    where: { id },
  });
  if (!row) return undefined;
  return {
    id: row.id,
    quotationId: row.quotation_id,
    invoiceNo: row.invoice_no,
    clientName: row.client_name,
    eventName: row.event_name,
    startDate: row.start_date,
    endDate: row.end_date,
    venue: row.venue,
    videographyAmount: row.videography_amount,
    photographyAmount: row.photography_amount,
    advance: row.advance,
    balance: row.balance,
    status: row.status as "Unpaid" | "Partial paid" | "Paid",
    advanceReceived: row.advance_received === 1,
    advanceReceivedAt: row.advance_received_at,
    advanceRef: row.advance_ref,
    advanceMethod: row.advance_method,
    balanceReceived: row.balance_received === 1,
    balanceReceivedAt: row.balance_received_at,
    balanceRef: row.balance_ref,
    balanceMethod: row.balance_method,
    hddDelivered: row.hdd_delivered === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    dueDate: row.due_date,
  };
}

export async function createInvoice(invoice: Invoice): Promise<Invoice> {
  await db.invoice.create({
    data: {
      id: invoice.id,
      quotation_id: invoice.quotationId,
      invoice_no: invoice.invoiceNo,
      client_name: invoice.clientName,
      event_name: invoice.eventName,
      start_date: invoice.startDate,
      end_date: invoice.endDate,
      venue: invoice.venue,
      videography_amount: invoice.videographyAmount,
      photography_amount: invoice.photographyAmount,
      advance: invoice.advance,
      balance: invoice.balance,
      status: invoice.status,
      advance_received: invoice.advanceReceived ? 1 : 0,
      advance_received_at: invoice.advanceReceivedAt,
      advance_ref: invoice.advanceRef,
      advance_method: invoice.advanceMethod,
      balance_received: invoice.balanceReceived ? 1 : 0,
      balance_received_at: invoice.balanceReceivedAt,
      balance_ref: invoice.balanceRef,
      balance_method: invoice.balanceMethod,
      hdd_delivered: invoice.hddDelivered ? 1 : 0,
      created_at: invoice.createdAt,
      due_date: invoice.dueDate,
    },
  });
  return invoice;
}

export async function updateInvoice(
  id: string,
  patch: Partial<Omit<Invoice, "id">>
): Promise<Invoice | undefined> {
  const existing = await getInvoiceById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  await db.invoice.update({
    where: { id },
    data: {
      quotation_id: merged.quotationId,
      invoice_no: merged.invoiceNo,
      client_name: merged.clientName,
      event_name: merged.eventName,
      start_date: merged.startDate,
      end_date: merged.endDate,
      venue: merged.venue,
      videography_amount: merged.videographyAmount,
      photography_amount: merged.photographyAmount,
      advance: merged.advance,
      balance: merged.balance,
      status: merged.status,
      advance_received: merged.advanceReceived ? 1 : 0,
      advance_received_at: merged.advanceReceivedAt,
      advance_ref: merged.advanceRef,
      advance_method: merged.advanceMethod,
      balance_received: merged.balanceReceived ? 1 : 0,
      balance_received_at: merged.balanceReceivedAt,
      balance_ref: merged.balanceRef,
      balance_method: merged.balanceMethod,
      hdd_delivered: merged.hddDelivered ? 1 : 0,
      updated_at: merged.updatedAt ?? null,
      due_date: merged.dueDate,
    },
  });

  return await getInvoiceById(id);
}

export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    await db.invoice.delete({ where: { id } });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * queries/invoices.ts — typed DB helpers for the invoices table
 */

import { db } from "@/lib/db";
import type { Invoice } from "@/lib/types";

interface InvoiceRow {
  id: string;
  quotation_id: string;
  invoice_no: string;
  client_name: string;
  event_name: string;
  start_date: string;
  end_date: string;
  venue: string;
  videography_amount: number;
  photography_amount: number;
  advance: number;
  balance: number;
  status: "Unpaid" | "Partial paid" | "Paid";
  advance_received: number;
  advance_received_at: string | null;
  advance_ref: string;
  advance_method: string;
  balance_received: number;
  balance_received_at: string | null;
  balance_ref: string;
  balance_method: string;
  hdd_delivered: number;
  created_at: string;
  updated_at: string | null;
  due_date: string;
}

function rowToInvoice(row: InvoiceRow): Invoice {
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
    status: row.status,
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

export function getAllInvoices(): Invoice[] {
  const rows = db
    .prepare("SELECT * FROM invoices ORDER BY created_at DESC")
    .all() as InvoiceRow[];
  return rows.map(rowToInvoice);
}

export function getInvoiceById(id: string): Invoice | undefined {
  const row = db
    .prepare("SELECT * FROM invoices WHERE id = ?")
    .get(id) as InvoiceRow | undefined;
  return row ? rowToInvoice(row) : undefined;
}

export function createInvoice(invoice: Invoice): Invoice {
  db.prepare(`
    INSERT INTO invoices
      (id,quotation_id,invoice_no,client_name,event_name,start_date,end_date,
       venue,videography_amount,photography_amount,advance,balance,status,
       advance_received,advance_received_at,advance_ref,advance_method,
       balance_received,balance_received_at,balance_ref,balance_method,
       hdd_delivered,created_at,due_date)
    VALUES
      (@id,@quotationId,@invoiceNo,@clientName,@eventName,@startDate,@endDate,
       @venue,@videographyAmount,@photographyAmount,@advance,@balance,@status,
       @advanceReceived,@advanceReceivedAt,@advanceRef,@advanceMethod,
       @balanceReceived,@balanceReceivedAt,@balanceRef,@balanceMethod,
       @hddDelivered,@createdAt,@dueDate)
  `).run({
    id: invoice.id,
    quotationId: invoice.quotationId,
    invoiceNo: invoice.invoiceNo,
    clientName: invoice.clientName,
    eventName: invoice.eventName,
    startDate: invoice.startDate,
    endDate: invoice.endDate,
    venue: invoice.venue,
    videographyAmount: invoice.videographyAmount,
    photographyAmount: invoice.photographyAmount,
    advance: invoice.advance,
    balance: invoice.balance,
    status: invoice.status,
    advanceReceived: invoice.advanceReceived ? 1 : 0,
    advanceReceivedAt: invoice.advanceReceivedAt,
    advanceRef: invoice.advanceRef,
    advanceMethod: invoice.advanceMethod,
    balanceReceived: invoice.balanceReceived ? 1 : 0,
    balanceReceivedAt: invoice.balanceReceivedAt,
    balanceRef: invoice.balanceRef,
    balanceMethod: invoice.balanceMethod,
    hddDelivered: invoice.hddDelivered ? 1 : 0,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
  });
  return invoice;
}

export function updateInvoice(
  id: string,
  patch: Partial<Omit<Invoice, "id">>
): Invoice | undefined {
  const existing = getInvoiceById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  db.prepare(`
    UPDATE invoices SET
      quotation_id=@quotationId, invoice_no=@invoiceNo,
      client_name=@clientName, event_name=@eventName,
      start_date=@startDate, end_date=@endDate, venue=@venue,
      videography_amount=@videographyAmount, photography_amount=@photographyAmount,
      advance=@advance, balance=@balance, status=@status,
      advance_received=@advanceReceived, advance_received_at=@advanceReceivedAt,
      advance_ref=@advanceRef, advance_method=@advanceMethod,
      balance_received=@balanceReceived, balance_received_at=@balanceReceivedAt,
      balance_ref=@balanceRef, balance_method=@balanceMethod,
      hdd_delivered=@hddDelivered, updated_at=@updatedAt, due_date=@dueDate
    WHERE id=@id
  `).run({
    id,
    quotationId: merged.quotationId,
    invoiceNo: merged.invoiceNo,
    clientName: merged.clientName,
    eventName: merged.eventName,
    startDate: merged.startDate,
    endDate: merged.endDate,
    venue: merged.venue,
    videographyAmount: merged.videographyAmount,
    photographyAmount: merged.photographyAmount,
    advance: merged.advance,
    balance: merged.balance,
    status: merged.status,
    advanceReceived: merged.advanceReceived ? 1 : 0,
    advanceReceivedAt: merged.advanceReceivedAt,
    advanceRef: merged.advanceRef,
    advanceMethod: merged.advanceMethod,
    balanceReceived: merged.balanceReceived ? 1 : 0,
    balanceReceivedAt: merged.balanceReceivedAt,
    balanceRef: merged.balanceRef,
    balanceMethod: merged.balanceMethod,
    hddDelivered: merged.hddDelivered ? 1 : 0,
    updatedAt: merged.updatedAt ?? null,
    dueDate: merged.dueDate,
  });

  return getInvoiceById(id);
}

export function deleteInvoice(id: string): boolean {
  const result = db.prepare("DELETE FROM invoices WHERE id = ?").run(id);
  return result.changes > 0;
}

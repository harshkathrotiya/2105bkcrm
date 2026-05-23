/**
 * GET    /api/invoices/[id]  — get a single invoice
 * PATCH  /api/invoices/[id]  — update an invoice (partial)
 * DELETE /api/invoices/[id]  — delete an invoice
 */

import type { NextRequest } from "next/server";
import { getInvoiceById, updateInvoice, deleteInvoice } from "@/lib/queries/invoices";
import { Validator, INVOICE_STATUSES } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }
    return Response.json(invoice);
  } catch (err) {
    console.error("[GET /api/invoices/[id]]", err);
    return Response.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await getInvoiceById(id);
    if (!existing) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    const v = new Validator(body);
    if (body.clientName !== undefined) v.minLength("clientName", 2).maxLength("clientName", 100);
    if (body.eventName !== undefined) v.maxLength("eventName", 200, "event name");
    if (body.venue !== undefined) v.maxLength("venue", 200);
    if (body.startDate !== undefined) v.date("startDate", "start date");
    if (body.endDate !== undefined) v.date("endDate", "end date");
    if (body.startDate !== undefined && body.endDate !== undefined) v.dateRange("startDate", "endDate");
    if (body.dueDate !== undefined) v.date("dueDate", "due date");
    if (body.videographyAmount !== undefined) v.nonNegativeNumber("videographyAmount", "videography amount");
    if (body.photographyAmount !== undefined) v.nonNegativeNumber("photographyAmount", "photography amount");
    if (body.advance !== undefined) v.nonNegativeNumber("advance");
    if (body.balance !== undefined) v.nonNegativeNumber("balance");
    if (body.status !== undefined) v.oneOf("status", INVOICE_STATUSES);
    if (v.hasErrors()) return v.response();

    // Auto-derive payment status from payment flags
    const advanceReceived =
      body.advanceReceived !== undefined ? body.advanceReceived : existing.advanceReceived;
    const balanceReceived =
      body.balanceReceived !== undefined ? body.balanceReceived : existing.balanceReceived;

    if (body.advanceReceived !== undefined || body.balanceReceived !== undefined) {
      if (advanceReceived && balanceReceived) {
        body.status = "Paid";
      } else if (advanceReceived || balanceReceived) {
        body.status = "Partial paid";
      } else {
        body.status = "Unpaid";
      }
    }

    const updated = await updateInvoice(id, {
      ...body,
      clientName: body.clientName?.trim(),
      eventName: body.eventName?.trim(),
      venue: body.venue?.trim(),
      updatedAt: new Date().toISOString().split("T")[0],
    });
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/invoices/[id]]", err);
    return Response.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteInvoice(id);
    if (!deleted) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/invoices/[id]]", err);
    return Response.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}

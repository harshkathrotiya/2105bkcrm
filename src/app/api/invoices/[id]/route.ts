/**
 * GET   /api/invoices/[id]  — get a single invoice
 * PATCH /api/invoices/[id]  — update an invoice (partial)
 * DELETE /api/invoices/[id] — delete an invoice
 *
 * The PATCH handler also auto-computes the payment status:
 *   both received  → "Paid"
 *   advance only   → "Partial paid"
 *   neither        → "Unpaid"
 */

import type { NextRequest } from "next/server";
import { getInvoiceById, updateInvoice, deleteInvoice } from "@/lib/queries/invoices";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = getInvoiceById(id);
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

    // Auto-derive payment status if payment flags are being updated
    const existing = getInvoiceById(id);
    if (!existing) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    const advanceReceived =
      body.advanceReceived !== undefined
        ? body.advanceReceived
        : existing.advanceReceived;
    const balanceReceived =
      body.balanceReceived !== undefined
        ? body.balanceReceived
        : existing.balanceReceived;

    if (body.advanceReceived !== undefined || body.balanceReceived !== undefined) {
      if (advanceReceived && balanceReceived) {
        body.status = "Paid";
      } else if (advanceReceived || balanceReceived) {
        body.status = "Partial paid";
      } else {
        body.status = "Unpaid";
      }
    }

    const updated = updateInvoice(id, { ...body, updatedAt: new Date().toISOString().split("T")[0] });
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
    const deleted = deleteInvoice(id);
    if (!deleted) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/invoices/[id]]", err);
    return Response.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}

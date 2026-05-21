/**
 * GET  /api/invoices  — list all invoices
 * POST /api/invoices  — create a new invoice
 */

import type { NextRequest } from "next/server";
import { getAllInvoices, createInvoice } from "@/lib/queries/invoices";
import { generateId } from "@/lib/types";

export async function GET() {
  try {
    const invoices = getAllInvoices();
    return Response.json(invoices);
  } catch (err) {
    console.error("[GET /api/invoices]", err);
    return Response.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.quotationId) {
      return Response.json({ error: "quotationId is required" }, { status: 400 });
    }
    if (!body.clientName?.trim()) {
      return Response.json({ error: "clientName is required" }, { status: 400 });
    }

    const advance = body.advance ?? 0;
    const balance = body.balance ?? 0;

    const invoice = createInvoice({
      id: body.id ?? `inv-${generateId()}`,
      quotationId: body.quotationId,
      invoiceNo: body.invoiceNo?.trim() ?? `BKM-INV-${generateId()}`,
      clientName: body.clientName.trim(),
      eventName: body.eventName?.trim() ?? "",
      startDate: body.startDate ?? "",
      endDate: body.endDate ?? "",
      venue: body.venue?.trim() ?? "",
      videographyAmount: body.videographyAmount ?? 0,
      photographyAmount: body.photographyAmount ?? 0,
      advance,
      balance,
      status: body.status ?? "Unpaid",
      advanceReceived: body.advanceReceived ?? false,
      advanceReceivedAt: body.advanceReceivedAt ?? null,
      advanceRef: body.advanceRef ?? "",
      advanceMethod: body.advanceMethod ?? "",
      balanceReceived: body.balanceReceived ?? false,
      balanceReceivedAt: body.balanceReceivedAt ?? null,
      balanceRef: body.balanceRef ?? "",
      balanceMethod: body.balanceMethod ?? "",
      hddDelivered: body.hddDelivered ?? false,
      createdAt: body.createdAt ?? new Date().toISOString().split("T")[0],
      dueDate:
        body.dueDate ??
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
    });

    return Response.json(invoice, { status: 201 });
  } catch (err) {
    console.error("[POST /api/invoices]", err);
    return Response.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

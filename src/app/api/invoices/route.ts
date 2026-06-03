/**
 * GET  /api/invoices  — list all invoices
 * POST /api/invoices  — create a new invoice
 */

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { getAllInvoices, createInvoice } from "@/lib/queries/invoices";
import { generateId } from "@/lib/types";
import { Validator } from "@/lib/validate";

export async function GET() {
  try {
    const invoices = await getAllInvoices();
    return Response.json(invoices);
  } catch (err) {
    console.error("[GET /api/invoices]", err);
    return Response.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "invoices.edit");
    if (!auth.ok) return auth.response!;

    const body = await request.json();

    const v = new Validator(body);
    v.required("quotationId", "quotation");
    v.required("clientName", "client name").minLength("clientName", 2).maxLength("clientName", 100);
    v.maxLength("eventName", 200, "event name");
    v.maxLength("venue", 200);
    if (body.startDate) v.date("startDate", "start date");
    if (body.endDate) v.date("endDate", "end date");
    if (body.startDate && body.endDate) v.dateRange("startDate", "endDate");
    if (body.dueDate) v.date("dueDate", "due date");
    if (body.videographyAmount !== undefined) v.nonNegativeNumber("videographyAmount", "videography amount");
    if (body.photographyAmount !== undefined) v.nonNegativeNumber("photographyAmount", "photography amount");
    if (body.advance !== undefined) v.nonNegativeNumber("advance");
    if (body.balance !== undefined) v.nonNegativeNumber("balance");
    if (v.hasErrors()) return v.response();

    const advance = body.advance ?? 0;
    const balance = body.balance ?? 0;

    const invoice = await createInvoice({
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
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });

    return Response.json(invoice, { status: 201 });
  } catch (err) {
    console.error("[POST /api/invoices]", err);
    return Response.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

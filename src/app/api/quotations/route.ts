/**
 * GET  /api/quotations  — list all quotations
 * POST /api/quotations  — create a new quotation
 */

import type { NextRequest } from "next/server";
import { getAllQuotations, createQuotation } from "@/lib/queries/quotations";
import { generateId } from "@/lib/types";
import type { QuotationRow } from "@/lib/types";

export async function GET() {
  try {
    const quotations = getAllQuotations();
    return Response.json(quotations);
  } catch (err) {
    console.error("[GET /api/quotations]", err);
    return Response.json(
      { error: "Failed to fetch quotations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }
    if (!body.clientName?.trim()) {
      return Response.json(
        { error: "clientName is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.equipment) || body.equipment.length === 0) {
      return Response.json(
        { error: "equipment must be a non-empty array" },
        { status: 400 }
      );
    }

    const equipment = body.equipment as QuotationRow[];
    const subtotal = equipment.reduce((s: number, r: QuotationRow) => s + r.amount, 0);
    const cgst = body.cgst ?? Math.round(subtotal * 0.09);
    const sgst = body.sgst ?? Math.round(subtotal * 0.09);
    const total = body.total ?? subtotal + cgst + sgst;

    const quotation = createQuotation({
      id: body.id ?? `quote-${generateId()}`,
      inquiryId: body.inquiryId,
      clientName: body.clientName.trim(),
      eventName: body.eventName?.trim() ?? "",
      quoteNo: body.quoteNo?.trim() ?? `BKM/${generateId()}`,
      startDate: body.startDate ?? "",
      endDate: body.endDate ?? "",
      days: body.days ?? 1,
      venue: body.venue?.trim() ?? "",
      status: "Draft",
      equipment,
      subtotal,
      cgst,
      sgst,
      total,
      createdAt: new Date().toISOString().split("T")[0],
      sentAt: null,
      approvedAt: null,
    });

    return Response.json(quotation, { status: 201 });
  } catch (err) {
    console.error("[POST /api/quotations]", err);
    return Response.json(
      { error: "Failed to create quotation" },
      { status: 500 }
    );
  }
}

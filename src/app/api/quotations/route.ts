/**
 * GET  /api/quotations  — list all quotations
 * POST /api/quotations  — create a new quotation
 */

import type { NextRequest } from "next/server";
import { getAllQuotations, createQuotation } from "@/lib/queries/quotations";
import { generateId } from "@/lib/types";
import type { QuotationRow } from "@/lib/types";
import { Validator } from "@/lib/validate";

export async function GET() {
  try {
    const quotations = getAllQuotations();
    return Response.json(quotations);
  } catch (err) {
    console.error("[GET /api/quotations]", err);
    return Response.json({ error: "Failed to fetch quotations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const v = new Validator(body);
    v.required("inquiryId", "inquiry");
    v.required("clientName", "client name").minLength("clientName", 2).maxLength("clientName", 100);
    v.nonEmptyArray("equipment");
    if (body.startDate) v.date("startDate", "start date");
    if (body.endDate) v.date("endDate", "end date");
    if (body.startDate && body.endDate) v.dateRange("startDate", "endDate");
    if (body.days !== undefined) v.positiveInteger("days");
    if (body.subtotal !== undefined) v.nonNegativeNumber("subtotal");
    if (body.cgst !== undefined) v.nonNegativeNumber("cgst", "CGST");
    if (body.sgst !== undefined) v.nonNegativeNumber("sgst", "SGST");
    if (v.hasErrors()) return v.response();

    // Validate each equipment row
    if (Array.isArray(body.equipment)) {
      for (let i = 0; i < body.equipment.length; i++) {
        const row = body.equipment[i];
        if (!row.position?.trim()) {
          return Response.json({ error: `equipment[${i}].position is required` }, { status: 400 });
        }
        if (typeof row.rate !== "number" || row.rate < 0) {
          return Response.json({ error: `equipment[${i}].rate must be a non-negative number` }, { status: 400 });
        }
        if (typeof row.days !== "number" || row.days <= 0) {
          return Response.json({ error: `equipment[${i}].days must be a positive number` }, { status: 400 });
        }
      }
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
    return Response.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}

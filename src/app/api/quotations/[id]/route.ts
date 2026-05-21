/**
 * GET   /api/quotations/[id]  — get a single quotation
 * PATCH /api/quotations/[id]  — update a quotation (partial)
 * DELETE /api/quotations/[id] — delete a quotation
 */

import type { NextRequest } from "next/server";
import { getQuotationById, updateQuotation, deleteQuotation } from "@/lib/queries/quotations";
import type { QuotationRow } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = getQuotationById(id);
    if (!quotation) {
      return Response.json({ error: "Quotation not found" }, { status: 404 });
    }
    return Response.json(quotation);
  } catch (err) {
    console.error("[GET /api/quotations/[id]]", err);
    return Response.json({ error: "Failed to fetch quotation" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Recalculate totals if equipment is being updated
    if (Array.isArray(body.equipment)) {
      const equipment = body.equipment as QuotationRow[];
      const subtotal = equipment.reduce((s, r) => s + r.amount, 0);
      body.subtotal = subtotal;
      body.cgst = body.cgst ?? Math.round(subtotal * 0.09);
      body.sgst = body.sgst ?? Math.round(subtotal * 0.09);
      body.total = body.total ?? subtotal + body.cgst + body.sgst;
    }

    const updated = updateQuotation(id, { ...body, updatedAt: new Date().toISOString().split("T")[0] });
    if (!updated) {
      return Response.json({ error: "Quotation not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/quotations/[id]]", err);
    return Response.json({ error: "Failed to update quotation" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteQuotation(id);
    if (!deleted) {
      return Response.json({ error: "Quotation not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/quotations/[id]]", err);
    return Response.json({ error: "Failed to delete quotation" }, { status: 500 });
  }
}

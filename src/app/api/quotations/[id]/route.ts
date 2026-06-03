/**
 * GET    /api/quotations/[id]  — get a single quotation
 * PATCH  /api/quotations/[id]  — update a quotation (partial)
 * DELETE /api/quotations/[id]  — delete a quotation
 */

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { getQuotationById, updateQuotation, deleteQuotation } from "@/lib/queries/quotations";
import type { QuotationRow } from "@/lib/types";
import { Validator, QUOTATION_STATUSES } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = await getQuotationById(id);
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
    const auth = await requirePermission(request, "quotations.edit");
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await request.json();

    const v = new Validator(body);
    if (body.clientName !== undefined) v.minLength("clientName", 2).maxLength("clientName", 100);
    if (body.startDate !== undefined) v.date("startDate", "start date");
    if (body.endDate !== undefined) v.date("endDate", "end date");
    if (body.startDate !== undefined && body.endDate !== undefined) v.dateRange("startDate", "endDate");
    if (body.days !== undefined) v.positiveInteger("days");
    if (body.status !== undefined) v.oneOf("status", QUOTATION_STATUSES);
    if (body.subtotal !== undefined) v.nonNegativeNumber("subtotal");
    if (body.cgst !== undefined) v.nonNegativeNumber("cgst", "CGST");
    if (body.sgst !== undefined) v.nonNegativeNumber("sgst", "SGST");
    if (v.hasErrors()) return v.response();

    // Recalculate totals if equipment is being updated
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
      const equipment = body.equipment as QuotationRow[];
      const subtotal = equipment.reduce((s, r) => s + r.amount, 0);
      body.subtotal = subtotal;
      body.cgst = body.cgst ?? Math.round(subtotal * 0.09);
      body.sgst = body.sgst ?? Math.round(subtotal * 0.09);
      body.total = body.total ?? subtotal + body.cgst + body.sgst;
    }

    // If signedCopyUrl is a base64 data URL, upload it first
    if (body.signedCopyUrl && body.signedCopyUrl.startsWith("data:")) {
      const { uploadFile } = await import("@/lib/storage");
      const filename = body.signedCopyName || "signed-copy.pdf";
      try {
        const savedPath = await uploadFile(body.signedCopyUrl, filename);
        body.signedCopyUrl = savedPath;
      } catch (err) {
        console.error("Signed copy upload failed:", err);
        return Response.json({ error: "Failed to upload signed copy" }, { status: 500 });
      }
    }

    const updated = await updateQuotation(id, {
      ...body,
      clientName: body.clientName?.trim(),
      eventName: body.eventName?.trim(),
      venue: body.venue?.trim(),
      updatedAt: new Date().toISOString().split("T")[0],
    });
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "quotations.edit");
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const deleted = await deleteQuotation(id);
    if (!deleted) {
      return Response.json({ error: "Quotation not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/quotations/[id]]", err);
    return Response.json({ error: "Failed to delete quotation" }, { status: 500 });
  }
}

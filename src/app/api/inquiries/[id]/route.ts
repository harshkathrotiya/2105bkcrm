/**
 * GET    /api/inquiries/[id]  — get a single inquiry
 * PATCH  /api/inquiries/[id]  — update an inquiry (partial)
 * DELETE /api/inquiries/[id]  — delete an inquiry
 */

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { getInquiryById, updateInquiry, deleteInquiry } from "@/lib/queries/inquiries";
import { Validator, INQUIRY_STATUSES } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inquiry = await getInquiryById(id);
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }
    return Response.json(inquiry);
  } catch (err) {
    console.error("[GET /api/inquiries/[id]]", err);
    return Response.json({ error: "Failed to fetch inquiry" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "inquiries.edit");
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await request.json();

    const v = new Validator(body);
    if (body.eventType !== undefined) v.minLength("eventType", 2).maxLength("eventType", 100);
    if (body.startDate !== undefined) v.date("startDate", "start date");
    if (body.endDate !== undefined) v.date("endDate", "end date");
    if (body.startDate !== undefined && body.endDate !== undefined) v.dateRange("startDate", "endDate");
    if (body.venue !== undefined) v.minLength("venue", 2).maxLength("venue", 200);
    if (body.notes !== undefined) v.maxLength("notes", 1000);
    if (body.status !== undefined) v.oneOf("status", INQUIRY_STATUSES);
    if (v.hasErrors()) return v.response();

    const updated = await updateInquiry(id, {
      ...body,
      eventType: body.eventType?.trim(),
      eventName: body.eventName?.trim(),
      venue: body.venue?.trim(),
      notes: body.notes?.trim(),
      updatedAt: new Date().toISOString().split("T")[0],
      screenWidth: body.screenWidth !== undefined ? parseFloat(body.screenWidth) : undefined,
      screenHeight: body.screenHeight !== undefined ? parseFloat(body.screenHeight) : undefined,
      screenAreaSqft: body.screenAreaSqft !== undefined ? parseFloat(body.screenAreaSqft) : undefined,
      totalCabinets: body.totalCabinets !== undefined ? parseInt(body.totalCabinets, 10) : undefined,
      ratePerSqft: body.ratePerSqft !== undefined ? parseFloat(body.ratePerSqft) : undefined,
    });
    if (!updated) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/inquiries/[id]]", err);
    return Response.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "inquiries.edit");
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const deleted = await deleteInquiry(id);
    if (!deleted) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/inquiries/[id]]", err);
    return Response.json({ error: "Failed to delete inquiry" }, { status: 500 });
  }
}

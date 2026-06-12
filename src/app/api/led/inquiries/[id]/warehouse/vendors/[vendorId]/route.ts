/**
 * PATCH  /api/led/inquiries/[id]/warehouse/vendors/[vendorId]  — update a vendor arrangement
 * DELETE /api/led/inquiries/[id]/warehouse/vendors/[vendorId]  — delete a vendor arrangement
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  try {
    const { id, vendorId } = await params;
    const vid = parseInt(vendorId, 10);
    if (isNaN(vid)) {
      return Response.json({ error: "Invalid vendorId" }, { status: 400 });
    }

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const existing = await db.ledVendorArrangement.findUnique({ where: { id: vid } });
    if (!existing || existing.inquiry_id !== id) {
      return Response.json({ error: "Vendor arrangement not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.vendorName !== undefined) data.vendor_name = String(body.vendorName).trim();
    if (body.ledType !== undefined) data.led_type = body.ledType;
    if (body.sqft !== undefined) data.sqft = Number(body.sqft);
    if (body.ratePerSqftPerDay !== undefined) data.rate_per_sqft_per_day = Number(body.ratePerSqftPerDay);

    const updated = await db.ledVendorArrangement.update({ where: { id: vid }, data });

    return Response.json({
      id: updated.id,
      inquiryId: updated.inquiry_id,
      vendorName: updated.vendor_name,
      ledType: updated.led_type,
      sqft: updated.sqft,
      ratePerSqftPerDay: updated.rate_per_sqft_per_day,
      createdAt: updated.created_at,
    });
  } catch (err) {
    console.error("[PATCH /api/led/inquiries/[id]/warehouse/vendors/[vendorId]]", err);
    return Response.json({ error: "Failed to update vendor arrangement" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  try {
    const { id, vendorId } = await params;
    const vid = parseInt(vendorId, 10);
    if (isNaN(vid)) {
      return Response.json({ error: "Invalid vendorId" }, { status: 400 });
    }

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const existing = await db.ledVendorArrangement.findUnique({ where: { id: vid } });
    if (!existing || existing.inquiry_id !== id) {
      return Response.json({ error: "Vendor arrangement not found" }, { status: 404 });
    }

    await db.ledVendorArrangement.delete({ where: { id: vid } });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/led/inquiries/[id]/warehouse/vendors/[vendorId]]", err);
    return Response.json({ error: "Failed to delete vendor arrangement" }, { status: 500 });
  }
}

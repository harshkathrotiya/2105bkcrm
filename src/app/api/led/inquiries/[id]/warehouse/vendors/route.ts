/**
 * POST /api/led/inquiries/[id]/warehouse/vendors  — create a vendor arrangement
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const body = await request.json();
    const { vendorName, ledType, sqft, ratePerSqftPerDay } = body;

    if (!vendorName || typeof vendorName !== "string" || !vendorName.trim()) {
      return Response.json({ error: "vendorName is required" }, { status: 400 });
    }
    if (typeof sqft !== "number" || sqft <= 0) {
      return Response.json({ error: "sqft must be > 0" }, { status: 400 });
    }
    if (typeof ratePerSqftPerDay !== "number" || ratePerSqftPerDay < 0) {
      return Response.json({ error: "ratePerSqftPerDay must be >= 0" }, { status: 400 });
    }

    const vendor = await db.ledVendorArrangement.create({
      data: {
        inquiry_id: id,
        vendor_name: vendorName.trim(),
        led_type: ledType ?? "P4",
        sqft,
        rate_per_sqft_per_day: ratePerSqftPerDay,
        created_at: new Date().toISOString(),
      },
    });

    return Response.json(
      {
        id: vendor.id,
        inquiryId: vendor.inquiry_id,
        vendorName: vendor.vendor_name,
        ledType: vendor.led_type,
        sqft: vendor.sqft,
        ratePerSqftPerDay: vendor.rate_per_sqft_per_day,
        createdAt: vendor.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/led/inquiries/[id]/warehouse/vendors]", err);
    return Response.json({ error: "Failed to create vendor arrangement" }, { status: 500 });
  }
}

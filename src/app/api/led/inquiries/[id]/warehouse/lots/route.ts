/**
 * POST /api/led/inquiries/[id]/warehouse/lots  — upsert a warehouse allocation
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
    const { lotId, allocatedSqft } = body;

    if (!lotId || typeof lotId !== "number") {
      return Response.json({ error: "lotId is required and must be a number" }, { status: 400 });
    }
    if (typeof allocatedSqft !== "number" || allocatedSqft < 0) {
      return Response.json({ error: "allocatedSqft must be >= 0" }, { status: 400 });
    }

    const lot = await db.ledCompanyLot.findUnique({ where: { id: lotId } });
    if (!lot) {
      return Response.json({ error: "Lot not found" }, { status: 404 });
    }

    const allocation = await db.ledWarehouseAllocation.upsert({
      where: { inquiry_id_lot_id: { inquiry_id: id, lot_id: lotId } },
      create: {
        inquiry_id: id,
        lot_id: lotId,
        allocated_sqft: allocatedSqft,
        created_at: new Date().toISOString(),
      },
      update: {
        allocated_sqft: allocatedSqft,
      },
    });

    return Response.json({
      id: allocation.id,
      inquiryId: allocation.inquiry_id,
      lotId: allocation.lot_id,
      allocatedSqft: allocation.allocated_sqft,
      createdAt: allocation.created_at,
    });
  } catch (err) {
    console.error("[POST /api/led/inquiries/[id]/warehouse/lots]", err);
    return Response.json({ error: "Failed to upsert allocation" }, { status: 500 });
  }
}

/**
 * DELETE /api/led/inquiries/[id]/warehouse/lots/[allocationId]  — delete a warehouse allocation
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; allocationId: string }> }
) {
  try {
    const { id, allocationId } = await params;
    const allocId = parseInt(allocationId, 10);
    if (isNaN(allocId)) {
      return Response.json({ error: "Invalid allocation id" }, { status: 400 });
    }

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const allocation = await db.ledWarehouseAllocation.findUnique({ where: { id: allocId } });
    if (!allocation || allocation.inquiry_id !== id) {
      return Response.json({ error: "Allocation not found" }, { status: 404 });
    }

    await db.ledWarehouseAllocation.delete({ where: { id: allocId } });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/led/inquiries/[id]/warehouse/lots/[allocationId]]", err);
    return Response.json({ error: "Failed to delete allocation" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { getEquipmentDetailsById, updateEquipment, deleteEquipment } from "@/lib/queries/equipment";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = getEquipmentDetailsById(parseInt(id, 10));
    if (!item) {
      return Response.json({ error: "Equipment not found" }, { status: 404 });
    }
    return Response.json(item);
  } catch (err) {
    console.error("[GET /api/equipment/[id]]", err);
    return Response.json({ error: "Failed to fetch equipment item" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const patch: any = { ...body };
    if (body.quantity !== undefined) patch.quantity = parseInt(body.quantity, 10);
    if (body.purchasePrice !== undefined) patch.purchasePrice = body.purchasePrice ? parseFloat(body.purchasePrice) : null;
    if (body.kitId !== undefined) patch.kitId = body.kitId ? parseInt(body.kitId, 10) : null;

    const updated = updateEquipment(parseInt(id, 10), patch);
    if (!updated) {
      return Response.json({ error: "Equipment not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/equipment/[id]]", err);
    return Response.json({ error: "Failed to update equipment item" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteEquipment(parseInt(id, 10));
    if (!deleted) {
      return Response.json({ error: "Equipment not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/equipment/[id]]", err);
    return Response.json({ error: "Failed to delete equipment item" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { deleteClientRate } from "@/lib/queries/pricing";

// DELETE /api/clients/[id]/rates/[equipmentId] — remove an override (revert to default rate)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; equipmentId: string }> }
) {
  try {
    const { id, equipmentId } = await params;
    const eqId = parseInt(equipmentId, 10);
    if (isNaN(eqId) || eqId <= 0) {
      return Response.json({ error: "Invalid equipment ID" }, { status: 400 });
    }

    const ok = await deleteClientRate(id, eqId);
    if (!ok) {
      return Response.json({ error: "Override not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/clients/[id]/rates/[equipmentId]]", err);
    return Response.json({ error: "Failed to delete client rate" }, { status: 500 });
  }
}

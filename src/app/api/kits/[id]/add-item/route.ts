import type { NextRequest } from "next/server";
import { addEquipmentToKit } from "@/lib/queries/kits";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kitIdStr } = await params;
    const kitId = parseInt(kitIdStr, 10);
    const { equipmentId, quantity } = await request.json();

    if (!equipmentId) {
      return Response.json({ error: "equipmentId is required" }, { status: 400 });
    }

    const qty = quantity !== undefined ? parseInt(quantity, 10) : undefined;
    const success = addEquipmentToKit(kitId, parseInt(equipmentId, 10), qty);
    if (!success) {
      return Response.json({ error: "Failed to add equipment to kit. Item might not exist or be retired." }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[POST /api/kits/[id]/add-item]", err);
    return Response.json({ error: "Failed to add item to kit" }, { status: 500 });
  }
}

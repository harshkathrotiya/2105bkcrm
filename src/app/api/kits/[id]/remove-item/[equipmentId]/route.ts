import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { removeEquipmentFromKit } from "@/lib/queries/kits";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; equipmentId: string }> }
) {
  try {
    const auth = await requirePermission(request, "kits.edit");
    if (!auth.ok) return auth.response!;

    const { id: kitIdStr, equipmentId: equipmentIdStr } = await params;
    const kitId = parseInt(kitIdStr, 10);
    const equipmentId = parseInt(equipmentIdStr, 10);

    const success = await removeEquipmentFromKit(kitId, equipmentId);
    if (!success) {
      return Response.json({ error: "Failed to remove equipment from kit" }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/kits/[id]/remove-item/[equipmentId]]", err);
    return Response.json({ error: "Failed to remove item from kit" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { addEquipmentToKit } from "@/lib/queries/kits";
import { Validator } from "@/lib/validate";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "kits.edit");
    if (!auth.ok) return auth.response!;

    const { id: kitIdStr } = await params;
    const kitId = parseInt(kitIdStr, 10);

    if (isNaN(kitId) || kitId <= 0) {
      return Response.json({ error: "Invalid kit ID" }, { status: 400 });
    }

    const body = await request.json();

    const v = new Validator(body);
    v.required("equipmentId", "equipment ID").positiveInteger("equipmentId", "equipment ID");
    if (body.quantity !== undefined) v.positiveInteger("quantity");
    if (v.hasErrors()) return v.response();

    const qty = body.quantity !== undefined ? parseInt(body.quantity, 10) : undefined;
    const success = await addEquipmentToKit(kitId, parseInt(body.equipmentId, 10), qty);
    if (!success) {
      return Response.json(
        { error: "Failed to add equipment to kit. Item may not exist or may be retired." },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[POST /api/kits/[id]/add-item]", err);
    return Response.json({ error: "Failed to add item to kit" }, { status: 500 });
  }
}

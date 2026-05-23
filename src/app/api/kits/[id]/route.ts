import type { NextRequest } from "next/server";
import { getKitById, updateKit, deleteKit } from "@/lib/queries/kits";
import { Validator } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const kit = getKitById(parseInt(id, 10));
    if (!kit) {
      return Response.json({ error: "Kit not found" }, { status: 404 });
    }
    return Response.json(kit);
  } catch (err) {
    console.error("[GET /api/kits/[id]]", err);
    return Response.json({ error: "Failed to fetch kit" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const v = new Validator(body);
    if (body.name !== undefined) v.minLength("name", 2).maxLength("name", 100);
    if (body.description !== undefined && body.description) v.maxLength("description", 500);
    if (body.mainBodyId !== undefined && body.mainBodyId !== null) v.positiveInteger("mainBodyId", "main body ID");
    if (body.mainBodyQty !== undefined && body.mainBodyQty !== null) v.positiveInteger("mainBodyQty", "main body quantity");
    if (v.hasErrors()) return v.response();

    const patch: any = { ...body };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.description !== undefined) patch.description = body.description?.trim() || null;
    if (body.mainBodyId !== undefined) patch.mainBodyId = body.mainBodyId ? parseInt(body.mainBodyId, 10) : null;
    if (body.mainBodyQty !== undefined) patch.mainBodyQty = body.mainBodyQty ? parseInt(body.mainBodyQty, 10) : null;

    const updated = updateKit(parseInt(id, 10), patch);
    if (!updated) {
      return Response.json({ error: "Kit not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/kits/[id]]", err);
    return Response.json({ error: "Failed to update kit" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteKit(parseInt(id, 10));
    if (!deleted) {
      return Response.json({ error: "Kit not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/kits/[id]]", err);
    return Response.json({ error: "Failed to delete kit" }, { status: 500 });
  }
}

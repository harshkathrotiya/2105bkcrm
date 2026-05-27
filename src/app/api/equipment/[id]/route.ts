import type { NextRequest } from "next/server";
import { getEquipmentDetailsById, updateEquipment, deleteEquipment } from "@/lib/queries/equipment";
import { Validator, EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getEquipmentDetailsById(parseInt(id, 10));
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

    const v = new Validator(body);
    if (body.productName !== undefined) v.minLength("productName", 2).maxLength("productName", 200);
    if (body.category !== undefined) v.oneOf("category", EQUIPMENT_CATEGORIES);
    if (body.quantity !== undefined) v.positiveInteger("quantity");
    if (body.serialNumber !== undefined && body.serialNumber) v.maxLength("serialNumber", 100, "serial number");
    if (body.bodyName !== undefined && body.bodyName) v.maxLength("bodyName", 100, "body name");
    if (body.respPerson !== undefined && body.respPerson) v.maxLength("respPerson", 100, "responsible person");
    if (body.purchaseDate !== undefined && body.purchaseDate) v.date("purchaseDate", "purchase date");
    if (body.purchaseFrom !== undefined && body.purchaseFrom) v.maxLength("purchaseFrom", 200, "purchase from");
    if (body.billNumber !== undefined && body.billNumber) v.maxLength("billNumber", 100, "bill number");
    if (body.purchasePrice !== undefined && body.purchasePrice !== null) v.nonNegativeNumber("purchasePrice", "purchase price");
    if (body.status !== undefined) v.oneOf("status", EQUIPMENT_STATUSES);
    if (body.notes !== undefined && body.notes) v.maxLength("notes", 1000);
    if (body.ownershipType !== undefined) v.oneOf("ownershipType", ["INHOUSE", "VENDOR"]);
    if (body.vendorId !== undefined && body.vendorId !== null && body.vendorId !== "") v.positiveInteger("vendorId", "vendor ID");
    if (v.hasErrors()) return v.response();

    const patch: any = { ...body };
    if (body.productName !== undefined) patch.productName = body.productName.trim();
    if (body.quantity !== undefined) patch.quantity = parseInt(body.quantity, 10);
    if (body.purchasePrice !== undefined) patch.purchasePrice = body.purchasePrice ? parseFloat(body.purchasePrice) : null;
    if (body.kitId !== undefined) patch.kitId = body.kitId ? parseInt(body.kitId, 10) : null;
    if (body.ownershipType !== undefined) patch.ownershipType = body.ownershipType;
    if (body.vendorId !== undefined) patch.vendorId = body.vendorId ? parseInt(body.vendorId, 10) : null;

    const updated = await updateEquipment(parseInt(id, 10), patch);
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
    const deleted = await deleteEquipment(parseInt(id, 10));
    if (!deleted) {
      return Response.json({ error: "Equipment not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/equipment/[id]]", err);
    return Response.json({ error: "Failed to delete equipment item" }, { status: 500 });
  }
}

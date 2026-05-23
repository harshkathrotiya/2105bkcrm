import type { NextRequest } from "next/server";
import { getEquipment, createEquipment, getEquipmentCategoryCounts } from "@/lib/queries/equipment";
import { Validator, EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const pageRaw = parseInt(searchParams.get("page") || "1", 10);
    const limitRaw = parseInt(searchParams.get("limit") || "20", 10);

    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const limit = isNaN(limitRaw) || limitRaw < 1 ? 20 : Math.min(limitRaw, 200);
    const offset = (page - 1) * limit;

    const { items, total } = getEquipment({
      category: category === "ALL" ? undefined : category,
      status,
      search,
      limit,
      offset,
    });

    const categoryCounts = getEquipmentCategoryCounts();
    return Response.json({ items, total, page, limit, categoryCounts });
  } catch (err) {
    console.error("[GET /api/equipment]", err);
    return Response.json({ error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const v = new Validator(body);
    v.required("productName", "product name").minLength("productName", 2).maxLength("productName", 200);
    v.required("category").oneOf("category", EQUIPMENT_CATEGORIES);
    if (body.quantity !== undefined) v.positiveInteger("quantity");
    if (body.serialNumber) v.maxLength("serialNumber", 100, "serial number");
    if (body.bodyName) v.maxLength("bodyName", 100, "body name");
    if (body.respPerson) v.maxLength("respPerson", 100, "responsible person");
    if (body.purchaseDate) v.date("purchaseDate", "purchase date");
    if (body.purchaseFrom) v.maxLength("purchaseFrom", 200, "purchase from");
    if (body.billNumber) v.maxLength("billNumber", 100, "bill number");
    if (body.purchasePrice !== undefined) v.nonNegativeNumber("purchasePrice", "purchase price");
    if (body.status !== undefined) v.oneOf("status", EQUIPMENT_STATUSES);
    if (body.notes) v.maxLength("notes", 1000);
    if (v.hasErrors()) return v.response();

    const item = createEquipment({
      productName: body.productName.trim(),
      category: body.category,
      quantity: parseInt(body.quantity ?? "1", 10),
      serialNumber: body.serialNumber?.trim() || null,
      bodyName: body.bodyName?.trim() || null,
      kitId: body.kitId ? parseInt(body.kitId, 10) : null,
      respPerson: body.respPerson?.trim() || null,
      purchaseDate: body.purchaseDate || null,
      purchaseFrom: body.purchaseFrom?.trim() || null,
      billNumber: body.billNumber?.trim() || null,
      purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : null,
      status: body.status || "AVAILABLE",
      notes: body.notes?.trim() || null,
    });

    return Response.json(item, { status: 201 });
  } catch (err) {
    console.error("[POST /api/equipment]", err);
    return Response.json({ error: "Failed to create equipment" }, { status: 500 });
  }
}

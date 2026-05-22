import type { NextRequest } from "next/server";
import { getEquipment, createEquipment, getEquipmentCategoryCounts } from "@/lib/queries/equipment";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const { items, total } = getEquipment({
      category: category === "ALL" ? undefined : category,
      status,
      search,
      limit,
      offset,
    });

    const categoryCounts = getEquipmentCategoryCounts();

    return Response.json({
      items,
      total,
      page,
      limit,
      categoryCounts,
    });
  } catch (err) {
    console.error("[GET /api/equipment]", err);
    return Response.json({ error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.productName?.trim()) {
      return Response.json({ error: "productName is required" }, { status: 400 });
    }
    if (!body.category) {
      return Response.json({ error: "category is required" }, { status: 400 });
    }

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

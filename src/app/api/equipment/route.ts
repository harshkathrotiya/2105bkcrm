import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { getEquipment, createEquipment, getEquipmentCategoryCounts } from "@/lib/queries/equipment";
import { Validator, EQUIPMENT_STATUSES } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const department = (searchParams.get("department") as "VIDEO" | "LED") || undefined;
    const ownerStaffIdRaw = searchParams.get("ownerStaffId");
    const ownerStaffId = ownerStaffIdRaw ? parseInt(ownerStaffIdRaw, 10) : undefined;
    const pageRaw = parseInt(searchParams.get("page") || "1", 10);
    const limitRaw = parseInt(searchParams.get("limit") || "20", 10);

    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const limit = isNaN(limitRaw) || limitRaw < 1 ? 20 : Math.min(limitRaw, 200);
    const offset = (page - 1) * limit;

    const { items, total } = await getEquipment({
      category: category === "ALL" ? undefined : category,
      status,
      search,
      limit,
      offset,
      department,
      ownerStaffId: ownerStaffId && !isNaN(ownerStaffId) ? ownerStaffId : undefined,
    });

    const categoryCounts = await getEquipmentCategoryCounts();
    return Response.json({ items, total, page, limit, categoryCounts });
  } catch (err) {
    console.error("[GET /api/equipment]", err);
    return Response.json({ error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "equipment.create");
    if (!auth.ok) return auth.response!;

    const body = await request.json();

    const v = new Validator(body);
    v.required("productName", "product name").minLength("productName", 2).maxLength("productName", 200);
    // Category is now user-extensible (managed via OptionList); require non-empty, capped length
    v.required("category").maxLength("category", 50);
    if (body.quantity !== undefined) v.positiveInteger("quantity");
    if (body.quantityUnit !== undefined) v.oneOf("quantityUnit", ["pieces", "pair", "metre"]);
    if (body.serialNumber) v.maxLength("serialNumber", 100, "serial number");
    if (body.bodyName) v.maxLength("bodyName", 100, "body name");
    if (body.respPerson) v.maxLength("respPerson", 100, "responsible person");
    if (body.purchaseDate) v.date("purchaseDate", "purchase date");
    if (body.purchaseFrom) v.maxLength("purchaseFrom", 200, "purchase from");
    if (body.billNumber) v.maxLength("billNumber", 100, "bill number");
    if (body.purchasePrice !== undefined) v.nonNegativeNumber("purchasePrice", "purchase price");
    if (body.status !== undefined) v.oneOf("status", EQUIPMENT_STATUSES);
    if (body.notes) v.maxLength("notes", 1000);
    if (body.ownershipType !== undefined) v.oneOf("ownershipType", ["INHOUSE", "VENDOR", "STAFF"]);
    if (body.vendorId !== undefined && body.vendorId !== null && body.vendorId !== "") v.positiveInteger("vendorId", "vendor ID");
    if (body.ownerStaffId !== undefined && body.ownerStaffId !== null && body.ownerStaffId !== "") v.positiveInteger("ownerStaffId", "owner staff ID");
    if (body.defaultRate !== undefined && body.defaultRate !== null && body.defaultRate !== "") v.nonNegativeNumber("defaultRate", "default rate");
    if (body.ownershipType === "VENDOR" && !body.vendorId) v.add("vendorId", "Vendor is required when owner is a vendor");
    if (body.ownershipType === "STAFF" && !body.ownerStaffId) v.add("ownerStaffId", "Staff is required when owner is a staff member");
    if (v.hasErrors()) return v.response();

    const item = await createEquipment({
      productName: body.productName.trim(),
      category: body.category,
      quantity: parseInt(body.quantity ?? "1", 10),
      quantityUnit: body.quantityUnit || "pieces",
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
      ownershipType: body.ownershipType || "INHOUSE",
      vendorId: body.ownershipType === "VENDOR" && body.vendorId ? parseInt(body.vendorId, 10) : null,
      ownerStaffId: body.ownershipType === "STAFF" && body.ownerStaffId ? parseInt(body.ownerStaffId, 10) : null,
      defaultRate: body.defaultRate !== undefined && body.defaultRate !== null && body.defaultRate !== "" ? parseFloat(body.defaultRate) : null,
      department: body.department ?? "VIDEO",
    });

    return Response.json(item, { status: 201 });
  } catch (err) {
    console.error("[POST /api/equipment]", err);
    return Response.json({ error: "Failed to create equipment" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { verifyJWT } from "@/lib/auth";
import { getAllKits, createKit, getAllKitsWithAvailability } from "@/lib/queries/kits";
import { Validator } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const department = (searchParams.get("department") as "VIDEO" | "LED") || undefined;

    // Validate date params if provided
    if (startDate || endDate) {
      const v = new Validator({ startDate, endDate });
      if (startDate) v.date("startDate", "start date");
      if (endDate) v.date("endDate", "end date");
      if (startDate && endDate) v.dateRange("startDate", "endDate");
      if (v.hasErrors()) return v.response();
    }

    const token = request.cookies.get("bk-media-session")?.value;
    const payload = token ? await verifyJWT(token) : null;
    const forcedDept = payload?.role === "Department Head" ? (payload.department as "VIDEO" | "LED") : undefined;
    const effectiveDept = forcedDept ?? department;

    if (startDate && endDate) {
      return Response.json(await getAllKitsWithAvailability(startDate, endDate, effectiveDept));
    }

    return Response.json(await getAllKits(effectiveDept));
  } catch (err) {
    console.error("[GET /api/kits]", err);
    return Response.json({ error: "Failed to fetch kits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "kits.edit");
    if (!auth.ok) return auth.response!;

    const body = await request.json();

    const v = new Validator(body);
    v.required("name").minLength("name", 2).maxLength("name", 100);
    if (body.description) v.maxLength("description", 500);
    if (body.mainBodyId !== undefined && body.mainBodyId !== null) v.positiveInteger("mainBodyId", "main body ID");
    if (body.mainBodyQty !== undefined && body.mainBodyQty !== null) v.positiveInteger("mainBodyQty", "main body quantity");
    if (v.hasErrors()) return v.response();

    // Validate accessories array if provided
    if (Array.isArray(body.accessories)) {
      for (let i = 0; i < body.accessories.length; i++) {
        const acc = body.accessories[i];
        if (!acc.id || isNaN(Number(acc.id)) || Number(acc.id) <= 0) {
          return Response.json({ error: `accessories[${i}].id must be a positive integer` }, { status: 400 });
        }
        if (acc.quantity !== undefined && (isNaN(Number(acc.quantity)) || Number(acc.quantity) <= 0)) {
          return Response.json({ error: `accessories[${i}].quantity must be a positive integer` }, { status: 400 });
        }
      }
    }

    const kit = await createKit({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      mainBodyId: body.mainBodyId ? parseInt(body.mainBodyId, 10) : null,
      mainBodyQty: body.mainBodyQty ? parseInt(body.mainBodyQty, 10) : null,
      accessories: body.accessories
        ? body.accessories.map((acc: { id: any; quantity: any }) => ({
            id: parseInt(acc.id, 10),
            quantity: parseInt(acc.quantity as string, 10),
          }))
        : undefined,
      department: body.department ?? "VIDEO",
    });

    return Response.json(kit, { status: 201 });
  } catch (err) {
    console.error("[POST /api/kits]", err);
    return Response.json({ error: "Failed to create kit" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { getVendorById, updateVendor } from "@/lib/queries/vendors";
import { Validator } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await getVendorById(parseInt(id, 10));
    if (!vendor) {
      return Response.json({ error: "Vendor not found" }, { status: 404 });
    }
    return Response.json(vendor);
  } catch (err) {
    console.error("[GET /api/vendors/[id]]", err);
    return Response.json({ error: "Failed to fetch vendor" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "vendors.edit");
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await request.json();

    const v = new Validator(body);
    if (body.name !== undefined) v.minLength("name", 2).maxLength("name", 100);
    if (body.phone !== undefined) v.phone("phone");
    if (body.email !== undefined && body.email) v.email("email");
    if (body.specialization !== undefined && body.specialization) v.maxLength("specialization", 100);
    if (body.city !== undefined && body.city) v.maxLength("city", 100);
    if (body.gstNumber !== undefined && body.gstNumber) v.gst("gstNumber", "GST number");
    if (body.notes !== undefined && body.notes) v.maxLength("notes", 500);
    if (v.hasErrors()) return v.response();

    const patch: any = { ...body };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.phone !== undefined) patch.phone = body.phone.trim();
    if (body.email !== undefined) patch.email = body.email?.trim() || null;
    if (body.specialization !== undefined) patch.specialization = body.specialization?.trim() || null;
    if (body.city !== undefined) patch.city = body.city?.trim() || null;
    if (body.gstNumber !== undefined) patch.gstNumber = body.gstNumber?.trim() || null;
    if (body.notes !== undefined) patch.notes = body.notes?.trim() || null;
    if (body.isActive !== undefined) patch.isActive = !!body.isActive;

    const updated = await updateVendor(parseInt(id, 10), patch);
    if (!updated) {
      return Response.json({ error: "Vendor not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/vendors/[id]]", err);
    return Response.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

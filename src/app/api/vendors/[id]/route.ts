import type { NextRequest } from "next/server";
import { getVendorById, updateVendor } from "@/lib/queries/vendors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = getVendorById(parseInt(id, 10));
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
    const { id } = await params;
    const body = await request.json();

    const patch: any = { ...body };
    if (body.isActive !== undefined) {
      patch.isActive = !!body.isActive;
    }

    const updated = updateVendor(parseInt(id, 10), patch);
    if (!updated) {
      return Response.json({ error: "Vendor not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/vendors/[id]]", err);
    return Response.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

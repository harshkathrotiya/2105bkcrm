import type { NextRequest } from "next/server";
import { getAllVendors, createVendor } from "@/lib/queries/vendors";

export async function GET() {
  try {
    const vendors = getAllVendors();
    return Response.json(vendors);
  } catch (err) {
    console.error("[GET /api/vendors]", err);
    return Response.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return Response.json({ error: "phone is required" }, { status: 400 });
    }

    const vendor = createVendor({
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      specialization: body.specialization?.trim() || null,
      city: body.city?.trim() || null,
      gstNumber: body.gstNumber?.trim() || null,
      notes: body.notes?.trim() || null,
    });

    return Response.json(vendor, { status: 201 });
  } catch (err) {
    console.error("[POST /api/vendors]", err);
    return Response.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}

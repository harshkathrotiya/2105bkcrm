import type { NextRequest } from "next/server";
import { getAllVendors, createVendor } from "@/lib/queries/vendors";
import { Validator } from "@/lib/validate";

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

    const v = new Validator(body);
    v.required("name").minLength("name", 2).maxLength("name", 100);
    v.required("phone").phone("phone");
    v.email("email");
    v.maxLength("specialization", 100);
    v.maxLength("city", 100);
    if (body.gstNumber) v.gst("gstNumber", "GST number");
    v.maxLength("notes", 500);
    if (v.hasErrors()) return v.response();

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

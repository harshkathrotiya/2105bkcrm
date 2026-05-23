import type { NextRequest } from "next/server";
import { getAllStaff, createStaff } from "@/lib/queries/staff";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;
    const paymentType = searchParams.get("paymentType") || undefined;
    const status = searchParams.get("status") || undefined;

    const staff = getAllStaff({ search, type, paymentType, status });
    return Response.json(staff);
  } catch (err) {
    console.error("[GET /api/staff]", err);
    return Response.json({ error: "Failed to fetch staff" }, { status: 500 });
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
    if (!body.role) {
      return Response.json({ error: "role is required" }, { status: 400 });
    }
    if (!body.staffType) {
      return Response.json({ error: "staffType is required" }, { status: 400 });
    }
    if (!body.paymentType) {
      return Response.json({ error: "paymentType is required" }, { status: 400 });
    }

    const staff = createStaff({
      name: body.name.trim(),
      phone: body.phone.trim(),
      role: body.role,
      staffType: body.staffType,
      paymentType: body.paymentType,
      ratePerDay: body.ratePerDay ? parseFloat(body.ratePerDay) : null,
      monthlySalary: body.monthlySalary ? parseFloat(body.monthlySalary) : null,
      withEquipment: !!body.withEquipment,
      equipmentDesc: body.equipmentDesc?.trim() || null,
      aadharNumber: body.aadharNumber?.trim() || null,
      aadharFront: body.aadharFront || null,
      aadharBack: body.aadharBack || null,
    });

    return Response.json(staff, { status: 201 });
  } catch (err) {
    console.error("[POST /api/staff]", err);
    return Response.json({ error: "Failed to create staff" }, { status: 500 });
  }
}

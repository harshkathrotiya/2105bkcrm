import type { NextRequest } from "next/server";
import { getAllStaff, createStaff } from "@/lib/queries/staff";
import { Validator, STAFF_ROLES, STAFF_TYPES, PAYMENT_TYPES } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;
    const paymentType = searchParams.get("paymentType") || undefined;
    const department = (searchParams.get("department") as "VIDEO" | "LED" | "BOTH") || undefined;
    const status = searchParams.get("status") || undefined;

    // Validate enum query params if provided
    if (type && !["INHOUSE", "EXTERNAL"].includes(type)) {
      return Response.json({ error: "type must be INHOUSE or EXTERNAL" }, { status: 400 });
    }
    if (paymentType && !["PER_DAY", "MONTHLY"].includes(paymentType)) {
      return Response.json({ error: "paymentType must be PER_DAY or MONTHLY" }, { status: 400 });
    }
    if (status && !["AVAILABLE", "DEPLOYED"].includes(status)) {
      return Response.json({ error: "status must be AVAILABLE or DEPLOYED" }, { status: 400 });
    }

    const staff = await getAllStaff({ search, type, paymentType, status, department });
    return Response.json(staff);
  } catch (err) {
    console.error("[GET /api/staff]", err);
    return Response.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const v = new Validator(body);
    v.required("name").minLength("name", 2).maxLength("name", 100);
    v.required("phone").phone("phone");
    v.required("role").oneOf("role", STAFF_ROLES);
    v.required("staffType", "staff type").oneOf("staffType", STAFF_TYPES, "staff type");
    v.required("paymentType", "payment type").oneOf("paymentType", PAYMENT_TYPES, "payment type");

    // Rate validation based on payment type
    if (body.paymentType === "PER_DAY") {
      v.required("ratePerDay", "rate per day").positiveNumber("ratePerDay", "rate per day");
    } else if (body.paymentType === "MONTHLY") {
      v.required("monthlySalary", "monthly salary").positiveNumber("monthlySalary", "monthly salary");
    }

    if (body.aadharNumber) v.aadhar("aadharNumber", "Aadhar number");
    if (body.equipmentDesc) v.maxLength("equipmentDesc", 200, "equipment description");
    if (v.hasErrors()) return v.response();

    const staff = await createStaff({
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
      department: body.department ?? "VIDEO",
    });

    return Response.json(staff, { status: 201 });
  } catch (err) {
    console.error("[POST /api/staff]", err);
    return Response.json({ error: "Failed to create staff" }, { status: 500 });
  }
}

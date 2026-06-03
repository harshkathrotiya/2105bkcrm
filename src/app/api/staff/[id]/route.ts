import type { NextRequest } from "next/server";
import { getStaffById, updateStaff, deleteStaff } from "@/lib/queries/staff";
import { Validator, STAFF_ROLES, STAFF_TYPES, PAYMENT_TYPES } from "@/lib/validate";
import { requirePermission } from "@/lib/role-permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staff = await getStaffById(parseInt(id, 10));
    if (!staff) {
      return Response.json({ error: "Staff not found" }, { status: 404 });
    }
    return Response.json(staff);
  } catch (err) {
    console.error("[GET /api/staff/[id]]", err);
    return Response.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "staff.edit");
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await request.json();

    const v = new Validator(body);
    if (body.name !== undefined) v.minLength("name", 2).maxLength("name", 100);
    if (body.phone !== undefined) v.phone("phone");
    if (body.role !== undefined) v.oneOf("role", STAFF_ROLES);
    if (body.staffType !== undefined) v.oneOf("staffType", STAFF_TYPES, "staff type");
    if (body.paymentType !== undefined) v.oneOf("paymentType", PAYMENT_TYPES, "payment type");
    if (body.ratePerDay !== undefined && body.ratePerDay !== null) v.positiveNumber("ratePerDay", "rate per day");
    if (body.monthlySalary !== undefined && body.monthlySalary !== null) v.positiveNumber("monthlySalary", "monthly salary");
    if (body.aadharNumber !== undefined && body.aadharNumber) v.aadhar("aadharNumber", "Aadhar number");
    if (body.equipmentDesc !== undefined && body.equipmentDesc) v.maxLength("equipmentDesc", 200, "equipment description");
    if (body.equipmentRatePerDay !== undefined && body.equipmentRatePerDay !== null && body.equipmentRatePerDay !== "") v.nonNegativeNumber("equipmentRatePerDay", "equipment rate per day");
    if (v.hasErrors()) return v.response();

    const patch: any = { ...body };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.phone !== undefined) patch.phone = body.phone.trim();
    if (body.ratePerDay !== undefined) patch.ratePerDay = body.ratePerDay ? parseFloat(body.ratePerDay) : null;
    if (body.monthlySalary !== undefined) patch.monthlySalary = body.monthlySalary ? parseFloat(body.monthlySalary) : null;
    if (body.withEquipment !== undefined) patch.withEquipment = !!body.withEquipment;
    if (body.equipmentDesc !== undefined) patch.equipmentDesc = body.equipmentDesc?.trim() || null;
    if (body.equipmentRatePerDay !== undefined) patch.equipmentRatePerDay = body.equipmentRatePerDay !== null && body.equipmentRatePerDay !== "" ? parseFloat(body.equipmentRatePerDay) : null;
    if (body.aadharNumber !== undefined) patch.aadharNumber = body.aadharNumber?.trim() || null;

    const updated = await updateStaff(parseInt(id, 10), patch);
    if (!updated) {
      return Response.json({ error: "Staff not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/staff/[id]]", err);
    return Response.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "staff.edit");
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const deleted = await deleteStaff(parseInt(id, 10));
    if (!deleted) {
      return Response.json({ error: "Staff not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/staff/[id]]", err);
    return Response.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}

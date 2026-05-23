import type { NextRequest } from "next/server";
import { getStaffById, updateStaff, deleteStaff } from "@/lib/queries/staff";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staff = getStaffById(parseInt(id, 10));
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
    const { id } = await params;
    const body = await request.json();

    const patch: any = { ...body };
    if (body.ratePerDay !== undefined) {
      patch.ratePerDay = body.ratePerDay ? parseFloat(body.ratePerDay) : null;
    }
    if (body.monthlySalary !== undefined) {
      patch.monthlySalary = body.monthlySalary ? parseFloat(body.monthlySalary) : null;
    }
    if (body.withEquipment !== undefined) {
      patch.withEquipment = !!body.withEquipment;
    }

    const updated = updateStaff(parseInt(id, 10), patch);
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteStaff(parseInt(id, 10));
    if (!deleted) {
      return Response.json({ error: "Staff not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/staff/[id]]", err);
    return Response.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}

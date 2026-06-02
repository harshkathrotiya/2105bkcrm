import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Validator } from "@/lib/validate";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = parseInt(id, 10);

    if (isNaN(assignmentId) || assignmentId <= 0) {
      return Response.json({ error: "Invalid assignment ID" }, { status: 400 });
    }

    const body = await request.json();

    const v = new Validator(body);
    if (body.daysAssigned !== undefined) v.positiveInteger("daysAssigned", "days assigned");
    if (body.ratePerDay !== undefined) v.nonNegativeNumber("ratePerDay", "rate per day");
    if (body.positionNo !== undefined && body.positionNo !== null) v.positiveInteger("positionNo", "position number");
    if (body.positionName !== undefined && body.positionName) v.maxLength("positionName", 100, "position name");
    if (body.equipmentRatePerDay !== undefined && body.equipmentRatePerDay !== null && body.equipmentRatePerDay !== "") v.nonNegativeNumber("equipmentRatePerDay", "equipment rate per day");
    if (v.hasErrors()) return v.response();

    const existing = await db.staffAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!existing) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    const daysAssigned =
      body.daysAssigned !== undefined ? parseInt(body.daysAssigned, 10) : existing.days_assigned;
    const ratePerDay =
      body.ratePerDay !== undefined ? parseFloat(body.ratePerDay) : existing.rate_per_day;
    const positionName =
      body.positionName !== undefined ? body.positionName : existing.position_name;
    const positionNo =
      body.positionNo !== undefined
        ? body.positionNo !== null ? parseInt(body.positionNo, 10) : null
        : existing.position_no;
    const withEquipment =
      body.withEquipment !== undefined
        ? (body.withEquipment === true || body.withEquipment === "true" || body.withEquipment === 1)
        : existing.with_equipment === 1;
    const equipmentRatePerDay = withEquipment
      ? (body.equipmentRatePerDay !== undefined && body.equipmentRatePerDay !== null && body.equipmentRatePerDay !== ""
          ? parseFloat(body.equipmentRatePerDay)
          : existing.equipment_rate_per_day)
      : 0;

    const totalAmount = (ratePerDay + equipmentRatePerDay) * daysAssigned;

    const updated = await db.staffAssignment.update({
      where: { id: assignmentId },
      data: {
        days_assigned: daysAssigned,
        rate_per_day: ratePerDay,
        with_equipment: withEquipment ? 1 : 0,
        equipment_rate_per_day: equipmentRatePerDay,
        total_amount: totalAmount,
        position_name: positionName,
        position_no: positionNo,
      }
    });

    return Response.json({
      id: updated.id,
      staffId: updated.staff_id,
      inquiryId: updated.inquiry_id,
      positionNo: updated.position_no,
      positionName: updated.position_name,
      daysAssigned: updated.days_assigned,
      ratePerDay: updated.rate_per_day,
      withEquipment: updated.with_equipment === 1,
      equipmentRatePerDay: updated.equipment_rate_per_day,
      totalAmount: updated.total_amount,
      isDuplicate: updated.is_duplicate === 1,
      confirmedDup: updated.confirmed_dup === 1,
      createdAt: updated.created_at,
    });
  } catch (err) {
    console.error("[PUT /api/staff-assignments/[id]]", err);
    return Response.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

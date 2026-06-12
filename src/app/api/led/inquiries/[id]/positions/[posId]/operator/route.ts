/**
 * PATCH /api/led/inquiries/[id]/positions/[posId]/operator  — assign/unassign operator for a position
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

function derivePosition(p: {
  id: number;
  inquiry_id: string;
  position_no: number;
  place: string;
  location: string;
  led_type: string;
  target_height_ft: number;
  target_width_ft: number;
  quantity: number;
  cabinet_height_mm: number;
  cabinet_width_mm: number;
  operator_staff_id: number | null;
  operator_source: string | null;
  created_at: string;
  operator_staff?: {
    id: number;
    name: string;
    role: string;
    rate_per_day: number | null;
    staff_type: string;
  } | null;
}) {
  const sqftPerScreen = p.target_height_ft * p.target_width_ft;
  const totalSqft = sqftPerScreen * p.quantity;
  const hCabs = Math.round((p.target_height_ft * 304.8) / p.cabinet_height_mm);
  const wCabs = Math.round((p.target_width_ft * 304.8) / p.cabinet_width_mm);
  const clearHeightMm = hCabs * p.cabinet_height_mm;
  const clearWidthMm = wCabs * p.cabinet_width_mm;

  return {
    id: p.id,
    inquiryId: p.inquiry_id,
    positionNo: p.position_no,
    place: p.place,
    location: p.location,
    ledType: p.led_type,
    targetHeightFt: p.target_height_ft,
    targetWidthFt: p.target_width_ft,
    quantity: p.quantity,
    cabinetHeightMm: p.cabinet_height_mm,
    cabinetWidthMm: p.cabinet_width_mm,
    operatorStaffId: p.operator_staff_id,
    operatorSource: p.operator_source ?? "IN_HOUSE",
    createdAt: p.created_at,
    sqftPerScreen,
    totalSqft,
    hCabs,
    wCabs,
    clearHeightMm,
    clearHeightFt: parseFloat((clearHeightMm / 304.8).toFixed(2)),
    clearWidthMm,
    clearWidthFt: parseFloat((clearWidthMm / 304.8).toFixed(2)),
    operatorStaff: p.operator_staff
      ? {
          id: p.operator_staff.id,
          name: p.operator_staff.name,
          role: p.operator_staff.role,
          ratePerDay: p.operator_staff.rate_per_day,
          staffType: p.operator_staff.staff_type,
        }
      : null,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; posId: string }> }
) {
  try {
    const { id, posId } = await params;
    const pid = parseInt(posId, 10);
    if (isNaN(pid)) {
      return Response.json({ error: "Invalid posId" }, { status: 400 });
    }

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const existing = await db.ledScreenPosition.findUnique({ where: { id: pid } });
    if (!existing || existing.inquiry_id !== id) {
      return Response.json({ error: "Position not found" }, { status: 404 });
    }

    const body = await request.json();
    const { staffId, operatorSource } = body;

    if (operatorSource !== undefined && !["IN_HOUSE", "EXTERNAL"].includes(operatorSource)) {
      return Response.json(
        { error: "operatorSource must be IN_HOUSE or EXTERNAL" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    data.operator_staff_id = staffId === undefined ? existing.operator_staff_id : (staffId ?? null);
    if (operatorSource !== undefined) data.operator_source = operatorSource;

    const updated = await db.ledScreenPosition.update({
      where: { id: pid },
      data,
      include: {
        operator_staff: {
          select: { id: true, name: true, role: true, rate_per_day: true, staff_type: true },
        },
      },
    });

    return Response.json(derivePosition(updated));
  } catch (err) {
    console.error("[PATCH /api/led/inquiries/[id]/positions/[posId]/operator]", err);
    return Response.json({ error: "Failed to update operator" }, { status: 500 });
  }
}

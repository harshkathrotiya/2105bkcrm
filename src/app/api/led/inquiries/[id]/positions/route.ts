/**
 * GET  /api/led/inquiries/[id]/positions  — list all screen positions for an inquiry
 * POST /api/led/inquiries/[id]/positions  — create a new screen position
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
    // derived
    sqftPerScreen,
    totalSqft,
    hCabs,
    wCabs,
    clearHeightMm,
    clearHeightFt: parseFloat((clearHeightMm / 304.8).toFixed(2)),
    clearWidthMm,
    clearWidthFt: parseFloat((clearWidthMm / 304.8).toFixed(2)),
    // operator
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const rawPositions = await db.ledScreenPosition.findMany({
      where: { inquiry_id: id },
      orderBy: { position_no: "asc" },
      include: {
        operator_staff: {
          select: { id: true, name: true, role: true, rate_per_day: true, staff_type: true },
        },
      },
    });

    const positions = rawPositions.map(derivePosition);

    const totalSqftPerDay = positions.reduce((sum, p) => sum + p.totalSqft, 0);
    const places = [...new Set(positions.map((p) => p.place))];

    return Response.json({
      positions,
      summary: {
        totalPositions: positions.length,
        totalSqftPerDay,
        places,
      },
    });
  } catch (err) {
    console.error("[GET /api/led/inquiries/[id]/positions]", err);
    return Response.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      place,
      location,
      ledType,
      targetHeightFt,
      targetWidthFt,
      quantity,
      cabinetHeightMm,
      cabinetWidthMm,
    } = body;

    if (!place || !location || !ledType) {
      return Response.json(
        { error: "place, location, and ledType are required" },
        { status: 400 }
      );
    }
    if (typeof targetHeightFt !== "number" || targetHeightFt <= 0) {
      return Response.json({ error: "targetHeightFt must be > 0" }, { status: 400 });
    }
    if (typeof targetWidthFt !== "number" || targetWidthFt <= 0) {
      return Response.json({ error: "targetWidthFt must be > 0" }, { status: 400 });
    }
    if (typeof quantity !== "number" || quantity < 1) {
      return Response.json({ error: "quantity must be >= 1" }, { status: 400 });
    }

    // Auto-assign positionNo
    let positionNo = body.positionNo;
    if (positionNo === undefined || positionNo === null) {
      const maxRow = await db.ledScreenPosition.findFirst({
        where: { inquiry_id: id },
        orderBy: { position_no: "desc" },
        select: { position_no: true },
      });
      positionNo = (maxRow?.position_no ?? 0) + 1;
    }

    const created = await db.ledScreenPosition.create({
      data: {
        inquiry_id: id,
        position_no: positionNo,
        place: String(place).trim(),
        location: String(location).trim(),
        led_type: ledType,
        target_height_ft: targetHeightFt,
        target_width_ft: targetWidthFt,
        quantity,
        cabinet_height_mm: typeof cabinetHeightMm === "number" ? cabinetHeightMm : 576,
        cabinet_width_mm: typeof cabinetWidthMm === "number" ? cabinetWidthMm : 576,
        created_at: new Date().toISOString(),
      },
      include: {
        operator_staff: {
          select: { id: true, name: true, role: true, rate_per_day: true, staff_type: true },
        },
      },
    });

    return Response.json(derivePosition(created), { status: 201 });
  } catch (err) {
    console.error("[POST /api/led/inquiries/[id]/positions]", err);
    return Response.json({ error: "Failed to create position" }, { status: 500 });
  }
}

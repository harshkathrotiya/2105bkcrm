/**
 * PATCH /api/led/inquiries/[id]/execution/status  — upsert a day status for a position
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

const VALID_STATUSES = ["OFF", "SETUP", "LIVE", "ISSUE"] as const;

export async function PATCH(
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
    const { positionNo, dayIndex, status, notes } = body;

    if (typeof positionNo !== "number") {
      return Response.json({ error: "positionNo is required" }, { status: 400 });
    }
    if (typeof dayIndex !== "number") {
      return Response.json({ error: "dayIndex is required" }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return Response.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const dayStatus = await db.ledDayStatus.upsert({
      where: {
        inquiry_id_position_no_day_index: {
          inquiry_id: id,
          position_no: positionNo,
          day_index: dayIndex,
        },
      },
      create: {
        inquiry_id: id,
        position_no: positionNo,
        day_index: dayIndex,
        status,
        notes: notes ?? "",
        day_done: false,
      },
      update: {
        status,
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    return Response.json({
      id: dayStatus.id,
      inquiryId: dayStatus.inquiry_id,
      positionNo: dayStatus.position_no,
      dayIndex: dayStatus.day_index,
      status: dayStatus.status,
      notes: dayStatus.notes,
      dayDone: dayStatus.day_done,
    });
  } catch (err) {
    console.error("[PATCH /api/led/inquiries/[id]/execution/status]", err);
    return Response.json({ error: "Failed to update day status" }, { status: 500 });
  }
}

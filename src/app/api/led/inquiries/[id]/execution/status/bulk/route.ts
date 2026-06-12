/**
 * POST /api/led/inquiries/[id]/execution/status/bulk  — set all positions to LIVE for a day
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

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
    const { dayIndex } = body;

    if (typeof dayIndex !== "number") {
      return Response.json({ error: "dayIndex is required" }, { status: 400 });
    }

    const positions = await db.ledScreenPosition.findMany({
      where: { inquiry_id: id },
      select: { position_no: true },
    });

    if (positions.length === 0) {
      return Response.json({ updated: 0 });
    }

    await db.$transaction(
      positions.map((p) =>
        db.ledDayStatus.upsert({
          where: {
            inquiry_id_position_no_day_index: {
              inquiry_id: id,
              position_no: p.position_no,
              day_index: dayIndex,
            },
          },
          create: {
            inquiry_id: id,
            position_no: p.position_no,
            day_index: dayIndex,
            status: "LIVE",
            notes: "",
            day_done: false,
          },
          update: {
            status: "LIVE",
          },
        })
      )
    );

    return Response.json({ updated: positions.length });
  } catch (err) {
    console.error("[POST /api/led/inquiries/[id]/execution/status/bulk]", err);
    return Response.json({ error: "Failed to bulk update statuses" }, { status: 500 });
  }
}

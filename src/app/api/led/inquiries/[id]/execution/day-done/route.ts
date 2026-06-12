/**
 * POST /api/led/inquiries/[id]/execution/day-done  — toggle day_done for all statuses on a day
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

    const existing = await db.ledDayStatus.findMany({
      where: { inquiry_id: id, day_index: dayIndex },
    });

    if (existing.length === 0) {
      // No rows yet — create a single marker row (positionNo=0) with day_done=true
      const marker = await db.ledDayStatus.create({
        data: {
          inquiry_id: id,
          position_no: 0,
          day_index: dayIndex,
          status: "OFF",
          notes: "",
          day_done: true,
        },
      });
      return Response.json({ dayIndex, dayDone: marker.day_done });
    }

    // Toggle: use the current value of the first row to determine target
    const currentDone = existing[0].day_done;
    const newDone = !currentDone;

    await db.$transaction(
      existing.map((row) =>
        db.ledDayStatus.update({
          where: { id: row.id },
          data: { day_done: newDone },
        })
      )
    );

    return Response.json({ dayIndex, dayDone: newDone });
  } catch (err) {
    console.error("[POST /api/led/inquiries/[id]/execution/day-done]", err);
    return Response.json({ error: "Failed to toggle day done" }, { status: 500 });
  }
}

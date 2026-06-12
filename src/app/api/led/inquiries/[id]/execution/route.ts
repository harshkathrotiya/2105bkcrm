/**
 * GET /api/led/inquiries/[id]/execution  — full execution view for an inquiry
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

function daysBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
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

    const eventDays = daysBetween(inquiry.start_date, inquiry.end_date);

    const [rawPositions, rawDayStatuses, rawIssues, rawLogs] = await Promise.all([
      db.ledScreenPosition.findMany({
        where: { inquiry_id: id },
        orderBy: { position_no: "asc" },
        select: {
          id: true,
          position_no: true,
          place: true,
          location: true,
          led_type: true,
          target_height_ft: true,
          target_width_ft: true,
          quantity: true,
        },
      }),
      db.ledDayStatus.findMany({ where: { inquiry_id: id } }),
      db.ledIssueLog.findMany({
        where: { inquiry_id: id },
        orderBy: { logged_at: "desc" },
      }),
      db.ledOperationsLog.findMany({
        where: { inquiry_id: id },
        orderBy: { logged_at: "desc" },
      }),
    ]);

    return Response.json({
      eventDays,
      startDate: inquiry.start_date,
      endDate: inquiry.end_date,
      positions: rawPositions.map((p) => ({
        id: p.id,
        positionNo: p.position_no,
        place: p.place,
        location: p.location,
        ledType: p.led_type,
        targetHeightFt: p.target_height_ft,
        targetWidthFt: p.target_width_ft,
        quantity: p.quantity,
      })),
      dayStatuses: rawDayStatuses.map((s) => ({
        id: s.id,
        inquiryId: s.inquiry_id,
        positionNo: s.position_no,
        dayIndex: s.day_index,
        status: s.status,
        notes: s.notes,
        dayDone: s.day_done,
      })),
      issues: rawIssues.map((i) => ({
        id: i.id,
        inquiryId: i.inquiry_id,
        text: i.text,
        loggedAt: i.logged_at,
      })),
      logs: rawLogs.map((l) => ({
        id: l.id,
        inquiryId: l.inquiry_id,
        logTime: l.log_time,
        text: l.text,
        loggedAt: l.logged_at,
      })),
    });
  } catch (err) {
    console.error("[GET /api/led/inquiries/[id]/execution]", err);
    return Response.json({ error: "Failed to fetch execution view" }, { status: 500 });
  }
}

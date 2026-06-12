/**
 * POST /api/led/inquiries/[id]/execution/logs  — create an operations log entry
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

function formatHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const now = new Date();
    const log = await db.ledOperationsLog.create({
      data: {
        inquiry_id: id,
        log_time: formatHHMM(now),
        text: text.trim(),
        logged_at: now.toISOString(),
      },
    });

    return Response.json(
      {
        id: log.id,
        inquiryId: log.inquiry_id,
        logTime: log.log_time,
        text: log.text,
        loggedAt: log.logged_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/led/inquiries/[id]/execution/logs]", err);
    return Response.json({ error: "Failed to create operations log" }, { status: 500 });
  }
}

/**
 * POST /api/led/inquiries/[id]/execution/issues  — log an issue
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
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const issue = await db.ledIssueLog.create({
      data: {
        inquiry_id: id,
        text: text.trim(),
        logged_at: new Date().toISOString(),
      },
    });

    return Response.json(
      {
        id: issue.id,
        inquiryId: issue.inquiry_id,
        text: issue.text,
        loggedAt: issue.logged_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/led/inquiries/[id]/execution/issues]", err);
    return Response.json({ error: "Failed to create issue log" }, { status: 500 });
  }
}

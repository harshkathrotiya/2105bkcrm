/**
 * DELETE /api/led/inquiries/[id]/execution/issues/[issueId]  — delete an issue log
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  try {
    const { id, issueId } = await params;
    const iid = parseInt(issueId, 10);
    if (isNaN(iid)) {
      return Response.json({ error: "Invalid issueId" }, { status: 400 });
    }

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const issue = await db.ledIssueLog.findUnique({ where: { id: iid } });
    if (!issue || issue.inquiry_id !== id) {
      return Response.json({ error: "Issue log not found" }, { status: 404 });
    }

    await db.ledIssueLog.delete({ where: { id: iid } });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/led/inquiries/[id]/execution/issues/[issueId]]", err);
    return Response.json({ error: "Failed to delete issue log" }, { status: 500 });
  }
}

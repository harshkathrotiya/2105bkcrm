import type { NextRequest } from "next/server";
import { confirmDuplicate } from "@/lib/queries/staff";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId || isNaN(Number(assignmentId)) || Number(assignmentId) <= 0) {
      return Response.json({ error: "assignmentId must be a positive integer" }, { status: 400 });
    }

    const res = confirmDuplicate(parseInt(assignmentId, 10));
    if (!res) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error("[POST /api/staff-assignments/confirm-duplicate]", err);
    return Response.json({ error: "Failed to confirm duplicate assignment" }, { status: 500 });
  }
}

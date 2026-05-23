import type { NextRequest } from "next/server";
import { confirmDuplicate } from "@/lib/queries/staff";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return Response.json({ error: "assignmentId is required" }, { status: 400 });
    }

    const res = confirmDuplicate(parseInt(assignmentId, 10));
    return Response.json({ success: res });
  } catch (err) {
    console.error("[POST /api/staff-assignments/confirm-duplicate]", err);
    return Response.json({ error: "Failed to confirm duplicate assignment" }, { status: 500 });
  }
}

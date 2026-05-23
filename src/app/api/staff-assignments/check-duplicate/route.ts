import type { NextRequest } from "next/server";
import { checkDuplicateAssignment } from "@/lib/queries/staff";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inquiryId, staffId } = body;

    if (!inquiryId || typeof inquiryId !== "string" || !inquiryId.trim()) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }
    if (!staffId || isNaN(Number(staffId)) || Number(staffId) <= 0) {
      return Response.json({ error: "staffId must be a positive integer" }, { status: 400 });
    }

    const res = await checkDuplicateAssignment(inquiryId.trim(), parseInt(staffId, 10));
    return Response.json(res);
  } catch (err) {
    console.error("[POST /api/staff-assignments/check-duplicate]", err);
    return Response.json({ error: "Failed to check duplicate assignment" }, { status: 500 });
  }
}

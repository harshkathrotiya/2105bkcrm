import type { NextRequest } from "next/server";
import { checkDuplicateAssignment } from "@/lib/queries/staff";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inquiryId, staffId } = body;

    if (!inquiryId || !staffId) {
      return Response.json({ error: "inquiryId and staffId are required" }, { status: 400 });
    }

    const res = checkDuplicateAssignment(inquiryId, parseInt(staffId, 10));
    return Response.json(res);
  } catch (err) {
    console.error("[POST /api/staff-assignments/check-duplicate]", err);
    return Response.json({ error: "Failed to check duplicate assignment" }, { status: 500 });
  }
}

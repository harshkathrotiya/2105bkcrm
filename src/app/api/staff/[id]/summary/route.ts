import type { NextRequest } from "next/server";
import { getStaffYtdSummary } from "@/lib/queries/staff";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const summary = getStaffYtdSummary(parseInt(id, 10));
    return Response.json(summary);
  } catch (err) {
    console.error("[GET /api/staff/[id]/summary]", err);
    return Response.json({ error: "Failed to fetch staff summary" }, { status: 500 });
  }
}

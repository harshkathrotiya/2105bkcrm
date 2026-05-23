import type { NextRequest } from "next/server";
import { getStaffHistory } from "@/lib/queries/staff";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = getStaffHistory(parseInt(id, 10));
    return Response.json(history);
  } catch (err) {
    console.error("[GET /api/staff/[id]/history]", err);
    return Response.json({ error: "Failed to fetch staff history" }, { status: 500 });
  }
}

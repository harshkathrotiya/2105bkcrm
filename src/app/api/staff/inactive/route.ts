import type { NextRequest } from "next/server";
import { getAllStaffIncludingInactive } from "@/lib/queries/staff";

export async function GET(_req: NextRequest) {
  try {
    const staff = getAllStaffIncludingInactive();
    return Response.json(staff);
  } catch (err) {
    console.error("[GET /api/staff/inactive]", err);
    return Response.json({ error: "Failed to fetch inactive staff" }, { status: 500 });
  }
}

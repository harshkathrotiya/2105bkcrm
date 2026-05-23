import type { NextRequest } from "next/server";
import { getStaffAvailability } from "@/lib/queries/staff";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const role = searchParams.get("role") || undefined;

    if (!startDate || !endDate) {
      return Response.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const availability = await getStaffAvailability(startDate, endDate, role);
    return Response.json(availability);
  } catch (err) {
    console.error("[GET /api/staff/availability]", err);
    return Response.json({ error: "Failed to check availability" }, { status: 500 });
  }
}

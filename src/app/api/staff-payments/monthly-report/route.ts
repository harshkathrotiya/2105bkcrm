import type { NextRequest } from "next/server";
import { getMonthlyReport } from "@/lib/queries/staff";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month"); // e.g. "2026-05"

    if (!month) {
      return Response.json({ error: "month parameter is required (YYYY-MM)" }, { status: 400 });
    }

    const report = getMonthlyReport(month);
    return Response.json(report);
  } catch (err) {
    console.error("[GET /api/staff-payments/monthly-report]", err);
    return Response.json({ error: "Failed to fetch monthly report" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { getExpenseReport } from "@/lib/queries/reports";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get("inquiryId");

    if (!inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }

    const report = await getExpenseReport(inquiryId);
    if (!report) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    return Response.json(report);
  } catch (err) {
    console.error("[GET /api/reports/expense]", err);
    return Response.json({ error: "Failed to generate expense report" }, { status: 500 });
  }
}

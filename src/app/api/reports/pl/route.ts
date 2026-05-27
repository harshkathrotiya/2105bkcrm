import type { NextRequest } from "next/server";
import { getPLReport } from "@/lib/queries/reports";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get("inquiryId");

    if (!inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }

    const report = await getPLReport(inquiryId);
    if (!report) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    return Response.json(report);
  } catch (err) {
    console.error("[GET /api/reports/pl]", err);
    return Response.json({ error: "Failed to generate P&L report" }, { status: 500 });
  }
}

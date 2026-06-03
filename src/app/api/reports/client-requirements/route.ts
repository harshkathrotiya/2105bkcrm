import type { NextRequest } from "next/server";
import { getClientRequirements, updateClientRequirements } from "@/lib/queries/reports";
import { Validator } from "@/lib/validate";
import { requirePermission } from "@/lib/role-permissions";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get("inquiryId");

    if (!inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }

    const report = await getClientRequirements(inquiryId);
    if (!report) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    return Response.json(report);
  } catch (err) {
    console.error("[GET /api/reports/client-requirements]", err);
    return Response.json({ error: "Failed to fetch client requirements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "reports.view");
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    const { inquiryId, powerRequirements, tablesSpace, otherRequirements } = body;

    if (!inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }

    const v = new Validator(body);
    if (powerRequirements !== undefined) v.maxLength("powerRequirements", 1000);
    if (tablesSpace !== undefined) v.maxLength("tablesSpace", 1000);
    if (otherRequirements !== undefined) v.maxLength("otherRequirements", 1000);
    if (v.hasErrors()) return v.response();

    await updateClientRequirements(inquiryId, {
      powerRequirements,
      tablesSpace,
      otherRequirements,
    });

    const updated = await getClientRequirements(inquiryId);
    return Response.json(updated);
  } catch (err) {
    console.error("[POST /api/reports/client-requirements]", err);
    return Response.json({ error: "Failed to update client requirements" }, { status: 500 });
  }
}

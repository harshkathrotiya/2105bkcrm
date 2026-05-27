import type { NextRequest } from "next/server";
import { getStaffBrief } from "@/lib/queries/reports";
import { sendWhatsAppBrief } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get("inquiryId");
    const staffIdStr = searchParams.get("staffId");

    if (!inquiryId || !staffIdStr) {
      return Response.json({ error: "inquiryId and staffId are required" }, { status: 400 });
    }

    const staffId = parseInt(staffIdStr, 10);
    if (isNaN(staffId) || staffId <= 0) {
      return Response.json({ error: "staffId must be a positive integer" }, { status: 400 });
    }

    const brief = await getStaffBrief(inquiryId, staffId);
    if (!brief) {
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }

    return Response.json(brief);
  } catch (err) {
    console.error("[GET /api/reports/staff-brief]", err);
    return Response.json({ error: "Failed to generate staff brief" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inquiryId, staffId, messageText } = body;

    if (!inquiryId || !staffId || !messageText) {
      return Response.json({ error: "inquiryId, staffId, and messageText are required" }, { status: 400 });
    }

    const brief = await getStaffBrief(inquiryId, parseInt(staffId, 10));
    if (!brief) {
      return Response.json({ error: "Staff/Event brief not found" }, { status: 404 });
    }

    // Call WhatsApp simulator
    const success = await sendWhatsAppBrief(brief.staff.name, brief.staff.phone, messageText);
    
    if (!success) {
      return Response.json({ error: "Failed to send WhatsApp broadcast simulation" }, { status: 500 });
    }

    return Response.json({ success: true, message: "WhatsApp message successfully sent via simulation!" });
  } catch (err) {
    console.error("[POST /api/reports/staff-brief]", err);
    return Response.json({ error: "Failed to execute WhatsApp broadcast simulation" }, { status: 500 });
  }
}

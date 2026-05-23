import type { NextRequest } from "next/server";
import { recordStaffPayment } from "@/lib/queries/staff";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payments } = body;

    if (!Array.isArray(payments)) {
      return Response.json({ error: "payments array is required" }, { status: 400 });
    }

    const recorded: any[] = [];
    db.transaction(() => {
      for (const p of payments) {
        if (!p.staffId || !p.amount || !p.paymentType || !p.paymentMethod) {
          throw new Error("Missing required payment fields");
        }
        const pay = recordStaffPayment({
          staffId: parseInt(p.staffId, 10),
          assignmentId: p.assignmentId ? parseInt(p.assignmentId, 10) : null,
          inquiryId: p.inquiryId || null,
          amount: parseFloat(p.amount),
          paymentType: p.paymentType,
          paymentMethod: p.paymentMethod,
          referenceNo: p.referenceNo || null,
          month: p.month || null,
          notes: p.notes || null,
        });
        recorded.push(pay);
      }
    })();

    return Response.json({ success: true, count: recorded.length, payments: recorded }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/staff-payments/bulk]", err);
    return Response.json({ error: err.message || "Failed to record bulk payments" }, { status: 500 });
  }
}

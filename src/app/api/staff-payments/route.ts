import type { NextRequest } from "next/server";
import { recordStaffPayment } from "@/lib/queries/staff";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, assignmentId, inquiryId, amount, paymentType, paymentMethod, referenceNo, month, notes } = body;

    if (!staffId || !amount || !paymentType || !paymentMethod) {
      return Response.json({ error: "staffId, amount, paymentType, and paymentMethod are required" }, { status: 400 });
    }

    const payment = recordStaffPayment({
      staffId: parseInt(staffId, 10),
      assignmentId: assignmentId ? parseInt(assignmentId, 10) : null,
      inquiryId: inquiryId || null,
      amount: parseFloat(amount),
      paymentType,
      paymentMethod,
      referenceNo: referenceNo || null,
      month: month || null,
      notes: notes || null,
    });

    return Response.json(payment, { status: 201 });
  } catch (err) {
    console.error("[POST /api/staff-payments]", err);
    return Response.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

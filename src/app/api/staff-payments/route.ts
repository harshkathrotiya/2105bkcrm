import type { NextRequest } from "next/server";
import { recordStaffPayment, getStaffPayments } from "@/lib/queries/staff";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get("inquiryId") || undefined;
    const month = searchParams.get("month") || undefined;
    const status = (searchParams.get("status") as "PENDING" | "PAID" | null) || undefined;
    const staffIdStr = searchParams.get("staffId");
    const staffId = staffIdStr ? parseInt(staffIdStr, 10) : undefined;

    const payments = getStaffPayments({ inquiryId, month, status, staffId });
    return Response.json(payments);
  } catch (err) {
    console.error("[GET /api/staff-payments]", err);
    return Response.json({ error: "Failed to fetch staff payments" }, { status: 500 });
  }
}

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

import type { NextRequest } from "next/server";
import { recordStaffPayment, getStaffPayments } from "@/lib/queries/staff";
import { Validator, PAYMENT_METHODS, STAFF_PAYMENT_TYPES } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get("inquiryId") || undefined;
    const month = searchParams.get("month") || undefined;
    const status = (searchParams.get("status") as "PENDING" | "PAID" | null) || undefined;
    const staffIdStr = searchParams.get("staffId");
    const staffId = staffIdStr ? parseInt(staffIdStr, 10) : undefined;

    // Validate query params
    if (month) {
      const v = new Validator({ month });
      v.yearMonth("month");
      if (v.hasErrors()) return v.response();
    }
    if (staffIdStr && (isNaN(Number(staffIdStr)) || Number(staffIdStr) <= 0)) {
      return Response.json({ error: "staffId must be a positive integer" }, { status: 400 });
    }
    if (status && !["PENDING", "PAID"].includes(status)) {
      return Response.json({ error: "status must be PENDING or PAID" }, { status: 400 });
    }

    const payments = await getStaffPayments({ inquiryId, month, status, staffId });
    return Response.json(payments);
  } catch (err) {
    console.error("[GET /api/staff-payments]", err);
    return Response.json({ error: "Failed to fetch staff payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const v = new Validator(body);
    v.required("staffId", "staff ID").positiveInteger("staffId", "staff ID");
    v.required("amount").positiveNumber("amount");
    v.required("paymentType", "payment type").oneOf("paymentType", STAFF_PAYMENT_TYPES, "payment type");
    v.required("paymentMethod", "payment method").oneOf("paymentMethod", PAYMENT_METHODS, "payment method");

    // MONTHLY_SALARY requires a month field
    if (body.paymentType === "MONTHLY_SALARY") {
      v.required("month").yearMonth("month");
    }
    // PER_EVENT requires an assignmentId
    if (body.paymentType === "PER_EVENT") {
      if (!body.assignmentId) {
        return Response.json({ error: "assignmentId is required for PER_EVENT payments" }, { status: 400 });
      }
    }

    if (body.referenceNo !== undefined && body.referenceNo) v.maxLength("referenceNo", 100, "reference number");
    if (body.notes !== undefined && body.notes) v.maxLength("notes", 500);
    if (v.hasErrors()) return v.response();

    const payment = await recordStaffPayment({
      staffId: parseInt(body.staffId, 10),
      assignmentId: body.assignmentId ? parseInt(body.assignmentId, 10) : null,
      inquiryId: body.inquiryId || null,
      amount: parseFloat(body.amount),
      paymentType: body.paymentType,
      paymentMethod: body.paymentMethod,
      referenceNo: body.referenceNo?.trim() || null,
      month: body.month || null,
      notes: body.notes?.trim() || null,
    });

    return Response.json(payment, { status: 201 });
  } catch (err) {
    console.error("[POST /api/staff-payments]", err);
    return Response.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

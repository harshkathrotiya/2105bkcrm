import type { NextRequest } from "next/server";
import { recordStaffPayment } from "@/lib/queries/staff";
import { db } from "@/lib/db";
import { PAYMENT_METHODS, STAFF_PAYMENT_TYPES } from "@/lib/validate";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payments } = body;

    if (!Array.isArray(payments) || payments.length === 0) {
      return Response.json({ error: "payments must be a non-empty array" }, { status: 400 });
    }

    // Validate every item before touching the DB
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      const prefix = `payments[${i}]`;

      if (!p.staffId || isNaN(Number(p.staffId)) || Number(p.staffId) <= 0) {
        return Response.json({ error: `${prefix}.staffId must be a positive integer` }, { status: 400 });
      }
      if (!p.amount || isNaN(Number(p.amount)) || Number(p.amount) <= 0) {
        return Response.json({ error: `${prefix}.amount must be a positive number` }, { status: 400 });
      }
      if (!p.paymentType || !(STAFF_PAYMENT_TYPES as readonly string[]).includes(p.paymentType)) {
        return Response.json({
          error: `${prefix}.paymentType must be one of: ${STAFF_PAYMENT_TYPES.join(", ")}`,
        }, { status: 400 });
      }
      if (!p.paymentMethod || !(PAYMENT_METHODS as readonly string[]).includes(p.paymentMethod)) {
        return Response.json({
          error: `${prefix}.paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}`,
        }, { status: 400 });
      }
      if (p.paymentType === "MONTHLY_SALARY" && !p.month) {
        return Response.json({ error: `${prefix}.month is required for MONTHLY_SALARY payments` }, { status: 400 });
      }
      if (p.paymentType === "MONTHLY_SALARY" && p.month && !/^\d{4}-\d{2}$/.test(p.month)) {
        return Response.json({ error: `${prefix}.month must be in YYYY-MM format` }, { status: 400 });
      }
      if (p.paymentType === "PER_EVENT" && !p.assignmentId) {
        return Response.json({ error: `${prefix}.assignmentId is required for PER_EVENT payments` }, { status: 400 });
      }
    }

    const recorded: any[] = [];
    db.transaction(() => {
      for (const p of payments) {
        const pay = recordStaffPayment({
          staffId: parseInt(p.staffId, 10),
          assignmentId: p.assignmentId ? parseInt(p.assignmentId, 10) : null,
          inquiryId: p.inquiryId || null,
          amount: parseFloat(p.amount),
          paymentType: p.paymentType,
          paymentMethod: p.paymentMethod,
          referenceNo: p.referenceNo?.trim() || null,
          month: p.month || null,
          notes: p.notes?.trim() || null,
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

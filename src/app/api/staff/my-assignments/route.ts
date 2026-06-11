import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("bk-media-session")?.value;
    if (!token) return Response.json({ error: "Unauthenticated" }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return Response.json({ error: "Unauthenticated" }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.is_active) return Response.json({ error: "User not found" }, { status: 404 });
    if (user.role !== "Staff") return Response.json({ error: "Forbidden" }, { status: 403 });

    const staffId = (user as any).staff_id;
    if (!staffId) return Response.json([], { status: 200 });

    const assignments = await db.staffAssignment.findMany({
      where: { staff_id: staffId },
      include: {
        inquiry: {
          select: {
            id: true,
            event_name: true,
            event_type: true,
            venue: true,
            start_date: true,
            end_date: true,
            start_time: true,
            end_time: true,
            status: true,
            department: true,
          },
        },
        payments: {
          select: { id: true, amount: true, payment_method: true, paid_at: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const result = assignments.map((a) => {
      const paid = a.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        id: a.id,
        positionName: a.position_name,
        daysAssigned: a.days_assigned,
        ratePerDay: a.rate_per_day,
        withEquipment: a.with_equipment === 1,
        equipmentRatePerDay: a.equipment_rate_per_day,
        totalAmount: a.total_amount,
        reportingTime: a.reporting_time,
        paidAmount: paid,
        pendingAmount: Math.max(0, a.total_amount - paid),
        inquiry: a.inquiry,
      };
    });

    return Response.json(result);
  } catch (err) {
    console.error("[GET /api/staff/my-assignments]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = parseInt(id, 10);
    const body = await request.json();

    // Verify assignment exists
    const existing = db
      .prepare("SELECT * FROM staff_assignments WHERE id = ?")
      .get(assignmentId) as any;

    if (!existing) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Build update fields — only allow patching days_assigned, rate_per_day, position_name, position_no
    const daysAssigned =
      body.daysAssigned !== undefined
        ? parseInt(body.daysAssigned, 10)
        : existing.days_assigned;

    const ratePerDay =
      body.ratePerDay !== undefined
        ? parseFloat(body.ratePerDay)
        : existing.rate_per_day;

    const positionName =
      body.positionName !== undefined ? body.positionName : existing.position_name;

    const positionNo =
      body.positionNo !== undefined
        ? body.positionNo !== null
          ? parseInt(body.positionNo, 10)
          : null
        : existing.position_no;

    const totalAmount = ratePerDay * daysAssigned;

    db.prepare(`
      UPDATE staff_assignments
      SET days_assigned = @daysAssigned,
          rate_per_day  = @ratePerDay,
          total_amount  = @totalAmount,
          position_name = @positionName,
          position_no   = @positionNo
      WHERE id = @id
    `).run({ id: assignmentId, daysAssigned, ratePerDay, totalAmount, positionName, positionNo });

    const updated = db
      .prepare("SELECT * FROM staff_assignments WHERE id = ?")
      .get(assignmentId) as any;

    return Response.json({
      id: updated.id,
      staffId: updated.staff_id,
      inquiryId: updated.inquiry_id,
      positionNo: updated.position_no,
      positionName: updated.position_name,
      daysAssigned: updated.days_assigned,
      ratePerDay: updated.rate_per_day,
      totalAmount: updated.total_amount,
      isDuplicate: updated.is_duplicate === 1,
      confirmedDup: updated.confirmed_dup === 1,
      createdAt: updated.created_at,
    });
  } catch (err) {
    console.error("[PUT /api/staff-assignments/[id]]", err);
    return Response.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

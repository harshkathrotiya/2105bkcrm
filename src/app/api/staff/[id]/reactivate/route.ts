import type { NextRequest } from "next/server";
import { reactivateStaff } from "@/lib/queries/staff";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/role-permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "staff.edit");
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const staffId = parseInt(id, 10);

    // Check if staff exists (including inactive)
    const existing = await db.staff.findUnique({
      where: { id: staffId },
      select: { id: true, is_active: true }
    });

    if (!existing) {
      return Response.json({ error: "Staff not found" }, { status: 404 });
    }

    if (existing.is_active === 1) {
      return Response.json({ error: "Staff is already active" }, { status: 400 });
    }

    const success = await reactivateStaff(staffId);
    if (!success) {
      return Response.json({ error: "Failed to reactivate staff" }, { status: 500 });
    }

    return Response.json({ success: true, message: "Staff reactivated successfully" });
  } catch (err) {
    console.error("[POST /api/staff/[id]/reactivate]", err);
    return Response.json({ error: "Failed to reactivate staff" }, { status: 500 });
  }
}

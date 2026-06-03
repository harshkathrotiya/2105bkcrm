/**
 * DELETE /api/calendar/[id]  — remove a calendar event
 */

import type { NextRequest } from "next/server";
import { deleteCalendarEvent } from "@/lib/queries/calendar";
import { requirePermission } from "@/lib/role-permissions";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "calendar.view");
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const deleted = await deleteCalendarEvent(id);
    if (!deleted) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/calendar/[id]]", err);
    return Response.json(
      { error: "Failed to delete calendar event" },
      { status: 500 }
    );
  }
}

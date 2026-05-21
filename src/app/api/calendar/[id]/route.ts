/**
 * DELETE /api/calendar/[id]  — remove a calendar event
 */

import type { NextRequest } from "next/server";
import { deleteCalendarEvent } from "@/lib/queries/calendar";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteCalendarEvent(id);
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

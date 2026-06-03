import type { NextRequest } from "next/server";
import { deleteCalendarEventsBulk } from "@/lib/queries/calendar";
import { requirePermission } from "@/lib/role-permissions";

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "calendar.view");
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "ids must be a non-empty array of strings" }, { status: 400 });
    }

    for (let i = 0; i < ids.length; i++) {
      if (typeof ids[i] !== "string" || ids[i].trim() === "") {
        return Response.json({ error: `ids[${i}] must be a non-empty string` }, { status: 400 });
      }
    }

    const deleted = await deleteCalendarEventsBulk(ids);
    if (!deleted) {
      return Response.json({ error: "Failed to delete calendar events" }, { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[POST /api/calendar/bulk-delete]", err);
    return Response.json({ error: "Failed to delete calendar events in bulk" }, { status: 500 });
  }
}

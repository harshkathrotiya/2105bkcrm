import type { NextRequest } from "next/server";
import { createCalendarEventsBulk } from "@/lib/queries/calendar";
import { generateId } from "@/lib/types";
import { Validator, CALENDAR_TYPES } from "@/lib/validate";
import { requirePermission } from "@/lib/role-permissions";

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "calendar.view");
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return Response.json({ error: "events must be a non-empty array" }, { status: 400 });
    }

    // Validate every event before database insertion
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const prefix = `events[${i}]`;
      const v = new Validator(e);
      v.required("date").integer("date").positiveInteger("date");
      v.required("month").integer("month");
      v.required("year").integer("year");
      v.required("label").minLength("label", 1).maxLength("label", 200);
      v.required("type").oneOf("type", CALENDAR_TYPES);
      if (v.hasErrors()) {
        return Response.json({ error: `${prefix}: ${v.firstError()}` }, { status: 400 });
      }

      const date = Number(e.date);
      const month = Number(e.month);
      const year = Number(e.year);

      if (date < 1 || date > 31) {
        return Response.json({ error: `${prefix}: date must be between 1 and 31` }, { status: 400 });
      }
      if (month < 0 || month > 11) {
        return Response.json({ error: `${prefix}: month must be between 0 and 11` }, { status: 400 });
      }
      if (year < 2000 || year > 2100) {
        return Response.json({ error: `${prefix}: year must be a valid 4-digit year` }, { status: 400 });
      }
    }

    const formattedEvents = events.map((e) => ({
      id: e.id ?? `cal-${generateId()}`,
      date: Number(e.date),
      month: Number(e.month),
      year: Number(e.year),
      label: e.label.trim(),
      type: e.type as "inquiry" | "quotation" | "confirmed" | "completed",
    }));

    const result = await createCalendarEventsBulk(formattedEvents);
    return Response.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/calendar/bulk]", err);
    return Response.json({ error: "Failed to create calendar events in bulk" }, { status: 500 });
  }
}

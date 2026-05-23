/**
 * GET  /api/calendar                        — all events
 * GET  /api/calendar?month=5&year=2026      — filter by month/year
 * POST /api/calendar                        — create a calendar event
 */

import type { NextRequest } from "next/server";
import {
  getAllCalendarEvents,
  getCalendarEventsByMonth,
  createCalendarEvent,
} from "@/lib/queries/calendar";
import { generateId } from "@/lib/types";
import { Validator, CALENDAR_TYPES } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const monthParam = sp.get("month");
    const yearParam = sp.get("year");

    if (monthParam !== null || yearParam !== null) {
      if (!monthParam || !yearParam) {
        return Response.json({ error: "Both month and year are required together" }, { status: 400 });
      }
      const month = parseInt(monthParam, 10);
      const year = parseInt(yearParam, 10);
      if (isNaN(month) || month < 0 || month > 11) {
        return Response.json({ error: "month must be an integer between 0 and 11" }, { status: 400 });
      }
      if (isNaN(year) || year < 2000 || year > 2100) {
        return Response.json({ error: "year must be a valid 4-digit year" }, { status: 400 });
      }
      const events = getCalendarEventsByMonth(month, year);
      return Response.json(events);
    }

    const events = getAllCalendarEvents();
    return Response.json(events);
  } catch (err) {
    console.error("[GET /api/calendar]", err);
    return Response.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const v = new Validator(body);
    v.required("date").integer("date").positiveInteger("date");
    v.required("month").integer("month");
    v.required("year").integer("year");
    v.required("label").minLength("label", 1).maxLength("label", 200);
    v.required("type").oneOf("type", CALENDAR_TYPES);
    if (v.hasErrors()) return v.response();

    const date = Number(body.date);
    const month = Number(body.month);
    const year = Number(body.year);

    if (date < 1 || date > 31) {
      return Response.json({ error: "date must be between 1 and 31" }, { status: 400 });
    }
    if (month < 0 || month > 11) {
      return Response.json({ error: "month must be between 0 and 11" }, { status: 400 });
    }
    if (year < 2000 || year > 2100) {
      return Response.json({ error: "year must be a valid 4-digit year" }, { status: 400 });
    }

    const event = createCalendarEvent({
      id: body.id ?? `cal-${generateId()}`,
      date,
      month,
      year,
      label: body.label.trim(),
      type: body.type,
    });

    return Response.json(event, { status: 201 });
  } catch (err) {
    console.error("[POST /api/calendar]", err);
    return Response.json({ error: "Failed to create calendar event" }, { status: 500 });
  }
}

/**
 * GET  /api/calendar             — all events
 * GET  /api/calendar?month=5&year=2026  — filter by month/year
 * POST /api/calendar             — create a calendar event
 */

import type { NextRequest } from "next/server";
import {
  getAllCalendarEvents,
  getCalendarEventsByMonth,
  createCalendarEvent,
} from "@/lib/queries/calendar";
import { generateId } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const monthParam = sp.get("month");
    const yearParam = sp.get("year");

    if (monthParam && yearParam) {
      const month = parseInt(monthParam, 10);
      const year = parseInt(yearParam, 10);
      if (isNaN(month) || isNaN(year)) {
        return Response.json(
          { error: "month and year must be integers" },
          { status: 400 }
        );
      }
      const events = getCalendarEventsByMonth(month, year);
      return Response.json(events);
    }

    const events = getAllCalendarEvents();
    return Response.json(events);
  } catch (err) {
    console.error("[GET /api/calendar]", err);
    return Response.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.date || !body.month || !body.year) {
      return Response.json(
        { error: "date, month, and year are required" },
        { status: 400 }
      );
    }
    if (!body.label?.trim()) {
      return Response.json({ error: "label is required" }, { status: 400 });
    }
    const validTypes = ["inquiry", "quotation", "confirmed"];
    if (!validTypes.includes(body.type)) {
      return Response.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const event = createCalendarEvent({
      id: body.id ?? `cal-${generateId()}`,
      date: Number(body.date),
      month: Number(body.month),
      year: Number(body.year),
      label: body.label.trim(),
      type: body.type,
    });

    return Response.json(event, { status: 201 });
  } catch (err) {
    console.error("[POST /api/calendar]", err);
    return Response.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}

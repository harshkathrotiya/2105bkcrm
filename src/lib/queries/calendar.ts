/**
 * queries/calendar.ts — typed DB helpers for the calendar_events table using Prisma
 */

import { db, withRetry } from "@/lib/db";
import type { CalendarEvent } from "@/lib/types";

export async function getAllCalendarEvents(): Promise<CalendarEvent[]> {
  const rows = await db.calendarEvent.findMany({
    orderBy: [
      { year: "asc" },
      { month: "asc" },
      { date: "asc" },
    ],
  });
  return rows.map((r: any) => ({
    id: r.id,
    date: r.date,
    month: r.month,
    year: r.year,
    label: r.label,
    type: r.type as "inquiry" | "quotation" | "confirmed",
  }));
}

export async function getCalendarEventsByMonth(
  month: number,
  year: number
): Promise<CalendarEvent[]> {
  const rows = await db.calendarEvent.findMany({
    where: { month, year },
    orderBy: { date: "asc" },
  });
  return rows.map((r: any) => ({
    id: r.id,
    date: r.date,
    month: r.month,
    year: r.year,
    label: r.label,
    type: r.type as "inquiry" | "quotation" | "confirmed",
  }));
}

export async function createCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  await db.calendarEvent.create({
    data: {
      id: event.id,
      date: event.date,
      month: event.month,
      year: event.year,
      label: event.label,
      type: event.type,
    },
  });
  return event;
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  try {
    await db.calendarEvent.delete({ where: { id } });
    return true;
  } catch (err) {
    return false;
  }
}

export async function createCalendarEventsBulk(events: CalendarEvent[]): Promise<CalendarEvent[]> {
  await db.calendarEvent.createMany({
    data: events.map((event) => ({
      id: event.id,
      date: event.date,
      month: event.month,
      year: event.year,
      label: event.label.trim(),
      type: event.type,
    })),
  });
  return events;
}

export async function deleteCalendarEventsBulk(ids: string[]): Promise<boolean> {
  try {
    await db.calendarEvent.deleteMany({
      where: {
        id: { in: ids },
      },
    });
    return true;
  } catch (err) {
    return false;
  }
}

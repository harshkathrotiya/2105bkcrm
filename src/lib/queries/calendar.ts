/**
 * queries/calendar.ts — typed DB helpers for the calendar_events table
 */

import { db } from "@/lib/db";
import type { CalendarEvent } from "@/lib/types";

interface CalendarRow {
  id: string;
  date: number;
  month: number;
  year: number;
  label: string;
  type: "inquiry" | "quotation" | "confirmed";
}

function rowToEvent(row: CalendarRow): CalendarEvent {
  return {
    id: row.id,
    date: row.date,
    month: row.month,
    year: row.year,
    label: row.label,
    type: row.type,
  };
}

export function getAllCalendarEvents(): CalendarEvent[] {
  const rows = db
    .prepare("SELECT * FROM calendar_events ORDER BY year, month, date")
    .all() as CalendarRow[];
  return rows.map(rowToEvent);
}

export function getCalendarEventsByMonth(
  month: number,
  year: number
): CalendarEvent[] {
  const rows = db
    .prepare(
      "SELECT * FROM calendar_events WHERE month = ? AND year = ? ORDER BY date"
    )
    .all(month, year) as CalendarRow[];
  return rows.map(rowToEvent);
}

export function createCalendarEvent(event: CalendarEvent): CalendarEvent {
  db.prepare(`
    INSERT INTO calendar_events (id, date, month, year, label, type)
    VALUES (@id, @date, @month, @year, @label, @type)
  `).run(event);
  return event;
}

export function deleteCalendarEvent(id: string): boolean {
  const result = db
    .prepare("DELETE FROM calendar_events WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

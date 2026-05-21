/**
 * queries/inquiries.ts — typed DB helpers for the inquiries table
 */

import { db } from "@/lib/db";
import type { Inquiry } from "@/lib/types";

interface InquiryRow {
  id: string;
  client_id: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  notes: string;
  status: "New" | "Quoted" | "Confirmed" | "Cancelled";
  created_at: string;
  updated_at: string | null;
}

function rowToInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    clientId: row.client_id,
    eventType: row.event_type,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    venue: row.venue,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function getAllInquiries(): Inquiry[] {
  const rows = db
    .prepare("SELECT * FROM inquiries ORDER BY created_at DESC")
    .all() as InquiryRow[];
  return rows.map(rowToInquiry);
}

export function getInquiryById(id: string): Inquiry | undefined {
  const row = db
    .prepare("SELECT * FROM inquiries WHERE id = ?")
    .get(id) as InquiryRow | undefined;
  return row ? rowToInquiry(row) : undefined;
}

export function getInquiriesByClient(clientId: string): Inquiry[] {
  const rows = db
    .prepare("SELECT * FROM inquiries WHERE client_id = ? ORDER BY start_date DESC")
    .all(clientId) as InquiryRow[];
  return rows.map(rowToInquiry);
}

export function createInquiry(inquiry: Inquiry): Inquiry {
  db.prepare(`
    INSERT INTO inquiries
      (id,client_id,event_type,start_date,end_date,start_time,end_time,
       venue,notes,status,created_at)
    VALUES
      (@id,@clientId,@eventType,@startDate,@endDate,@startTime,@endTime,
       @venue,@notes,@status,@createdAt)
  `).run({
    id: inquiry.id,
    clientId: inquiry.clientId,
    eventType: inquiry.eventType,
    startDate: inquiry.startDate,
    endDate: inquiry.endDate,
    startTime: inquiry.startTime,
    endTime: inquiry.endTime,
    venue: inquiry.venue,
    notes: inquiry.notes,
    status: inquiry.status,
    createdAt: inquiry.createdAt,
  });
  return inquiry;
}

export function updateInquiry(
  id: string,
  patch: Partial<Omit<Inquiry, "id">>
): Inquiry | undefined {
  const existing = getInquiryById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  db.prepare(`
    UPDATE inquiries SET
      client_id=@clientId, event_type=@eventType,
      start_date=@startDate, end_date=@endDate,
      start_time=@startTime, end_time=@endTime,
      venue=@venue, notes=@notes, status=@status, updated_at=@updatedAt
    WHERE id=@id
  `).run({
    id,
    clientId: merged.clientId,
    eventType: merged.eventType,
    startDate: merged.startDate,
    endDate: merged.endDate,
    startTime: merged.startTime,
    endTime: merged.endTime,
    venue: merged.venue,
    notes: merged.notes,
    status: merged.status,
    updatedAt: merged.updatedAt ?? null,
  });

  return getInquiryById(id);
}

export function deleteInquiry(id: string): boolean {
  const result = db.prepare("DELETE FROM inquiries WHERE id = ?").run(id);
  return result.changes > 0;
}

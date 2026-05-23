/**
 * queries/inquiries.ts — typed DB helpers for the inquiries table using Prisma
 */

import { db } from "@/lib/db";
import type { Inquiry } from "@/lib/types";

export async function getAllInquiries(): Promise<Inquiry[]> {
  const rows = await db.inquiry.findMany({
    orderBy: { created_at: "desc" },
  });
  return rows.map((r: any) => ({
    id: r.id,
    clientId: r.client_id,
    eventType: r.event_type,
    startDate: r.start_date,
    endDate: r.end_date,
    startTime: r.start_time,
    endTime: r.end_time,
    venue: r.venue,
    notes: r.notes,
    status: r.status as "New" | "Quoted" | "Confirmed" | "Cancelled",
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  }));
}

export async function getInquiryById(id: string): Promise<Inquiry | undefined> {
  const row = await db.inquiry.findUnique({
    where: { id },
  });
  if (!row) return undefined;
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
    status: row.status as "New" | "Quoted" | "Confirmed" | "Cancelled",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function getInquiriesByClient(clientId: string): Promise<Inquiry[]> {
  const rows = await db.inquiry.findMany({
    where: { client_id: clientId },
    orderBy: { start_date: "desc" },
  });
  return rows.map((r: any) => ({
    id: r.id,
    clientId: r.client_id,
    eventType: r.event_type,
    startDate: r.start_date,
    endDate: r.end_date,
    startTime: r.start_time,
    endTime: r.end_time,
    venue: r.venue,
    notes: r.notes,
    status: r.status as "New" | "Quoted" | "Confirmed" | "Cancelled",
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  }));
}

export async function createInquiry(inquiry: Inquiry): Promise<Inquiry> {
  await db.inquiry.create({
    data: {
      id: inquiry.id,
      client_id: inquiry.clientId,
      event_type: inquiry.eventType,
      start_date: inquiry.startDate,
      end_date: inquiry.endDate,
      start_time: inquiry.startTime,
      end_time: inquiry.endTime,
      venue: inquiry.venue,
      notes: inquiry.notes,
      status: inquiry.status,
      created_at: inquiry.createdAt,
    },
  });
  return inquiry;
}

export async function updateInquiry(
  id: string,
  patch: Partial<Omit<Inquiry, "id">>
): Promise<Inquiry | undefined> {
  const existing = await getInquiryById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  await db.inquiry.update({
    where: { id },
    data: {
      client_id: merged.clientId,
      event_type: merged.eventType,
      start_date: merged.startDate,
      end_date: merged.endDate,
      start_time: merged.startTime,
      end_time: merged.endTime,
      venue: merged.venue,
      notes: merged.notes,
      status: merged.status,
      updated_at: merged.updatedAt ?? null,
    },
  });

  return await getInquiryById(id);
}

export async function deleteInquiry(id: string): Promise<boolean> {
  try {
    await db.inquiry.delete({ where: { id } });
    return true;
  } catch (err) {
    return false;
  }
}

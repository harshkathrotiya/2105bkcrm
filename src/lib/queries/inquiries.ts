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
    eventName: r.event_name || "",
    startDate: r.start_date,
    endDate: r.end_date,
    startTime: r.start_time,
    endTime: r.end_time,
    venue: r.venue,
    notes: r.notes,
    status: r.status as "New" | "Quoted" | "Confirmed" | "Cancelled",
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
    department: r.department as "VIDEO" | "LED" | "MERGED",
    screenWidth: r.screen_width ?? undefined,
    screenHeight: r.screen_height ?? undefined,
    screenAreaSqft: r.screen_area_sqft ?? undefined,
    totalCabinets: r.total_cabinets ?? undefined,
    ledType: r.led_type ?? undefined,
    ratePerSqft: r.rate_per_sqft ?? undefined,
    location: r.location,
    stageType: r.stage_type ?? undefined,
    dispatchDate: r.dispatch_date ?? undefined,
    dispatchTime: r.dispatch_time ?? undefined,
    vehicle1Number: r.vehicle1_number ?? undefined,
    vehicle1Driver: r.vehicle1_driver ?? undefined,
    vehicle2Number: r.vehicle2_number ?? undefined,
    vehicle2Driver: r.vehicle2_driver ?? undefined,
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
    eventName: row.event_name || "",
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    venue: row.venue,
    notes: row.notes,
    status: row.status as "New" | "Quoted" | "Confirmed" | "Cancelled",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    department: row.department as "VIDEO" | "LED" | "MERGED",
    screenWidth: row.screen_width ?? undefined,
    screenHeight: row.screen_height ?? undefined,
    screenAreaSqft: row.screen_area_sqft ?? undefined,
    totalCabinets: row.total_cabinets ?? undefined,
    ledType: row.led_type ?? undefined,
    ratePerSqft: row.rate_per_sqft ?? undefined,
    location: row.location,
    stageType: row.stage_type ?? undefined,
    dispatchDate: row.dispatch_date ?? undefined,
    dispatchTime: row.dispatch_time ?? undefined,
    vehicle1Number: row.vehicle1_number ?? undefined,
    vehicle1Driver: row.vehicle1_driver ?? undefined,
    vehicle2Number: row.vehicle2_number ?? undefined,
    vehicle2Driver: row.vehicle2_driver ?? undefined,
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
    eventName: r.event_name || "",
    startDate: r.start_date,
    endDate: r.end_date,
    startTime: r.start_time,
    endTime: r.end_time,
    venue: r.venue,
    notes: r.notes,
    status: r.status as "New" | "Quoted" | "Confirmed" | "Cancelled",
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
    department: r.department as "VIDEO" | "LED" | "MERGED",
    screenWidth: r.screen_width ?? undefined,
    screenHeight: r.screen_height ?? undefined,
    screenAreaSqft: r.screen_area_sqft ?? undefined,
    totalCabinets: r.total_cabinets ?? undefined,
    ledType: r.led_type ?? undefined,
    ratePerSqft: r.rate_per_sqft ?? undefined,
    location: r.location,
    stageType: r.stage_type ?? undefined,
    dispatchDate: r.dispatch_date ?? undefined,
    dispatchTime: r.dispatch_time ?? undefined,
    vehicle1Number: r.vehicle1_number ?? undefined,
    vehicle1Driver: r.vehicle1_driver ?? undefined,
    vehicle2Number: r.vehicle2_number ?? undefined,
    vehicle2Driver: r.vehicle2_driver ?? undefined,
  }));
}

export async function createInquiry(inquiry: Inquiry): Promise<Inquiry> {
  await db.inquiry.create({
    data: {
      id: inquiry.id,
      client_id: inquiry.clientId,
      event_type: inquiry.eventType,
      event_name: inquiry.eventName || "",
      start_date: inquiry.startDate,
      end_date: inquiry.endDate,
      start_time: inquiry.startTime,
      end_time: inquiry.endTime,
      venue: inquiry.venue,
      notes: inquiry.notes,
      status: inquiry.status,
      created_at: inquiry.createdAt,
      department: inquiry.department ?? "VIDEO",
      screen_width: inquiry.screenWidth ?? null,
      screen_height: inquiry.screenHeight ?? null,
      screen_area_sqft: inquiry.screenAreaSqft ?? null,
      total_cabinets: inquiry.totalCabinets ?? null,
      led_type: inquiry.ledType ?? null,
      rate_per_sqft: inquiry.ratePerSqft ?? null,
      location: inquiry.location ?? "INDOOR",
      stage_type: inquiry.stageType ?? null,
      dispatch_date: inquiry.dispatchDate ?? null,
      dispatch_time: inquiry.dispatchTime ?? null,
      vehicle1_number: inquiry.vehicle1Number ?? null,
      vehicle1_driver: inquiry.vehicle1Driver ?? null,
      vehicle2_number: inquiry.vehicle2Number ?? null,
      vehicle2_driver: inquiry.vehicle2Driver ?? null,
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
      event_name: merged.eventName || "",
      start_date: merged.startDate,
      end_date: merged.endDate,
      start_time: merged.startTime,
      end_time: merged.endTime,
      venue: merged.venue,
      notes: merged.notes,
      status: merged.status,
      updated_at: merged.updatedAt ?? null,
      department: merged.department ?? "VIDEO",
      screen_width: merged.screenWidth !== undefined ? merged.screenWidth : null,
      screen_height: merged.screenHeight !== undefined ? merged.screenHeight : null,
      screen_area_sqft: merged.screenAreaSqft !== undefined ? merged.screenAreaSqft : null,
      total_cabinets: merged.totalCabinets !== undefined ? merged.totalCabinets : null,
      led_type: merged.ledType !== undefined ? merged.ledType : null,
      rate_per_sqft: merged.ratePerSqft !== undefined ? merged.ratePerSqft : null,
      location: merged.location ?? "INDOOR",
      stage_type: merged.stageType !== undefined ? merged.stageType : null,
      dispatch_date: merged.dispatchDate !== undefined ? merged.dispatchDate : null,
      dispatch_time: merged.dispatchTime !== undefined ? merged.dispatchTime : null,
      vehicle1_number: merged.vehicle1Number !== undefined ? merged.vehicle1Number : null,
      vehicle1_driver: merged.vehicle1Driver !== undefined ? merged.vehicle1Driver : null,
      vehicle2_number: merged.vehicle2Number !== undefined ? merged.vehicle2Number : null,
      vehicle2_driver: merged.vehicle2Driver !== undefined ? merged.vehicle2Driver : null,
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

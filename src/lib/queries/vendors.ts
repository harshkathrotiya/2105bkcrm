/**
 * queries/vendors.ts — typed DB helpers for the vendors table using Prisma
 */

import { db } from "@/lib/db";
import type { Vendor } from "@/lib/types";

export async function getAllVendors(): Promise<(Vendor & { timesUsed: number })[]> {
  const vendors = await db.vendor.findMany({
    include: { equipment_bookings: true },
    orderBy: { name: "asc" },
  });

  return vendors.map(v => ({
    id: v.id,
    name: v.name,
    phone: v.phone,
    email: v.email,
    specialization: v.specialization,
    city: v.city,
    gstNumber: v.gst_number,
    notes: v.notes,
    isActive: v.is_active === 1,
    createdAt: v.created_at,
    timesUsed: v.equipment_bookings.length,
  }));
}

export async function getVendorById(id: number): Promise<Vendor | undefined> {
  const v = await db.vendor.findUnique({ where: { id } });
  if (!v) return undefined;

  return {
    id: v.id,
    name: v.name,
    phone: v.phone,
    email: v.email,
    specialization: v.specialization,
    city: v.city,
    gstNumber: v.gst_number,
    notes: v.notes,
    isActive: v.is_active === 1,
    createdAt: v.created_at,
  };
}

export async function createVendor(vendor: Omit<Vendor, "id" | "createdAt" | "isActive">): Promise<Vendor> {
  const nowStr = new Date().toISOString();
  const v = await db.vendor.create({
    data: {
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email ?? null,
      specialization: vendor.specialization ?? null,
      city: vendor.city ?? null,
      gst_number: vendor.gstNumber ?? null,
      notes: vendor.notes ?? null,
      is_active: 1,
      created_at: nowStr,
    },
  });

  return {
    id: v.id,
    name: v.name,
    phone: v.phone,
    email: v.email,
    specialization: v.specialization,
    city: v.city,
    gstNumber: v.gst_number,
    notes: v.notes,
    isActive: true,
    createdAt: v.created_at,
  };
}

export async function updateVendor(id: number, patch: Partial<Omit<Vendor, "id" | "createdAt">>): Promise<Vendor | undefined> {
  const existing = await getVendorById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  const v = await db.vendor.update({
    where: { id },
    data: {
      name: merged.name,
      phone: merged.phone,
      email: merged.email ?? null,
      specialization: merged.specialization ?? null,
      city: merged.city ?? null,
      gst_number: merged.gstNumber ?? null,
      notes: merged.notes ?? null,
      is_active: merged.isActive ? 1 : 0,
    },
  });

  return {
    id: v.id,
    name: v.name,
    phone: v.phone,
    email: v.email,
    specialization: v.specialization,
    city: v.city,
    gstNumber: v.gst_number,
    notes: v.notes,
    isActive: v.is_active === 1,
    createdAt: v.created_at,
  };
}

export interface VendorHistoryItem {
  bookingId: number;
  inquiryId: string;
  clientName: string;
  eventType: string;
  bookedFrom: string;
  bookedTo: string;
  itemName: string;
  position: string;
  status: string;
  vendorCostPerDay: number;
  totalVendorCost: number;
}

export async function getVendorHistory(vendorId: number): Promise<VendorHistoryItem[]> {
  const rows = await db.equipmentBooking.findMany({
    where: { vendor_id: vendorId },
    include: {
      inquiry: {
        include: {
          client: true,
          quotations: {
            where: { status: { not: "Revised" } }
          }
        },
      },
      equipment: true,
      kit: true,
    },
    orderBy: { booked_from: "desc" },
  });

  return rows.map((r: any) => {
    let itemName = r.equipment?.product_name || r.kit?.name || "Unspecified Item";

    if (itemName === "Unspecified Item" && r.position) {
      const activeQuote = r.inquiry?.quotations?.[0];
      if (activeQuote && activeQuote.equipment) {
        try {
          const eqRows = JSON.parse(activeQuote.equipment);
          const matchedRow = eqRows.find((er: any) => er.no.toString() === r.position);
          if (matchedRow && matchedRow.equip) {
            itemName = matchedRow.equip;
          }
        } catch {}
      }
    }

    return {
      bookingId: r.id,
      inquiryId: r.inquiry_id,
      clientName: r.inquiry?.client?.name || "Unknown Client",
      eventType: r.inquiry?.event_type || "Unknown Event",
      bookedFrom: r.booked_from,
      bookedTo: r.booked_to,
      itemName,
      position: r.position || "",
      status: r.status,
      vendorCostPerDay: r.vendor_cost_per_day || 0,
      totalVendorCost: r.total_vendor_cost || 0,
    };
  });
}

export async function getVendorYtdSpend(vendorId: number): Promise<number> {
  const currentYear = new Date().getFullYear();
  const yearStr = `${currentYear}-01-01`; // Using Prisma filtering to check year

  const sum = await db.equipmentBooking.aggregate({
    _sum: { total_vendor_cost: true },
    where: {
      vendor_id: vendorId,
      booked_from: { gte: yearStr },
    },
  });

  return sum._sum.total_vendor_cost || 0;
}

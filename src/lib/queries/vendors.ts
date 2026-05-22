/**
 * queries/vendors.ts — typed DB helpers for the vendors table
 */

import { db } from "@/lib/db";
import type { Vendor } from "@/lib/types";

export interface VendorRow {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  specialization: string | null;
  city: string | null;
  gst_number: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
}

function rowToVendor(row: VendorRow): Vendor {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    specialization: row.specialization,
    city: row.city,
    gstNumber: row.gst_number,
    notes: row.notes,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

export function getAllVendors(): (Vendor & { timesUsed: number })[] {
  const rows = db.prepare(`
    SELECT v.*, COUNT(eb.id) as times_used
    FROM vendors v
    LEFT JOIN equipment_bookings eb ON v.id = eb.vendor_id
    GROUP BY v.id
    ORDER BY v.name ASC
  `).all() as (VendorRow & { times_used: number })[];

  return rows.map((row) => ({
    ...rowToVendor(row),
    timesUsed: row.times_used,
  }));
}

export function getVendorById(id: number): Vendor | undefined {
  const row = db.prepare("SELECT * FROM vendors WHERE id = ?").get(id) as VendorRow | undefined;
  return row ? rowToVendor(row) : undefined;
}

export function createVendor(vendor: Omit<Vendor, "id" | "createdAt" | "isActive">): Vendor {
  const nowStr = new Date().toISOString();
  const res = db.prepare(`
    INSERT INTO vendors (name, phone, email, specialization, city, gst_number, notes, is_active, created_at)
    VALUES (@name, @phone, @email, @specialization, @city, @gstNumber, @notes, 1, @createdAt)
  `).run({
    name: vendor.name,
    phone: vendor.phone,
    email: vendor.email ?? null,
    specialization: vendor.specialization ?? null,
    city: vendor.city ?? null,
    gstNumber: vendor.gstNumber ?? null,
    notes: vendor.notes ?? null,
    createdAt: nowStr,
  });

  return {
    id: res.lastInsertRowid as number,
    name: vendor.name,
    phone: vendor.phone,
    email: vendor.email,
    specialization: vendor.specialization,
    city: vendor.city,
    gstNumber: vendor.gstNumber,
    notes: vendor.notes,
    isActive: true,
    createdAt: nowStr,
  };
}

export function updateVendor(id: number, patch: Partial<Omit<Vendor, "id" | "createdAt">>): Vendor | undefined {
  const existing = getVendorById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  db.prepare(`
    UPDATE vendors SET
      name = @name,
      phone = @phone,
      email = @email,
      specialization = @specialization,
      city = @city,
      gst_number = @gstNumber,
      notes = @notes,
      is_active = @isActive
    WHERE id = @id
  `).run({
    id,
    name: merged.name,
    phone: merged.phone,
    email: merged.email ?? null,
    specialization: merged.specialization ?? null,
    city: merged.city ?? null,
    gstNumber: merged.gstNumber ?? null,
    notes: merged.notes ?? null,
    isActive: merged.isActive ? 1 : 0,
  });

  return getVendorById(id);
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

export function getVendorHistory(vendorId: number): VendorHistoryItem[] {
  const rows = db.prepare(`
    SELECT 
      eb.id as booking_id,
      eb.inquiry_id,
      eb.position,
      eb.booked_from,
      eb.booked_to,
      eb.status as booking_status,
      eb.vendor_cost_per_day,
      eb.total_vendor_cost,
      i.event_type,
      c.name as client_name,
      COALESCE(e.product_name, k.name) as item_name
    FROM equipment_bookings eb
    LEFT JOIN inquiries i ON eb.inquiry_id = i.id
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN equipment e ON eb.equipment_id = e.id
    LEFT JOIN kits k ON eb.kit_id = k.id
    WHERE eb.vendor_id = ?
    ORDER BY eb.booked_from DESC
  `).all(vendorId) as any[];

  return rows.map((r) => ({
    bookingId: r.booking_id,
    inquiryId: r.inquiry_id,
    clientName: r.client_name || "Unknown Client",
    eventType: r.event_type || "Unknown Event",
    bookedFrom: r.booked_from,
    bookedTo: r.booked_to,
    itemName: r.item_name || "Unspecified Item",
    position: r.position || "",
    status: r.booking_status,
    vendorCostPerDay: r.vendor_cost_per_day || 0,
    totalVendorCost: r.total_vendor_cost || 0,
  }));
}

export function getVendorYtdSpend(vendorId: number): number {
  const currentYear = new Date().getFullYear();
  const yearStr = `${currentYear}%`;
  
  const row = db.prepare(`
    SELECT SUM(total_vendor_cost) as total
    FROM equipment_bookings
    WHERE vendor_id = ? AND booked_from LIKE ?
  `).get(vendorId, yearStr) as { total: number | null } | undefined;

  return row?.total || 0;
}

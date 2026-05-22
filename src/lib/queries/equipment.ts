/**
 * queries/equipment.ts — typed DB helpers for the equipment table
 */

import { db } from "@/lib/db";
import type { Equipment } from "@/lib/types";

export interface EquipmentRow {
  id: number;
  product_name: string;
  category: "CAMERA" | "VIDEO_MIXER" | "VIDEO_RECORDER" | "AUDIO_MIXER" | "WIRELESS_TX" | "UPS" | "ACCESSORY";
  quantity: number;
  serial_number: string | null;
  body_name: string | null;
  kit_id: number | null;
  resp_person: string | null;
  purchase_date: string | null;
  purchase_from: string | null;
  bill_number: string | null;
  purchase_price: number | null;
  status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "SOLD" | "RETIRED";
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export function rowToEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    productName: row.product_name,
    category: row.category,
    quantity: row.quantity,
    serialNumber: row.serial_number,
    bodyName: row.body_name,
    kitId: row.kit_id,
    respPerson: row.resp_person,
    purchaseDate: row.purchase_date,
    purchaseFrom: row.purchase_from,
    billNumber: row.bill_number,
    purchasePrice: row.purchase_price,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface EquipmentFilters {
  category?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function getEquipment(filters: EquipmentFilters = {}): { items: Equipment[]; total: number } {
  let query = "SELECT * FROM equipment WHERE status != 'RETIRED'";
  let countQuery = "SELECT COUNT(*) as total FROM equipment WHERE status != 'RETIRED'";
  const params: any[] = [];
  const countParams: any[] = [];

  if (filters.category) {
    query += " AND category = ?";
    countQuery += " AND category = ?";
    params.push(filters.category);
    countParams.push(filters.category);
  }

  if (filters.status) {
    query += " AND status = ?";
    countQuery += " AND status = ?";
    params.push(filters.status);
    countParams.push(filters.status);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    query += " AND (product_name LIKE ? OR serial_number LIKE ? OR resp_person LIKE ?)";
    countQuery += " AND (product_name LIKE ? OR serial_number LIKE ? OR resp_person LIKE ?)";
    params.push(term, term, term);
    countParams.push(term, term, term);
  }

  query += " ORDER BY id DESC";

  if (filters.limit !== undefined && filters.offset !== undefined) {
    query += " LIMIT ? OFFSET ?";
    params.push(filters.limit, filters.offset);
  }

  const rows = db.prepare(query).all(...params) as EquipmentRow[];
  const countRow = db.prepare(countQuery).get(...countParams) as { total: number } | undefined;

  return {
    items: rows.map(rowToEquipment),
    total: countRow ? countRow.total : 0,
  };
}

export function getEquipmentById(id: number): Equipment | undefined {
  const row = db.prepare("SELECT * FROM equipment WHERE id = ?").get(id) as EquipmentRow | undefined;
  return row ? rowToEquipment(row) : undefined;
}

export function getEquipmentDetailsById(id: number) {
  const item = getEquipmentById(id);
  if (!item) return undefined;

  // Fetch kit it belongs to
  let kit = null;
  if (item.kitId) {
    kit = db.prepare("SELECT id, name FROM kits WHERE id = ?").get(item.kitId) as { id: number; name: string } | undefined;
  }

  // Fetch kit where it is the main body
  const mainBodyOfKit = db.prepare("SELECT id, name FROM kits WHERE main_body_id = ?").get(id) as { id: number; name: string } | undefined;

  // Fetch booking history
  const bookings = db.prepare(`
    SELECT
      eb.id,
      eb.inquiry_id as inquiryId,
      eb.position,
      eb.booked_from as bookedFrom,
      eb.booked_to as bookedTo,
      eb.status,
      eb.vendor_id as vendorId,
      eb.vendor_cost_per_day as vendorCostPerDay,
      eb.total_vendor_cost as totalVendorCost,
      i.event_type as eventType,
      i.start_date as startDate,
      i.end_date as endDate,
      i.status as inquiryStatus,
      c.name as clientName,
      v.name as vendorName
    FROM equipment_bookings eb
    LEFT JOIN inquiries i ON eb.inquiry_id = i.id
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN vendors v ON eb.vendor_id = v.id
    WHERE eb.equipment_id = ?
    ORDER BY eb.booked_from DESC
  `).all(id) as any[];

  return {
    ...item,
    kit: kit || null,
    mainBodyOfKit: mainBodyOfKit || null,
    bookings,
  };
}

export function getEquipmentByKitId(kitId: number): Equipment[] {
  const rows = db.prepare("SELECT * FROM equipment WHERE kit_id = ?").all(kitId) as EquipmentRow[];
  return rows.map(rowToEquipment);
}

export function createEquipment(item: Omit<Equipment, "id" | "createdAt">): Equipment {
  const nowStr = new Date().toISOString();
  const res = db.prepare(`
    INSERT INTO equipment (
      product_name, category, quantity, serial_number, body_name, kit_id,
      resp_person, purchase_date, purchase_from, bill_number, purchase_price,
      status, notes, created_at
    ) VALUES (
      @productName, @category, @quantity, @serialNumber, @bodyName, @kitId,
      @respPerson, @purchaseDate, @purchaseFrom, @billNumber, @purchasePrice,
      @status, @notes, @createdAt
    )
  `).run({
    productName: item.productName,
    category: item.category,
    quantity: item.quantity,
    serialNumber: item.serialNumber ?? null,
    bodyName: item.bodyName ?? null,
    kitId: item.kitId ?? null,
    respPerson: item.respPerson ?? null,
    purchaseDate: item.purchaseDate ?? null,
    purchaseFrom: item.purchaseFrom ?? null,
    billNumber: item.billNumber ?? null,
    purchasePrice: item.purchasePrice ?? null,
    status: item.status || "AVAILABLE",
    notes: item.notes ?? null,
    createdAt: nowStr
  });

  return {
    ...item,
    id: res.lastInsertRowid as number,
    createdAt: nowStr,
  };
}

export function updateEquipment(id: number, patch: Partial<Omit<Equipment, "id" | "createdAt">>): Equipment | undefined {
  const existing = getEquipmentById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };
  const nowStr = new Date().toISOString();

  db.prepare(`
    UPDATE equipment SET
      product_name = @productName,
      category = @category,
      quantity = @quantity,
      serial_number = @serialNumber,
      body_name = @bodyName,
      kit_id = @kitId,
      resp_person = @respPerson,
      purchase_date = @purchaseDate,
      purchase_from = @purchaseFrom,
      bill_number = @billNumber,
      purchase_price = @purchasePrice,
      status = @status,
      notes = @notes,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id,
    productName: merged.productName,
    category: merged.category,
    quantity: merged.quantity,
    serialNumber: merged.serialNumber ?? null,
    bodyName: merged.bodyName ?? null,
    kitId: merged.kitId ?? null,
    respPerson: merged.respPerson ?? null,
    purchaseDate: merged.purchaseDate ?? null,
    purchaseFrom: merged.purchaseFrom ?? null,
    billNumber: merged.billNumber ?? null,
    purchasePrice: merged.purchasePrice ?? null,
    status: merged.status,
    notes: merged.notes ?? null,
    updatedAt: nowStr,
  });

  return getEquipmentById(id);
}

export function deleteEquipment(id: number): boolean {
  // Soft delete: status = RETIRED
  const result = db.prepare("UPDATE equipment SET status = 'RETIRED', updated_at = datetime('now') WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getAssetSummary() {
  const totalValRow = db.prepare(`
    SELECT SUM(purchase_price * quantity) as totalValue, COUNT(*) as totalCount
    FROM equipment
    WHERE status != 'RETIRED'
  `).get() as { totalValue: number | null; totalCount: number } | undefined;

  const categoryBreakdown = db.prepare(`
    SELECT category, SUM(purchase_price * quantity) as value, COUNT(*) as count
    FROM equipment
    WHERE status != 'RETIRED'
    GROUP BY category
  `).all() as { category: string; value: number | null; count: number }[];

  const categoryMap: Record<string, { count: number; value: number }> = {
    CAMERA: { count: 0, value: 0 },
    VIDEO_MIXER: { count: 0, value: 0 },
    VIDEO_RECORDER: { count: 0, value: 0 },
    AUDIO_MIXER: { count: 0, value: 0 },
    WIRELESS_TX: { count: 0, value: 0 },
    UPS: { count: 0, value: 0 },
    ACCESSORY: { count: 0, value: 0 },
  };

  categoryBreakdown.forEach((row) => {
    if (categoryMap[row.category]) {
      categoryMap[row.category] = {
        count: row.count,
        value: row.value || 0,
      };
    }
  });

  return {
    totalValue: totalValRow?.totalValue || 0,
    totalCount: totalValRow?.totalCount || 0,
    categories: categoryMap,
  };
}

export function getEquipmentCategoryCounts(): Record<string, number> {
  const rows = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM equipment
    WHERE status != 'RETIRED'
    GROUP BY category
  `).all() as { category: string; count: number }[];

  const counts: Record<string, number> = {
    ALL: 0,
    CAMERA: 0,
    VIDEO_MIXER: 0,
    VIDEO_RECORDER: 0,
    AUDIO_MIXER: 0,
    WIRELESS_TX: 0,
    UPS: 0,
    ACCESSORY: 0,
  };

  let total = 0;
  rows.forEach((row) => {
    if (row.category in counts) {
      counts[row.category] = row.count;
      total += row.count;
    }
  });
  counts.ALL = total;

  return counts;
}

/**
 * Helper to check if a specific equipment is booked in a date range
 */
export function isEquipmentBooked(equipmentId: number, startDate: string, endDate: string): boolean {
  const row = db.prepare(`
    SELECT COUNT(*) as count 
    FROM equipment_bookings 
    WHERE equipment_id = ? 
      AND status != 'RETURNED'
      AND booked_from <= ? 
      AND booked_to >= ?
  `).get(equipmentId, endDate, startDate) as { count: number } | undefined;

  return (row?.count || 0) > 0;
}


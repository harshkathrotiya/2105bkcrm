/**
 * queries/equipment.ts — typed DB helpers for the equipment table using Prisma
 */

import { db } from "@/lib/db";
import type { Equipment } from "@/lib/types";

export interface EquipmentFilters {
  category?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  department?: "VIDEO" | "LED";
}

function mapEquipment(row: any): Equipment {
  return {
    id: row.id,
    productName: row.product_name,
    category: row.category,
    quantity: row.quantity,
    serialNumber: row.serial_number,
    bodyName: row.body_name,
    kitId: row.kit_id,
    kitName: row.kit?.name || row.kit_name || null,
    respPerson: row.resp_person,
    purchaseDate: row.purchase_date,
    purchaseFrom: row.purchase_from,
    billNumber: row.bill_number,
    purchasePrice: row.purchase_price,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownershipType: (row.ownership_type as "INHOUSE" | "VENDOR" | "STAFF") || "INHOUSE",
    vendorId: row.vendor_id || null,
    vendorName: row.vendor?.name || null,
    ownerStaffId: row.owner_staff_id || null,
    ownerStaffName: row.owner_staff?.name || null,
    defaultRate: row.default_rate ?? null,
    department: row.department as "VIDEO" | "LED",
  };
}

export async function getEquipment(filters: EquipmentFilters = {}): Promise<{ items: Equipment[]; total: number }> {
  const where: any = {};
  
  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = { not: "RETIRED" };
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.department) {
    where.department = filters.department;
  }

  if (filters.search) {
    where.OR = [
      { product_name: { contains: filters.search, mode: "insensitive" } },
      { serial_number: { contains: filters.search, mode: "insensitive" } },
      { resp_person: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.equipment.findMany({
      where,
      include: { kit: true, vendor: true, owner_staff: true },
      orderBy: { id: "desc" },
      take: filters.limit,
      skip: filters.offset,
    }),
    db.equipment.count({ where }),
  ]);

  return {
    items: rows.map(mapEquipment),
    total,
  };
}

export async function getEquipmentById(id: number): Promise<Equipment | undefined> {
  const row = await db.equipment.findUnique({
    where: { id },
    include: { kit: true, vendor: true, owner_staff: true },
  });
  return row ? mapEquipment(row) : undefined;
}

export async function getEquipmentDetailsById(id: number) {
  const item = await getEquipmentById(id);
  if (!item) return undefined;

  let kit = null;
  if (item.kitId) {
    kit = await db.kit.findUnique({
      where: { id: item.kitId },
      select: { id: true, name: true },
    });
  }

  const mainBodyOfKit = await db.kit.findFirst({
    where: { main_body_id: id },
    select: { id: true, name: true },
  });

  const bookings = await db.equipmentBooking.findMany({
    where: { equipment_id: id },
    include: {
      inquiry: {
        include: { client: true },
      },
      vendor: true,
    },
    orderBy: { booked_from: "desc" },
  });

  return {
    ...item,
    kit: kit || null,
    mainBodyOfKit: mainBodyOfKit || null,
    bookings: bookings.map((b: any) => ({
      id: b.id,
      inquiryId: b.inquiry_id,
      position: b.position,
      bookedFrom: b.booked_from,
      bookedTo: b.booked_to,
      status: b.status,
      vendorId: b.vendor_id,
      vendorCostPerDay: b.vendor_cost_per_day,
      totalVendorCost: b.total_vendor_cost,
      eventType: b.inquiry?.event_type,
      eventName: b.inquiry?.event_name,
      startDate: b.inquiry?.start_date,
      endDate: b.inquiry?.end_date,
      inquiryStatus: b.inquiry?.status,
      clientName: b.inquiry?.client?.name,
      vendorName: b.vendor?.name,
    })),
  };
}

export async function getEquipmentByKitId(kitId: number): Promise<Equipment[]> {
  const rows = await db.equipment.findMany({
    where: { kit_id: kitId },
    include: { kit: true, vendor: true, owner_staff: true },
  });
  return rows.map(mapEquipment);
}

export async function createEquipment(item: Omit<Equipment, "id" | "createdAt">): Promise<Equipment> {
  const nowStr = new Date().toISOString();
  const row = await db.equipment.create({
    data: {
      product_name: item.productName,
      category: item.category,
      quantity: item.quantity,
      serial_number: item.serialNumber ?? null,
      body_name: item.bodyName ?? null,
      kit_id: item.kitId ?? null,
      resp_person: item.respPerson ?? null,
      purchase_date: item.purchaseDate ?? null,
      purchase_from: item.purchaseFrom ?? null,
      bill_number: item.billNumber ?? null,
      purchase_price: item.purchasePrice ?? null,
      status: item.status || "AVAILABLE",
      notes: item.notes ?? null,
      created_at: nowStr,
      ownership_type: item.ownershipType || "INHOUSE",
      vendor_id: item.vendorId ?? null,
      owner_staff_id: item.ownerStaffId ?? null,
      default_rate: item.defaultRate ?? null,
      department: item.department || "VIDEO",
    },
    include: { kit: true, vendor: true, owner_staff: true }
  });

  return mapEquipment(row);
}

export async function updateEquipment(id: number, patch: Partial<Omit<Equipment, "id" | "createdAt">>): Promise<Equipment | undefined> {
  const existing = await getEquipmentById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };
  const nowStr = new Date().toISOString();

  const row = await db.equipment.update({
    where: { id },
    data: {
      product_name: merged.productName,
      category: merged.category,
      quantity: merged.quantity,
      serial_number: merged.serialNumber ?? null,
      body_name: merged.bodyName ?? null,
      kit_id: merged.kitId ?? null,
      resp_person: merged.respPerson ?? null,
      purchase_date: merged.purchaseDate ?? null,
      purchase_from: merged.purchaseFrom ?? null,
      bill_number: merged.billNumber ?? null,
      purchase_price: merged.purchasePrice ?? null,
      status: merged.status,
      notes: merged.notes ?? null,
      updated_at: nowStr,
      ownership_type: merged.ownershipType || "INHOUSE",
      vendor_id: merged.vendorId ?? null,
      owner_staff_id: merged.ownerStaffId ?? null,
      default_rate: merged.defaultRate ?? null,
      department: merged.department || "VIDEO",
    },
    include: { kit: true, vendor: true, owner_staff: true }
  });

  return mapEquipment(row);
}

export async function deleteEquipment(id: number): Promise<boolean> {
  try {
    await db.equipment.update({
      where: { id },
      data: { status: "RETIRED", updated_at: new Date().toISOString() },
    });
    return true;
  } catch (err) {
    return false;
  }
}

export async function getAssetSummary() {
  const equipment = await db.equipment.findMany({
    where: { status: { notIn: ["RETIRED", "SOLD"] } },
  });

  let totalValue = 0;
  let totalCount = 0;
  
  const categoryMap: Record<string, { count: number; value: number }> = {
    CAMERA: { count: 0, value: 0 },
    VIDEO_MIXER: { count: 0, value: 0 },
    VIDEO_RECORDER: { count: 0, value: 0 },
    AUDIO_MIXER: { count: 0, value: 0 },
    WIRELESS_TX: { count: 0, value: 0 },
    UPS: { count: 0, value: 0 },
    ACCESSORY: { count: 0, value: 0 },
  };

  for (const eq of equipment) {
    const val = (eq.purchase_price || 0) * eq.quantity;
    totalValue += val;
    totalCount += 1; // Or eq.quantity? The previous SQL did COUNT(*)
    
    if (categoryMap[eq.category]) {
      categoryMap[eq.category].count += 1;
      categoryMap[eq.category].value += val;
    }
  }

  return {
    totalValue,
    totalCount,
    categories: categoryMap,
  };
}

export async function getEquipmentCategoryCounts(): Promise<Record<string, number>> {
  const equipment = await db.equipment.findMany({
    where: { status: { notIn: ["RETIRED", "SOLD"] } },
    select: { category: true },
  });

  const counts: Record<string, number> = {
    ALL: equipment.length,
    CAMERA: 0,
    VIDEO_MIXER: 0,
    VIDEO_RECORDER: 0,
    AUDIO_MIXER: 0,
    WIRELESS_TX: 0,
    UPS: 0,
    ACCESSORY: 0,
  };

  for (const eq of equipment) {
    if (eq.category in counts) {
      counts[eq.category] += 1;
    }
  }

  return counts;
}

export async function isEquipmentBooked(equipmentId: number, startDate: string, endDate: string): Promise<boolean> {
  const count = await db.equipmentBooking.count({
    where: {
      equipment_id: equipmentId,
      status: { not: "RETURNED" },
      booked_from: { lte: endDate },
      booked_to: { gte: startDate },
    },
  });

  if (count > 0) return true;

  const eq = await db.equipment.findUnique({
    where: { id: equipmentId },
    select: { kit_id: true },
  });

  if (eq && eq.kit_id) {
    const kitCount = await db.equipmentBooking.count({
      where: {
        kit_id: eq.kit_id,
        status: { not: "RETURNED" },
        booked_from: { lte: endDate },
        booked_to: { gte: startDate },
      },
    });
    if (kitCount > 0) return true;
  }

  return false;
}

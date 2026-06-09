/**
 * queries/equipment.ts — typed DB helpers for the equipment table using Prisma
 */

import { db, withRetry } from "@/lib/db";
import type { Equipment } from "@/lib/types";

export interface EquipmentFilters {
  category?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  department?: "VIDEO" | "LED";
  ownerStaffId?: number;
}

function mapEquipment(row: any): Equipment {
  return {
    id: row.id,
    productName: row.product_name,
    category: row.category,
    quantity: row.quantity,
    quantityUnit: (row.quantity_unit as "pieces" | "pair" | "metre") || "pieces",
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

  if (filters.ownerStaffId) {
    where.owner_staff_id = filters.ownerStaffId;
  }

  if (filters.search) {
    where.OR = [
      { product_name: { contains: filters.search, mode: "insensitive" } },
      { serial_number: { contains: filters.search, mode: "insensitive" } },
      { resp_person: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await withRetry(() => Promise.all([
    db.equipment.findMany({
      where,
      include: { kit: true, vendor: true, owner_staff: true },
      orderBy: { id: "desc" },
      take: filters.limit,
      skip: filters.offset,
    }),
    db.equipment.count({ where }),
  ]));

  // Derive "in use today" from active bookings covering today (date-based), rather
  // than a permanent status column. An item is in use if it — or its kit — has a
  // non-returned booking whose date range includes today.
  const todayStr = new Date().toISOString().slice(0, 10);
  const equipmentIds = rows.map((r) => r.id);
  const kitIds = rows.map((r) => r.kit_id).filter((id): id is number => id != null);

  const activeBookings = (equipmentIds.length || kitIds.length)
    ? await db.equipmentBooking.findMany({
        where: {
          status: { not: "RETURNED" },
          booked_from: { lte: todayStr },
          booked_to: { gte: todayStr },
          OR: [
            { equipment_id: { in: equipmentIds } },
            ...(kitIds.length ? [{ kit_id: { in: kitIds } }] : []),
          ],
        },
        select: { equipment_id: true, kit_id: true },
      })
    : [];

  const inUseEquipmentIds = new Set(activeBookings.map((b) => b.equipment_id).filter((id): id is number => id != null));
  const inUseKitIds = new Set(activeBookings.map((b) => b.kit_id).filter((id): id is number => id != null));

  return {
    items: rows.map((r) => ({
      ...mapEquipment(r),
      inUseToday: inUseEquipmentIds.has(r.id) || (r.kit_id != null && inUseKitIds.has(r.kit_id)),
    })),
    total,
  };
}

export async function getEquipmentById(id: number): Promise<Equipment | undefined> {
  const row = await db.equipment.findUnique({
    where: { id },
    include: { kit: true, vendor: true, owner_staff: true },
  });
  if (!row) return undefined;

  // Derive "in use today" from an active booking covering today (date-based).
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeBooking = await db.equipmentBooking.findFirst({
    where: {
      status: { not: "RETURNED" },
      booked_from: { lte: todayStr },
      booked_to: { gte: todayStr },
      OR: [
        { equipment_id: id },
        ...(row.kit_id != null ? [{ kit_id: row.kit_id }] : []),
      ],
    },
    select: { id: true },
  });

  return { ...mapEquipment(row), inUseToday: !!activeBooking };
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

  // History includes bookings made directly for this item AND bookings of the kit
  // this item belongs to (so kit-level usage shows in the item's history too).
  const bookings = await db.equipmentBooking.findMany({
    where: {
      OR: [
        { equipment_id: id },
        ...(item.kitId ? [{ kit_id: item.kitId }] : []),
      ],
    },
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

export interface EquipmentHistoryItem {
  id: number;
  equipmentId: number | null;
  equipmentName: string;
  kitName: string | null;
  position: string | null;
  bookedFrom: string;
  bookedTo: string;
  status: string;
  source: "IN_HOUSE" | "VENDOR" | "STAFF";
  vendorName: string | null;
  ownerStaffName: string | null;
  inquiryId: string;
  eventName: string | null;
  eventType: string | null;
  clientName: string | null;
}

// Global usage history — every equipment booking across all items, newest first.
// Optional filters: free-text search (equipment/event/client) and booking status.
export async function getEquipmentHistory(filters: { search?: string; status?: string } = {}): Promise<EquipmentHistoryItem[]> {
  const where: any = {};
  if (filters.status) {
    where.status = filters.status;
  }

  const bookings = await db.equipmentBooking.findMany({
    where,
    include: {
      equipment: true,
      kit: true,
      vendor: true,
      rental_owner_staff: true,
      inquiry: { include: { client: true } },
    },
    orderBy: { booked_from: "desc" },
  });

  const mapped: EquipmentHistoryItem[] = bookings.map((b: any) => {
    const source: "IN_HOUSE" | "VENDOR" | "STAFF" = b.vendor_id
      ? "VENDOR"
      : b.rental_owner_staff_id
      ? "STAFF"
      : "IN_HOUSE";
    return {
      id: b.id,
      equipmentId: b.equipment_id,
      equipmentName: b.equipment?.product_name || b.kit?.name || "Equipment",
      kitName: b.kit?.name || null,
      position: b.position,
      bookedFrom: b.booked_from,
      bookedTo: b.booked_to,
      status: b.status,
      source,
      vendorName: b.vendor?.name || null,
      ownerStaffName: b.rental_owner_staff?.name || null,
      inquiryId: b.inquiry_id,
      eventName: b.inquiry?.event_name || null,
      eventType: b.inquiry?.event_type || null,
      clientName: b.inquiry?.client?.name || null,
    };
  });

  // Free-text search is applied in-memory (across equipment / event / client names)
  // so a single box can match any of them.
  const q = filters.search?.trim().toLowerCase();
  if (!q) return mapped;
  return mapped.filter((r) =>
    [r.equipmentName, r.eventName, r.eventType, r.clientName, r.vendorName, r.ownerStaffName]
      .some((v) => v?.toLowerCase().includes(q))
  );
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
      quantity_unit: item.quantityUnit || "pieces",
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
      quantity_unit: merged.quantityUnit || "pieces",
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

  // Active bookings covering today → used to count "in use" (availability is
  // date-based, not the stale status column). Matches getEquipment's inUseToday.
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeBookings = await db.equipmentBooking.findMany({
    where: {
      status: { not: "RETURNED" },
      booked_from: { lte: todayStr },
      booked_to: { gte: todayStr },
    },
    select: { equipment_id: true, kit_id: true },
  });
  const inUseEquipmentIds = new Set(
    activeBookings.map((b) => b.equipment_id).filter((id): id is number => id != null)
  );
  const inUseKitIds = new Set(
    activeBookings.map((b) => b.kit_id).filter((id): id is number => id != null)
  );

  let totalValue = 0;
  let totalCount = 0;

  // Operational status counts. "In use" overlaps with the AVAILABLE status, so it
  // is derived from bookings; "available" = AVAILABLE and not in use today.
  const statusCounts = { inUse: 0, available: 0, maintenance: 0 };

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

    const inUse = inUseEquipmentIds.has(eq.id) || (eq.kit_id != null && inUseKitIds.has(eq.kit_id));
    if (eq.status === "MAINTENANCE") {
      statusCounts.maintenance += 1;
    } else if (inUse) {
      statusCounts.inUse += 1;
    } else if (eq.status === "AVAILABLE") {
      statusCounts.available += 1;
    }

    if (categoryMap[eq.category]) {
      categoryMap[eq.category].count += 1;
      categoryMap[eq.category].value += val;
    }
  }

  return {
    totalValue,
    totalCount,
    statusCounts,
    categories: categoryMap,
  };
}

export async function getEquipmentCategoryCounts(): Promise<Record<string, number>> {
  const equipment = await db.equipment.findMany({
    where: { status: { notIn: ["RETIRED", "SOLD"] } },
    select: { category: true },
  });

  const counts: Record<string, number> = { ALL: equipment.length };

  for (const eq of equipment) {
    counts[eq.category] = (counts[eq.category] || 0) + 1;
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

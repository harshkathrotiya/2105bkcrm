/**
 * queries/kits.ts — typed DB helpers for the kits table using Prisma
 */

import { db } from "@/lib/db";
import type { Kit } from "@/lib/types";
import { isEquipmentBooked } from "./equipment";

function mapKit(row: any): Kit {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mainBodyId: row.main_body_id,
    createdAt: row.created_at,
    items: row.equipment ? row.equipment.map((eq: any) => ({
      id: eq.id,
      productName: eq.product_name,
      category: eq.category,
      quantity: eq.quantity,
      serialNumber: eq.serial_number,
      bodyName: eq.body_name,
      kitId: eq.kit_id,
      kitName: row.name,
      respPerson: eq.resp_person,
      purchaseDate: eq.purchase_date,
      purchaseFrom: eq.purchase_from,
      billNumber: eq.bill_number,
      purchasePrice: eq.purchase_price,
      status: eq.status,
      notes: eq.notes,
      createdAt: eq.created_at,
      updatedAt: eq.updated_at,
    })) : [],
  };
}

export async function getAllKits(): Promise<Kit[]> {
  const rows = await db.kit.findMany({
    orderBy: { id: "desc" },
    include: {
      equipment: {
        where: { status: { not: "RETIRED" } }
      }
    }
  });
  return rows.map(mapKit);
}

type KitAvailabilityStatus = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";

const OUT_OF_SERVICE_STATUSES = new Set(["MAINTENANCE", "SOLD", "RETIRED"]);

function getKitAvailabilityFromBookings(
  kit: Kit,
  bookedEquipmentIds: Set<number>,
  bookedKitIds: Set<number>,
): KitAvailabilityStatus {
  const items = kit.items ?? [];
  const mainBodyId = kit.mainBodyId;
  const accessories = items.filter((item) => item.id !== mainBodyId);

  const isItemUnavailable = (item: NonNullable<Kit["items"]>[number]) =>
    bookedEquipmentIds.has(item.id) ||
    (item.kitId !== null && item.kitId !== undefined && bookedKitIds.has(item.kitId)) ||
    OUT_OF_SERVICE_STATUSES.has(item.status);

  if (mainBodyId) {
    const mainBodyItem = items.find((item) => item.id === mainBodyId);
    if (!mainBodyItem || isItemUnavailable(mainBodyItem)) {
      return "UNAVAILABLE";
    }

    return accessories.some(isItemUnavailable) ? "PARTIAL" : "AVAILABLE";
  }

  if (accessories.length === 0) return "AVAILABLE";

  const unavailableAccessoriesCount = accessories.filter(isItemUnavailable).length;
  if (unavailableAccessoriesCount === 0) return "AVAILABLE";
  if (unavailableAccessoriesCount === accessories.length) return "UNAVAILABLE";
  return "PARTIAL";
}

export async function getAllKitsWithAvailability(startDate: string, endDate: string): Promise<Kit[]> {
  const kits = await getAllKits();
  const equipmentIds = kits.flatMap((kit) => kit.items?.map((item) => item.id) ?? []);
  const kitIds = kits.map((kit) => kit.id);

  if (equipmentIds.length === 0 && kitIds.length === 0) {
    return kits.map((kit) => ({ ...kit, availabilityStatus: "AVAILABLE" }));
  }

  const bookings = await db.equipmentBooking.findMany({
    where: {
      status: { not: "RETURNED" },
      booked_from: { lte: endDate },
      booked_to: { gte: startDate },
      OR: [
        { equipment_id: { in: equipmentIds } },
        { kit_id: { in: kitIds } },
      ],
    },
    select: {
      equipment_id: true,
      kit_id: true,
    },
  });

  const bookedEquipmentIds = new Set(
    bookings
      .map((booking) => booking.equipment_id)
      .filter((id): id is number => id !== null),
  );
  const bookedKitIds = new Set(
    bookings
      .map((booking) => booking.kit_id)
      .filter((id): id is number => id !== null),
  );

  return kits.map((kit) => ({
    ...kit,
    availabilityStatus: getKitAvailabilityFromBookings(kit, bookedEquipmentIds, bookedKitIds),
  }));
}

export async function getKitById(id: number): Promise<Kit | undefined> {
  const row = await db.kit.findUnique({
    where: { id },
    include: {
      equipment: {
        where: { status: { not: "RETIRED" } }
      }
    }
  });
  if (!row) return undefined;
  return mapKit(row);
}

export async function assignMainBodyToKit(kitId: number, equipmentId: number, quantityToAdd?: number, tx?: any): Promise<number | null> {
  const client = tx || db;
  const eq = await client.equipment.findFirst({
    where: { id: equipmentId, status: { not: "RETIRED" } }
  });
  if (!eq) return null;

  const targetQty = quantityToAdd !== undefined ? quantityToAdd : eq.quantity;
  if (targetQty <= 0 || targetQty > eq.quantity) return null;

  if (targetQty === eq.quantity) {
    await client.equipment.update({
      where: { id: equipmentId },
      data: { kit_id: kitId }
    });
    return equipmentId;
  } else {
    const sns = eq.serial_number ? eq.serial_number.split("\n").map((s: string) => s.trim()).filter(Boolean) : [];
    const addedSns = sns.slice(0, targetQty).join("\n");
    const remainingSns = sns.slice(targetQty).join("\n");

    let newId: number | null = null;
    const runUpdates = async (t: any) => {
      const newEq = await t.equipment.create({
        data: {
          product_name: eq.product_name,
          category: eq.category,
          quantity: targetQty,
          serial_number: addedSns || null,
          body_name: eq.body_name,
          kit_id: kitId,
          resp_person: eq.resp_person,
          purchase_date: eq.purchase_date,
          purchase_from: eq.purchase_from,
          bill_number: eq.bill_number,
          purchase_price: eq.purchase_price,
          status: eq.status,
          notes: eq.notes,
          created_at: eq.created_at,
        }
      });
      newId = newEq.id;

      await t.equipment.update({
        where: { id: equipmentId },
        data: {
          quantity: eq.quantity - targetQty,
          serial_number: remainingSns || null,
        }
      });
    };

    if (tx) {
      await runUpdates(tx);
    } else {
      await db.$transaction(runUpdates);
    }

    return newId;
  }
}

export async function createKit(kit: {
  name: string;
  description?: string | null;
  mainBodyId?: number | null;
  mainBodyQty?: number | null;
  accessories?: { id: number; quantity: number }[];
}): Promise<Kit> {
  const nowStr = new Date().toISOString();
  let resultKit: Kit | null = null;

  await db.$transaction(async (tx) => {
    const newKit = await tx.kit.create({
      data: {
        name: kit.name,
        description: kit.description ?? null,
        main_body_id: null,
        created_at: nowStr,
      }
    });
    const kitId = newKit.id;

    const finalMainBodyId = kit.mainBodyId ?? null;
    if (finalMainBodyId) {
      const linkedId = await assignMainBodyToKit(kitId, finalMainBodyId, kit.mainBodyQty ?? undefined, tx);
      if (linkedId) {
        await tx.kit.update({
          where: { id: kitId },
          data: { main_body_id: linkedId }
        });
      }
    }

    if (kit.accessories && kit.accessories.length > 0) {
      for (const acc of kit.accessories) {
        const added = await addEquipmentToKit(kitId, acc.id, acc.quantity, tx);
        if (!added) {
          throw new Error(`Failed to add accessory ${acc.id} to kit`);
        }
      }
    }

    const row = await tx.kit.findUnique({
      where: { id: kitId },
      include: {
        equipment: {
          where: { status: { not: "RETIRED" } }
        }
      }
    });
    if (!row) {
      throw new Error("Failed to retrieve newly created kit");
    }
    resultKit = mapKit(row);
  });

  if (!resultKit) {
    throw new Error("Failed to retrieve newly created kit");
  }
  return resultKit;
}

export async function updateKit(id: number, patch: Partial<{ name: string; description: string | null; mainBodyId: number | null; mainBodyQty: number | null }>): Promise<Kit | undefined> {
  const existing = await getKitById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  let finalMainBodyId = merged.mainBodyId;

  if (patch.mainBodyId !== undefined) {
    if (existing.mainBodyId && existing.mainBodyId !== patch.mainBodyId) {
      await db.equipment.updateMany({
        where: { id: existing.mainBodyId, kit_id: id },
        data: { kit_id: null }
      });
    }
    if (patch.mainBodyId) {
      const qty = patch.mainBodyQty !== undefined && patch.mainBodyQty !== null ? patch.mainBodyQty : undefined;
      const linkedId = await assignMainBodyToKit(id, patch.mainBodyId, qty);
      if (linkedId) {
        finalMainBodyId = linkedId;
      }
    }
  }

  await db.kit.update({
    where: { id },
    data: {
      name: merged.name,
      description: merged.description ?? null,
      main_body_id: finalMainBodyId ?? null,
    }
  });

  return await getKitById(id);
}

export async function deleteKit(id: number): Promise<boolean> {
  try {
    await db.$transaction(async (tx) => {
      await tx.equipment.updateMany({
        where: { kit_id: id },
        data: { kit_id: null }
      });
      await tx.kit.delete({ where: { id } });
    });
    return true;
  } catch (err) {
    return false;
  }
}

export async function addEquipmentToKit(kitId: number, equipmentId: number, quantityToAdd?: number, tx?: any): Promise<boolean> {
  const client = tx || db;
  const eq = await client.equipment.findFirst({
    where: { id: equipmentId, status: { not: "RETIRED" } }
  });
  if (!eq) return false;

  const targetQty = quantityToAdd !== undefined ? quantityToAdd : eq.quantity;
  if (targetQty <= 0 || targetQty > eq.quantity) return false;

  if (targetQty === eq.quantity) {
    await client.equipment.update({
      where: { id: equipmentId },
      data: { kit_id: kitId }
    });
    return true;
  } else {
    const sns = eq.serial_number ? eq.serial_number.split("\n").map((s: string) => s.trim()).filter(Boolean) : [];
    const addedSns = sns.slice(0, targetQty).join("\n");
    const remainingSns = sns.slice(targetQty).join("\n");

    const runUpdates = async (t: any) => {
      await t.equipment.create({
        data: {
          product_name: eq.product_name,
          category: eq.category,
          quantity: targetQty,
          serial_number: addedSns || null,
          body_name: eq.body_name,
          kit_id: kitId,
          resp_person: eq.resp_person,
          purchase_date: eq.purchase_date,
          purchase_from: eq.purchase_from,
          bill_number: eq.bill_number,
          purchase_price: eq.purchase_price,
          status: eq.status,
          notes: eq.notes,
          created_at: eq.created_at,
        }
      });

      await t.equipment.update({
        where: { id: equipmentId },
        data: {
          quantity: eq.quantity - targetQty,
          serial_number: remainingSns || null,
        }
      });
    };

    if (tx) {
      await runUpdates(tx);
    } else {
      await db.$transaction(runUpdates);
    }

    return true;
  }
}

export async function removeEquipmentFromKit(kitId: number, equipmentId: number): Promise<boolean> {
  const kit = await getKitById(kitId);
  if (kit && kit.mainBodyId === equipmentId) {
    await db.kit.update({
      where: { id: kitId },
      data: { main_body_id: null }
    });
  }
  
  const result = await db.equipment.updateMany({
    where: { id: equipmentId, kit_id: kitId },
    data: { kit_id: null }
  });
  
  return result.count > 0;
}

export async function getKitAvailabilityStatus(kitId: number, startDate: string, endDate: string): Promise<"AVAILABLE" | "PARTIAL" | "UNAVAILABLE"> {
  const kit = await getKitById(kitId);
  if (!kit) return "UNAVAILABLE";

  const mainBodyId = kit.mainBodyId;
  const accessories = kit.items?.filter(item => item.id !== mainBodyId) || [];

  if (mainBodyId) {
    const mainBodyItem = kit.items?.find(item => item.id === mainBodyId);
    if (!mainBodyItem) {
      return "UNAVAILABLE";
    }

    const isMainBodyBooked = await isEquipmentBooked(mainBodyId, startDate, endDate);
    const isMainBodyOutOfService = mainBodyItem.status === "MAINTENANCE" || mainBodyItem.status === "SOLD" || mainBodyItem.status === "RETIRED";

    if (isMainBodyBooked || isMainBodyOutOfService) {
      return "UNAVAILABLE";
    }

    let hasMissingAccessory = false;
    for (const item of accessories) {
      const isBooked = await isEquipmentBooked(item.id, startDate, endDate);
      const isOutOfService = item.status === "MAINTENANCE" || item.status === "SOLD" || item.status === "RETIRED";
      if (isBooked || isOutOfService) {
        hasMissingAccessory = true;
        break;
      }
    }

    return hasMissingAccessory ? "PARTIAL" : "AVAILABLE";
  } else {
    if (accessories.length === 0) return "AVAILABLE";

    let bookedAccessoriesCount = 0;
    for (const item of accessories) {
      const isBooked = await isEquipmentBooked(item.id, startDate, endDate);
      const isOutOfService = item.status === "MAINTENANCE" || item.status === "SOLD" || item.status === "RETIRED";
      if (isBooked || isOutOfService) {
        bookedAccessoriesCount++;
      }
    }

    if (bookedAccessoriesCount === 0) return "AVAILABLE";
    if (bookedAccessoriesCount === accessories.length) return "UNAVAILABLE";
    return "PARTIAL";
  }
}

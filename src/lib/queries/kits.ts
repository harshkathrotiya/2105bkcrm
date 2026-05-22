/**
 * queries/kits.ts — typed DB helpers for the kits table
 */

import { db } from "@/lib/db";
import type { Kit } from "@/lib/types";
import { rowToEquipment, EquipmentRow, isEquipmentBooked } from "./equipment";

export interface KitRow {
  id: number;
  name: string;
  description: string | null;
  main_body_id: number | null;
  created_at: string;
}

function rowToKit(row: KitRow): Kit {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mainBodyId: row.main_body_id,
    createdAt: row.created_at,
    items: [],
  };
}

export function getAllKits(): Kit[] {
  const rows = db.prepare("SELECT * FROM kits ORDER BY id DESC").all() as KitRow[];
  const kits = rows.map(rowToKit);

  // Load items for each kit
  for (const kit of kits) {
    const items = db.prepare("SELECT * FROM equipment WHERE kit_id = ? AND status != 'RETIRED'").all(kit.id) as EquipmentRow[];
    kit.items = items.map(rowToEquipment);
  }

  return kits;
}

export function getKitById(id: number): Kit | undefined {
  const row = db.prepare("SELECT * FROM kits WHERE id = ?").get(id) as KitRow | undefined;
  if (!row) return undefined;

  const kit = rowToKit(row);
  const items = db.prepare("SELECT * FROM equipment WHERE kit_id = ? AND status != 'RETIRED'").all(id) as EquipmentRow[];
  kit.items = items.map(rowToEquipment);

  return kit;
}

export function assignMainBodyToKit(kitId: number, equipmentId: number, quantityToAdd?: number): number | null {
  const eq = db.prepare("SELECT * FROM equipment WHERE id = ? AND status != 'RETIRED'").get(equipmentId) as EquipmentRow | undefined;
  if (!eq) return null;

  const targetQty = quantityToAdd !== undefined ? quantityToAdd : eq.quantity;
  if (targetQty <= 0 || targetQty > eq.quantity) return null;

  if (targetQty === eq.quantity) {
    // Link the whole row
    db.prepare("UPDATE equipment SET kit_id = ? WHERE id = ?").run(kitId, equipmentId);
    return equipmentId;
  } else {
    // Split the row!
    const sns = eq.serial_number ? eq.serial_number.split("\n").map(s => s.trim()).filter(Boolean) : [];
    const addedSns = sns.slice(0, targetQty).join("\n");
    const remainingSns = sns.slice(targetQty).join("\n");

    let newId: number | null = null;
    db.transaction(() => {
      // 1. Insert new row with targetQty linked to the kit
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
        productName: eq.product_name,
        category: eq.category,
        quantity: targetQty,
        serialNumber: addedSns || null,
        bodyName: eq.body_name,
        kitId: kitId,
        respPerson: eq.resp_person,
        purchaseDate: eq.purchase_date,
        purchaseFrom: eq.purchase_from,
        billNumber: eq.bill_number,
        purchasePrice: eq.purchase_price,
        status: eq.status,
        notes: eq.notes,
        createdAt: eq.created_at,
      });
      newId = res.lastInsertRowid as number;

      // 2. Update existing row to have remaining quantity and remaining serial numbers
      db.prepare(`
        UPDATE equipment SET
          quantity = ?,
          serial_number = ?
        WHERE id = ?
      `).run(eq.quantity - targetQty, remainingSns || null, equipmentId);
    })();

    return newId;
  }
}

export function createKit(kit: {
  name: string;
  description?: string | null;
  mainBodyId?: number | null;
  mainBodyQty?: number | null;
  accessories?: { id: number; quantity: number }[];
}): Kit {
  const nowStr = new Date().toISOString();
  let kitId = 0;

  db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO kits (name, description, main_body_id, created_at)
      VALUES (@name, @description, NULL, @createdAt)
    `).run({
      name: kit.name,
      description: kit.description ?? null,
      createdAt: nowStr,
    });

    kitId = res.lastInsertRowid as number;

    const finalMainBodyId = kit.mainBodyId ?? null;
    if (finalMainBodyId) {
      const linkedId = assignMainBodyToKit(kitId, finalMainBodyId, kit.mainBodyQty ?? undefined);
      if (linkedId) {
        db.prepare("UPDATE kits SET main_body_id = ? WHERE id = ?").run(linkedId, kitId);
      }
    }

    // Link accessories if provided
    if (kit.accessories && kit.accessories.length > 0) {
      for (const acc of kit.accessories) {
        const added = addEquipmentToKit(kitId, acc.id, acc.quantity);
        if (!added) {
          throw new Error(`Failed to add accessory ${acc.id} to kit`);
        }
      }
    }
  })();

  const newKit = getKitById(kitId);
  if (!newKit) {
    throw new Error("Failed to retrieve newly created kit");
  }
  return newKit;
}

export function updateKit(id: number, patch: Partial<{ name: string; description: string | null; mainBodyId: number | null; mainBodyQty: number | null }>): Kit | undefined {
  const existing = getKitById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  db.transaction(() => {
    let finalMainBodyId = merged.mainBodyId;

    if (patch.mainBodyId !== undefined) {
      // Unlink old main body if it belonged to this kit
      if (existing.mainBodyId && existing.mainBodyId !== patch.mainBodyId) {
        db.prepare("UPDATE equipment SET kit_id = NULL WHERE id = ? AND kit_id = ?").run(existing.mainBodyId, id);
      }
      // Link new main body
      if (patch.mainBodyId) {
        const qty = patch.mainBodyQty !== undefined && patch.mainBodyQty !== null ? patch.mainBodyQty : undefined;
        const linkedId = assignMainBodyToKit(id, patch.mainBodyId, qty);
        if (linkedId) {
          finalMainBodyId = linkedId;
        }
      }
    }

    db.prepare(`
      UPDATE kits SET
        name = @name,
        description = @description,
        main_body_id = @mainBodyId
      WHERE id = @id
    `).run({
      id,
      name: merged.name,
      description: merged.description ?? null,
      mainBodyId: finalMainBodyId ?? null,
    });
  })();

  return getKitById(id);
}

export function deleteKit(id: number): boolean {
  // Clear kit_id from all equipment items first
  db.prepare("UPDATE equipment SET kit_id = NULL WHERE kit_id = ?").run(id);
  const result = db.prepare("DELETE FROM kits WHERE id = ?").run(id);
  return result.changes > 0;
}

export function addEquipmentToKit(kitId: number, equipmentId: number, quantityToAdd?: number): boolean {
  const eq = db.prepare("SELECT * FROM equipment WHERE id = ? AND status != 'RETIRED'").get(equipmentId) as EquipmentRow | undefined;
  if (!eq) return false;

  const targetQty = quantityToAdd !== undefined ? quantityToAdd : eq.quantity;
  if (targetQty <= 0 || targetQty > eq.quantity) return false;

  if (targetQty === eq.quantity) {
    // Just link the whole row
    const result = db.prepare("UPDATE equipment SET kit_id = ? WHERE id = ?").run(kitId, equipmentId);
    return result.changes > 0;
  } else {
    // Split the row!
    // Parse serial numbers
    const sns = eq.serial_number ? eq.serial_number.split("\n").map(s => s.trim()).filter(Boolean) : [];
    const addedSns = sns.slice(0, targetQty).join("\n");
    const remainingSns = sns.slice(targetQty).join("\n");

    db.transaction(() => {
      // 1. Insert new row with targetQty linked to the kit
      db.prepare(`
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
        productName: eq.product_name,
        category: eq.category,
        quantity: targetQty,
        serialNumber: addedSns || null,
        bodyName: eq.body_name,
        kitId: kitId,
        respPerson: eq.resp_person,
        purchaseDate: eq.purchase_date,
        purchaseFrom: eq.purchase_from,
        billNumber: eq.bill_number,
        purchasePrice: eq.purchase_price,
        status: eq.status,
        notes: eq.notes,
        createdAt: eq.created_at,
      });

      // 2. Update existing row to have remaining quantity and remaining serial numbers
      db.prepare(`
        UPDATE equipment SET
          quantity = ?,
          serial_number = ?
        WHERE id = ?
      `).run(eq.quantity - targetQty, remainingSns || null, equipmentId);
    })();

    return true;
  }
}

export function removeEquipmentFromKit(kitId: number, equipmentId: number): boolean {
  // If this item was the main body, clear main_body_id on the kit
  const kit = getKitById(kitId);
  if (kit && kit.mainBodyId === equipmentId) {
    db.prepare("UPDATE kits SET main_body_id = NULL WHERE id = ?").run(kitId);
  }
  const result = db.prepare("UPDATE equipment SET kit_id = NULL WHERE id = ? AND kit_id = ?").run(equipmentId, kitId);
  return result.changes > 0;
}

/**
 * Checks kit availability status for a given event date range.
 * Returns 'AVAILABLE', 'PARTIAL', or 'UNAVAILABLE'.
 */
export function getKitAvailabilityStatus(kitId: number, startDate: string, endDate: string): "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" {
  const kit = getKitById(kitId);
  if (!kit) return "UNAVAILABLE";

  const mainBodyId = kit.mainBodyId;
  const accessories = kit.items?.filter(item => item.id !== mainBodyId) || [];

  if (mainBodyId) {
    const mainBodyItem = kit.items?.find(item => item.id === mainBodyId);
    if (!mainBodyItem) {
      return "UNAVAILABLE";
    }

    const isMainBodyBooked = isEquipmentBooked(mainBodyId, startDate, endDate);
    const isMainBodyOutOfService = mainBodyItem.status === "MAINTENANCE" || mainBodyItem.status === "SOLD" || mainBodyItem.status === "RETIRED";

    if (isMainBodyBooked || isMainBodyOutOfService) {
      return "UNAVAILABLE";
    }

    // Main body is available, check accessories
    let hasMissingAccessory = false;
    for (const item of accessories) {
      const isBooked = isEquipmentBooked(item.id, startDate, endDate);
      const isOutOfService = item.status === "MAINTENANCE" || item.status === "SOLD" || item.status === "RETIRED";
      if (isBooked || isOutOfService) {
        hasMissingAccessory = true;
        break;
      }
    }

    return hasMissingAccessory ? "PARTIAL" : "AVAILABLE";
  } else {
    // If no main body, check accessories
    if (accessories.length === 0) return "AVAILABLE";

    let bookedAccessoriesCount = 0;
    for (const item of accessories) {
      const isBooked = isEquipmentBooked(item.id, startDate, endDate);
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


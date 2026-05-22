/**
 * queries/kits.ts — typed DB helpers for the kits table
 */

import { db } from "@/lib/db";
import type { Kit, Equipment } from "@/lib/types";
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

export function createKit(kit: { name: string; description?: string | null; mainBodyId?: number | null }): Kit {
  const nowStr = new Date().toISOString();
  
  const res = db.prepare(`
    INSERT INTO kits (name, description, main_body_id, created_at)
    VALUES (@name, @description, @mainBodyId, @createdAt)
  `).run({
    name: kit.name,
    description: kit.description ?? null,
    mainBodyId: kit.mainBodyId ?? null,
    createdAt: nowStr,
  });

  const kitId = res.lastInsertRowid as number;

  // If a main body is selected, update that equipment item's kit_id
  if (kit.mainBodyId) {
    db.prepare("UPDATE equipment SET kit_id = ? WHERE id = ?").run(kitId, kit.mainBodyId);
  }

  return {
    id: kitId,
    name: kit.name,
    description: kit.description,
    mainBodyId: kit.mainBodyId,
    createdAt: nowStr,
    items: [],
  };
}

export function updateKit(id: number, patch: Partial<{ name: string; description: string | null; mainBodyId: number | null }>): Kit | undefined {
  const existing = getKitById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

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
    mainBodyId: merged.mainBodyId ?? null,
  });

  // If mainBodyId changed, make sure the new main body has its kit_id updated
  if (patch.mainBodyId !== undefined) {
    // Unlink old main body if it belonged to this kit
    if (existing.mainBodyId && existing.mainBodyId !== patch.mainBodyId) {
      db.prepare("UPDATE equipment SET kit_id = NULL WHERE id = ? AND kit_id = ?").run(existing.mainBodyId, id);
    }
    // Link new main body
    if (patch.mainBodyId) {
      db.prepare("UPDATE equipment SET kit_id = ? WHERE id = ?").run(id, patch.mainBodyId);
    }
  }

  return getKitById(id);
}

export function deleteKit(id: number): boolean {
  // Clear kit_id from all equipment items first
  db.prepare("UPDATE equipment SET kit_id = NULL WHERE kit_id = ?").run(id);
  const result = db.prepare("DELETE FROM kits WHERE id = ?").run(id);
  return result.changes > 0;
}

export function addEquipmentToKit(kitId: number, equipmentId: number): boolean {
  const result = db.prepare("UPDATE equipment SET kit_id = ? WHERE id = ? AND status != 'RETIRED'").run(kitId, equipmentId);
  return result.changes > 0;
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

  if (!mainBodyId) {
    // If no main body, check accessories
    if (accessories.length === 0) return "AVAILABLE";
    
    // Check if any accessories are booked
    let bookedAccessoriesCount = 0;
    for (const item of accessories) {
      const isBooked = isEquipmentBooked(item.id, startDate, endDate);
      if (isBooked) bookedAccessoriesCount++;
    }

    if (bookedAccessoriesCount === 0) return "AVAILABLE";
    if (bookedAccessoriesCount === accessories.length) return "UNAVAILABLE";
    return "PARTIAL";
  }

  // Check if main body is booked
  const isMainBodyBooked = isEquipmentBooked(mainBodyId, startDate, endDate);
  if (isMainBodyBooked) {
    return "UNAVAILABLE";
  }

  // Check accessories
  let bookedAccessoriesCount = 0;
  for (const item of accessories) {
    const isBooked = isEquipmentBooked(item.id, startDate, endDate);
    if (isBooked) bookedAccessoriesCount++;
  }

  if (bookedAccessoriesCount === 0) return "AVAILABLE";
  return "PARTIAL";
}


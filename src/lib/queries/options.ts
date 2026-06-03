/**
 * queries/options.ts — user-managed dropdown option lists.
 *
 * Backs the dynamic "add your own" dropdowns for staff roles and quotation
 * positions. On first read of a given type, the built-in defaults are seeded
 * so the list is never empty.
 */

import { db } from "@/lib/db";
import { STAFF_ROLES, EQUIPMENT_CATEGORIES } from "@/lib/validate";

export type OptionType = "STAFF_ROLE" | "QUOTATION_POSITION" | "EQUIPMENT_CATEGORY";

export interface OptionItem {
  id: number;
  type: OptionType;
  value: string;
  metaEquip?: string | null;
  metaRate?: number | null;
  sortOrder: number;
}

// Default quotation positions (migrated from the old hardcoded POSITION_MAP).
const DEFAULT_POSITIONS: { value: string; equip: string; rate: number }[] = [
  { value: "Center Tally", equip: "FS6", rate: 20000 },
  { value: "Center Semi Wide", equip: "FS6", rate: 20000 },
  { value: "Center Full Wide", equip: "Z150", rate: 8000 },
  { value: "Left Side", equip: "FS6", rate: 20000 },
  { value: "Right Side", equip: "FS6", rate: 20000 },
  { value: "Wireless 1", equip: "FX3 + Wireless", rate: 10000 },
  { value: "Wireless 2", equip: "FX3 + Wireless", rate: 10000 },
  { value: "Wireless 3", equip: "FX3 + Wireless", rate: 10000 },
  { value: "Wireless 4", equip: "FX3 + Wireless", rate: 10000 },
  { value: "Photo 1", equip: "DSLR", rate: 8000 },
  { value: "Photo 2", equip: "DSLR", rate: 8000 },
  { value: "Photo 3", equip: "DSLR", rate: 8000 },
  { value: "Photo 4", equip: "DSLR", rate: 8000 },
  { value: "Source PC", equip: "PC", rate: 5000 },
  { value: "Youtube Live", equip: "Live PC", rate: 5000 },
  { value: "Editor", equip: "Editor", rate: 5000 },
  { value: "Photo Editor", equip: "Photo Editor", rate: 5000 },
  { value: "Video Crane 32 Feet", equip: "Crane 32 Feet", rate: 15000 },
  { value: "Drone", equip: "Drone", rate: 12000 },
  { value: "FPV", equip: "FPV", rate: 15000 },
];

function mapOption(row: any): OptionItem {
  return {
    id: row.id,
    type: row.type,
    value: row.value,
    metaEquip: row.meta_equip,
    metaRate: row.meta_rate,
    sortOrder: row.sort_order,
  };
}

/** Seed built-in defaults for a type if none exist yet. */
async function ensureSeeded(type: OptionType): Promise<void> {
  const count = await db.optionList.count({ where: { type } });
  if (count > 0) return;

  const nowStr = new Date().toISOString();
  if (type === "STAFF_ROLE") {
    await db.optionList.createMany({
      data: STAFF_ROLES.map((value, i) => ({
        type,
        value,
        sort_order: i,
        created_at: nowStr,
      })),
      skipDuplicates: true,
    });
  } else if (type === "QUOTATION_POSITION") {
    await db.optionList.createMany({
      data: DEFAULT_POSITIONS.map((p, i) => ({
        type,
        value: p.value,
        meta_equip: p.equip,
        meta_rate: p.rate,
        sort_order: i,
        created_at: nowStr,
      })),
      skipDuplicates: true,
    });
  } else if (type === "EQUIPMENT_CATEGORY") {
    await db.optionList.createMany({
      data: EQUIPMENT_CATEGORIES.map((value, i) => ({
        type,
        value,
        sort_order: i,
        created_at: nowStr,
      })),
      skipDuplicates: true,
    });
  }
}

export async function getOptions(type: OptionType): Promise<OptionItem[]> {
  await ensureSeeded(type);
  const rows = await db.optionList.findMany({
    where: { type, is_active: 1 },
    orderBy: [{ sort_order: "asc" }, { value: "asc" }],
  });
  return rows.map(mapOption);
}

export async function addOption(
  type: OptionType,
  value: string,
  meta?: { equip?: string | null; rate?: number | null }
): Promise<OptionItem> {
  const nowStr = new Date().toISOString();
  const max = await db.optionList.aggregate({
    _max: { sort_order: true },
    where: { type },
  });
  const sortOrder = (max._max.sort_order ?? -1) + 1;

  const row = await db.optionList.upsert({
    where: { type_value: { type, value } },
    create: {
      type,
      value,
      meta_equip: meta?.equip ?? null,
      meta_rate: meta?.rate ?? null,
      sort_order: sortOrder,
      created_at: nowStr,
    },
    // Re-activate if it was previously removed
    update: {
      is_active: 1,
      meta_equip: meta?.equip ?? undefined,
      meta_rate: meta?.rate ?? undefined,
    },
  });
  return mapOption(row);
}

export async function removeOption(type: OptionType, value: string): Promise<boolean> {
  try {
    await db.optionList.update({
      where: { type_value: { type, value } },
      data: { is_active: 0 },
    });
    return true;
  } catch {
    return false;
  }
}

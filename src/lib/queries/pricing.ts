/**
 * queries/pricing.ts — client-specific equipment rate overrides.
 *
 * Each equipment item carries a `default_rate` (the standard per-day rental rate
 * charged to clients). When a particular client gets a different price for a given
 * piece of equipment, that exception lives in the `client_equipment_rates` table.
 *
 * Effective rate for (client, equipment) = override rate if one exists, else the
 * equipment's default_rate, else 0.
 */

import { db } from "@/lib/db";
import type { ClientEquipmentRate } from "@/lib/types";

function mapRate(row: any): ClientEquipmentRate {
  return {
    id: row.id,
    clientId: row.client_id,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment?.product_name,
    rate: row.rate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All client-specific overrides for a single client. */
export async function getClientRates(clientId: string): Promise<ClientEquipmentRate[]> {
  const rows = await db.clientEquipmentRate.findMany({
    where: { client_id: clientId },
    include: { equipment: true },
    orderBy: { equipment: { product_name: "asc" } },
  });
  return rows.map(mapRate);
}

/**
 * Effective per-day rate a client pays for a piece of equipment.
 * Falls back to the equipment's default_rate when no override exists.
 */
export async function getEffectiveRate(clientId: string, equipmentId: number): Promise<number> {
  const override = await db.clientEquipmentRate.findUnique({
    where: { client_id_equipment_id: { client_id: clientId, equipment_id: equipmentId } },
  });
  if (override) return override.rate;

  const eq = await db.equipment.findUnique({
    where: { id: equipmentId },
    select: { default_rate: true },
  });
  return eq?.default_rate ?? 0;
}

/**
 * Effective rates for many equipment items at once (used when building a quotation).
 * Returns a map of equipmentId -> { rate, isOverride }.
 */
export async function getEffectiveRates(
  clientId: string,
  equipmentIds: number[]
): Promise<Record<number, { rate: number; isOverride: boolean }>> {
  if (equipmentIds.length === 0) return {};

  const [overrides, equipment] = await Promise.all([
    db.clientEquipmentRate.findMany({
      where: { client_id: clientId, equipment_id: { in: equipmentIds } },
    }),
    db.equipment.findMany({
      where: { id: { in: equipmentIds } },
      select: { id: true, default_rate: true },
    }),
  ]);

  const overrideMap = new Map<number, number>();
  for (const o of overrides) overrideMap.set(o.equipment_id, o.rate);

  const result: Record<number, { rate: number; isOverride: boolean }> = {};
  for (const eq of equipment) {
    if (overrideMap.has(eq.id)) {
      result[eq.id] = { rate: overrideMap.get(eq.id)!, isOverride: true };
    } else {
      result[eq.id] = { rate: eq.default_rate ?? 0, isOverride: false };
    }
  }
  return result;
}

/** Create or update a client-specific override (upsert on the unique pair). */
export async function setClientRate(
  clientId: string,
  equipmentId: number,
  rate: number
): Promise<ClientEquipmentRate> {
  const nowStr = new Date().toISOString();
  const row = await db.clientEquipmentRate.upsert({
    where: { client_id_equipment_id: { client_id: clientId, equipment_id: equipmentId } },
    create: {
      client_id: clientId,
      equipment_id: equipmentId,
      rate,
      created_at: nowStr,
    },
    update: {
      rate,
      updated_at: nowStr,
    },
    include: { equipment: true },
  });
  return mapRate(row);
}

/** Remove a client-specific override (client reverts to the default rate). */
export async function deleteClientRate(clientId: string, equipmentId: number): Promise<boolean> {
  try {
    await db.clientEquipmentRate.delete({
      where: { client_id_equipment_id: { client_id: clientId, equipment_id: equipmentId } },
    });
    return true;
  } catch {
    return false;
  }
}

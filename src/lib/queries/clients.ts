/**
 * queries/clients.ts — typed DB helpers for the clients table using Prisma
 */

import { db, withRetry } from "@/lib/db";
import type { Client } from "@/lib/types";

// ── Queries ──────────────────────────────────────────────────────────────────
export async function getAllClients(): Promise<Client[]> {
  const rows = await db.client.findMany({
    orderBy: { created_at: "desc" },
  });
  return rows.map((r: any) => ({
    id: r.id,
    initials: r.initials,
    bg: r.bg,
    fg: r.fg,
    name: r.name,
    contact: r.contact,
    mobile: r.mobile,
    email: r.email,
    gst: r.gst,
    pan: r.pan,
    addressLine: r.address_line,
    city: r.city,
    district: r.district,
    state: r.state,
    pin: r.pin,
    status: r.status as "Active" | "Inactive",
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  }));
}

export async function getClientById(id: string): Promise<Client | undefined> {
  const row = await db.client.findUnique({
    where: { id },
  });
  if (!row) return undefined;
  return {
    id: row.id,
    initials: row.initials,
    bg: row.bg,
    fg: row.fg,
    name: row.name,
    contact: row.contact,
    mobile: row.mobile,
    email: row.email,
    gst: row.gst,
    pan: row.pan,
    addressLine: row.address_line,
    city: row.city,
    district: row.district,
    state: row.state,
    pin: row.pin,
    status: row.status as "Active" | "Inactive",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function createClient(client: Client): Promise<Client> {
  await db.client.create({
    data: {
      id: client.id,
      initials: client.initials,
      bg: client.bg,
      fg: client.fg,
      name: client.name,
      contact: client.contact,
      mobile: client.mobile,
      email: client.email,
      gst: client.gst,
      pan: client.pan,
      address_line: client.addressLine,
      city: client.city,
      district: client.district,
      state: client.state,
      pin: client.pin,
      status: client.status,
      created_at: client.createdAt,
    },
  });
  return client;
}

export async function updateClient(
  id: string,
  patch: Partial<Omit<Client, "id">>
): Promise<Client | undefined> {
  const existing = await getClientById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  await db.client.update({
    where: { id },
    data: {
      initials: merged.initials,
      bg: merged.bg,
      fg: merged.fg,
      name: merged.name,
      contact: merged.contact,
      mobile: merged.mobile,
      email: merged.email,
      gst: merged.gst,
      pan: merged.pan,
      address_line: merged.addressLine,
      city: merged.city,
      district: merged.district,
      state: merged.state,
      pin: merged.pin,
      status: merged.status,
      updated_at: merged.updatedAt ?? null,
    },
  });

  return await getClientById(id);
}

export async function deleteClient(id: string): Promise<boolean> {
  try {
    await db.client.delete({ where: { id } });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * queries/clients.ts — typed DB helpers for the clients table
 */

import { db } from "@/lib/db";
import type { Client } from "@/lib/types";

// ── Row → domain type ────────────────────────────────────────────────────────
interface ClientRow {
  id: string;
  initials: string;
  bg: string;
  fg: string;
  name: string;
  contact: string;
  mobile: string;
  email: string;
  gst: string;
  pan: string;
  address_line: string;
  city: string;
  district: string;
  state: string;
  pin: string;
  status: "Active" | "Inactive";
  created_at: string;
  updated_at: string | null;
}

function rowToClient(row: ClientRow): Client {
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
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

// ── Queries ──────────────────────────────────────────────────────────────────
export function getAllClients(): Client[] {
  const rows = db
    .prepare("SELECT * FROM clients ORDER BY created_at DESC")
    .all() as ClientRow[];
  return rows.map(rowToClient);
}

export function getClientById(id: string): Client | undefined {
  const row = db
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(id) as ClientRow | undefined;
  return row ? rowToClient(row) : undefined;
}

export function createClient(client: Client): Client {
  db.prepare(`
    INSERT INTO clients
      (id,initials,bg,fg,name,contact,mobile,email,gst,pan,
       address_line,city,district,state,pin,status,created_at)
    VALUES
      (@id,@initials,@bg,@fg,@name,@contact,@mobile,@email,@gst,@pan,
       @addressLine,@city,@district,@state,@pin,@status,@createdAt)
  `).run({
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
    addressLine: client.addressLine,
    city: client.city,
    district: client.district,
    state: client.state,
    pin: client.pin,
    status: client.status,
    createdAt: client.createdAt,
  });
  return client;
}

export function updateClient(
  id: string,
  patch: Partial<Omit<Client, "id">>
): Client | undefined {
  const existing = getClientById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };

  db.prepare(`
    UPDATE clients SET
      initials=@initials, bg=@bg, fg=@fg, name=@name, contact=@contact,
      mobile=@mobile, email=@email, gst=@gst, pan=@pan,
      address_line=@addressLine, city=@city, district=@district,
      state=@state, pin=@pin, status=@status, updated_at=@updatedAt
    WHERE id=@id
  `).run({
    id,
    initials: merged.initials,
    bg: merged.bg,
    fg: merged.fg,
    name: merged.name,
    contact: merged.contact,
    mobile: merged.mobile,
    email: merged.email,
    gst: merged.gst,
    pan: merged.pan,
    addressLine: merged.addressLine,
    city: merged.city,
    district: merged.district,
    state: merged.state,
    pin: merged.pin,
    status: merged.status,
    updatedAt: merged.updatedAt ?? null,
  });

  return getClientById(id);
}

export function deleteClient(id: string): boolean {
  const result = db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return result.changes > 0;
}

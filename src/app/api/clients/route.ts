/**
 * GET  /api/clients        — list all clients
 * POST /api/clients        — create a new client
 */

import type { NextRequest } from "next/server";
import { getAllClients, createClient } from "@/lib/queries/clients";
import { generateId } from "@/lib/types";

export async function GET() {
  try {
    const clients = getAllClients();
    return Response.json(clients);
  } catch (err) {
    console.error("[GET /api/clients]", err);
    return Response.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.name?.trim()) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }
    if (!body.mobile?.trim()) {
      return Response.json({ error: "mobile is required" }, { status: 400 });
    }
    if (!body.contact?.trim()) {
      return Response.json({ error: "contact is required" }, { status: 400 });
    }

    const client = createClient({
      id: body.id ?? `client-${generateId()}`,
      initials: body.initials ?? body.name.slice(0, 2).toUpperCase(),
      bg: body.bg ?? "#EEEDFE",
      fg: body.fg ?? "#3C3489",
      name: body.name.trim(),
      contact: body.contact.trim(),
      mobile: body.mobile.trim(),
      email: body.email?.trim() ?? "",
      gst: body.gst?.trim() ?? "",
      pan: body.pan?.trim() ?? "",
      addressLine: body.addressLine?.trim() ?? "",
      city: body.city?.trim() ?? "",
      district: body.district?.trim() ?? "",
      state: body.state?.trim() ?? "",
      pin: body.pin?.trim() ?? "",
      status: body.status ?? "Active",
      createdAt: body.createdAt ?? new Date().toISOString().split("T")[0],
    });

    return Response.json(client, { status: 201 });
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return Response.json({ error: "Failed to create client" }, { status: 500 });
  }
}

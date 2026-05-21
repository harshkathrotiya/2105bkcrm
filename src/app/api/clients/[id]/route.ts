/**
 * GET   /api/clients/[id]  — get a single client
 * PATCH /api/clients/[id]  — update a client (partial)
 * DELETE /api/clients/[id] — delete a client
 */

import type { NextRequest } from "next/server";
import { getClientById, updateClient, deleteClient } from "@/lib/queries/clients";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClientById(id);
    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }
    return Response.json(client);
  } catch (err) {
    console.error("[GET /api/clients/[id]]", err);
    return Response.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = updateClient(id, { ...body, updatedAt: new Date().toISOString().split("T")[0] });
    if (!updated) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/clients/[id]]", err);
    return Response.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteClient(id);
    if (!deleted) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/clients/[id]]", err);
    return Response.json({ error: "Failed to delete client" }, { status: 500 });
  }
}

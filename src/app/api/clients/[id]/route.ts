/**
 * GET    /api/clients/[id]  — get a single client
 * PATCH  /api/clients/[id]  — update a client (partial)
 * DELETE /api/clients/[id]  — delete a client
 */

import type { NextRequest } from "next/server";
import { getClientById, updateClient, deleteClient } from "@/lib/queries/clients";
import { Validator } from "@/lib/validate";

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

    const v = new Validator(body);
    if (body.name !== undefined) v.minLength("name", 2).maxLength("name", 100);
    if (body.mobile !== undefined) v.phone("mobile");
    if (body.contact !== undefined) v.minLength("contact", 2, "contact person").maxLength("contact", 100, "contact person");
    if (body.email !== undefined) v.email("email");
    if (body.gst !== undefined) v.gst("gst", "GST number");
    if (body.pan !== undefined) v.pan("pan", "PAN number");
    if (body.pin !== undefined) v.pin("pin", "PIN code");
    if (body.addressLine !== undefined) v.maxLength("addressLine", 200, "address");
    if (v.hasErrors()) return v.response();

    const updated = updateClient(id, {
      ...body,
      name: body.name?.trim(),
      contact: body.contact?.trim(),
      mobile: body.mobile?.trim(),
      email: body.email?.trim(),
      gst: body.gst?.trim(),
      pan: body.pan?.trim(),
      pin: body.pin?.trim(),
      addressLine: body.addressLine?.trim(),
      city: body.city?.trim(),
      district: body.district?.trim(),
      state: body.state?.trim(),
      updatedAt: new Date().toISOString().split("T")[0],
    });
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

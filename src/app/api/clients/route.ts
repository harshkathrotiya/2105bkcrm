/**
 * GET  /api/clients  — list all clients
 * POST /api/clients  — create a new client
 */

import type { NextRequest } from "next/server";
import { getAllClients, createClient } from "@/lib/queries/clients";
import { generateId } from "@/lib/types";
import { Validator } from "@/lib/validate";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const clients = await getAllClients();
    return Response.json(clients);
  } catch (err) {
    console.error("[GET /api/clients]", err);
    return Response.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const v = new Validator(body);
    v.required("name").minLength("name", 2).maxLength("name", 100);
    v.required("mobile").phone("mobile");
    v.required("contact", "contact person").minLength("contact", 2).maxLength("contact", 100);
    v.email("email");
    v.gst("gst", "GST number");
    v.pan("pan", "PAN number");
    v.pin("pin", "PIN code");
    v.maxLength("addressLine", 200, "address");
    v.maxLength("city", 100);
    v.maxLength("district", 100);
    v.maxLength("state", 100);
    if (v.hasErrors()) return v.response();

    const existing = await db.client.findFirst({ where: { mobile: body.mobile.trim() } });
    if (existing) {
      return Response.json({ error: "A client with this mobile number already exists." }, { status: 409 });
    }

    const client = await createClient({
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

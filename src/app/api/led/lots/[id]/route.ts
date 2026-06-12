/**
 * PATCH  /api/led/lots/[id]  — update a LED company lot
 * DELETE /api/led/lots/[id]  — delete a LED company lot
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

function deriveLot(lot: {
  id: number;
  name: string;
  led_type: string;
  cabinet_height_mm: number;
  cabinet_width_mm: number;
  cabinets_per_box: number;
  total_cabinets: number;
  created_at: string;
  updated_at?: string | null;
}) {
  return {
    id: lot.id,
    name: lot.name,
    ledType: lot.led_type,
    cabinetHeightMm: lot.cabinet_height_mm,
    cabinetWidthMm: lot.cabinet_width_mm,
    cabinetsPerBox: lot.cabinets_per_box,
    totalCabinets: lot.total_cabinets,
    createdAt: lot.created_at,
    updatedAt: lot.updated_at ?? null,
    sqftForPricing: lot.total_cabinets * 4,
    totalBoxes: Math.ceil(lot.total_cabinets / lot.cabinets_per_box),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lotId = parseInt(id, 10);
    if (isNaN(lotId)) {
      return Response.json({ error: "Invalid lot id" }, { status: 400 });
    }

    const existing = await db.ledCompanyLot.findUnique({ where: { id: lotId } });
    if (!existing) {
      return Response.json({ error: "Lot not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.ledType !== undefined) data.led_type = body.ledType;
    if (body.cabinetHeightMm !== undefined) data.cabinet_height_mm = Number(body.cabinetHeightMm);
    if (body.cabinetWidthMm !== undefined) data.cabinet_width_mm = Number(body.cabinetWidthMm);
    if (body.cabinetsPerBox !== undefined) data.cabinets_per_box = Number(body.cabinetsPerBox);
    if (body.totalCabinets !== undefined) data.total_cabinets = Number(body.totalCabinets);

    const updated = await db.ledCompanyLot.update({ where: { id: lotId }, data });
    return Response.json(deriveLot(updated));
  } catch (err) {
    console.error("[PATCH /api/led/lots/[id]]", err);
    return Response.json({ error: "Failed to update lot" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lotId = parseInt(id, 10);
    if (isNaN(lotId)) {
      return Response.json({ error: "Invalid lot id" }, { status: 400 });
    }

    await db.ledCompanyLot.delete({ where: { id: lotId } });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/led/lots/[id]]", err);
    return Response.json({ error: "Failed to delete lot" }, { status: 500 });
  }
}

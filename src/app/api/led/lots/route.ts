/**
 * GET  /api/led/lots  — list all LED company lots
 * POST /api/led/lots  — create a new LED company lot
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
    // derived
    sqftForPricing: lot.total_cabinets * 4,
    totalBoxes: Math.ceil(lot.total_cabinets / lot.cabinets_per_box),
  };
}

export async function GET(_req: NextRequest) {
  try {
    const lots = await db.ledCompanyLot.findMany({ orderBy: { name: "asc" } });
    return Response.json(lots.map(deriveLot));
  } catch (err) {
    console.error("[GET /api/led/lots]", err);
    return Response.json({ error: "Failed to fetch lots" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, ledType, cabinetHeightMm, cabinetWidthMm, cabinetsPerBox, totalCabinets } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }
    if (typeof totalCabinets !== "number" || totalCabinets <= 0) {
      return Response.json({ error: "totalCabinets must be > 0" }, { status: 400 });
    }
    const cpb = typeof cabinetsPerBox === "number" ? cabinetsPerBox : 5;
    if (cpb < 1) {
      return Response.json({ error: "cabinetsPerBox must be >= 1" }, { status: 400 });
    }

    const lot = await db.ledCompanyLot.create({
      data: {
        name: name.trim(),
        led_type: ledType ?? "P4",
        cabinet_height_mm: typeof cabinetHeightMm === "number" ? cabinetHeightMm : 576,
        cabinet_width_mm: typeof cabinetWidthMm === "number" ? cabinetWidthMm : 576,
        cabinets_per_box: cpb,
        total_cabinets: totalCabinets,
        created_at: new Date().toISOString(),
      },
    });

    return Response.json(deriveLot(lot), { status: 201 });
  } catch (err) {
    console.error("[POST /api/led/lots]", err);
    return Response.json({ error: "Failed to create lot" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { getAllKits, createKit, getKitAvailabilityStatus } from "@/lib/queries/kits";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const kits = getAllKits();

    if (startDate && endDate) {
      const kitsWithStatus = kits.map((kit) => ({
        ...kit,
        availabilityStatus: getKitAvailabilityStatus(kit.id, startDate, endDate),
      }));
      return Response.json(kitsWithStatus);
    }

    return Response.json(kits);
  } catch (err) {
    console.error("[GET /api/kits]", err);
    return Response.json({ error: "Failed to fetch kits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const kit = createKit({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      mainBodyId: body.mainBodyId ? parseInt(body.mainBodyId, 10) : null,
    });

    return Response.json(kit, { status: 201 });
  } catch (err) {
    console.error("[POST /api/kits]", err);
    return Response.json({ error: "Failed to create kit" }, { status: 500 });
  }
}

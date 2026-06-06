import type { NextRequest } from "next/server";
import { getStaffEquipmentRentals } from "@/lib/queries/staff";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rentals = await getStaffEquipmentRentals(parseInt(id, 10));
    return Response.json(rentals);
  } catch (err) {
    console.error("[GET /api/staff/[id]/rentals]", err);
    return Response.json({ error: "Failed to fetch staff equipment rentals" }, { status: 500 });
  }
}

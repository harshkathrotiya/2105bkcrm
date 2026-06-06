import type { NextRequest } from "next/server";
import { getEquipmentHistory } from "@/lib/queries/equipment";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    const history = await getEquipmentHistory({ search, status });
    return Response.json(history);
  } catch (err) {
    console.error("[GET /api/equipment/history]", err);
    return Response.json({ error: "Failed to fetch equipment history" }, { status: 500 });
  }
}

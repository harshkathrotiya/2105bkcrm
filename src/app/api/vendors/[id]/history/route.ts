import type { NextRequest } from "next/server";
import { getVendorHistory, getVendorYtdSpend } from "@/lib/queries/vendors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendorId = parseInt(id, 10);

    const history = getVendorHistory(vendorId);
    const ytdSpend = getVendorYtdSpend(vendorId);

    return Response.json({
      history,
      ytdSpend,
    });
  } catch (err) {
    console.error("[GET /api/vendors/[id]/history]", err);
    return Response.json({ error: "Failed to fetch vendor history" }, { status: 500 });
  }
}

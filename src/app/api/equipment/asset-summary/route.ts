import { getAssetSummary } from "@/lib/queries/equipment";

export async function GET() {
  try {
    const summary = await getAssetSummary();
    return Response.json(summary);
  } catch (err) {
    console.error("[GET /api/equipment/asset-summary]", err);
    return Response.json({ error: "Failed to calculate asset summary" }, { status: 500 });
  }
}

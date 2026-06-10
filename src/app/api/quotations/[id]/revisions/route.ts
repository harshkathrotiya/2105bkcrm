/**
 * GET /api/quotations/[id]/revisions — list all saved revisions for a quotation
 */

import type { NextRequest } from "next/server";
import { getQuotationRevisions } from "@/lib/queries/quotations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const revisions = await getQuotationRevisions(id);
    return Response.json(revisions);
  } catch (err) {
    console.error("[GET /api/quotations/[id]/revisions]", err);
    return Response.json({ error: "Failed to fetch revisions" }, { status: 500 });
  }
}

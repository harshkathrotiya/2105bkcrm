import type { NextRequest } from "next/server";
import { getClientRates, setClientRate } from "@/lib/queries/pricing";
import { Validator } from "@/lib/validate";

// GET /api/clients/[id]/rates — list this client's equipment rate overrides
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rates = await getClientRates(id);
    return Response.json(rates);
  } catch (err) {
    console.error("[GET /api/clients/[id]/rates]", err);
    return Response.json({ error: "Failed to fetch client rates" }, { status: 500 });
  }
}

// POST /api/clients/[id]/rates — create or update an override { equipmentId, rate }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const v = new Validator(body);
    v.required("equipmentId", "equipment").positiveInteger("equipmentId", "equipment ID");
    v.required("rate").nonNegativeNumber("rate");
    if (v.hasErrors()) return v.response();

    const rate = await setClientRate(id, parseInt(body.equipmentId, 10), parseFloat(body.rate));
    return Response.json(rate, { status: 201 });
  } catch (err) {
    console.error("[POST /api/clients/[id]/rates]", err);
    return Response.json({ error: "Failed to save client rate" }, { status: 500 });
  }
}

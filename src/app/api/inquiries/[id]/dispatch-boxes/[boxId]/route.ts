/**
 * PATCH  /api/inquiries/[id]/dispatch-boxes/[boxId]  — update a dispatch box
 * DELETE /api/inquiries/[id]/dispatch-boxes/[boxId]  — delete a dispatch box
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Validator } from "@/lib/validate";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; boxId: string }> }
) {
  try {
    const { boxId } = await params;
    const body = await request.json();

    const v = new Validator(body);
    if (body.boxNumber !== undefined) v.positiveInteger("boxNumber", "box number");
    if (body.contents !== undefined) v.minLength("contents", 2).maxLength("contents", 200);
    if (body.cabinets !== undefined) v.positiveInteger("cabinets");
    if (body.vehicle !== undefined) v.oneOf("vehicle", ["Vehicle 1", "Vehicle 2"]);
    if (body.source !== undefined) v.oneOf("source", ["BK_MEDIA", "VENDOR"]);
    if (v.hasErrors()) return v.response();

    const data: any = {};
    if (body.boxNumber !== undefined) data.box_number = parseInt(body.boxNumber, 10);
    if (body.contents !== undefined) data.contents = body.contents.trim();
    if (body.cabinets !== undefined) data.cabinets = parseInt(body.cabinets, 10);
    if (body.vehicle !== undefined) data.vehicle = body.vehicle;
    if (body.source !== undefined) data.source = body.source;

    const box = await db.ledDispatchBox.update({
      where: { id: parseInt(boxId, 10) },
      data,
    });

    return Response.json({
      id: box.id,
      inquiryId: box.inquiry_id,
      boxNumber: box.box_number,
      contents: box.contents,
      cabinets: box.cabinets,
      vehicle: box.vehicle,
      source: box.source,
    });
  } catch (err) {
    console.error("[PATCH /api/inquiries/[id]/dispatch-boxes/[boxId]]", err);
    return Response.json({ error: "Failed to update dispatch box" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; boxId: string }> }
) {
  try {
    const { boxId } = await params;
    await db.ledDispatchBox.delete({
      where: { id: parseInt(boxId, 10) },
    });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/inquiries/[id]/dispatch-boxes/[boxId]]", err);
    return Response.json({ error: "Failed to delete dispatch box" }, { status: 500 });
  }
}

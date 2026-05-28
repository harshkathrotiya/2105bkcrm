/**
 * GET  /api/inquiries/[id]/dispatch-boxes  — list all dispatch boxes for an inquiry
 * POST /api/inquiries/[id]/dispatch-boxes  — add a new dispatch box to an inquiry
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Validator } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const boxes = await db.ledDispatchBox.findMany({
      where: { inquiry_id: id },
      orderBy: { box_number: "asc" },
    });
    return Response.json(boxes.map((b) => ({
      id: b.id,
      inquiryId: b.inquiry_id,
      boxNumber: b.box_number,
      contents: b.contents,
      cabinets: b.cabinets,
      vehicle: b.vehicle,
      source: b.source,
    })));
  } catch (err) {
    console.error("[GET /api/inquiries/[id]/dispatch-boxes]", err);
    return Response.json({ error: "Failed to fetch dispatch boxes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const v = new Validator(body);
    v.required("boxNumber", "box number").positiveInteger("boxNumber", "box number");
    v.required("contents").minLength("contents", 2).maxLength("contents", 200);
    v.required("cabinets").positiveInteger("cabinets");
    v.required("vehicle").oneOf("vehicle", ["Vehicle 1", "Vehicle 2"]);
    v.required("source").oneOf("source", ["BK_MEDIA", "VENDOR"]);
    if (v.hasErrors()) return v.response();

    const box = await db.ledDispatchBox.create({
      data: {
        inquiry_id: id,
        box_number: parseInt(body.boxNumber, 10),
        contents: body.contents.trim(),
        cabinets: parseInt(body.cabinets, 10),
        vehicle: body.vehicle,
        source: body.source,
      },
    });

    return Response.json({
      id: box.id,
      inquiryId: box.inquiry_id,
      boxNumber: box.box_number,
      contents: box.contents,
      cabinets: box.cabinets,
      vehicle: box.vehicle,
      source: box.source,
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/inquiries/[id]/dispatch-boxes]", err);
    return Response.json({ error: "Failed to create dispatch box" }, { status: 500 });
  }
}

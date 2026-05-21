/**
 * GET   /api/inquiries/[id]  — get a single inquiry
 * PATCH /api/inquiries/[id]  — update an inquiry (partial)
 * DELETE /api/inquiries/[id] — delete an inquiry
 */

import type { NextRequest } from "next/server";
import { getInquiryById, updateInquiry, deleteInquiry } from "@/lib/queries/inquiries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inquiry = getInquiryById(id);
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }
    return Response.json(inquiry);
  } catch (err) {
    console.error("[GET /api/inquiries/[id]]", err);
    return Response.json({ error: "Failed to fetch inquiry" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = updateInquiry(id, { ...body, updatedAt: new Date().toISOString().split("T")[0] });
    if (!updated) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/inquiries/[id]]", err);
    return Response.json(
      { error: "Failed to update inquiry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteInquiry(id);
    if (!deleted) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/inquiries/[id]]", err);
    return Response.json(
      { error: "Failed to delete inquiry" },
      { status: 500 }
    );
  }
}

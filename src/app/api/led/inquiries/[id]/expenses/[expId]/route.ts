/**
 * PATCH  /api/led/inquiries/[id]/expenses/[expId]  — update an expense
 * DELETE /api/led/inquiries/[id]/expenses/[expId]  — delete an expense
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expId: string }> }
) {
  try {
    const { id, expId } = await params;
    const eid = parseInt(expId, 10);
    if (isNaN(eid)) {
      return Response.json({ error: "Invalid expId" }, { status: 400 });
    }

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const existing = await db.ledExpense.findUnique({ where: { id: eid } });
    if (!existing || existing.inquiry_id !== id) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    const validCategories = ["TRANSPORT", "FOOD", "MISC", "CUSTOM"];
    if (body.category !== undefined) {
      if (!validCategories.includes(body.category)) {
        return Response.json(
          { error: `category must be one of: ${validCategories.join(", ")}` },
          { status: 400 }
        );
      }
      data.category = body.category;
    }
    if (body.label !== undefined) data.label = String(body.label).trim();
    if (body.amount !== undefined) data.amount = Number(body.amount);

    const updated = await db.ledExpense.update({ where: { id: eid }, data });

    return Response.json({
      id: updated.id,
      inquiryId: updated.inquiry_id,
      category: updated.category,
      label: updated.label,
      amount: updated.amount,
      createdAt: updated.created_at,
    });
  } catch (err) {
    console.error("[PATCH /api/led/inquiries/[id]/expenses/[expId]]", err);
    return Response.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expId: string }> }
) {
  try {
    const { id, expId } = await params;
    const eid = parseInt(expId, 10);
    if (isNaN(eid)) {
      return Response.json({ error: "Invalid expId" }, { status: 400 });
    }

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const existing = await db.ledExpense.findUnique({ where: { id: eid } });
    if (!existing || existing.inquiry_id !== id) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    await db.ledExpense.delete({ where: { id: eid } });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/led/inquiries/[id]/expenses/[expId]]", err);
    return Response.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}

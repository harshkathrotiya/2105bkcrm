/**
 * GET  /api/led/inquiries/[id]/expenses  — P&L summary and expense list
 * POST /api/led/inquiries/[id]/expenses  — create an expense
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

function daysBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const eventDays = daysBetween(inquiry.start_date, inquiry.end_date);

    // Compute screen area: prefer positions sum, fallback to inquiry field
    const positions = await db.ledScreenPosition.findMany({ where: { inquiry_id: id } });
    let screenAreaSqft = inquiry.screen_area_sqft ?? 0;
    if (positions.length > 0) {
      screenAreaSqft = positions.reduce(
        (sum, p) => sum + p.target_height_ft * p.target_width_ft * p.quantity,
        0
      );
    }

    const ratePerSqft = inquiry.rate_per_sqft ?? 0;
    const clientBilling = screenAreaSqft * ratePerSqft * eventDays;

    // Vendor cost
    const vendors = await db.ledVendorArrangement.findMany({ where: { inquiry_id: id } });
    const vendorCost = vendors.reduce(
      (sum, v) => sum + v.sqft * v.rate_per_sqft_per_day * eventDays,
      0
    );

    // Staff cost — sum StaffPayment.amount for this inquiry
    const staffPayments = await db.staffPayment.findMany({ where: { inquiry_id: id } });
    const staffCost = staffPayments.reduce((sum, p) => sum + p.amount, 0);

    // Expenses
    const expenses = await db.ledExpense.findMany({
      where: { inquiry_id: id },
      orderBy: { created_at: "asc" },
    });

    let transport = 0;
    let food = 0;
    let misc = 0;
    let extraTotal = 0;

    for (const e of expenses) {
      switch (e.category) {
        case "TRANSPORT":
          transport += e.amount;
          break;
        case "FOOD":
          food += e.amount;
          break;
        case "MISC":
          misc += e.amount;
          break;
        case "CUSTOM":
          extraTotal += e.amount;
          break;
      }
    }

    const totalExpenses = transport + food + misc + extraTotal + staffCost + vendorCost;
    const netProfit = clientBilling - totalExpenses;
    const profitMargin =
      clientBilling > 0 ? parseFloat(((netProfit / clientBilling) * 100).toFixed(2)) : 0;

    const expenseBreakdown = {
      vendorPct:
        totalExpenses > 0
          ? parseFloat(((vendorCost / totalExpenses) * 100).toFixed(1))
          : 0,
      staffPct:
        totalExpenses > 0
          ? parseFloat(((staffCost / totalExpenses) * 100).toFixed(1))
          : 0,
      transportPct:
        totalExpenses > 0
          ? parseFloat(((transport / totalExpenses) * 100).toFixed(1))
          : 0,
      foodPct:
        totalExpenses > 0
          ? parseFloat(((food / totalExpenses) * 100).toFixed(1))
          : 0,
      miscPct:
        totalExpenses > 0
          ? parseFloat(((misc / totalExpenses) * 100).toFixed(1))
          : 0,
      extraPct:
        totalExpenses > 0
          ? parseFloat(((extraTotal / totalExpenses) * 100).toFixed(1))
          : 0,
    };

    return Response.json({
      eventDays,
      screenAreaSqft,
      ratePerSqft,
      clientBilling,
      vendorCost,
      staffCost,
      transport,
      food,
      misc,
      extraTotal,
      totalExpenses,
      netProfit,
      profitMargin,
      expenseBreakdown,
      expenses: expenses.map((e) => ({
        id: e.id,
        inquiryId: e.inquiry_id,
        category: e.category,
        label: e.label,
        amount: e.amount,
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    console.error("[GET /api/led/inquiries/[id]/expenses]", err);
    return Response.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inquiry = await db.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const body = await request.json();
    const { category, label, amount } = body;

    const validCategories = ["TRANSPORT", "FOOD", "MISC", "CUSTOM"];
    if (!category || !validCategories.includes(category)) {
      return Response.json(
        { error: `category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }
    if (typeof amount !== "number" || amount < 0) {
      return Response.json({ error: "amount must be a non-negative number" }, { status: 400 });
    }

    const expense = await db.ledExpense.create({
      data: {
        inquiry_id: id,
        category,
        label: label ? String(label).trim() : "",
        amount,
        created_at: new Date().toISOString(),
      },
    });

    return Response.json(
      {
        id: expense.id,
        inquiryId: expense.inquiry_id,
        category: expense.category,
        label: expense.label,
        amount: expense.amount,
        createdAt: expense.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/led/inquiries/[id]/expenses]", err);
    return Response.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

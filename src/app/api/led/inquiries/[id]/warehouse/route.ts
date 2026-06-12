/**
 * GET /api/led/inquiries/[id]/warehouse  — full LED warehouse view for an inquiry
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

    const [allLots, allocations, vendors, positions] = await Promise.all([
      db.ledCompanyLot.findMany({ orderBy: { name: "asc" } }),
      db.ledWarehouseAllocation.findMany({
        where: { inquiry_id: id },
        include: { lot: true },
      }),
      db.ledVendorArrangement.findMany({ where: { inquiry_id: id } }),
      db.ledScreenPosition.findMany({ where: { inquiry_id: id } }),
    ]);

    // Compute required sqft
    let requiredSqft = 0;
    if (positions.length > 0) {
      requiredSqft = positions.reduce(
        (sum, p) => sum + p.target_height_ft * p.target_width_ft * p.quantity,
        0
      );
    } else {
      requiredSqft = inquiry.screen_area_sqft ?? 0;
    }

    const bkMediaTotal = allocations.reduce((sum, a) => sum + a.allocated_sqft, 0);
    const vendorTotal = vendors.reduce((sum, v) => sum + v.sqft, 0);
    const shortfall = Math.max(0, requiredSqft - bkMediaTotal - vendorTotal);
    const coveragePct = Math.min(
      100,
      Math.round(((bkMediaTotal + vendorTotal) / Math.max(requiredSqft, 1)) * 100)
    );
    const ratePerSqft = inquiry.rate_per_sqft ?? 0;
    const clientBilling = requiredSqft * ratePerSqft * eventDays;
    const vendorCost = vendors.reduce(
      (sum, v) => sum + v.sqft * v.rate_per_sqft_per_day * eventDays,
      0
    );
    const netMargin = clientBilling - vendorCost;

    return Response.json({
      eventDays,
      startDate: inquiry.start_date,
      endDate: inquiry.end_date,
      requiredSqft,
      bkMediaTotal,
      vendorTotal,
      shortfall,
      coveragePct,
      clientBilling,
      vendorCost,
      netMargin,
      ratePerSqft,
      lots: allLots.map((l) => ({
        id: l.id,
        name: l.name,
        ledType: l.led_type,
        cabinetHeightMm: l.cabinet_height_mm,
        cabinetWidthMm: l.cabinet_width_mm,
        cabinetsPerBox: l.cabinets_per_box,
        totalCabinets: l.total_cabinets,
        sqftForPricing: l.total_cabinets * 4,
        totalBoxes: Math.ceil(l.total_cabinets / l.cabinets_per_box),
      })),
      allocations: allocations.map((a) => ({
        id: a.id,
        inquiryId: a.inquiry_id,
        lotId: a.lot_id,
        allocatedSqft: a.allocated_sqft,
        createdAt: a.created_at,
        lot: a.lot
          ? {
              id: a.lot.id,
              name: a.lot.name,
              ledType: a.lot.led_type,
              totalCabinets: a.lot.total_cabinets,
              sqftForPricing: a.lot.total_cabinets * 4,
            }
          : null,
      })),
      vendors: vendors.map((v) => ({
        id: v.id,
        inquiryId: v.inquiry_id,
        vendorName: v.vendor_name,
        ledType: v.led_type,
        sqft: v.sqft,
        ratePerSqftPerDay: v.rate_per_sqft_per_day,
        createdAt: v.created_at,
        totalCost: v.sqft * v.rate_per_sqft_per_day * eventDays,
      })),
    });
  } catch (err) {
    console.error("[GET /api/led/inquiries/[id]/warehouse]", err);
    return Response.json({ error: "Failed to fetch warehouse view" }, { status: 500 });
  }
}

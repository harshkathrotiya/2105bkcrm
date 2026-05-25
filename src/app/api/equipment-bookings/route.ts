import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Validator } from "@/lib/validate";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const v = new Validator(body);
    v.required("inquiryId", "inquiry ID");
    v.required("bookedFrom", "booked from date").date("bookedFrom", "booked from date");
    v.required("bookedTo", "booked to date").date("bookedTo", "booked to date");
    v.dateRange("bookedFrom", "bookedTo");

    // Must have either equipmentId, kitId, or vendorId
    if (!body.equipmentId && !body.kitId && !body.vendorId) {
      return Response.json({ error: "Either equipmentId, kitId, or vendorId is required" }, { status: 400 });
    }
    if (body.equipmentId !== undefined && body.equipmentId !== null) {
      v.positiveInteger("equipmentId", "equipment ID");
    }
    if (body.kitId !== undefined && body.kitId !== null) {
      v.positiveInteger("kitId", "kit ID");
    }
    if (body.vendorId !== undefined && body.vendorId !== null) {
      v.positiveInteger("vendorId", "vendor ID");
    }
    if (body.vendorCostPerDay !== undefined && body.vendorCostPerDay !== null) {
      v.nonNegativeNumber("vendorCostPerDay", "vendor cost per day");
    }
    if (body.position !== undefined && body.position) {
      v.maxLength("position", 100);
    }
    if (v.hasErrors()) return v.response();

    const { inquiryId, equipmentId, kitId, position, bookedFrom, bookedTo, vendorId, vendorCostPerDay } = body;

    // Calculate total vendor cost
    let totalVendorCost = null;
    if (vendorId && vendorCostPerDay !== undefined && vendorCostPerDay !== null) {
      const start = new Date(bookedFrom);
      const end = new Date(bookedTo);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      totalVendorCost = parseFloat(vendorCostPerDay) * days;
    }

    let newBooking;
    await db.$transaction(async (tx) => {
      // Remove any existing booking for the same inquiry + position to prevent duplicates
      if (position) {
        await tx.equipmentBooking.deleteMany({
          where: { inquiry_id: inquiryId, position: position }
        });
      }

      newBooking = await tx.equipmentBooking.create({
        data: {
          inquiry_id: inquiryId,
          equipment_id: equipmentId ? parseInt(equipmentId, 10) : null,
          kit_id: kitId ? parseInt(kitId, 10) : null,
          position: position || null,
          booked_from: bookedFrom,
          booked_to: bookedTo,
          status: 'BOOKED',
          vendor_id: vendorId ? parseInt(vendorId, 10) : null,
          vendor_cost_per_day: vendorCostPerDay ? parseFloat(vendorCostPerDay) : null,
          total_vendor_cost: totalVendorCost,
        }
      });
    });

    return Response.json(newBooking, { status: 201 });
  } catch (err) {
    console.error("[POST /api/equipment-bookings]", err);
    return Response.json({ error: "Failed to create equipment booking" }, { status: 500 });
  }
}

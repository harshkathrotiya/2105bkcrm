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

    // Must have either equipmentId or kitId
    if (!body.equipmentId && !body.kitId) {
      return Response.json({ error: "Either equipmentId or kitId is required" }, { status: 400 });
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

    // Remove any existing booking for the same inquiry + position to prevent duplicates
    if (position) {
      db.prepare("DELETE FROM equipment_bookings WHERE inquiry_id = ? AND position = ?").run(inquiryId, position);
    }

    const res = db.prepare(`
      INSERT INTO equipment_bookings (
        inquiry_id, equipment_id, kit_id, position, booked_from, booked_to,
        status, vendor_id, vendor_cost_per_day, total_vendor_cost
      ) VALUES (
        @inquiryId, @equipmentId, @kitId, @position, @bookedFrom, @bookedTo,
        'BOOKED', @vendorId, @vendorCostPerDay, @totalVendorCost
      )
    `).run({
      inquiryId,
      equipmentId: equipmentId ? parseInt(equipmentId, 10) : null,
      kitId: kitId ? parseInt(kitId, 10) : null,
      position: position || null,
      bookedFrom,
      bookedTo,
      vendorId: vendorId ? parseInt(vendorId, 10) : null,
      vendorCostPerDay: vendorCostPerDay ? parseFloat(vendorCostPerDay) : null,
      totalVendorCost,
    });

    const newBooking = db.prepare("SELECT * FROM equipment_bookings WHERE id = ?").get(res.lastInsertRowid) as any;
    return Response.json(newBooking, { status: 201 });
  } catch (err) {
    console.error("[POST /api/equipment-bookings]", err);
    return Response.json({ error: "Failed to create equipment booking" }, { status: 500 });
  }
}

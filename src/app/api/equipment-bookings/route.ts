import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      inquiryId,
      equipmentId,
      kitId,
      position,
      bookedFrom,
      bookedTo,
      vendorId,
      vendorCostPerDay,
    } = body;

    if (!inquiryId || !bookedFrom || !bookedTo) {
      return Response.json({ error: "inquiryId, bookedFrom, and bookedTo are required" }, { status: 400 });
    }

    // Calculate total vendor cost if vendor is present
    let totalVendorCost = null;
    if (vendorId && vendorCostPerDay !== undefined && vendorCostPerDay !== null) {
      const start = new Date(bookedFrom);
      const end = new Date(bookedTo);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      totalVendorCost = parseFloat(vendorCostPerDay) * days;
    }

    // Remove any existing booking for the same inquiry and position to prevent duplicates
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

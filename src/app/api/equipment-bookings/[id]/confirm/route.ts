import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId) || bookingId <= 0) {
      return Response.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const booking = db.prepare("SELECT * FROM equipment_bookings WHERE id = ?").get(bookingId) as any;
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.status === "OUT" || booking.status === "RETURNED") {
      return Response.json({ error: `Booking is already ${booking.status.toLowerCase()}` }, { status: 409 });
    }

    const nowStr = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        UPDATE equipment_bookings
        SET status = 'OUT', confirmed_by_id = 'system', confirmed_at = ?
        WHERE id = ?
      `).run(nowStr, bookingId);

      if (booking.equipment_id) {
        db.prepare("UPDATE equipment SET status = 'IN_USE' WHERE id = ?").run(booking.equipment_id);
      }

      if (booking.kit_id) {
        db.prepare("UPDATE equipment SET status = 'IN_USE' WHERE kit_id = ?").run(booking.kit_id);
        const kit = db.prepare("SELECT main_body_id FROM kits WHERE id = ?").get(booking.kit_id) as { main_body_id: number | null } | undefined;
        if (kit?.main_body_id) {
          db.prepare("UPDATE equipment SET status = 'IN_USE' WHERE id = ?").run(kit.main_body_id);
        }
      }
    })();

    const updatedBooking = db.prepare("SELECT * FROM equipment_bookings WHERE id = ?").get(bookingId);
    return Response.json(updatedBooking);
  } catch (err) {
    console.error("[PUT /api/equipment-bookings/[id]/confirm]", err);
    return Response.json({ error: "Failed to confirm booking" }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    const booking = db.prepare("SELECT * FROM equipment_bookings WHERE id = ?").get(bookingId) as any;
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    db.transaction(() => {
      // Update booking status to RETURNED
      db.prepare(`
        UPDATE equipment_bookings
        SET status = 'RETURNED'
        WHERE id = ?
      `).run(bookingId);

      // Set equipment status to AVAILABLE
      if (booking.equipment_id) {
        db.prepare("UPDATE equipment SET status = 'AVAILABLE' WHERE id = ?").run(booking.equipment_id);
      }

      // If it's a kit, set kit items to AVAILABLE
      if (booking.kit_id) {
        db.prepare("UPDATE equipment SET status = 'AVAILABLE' WHERE kit_id = ?").run(booking.kit_id);
        const kit = db.prepare("SELECT main_body_id FROM kits WHERE id = ?").get(booking.kit_id) as { main_body_id: number | null } | undefined;
        if (kit?.main_body_id) {
          db.prepare("UPDATE equipment SET status = 'AVAILABLE' WHERE id = ?").run(kit.main_body_id);
        }
      }
    })();

    const updatedBooking = db.prepare("SELECT * FROM equipment_bookings WHERE id = ?").get(bookingId);
    return Response.json(updatedBooking);
  } catch (err) {
    console.error("[PUT /api/equipment-bookings/[id]/return]", err);
    return Response.json({ error: "Failed to return booking" }, { status: 500 });
  }
}

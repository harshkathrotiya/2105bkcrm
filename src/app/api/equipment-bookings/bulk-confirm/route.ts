import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingIds } = body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return Response.json({ error: "bookingIds must be a non-empty array of integers" }, { status: 400 });
    }

    // Validate every ID before touching the DB
    for (let i = 0; i < bookingIds.length; i++) {
      const bid = bookingIds[i];
      if (isNaN(Number(bid)) || !Number.isInteger(Number(bid)) || Number(bid) <= 0) {
        return Response.json({ error: `bookingIds[${i}] must be a positive integer` }, { status: 400 });
      }
    }

    const nowStr = new Date().toISOString();

    db.transaction(() => {
      const getBooking = db.prepare("SELECT * FROM equipment_bookings WHERE id = ?");
      const confirmBooking = db.prepare(`
        UPDATE equipment_bookings
        SET status = 'OUT', confirmed_by_id = 'system', confirmed_at = ?
        WHERE id = ?
      `);
      const setEquipInUse = db.prepare("UPDATE equipment SET status = 'IN_USE' WHERE id = ?");
      const setKitItemsInUse = db.prepare("UPDATE equipment SET status = 'IN_USE' WHERE kit_id = ?");
      const getKitMainBody = db.prepare("SELECT main_body_id FROM kits WHERE id = ?");

      for (const id of bookingIds) {
        const booking = getBooking.get(id) as any;
        if (!booking || booking.status === "OUT" || booking.status === "RETURNED") continue;

        confirmBooking.run(nowStr, id);

        if (booking.equipment_id) {
          setEquipInUse.run(booking.equipment_id);
        }

        if (booking.kit_id) {
          setKitItemsInUse.run(booking.kit_id);
          const kit = getKitMainBody.get(booking.kit_id) as { main_body_id: number | null } | undefined;
          if (kit?.main_body_id) {
            setEquipInUse.run(kit.main_body_id);
          }
        }
      }
    })();

    return Response.json({ success: true, count: bookingIds.length });
  } catch (err) {
    console.error("[POST /api/equipment-bookings/bulk-confirm]", err);
    return Response.json({ error: "Failed to bulk confirm bookings" }, { status: 500 });
  }
}

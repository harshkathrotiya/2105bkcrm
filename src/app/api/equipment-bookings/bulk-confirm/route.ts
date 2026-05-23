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

    await db.$transaction(async (tx) => {
      for (const id of bookingIds) {
        const booking = await tx.equipmentBooking.findUnique({ where: { id } });
        if (!booking || booking.status === "OUT" || booking.status === "RETURNED") continue;

        await tx.equipmentBooking.update({
          where: { id },
          data: { status: 'OUT', confirmed_by_id: 'system', confirmed_at: nowStr }
        });

        if (booking.equipment_id) {
          await tx.equipment.update({
            where: { id: booking.equipment_id },
            data: { status: 'IN_USE' }
          });
        }

        if (booking.kit_id) {
          await tx.equipment.updateMany({
            where: { kit_id: booking.kit_id },
            data: { status: 'IN_USE' }
          });
          const kit = await tx.kit.findUnique({
            where: { id: booking.kit_id },
            select: { main_body_id: true }
          });
          if (kit?.main_body_id) {
            await tx.equipment.update({
              where: { id: kit.main_body_id },
              data: { status: 'IN_USE' }
            });
          }
        }
      }
    });

    return Response.json({ success: true, count: bookingIds.length });
  } catch (err) {
    console.error("[POST /api/equipment-bookings/bulk-confirm]", err);
    return Response.json({ error: "Failed to bulk confirm bookings" }, { status: 500 });
  }
}

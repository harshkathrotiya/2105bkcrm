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

    const booking = await db.equipmentBooking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.status === "RETURNED") {
      return Response.json({ error: "Booking has already been returned" }, { status: 409 });
    }
    if (booking.status !== "OUT" && booking.status !== "BOOKED") {
      return Response.json({ error: "Booking must be in BOOKED or OUT status to be returned" }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      await tx.equipmentBooking.update({
        where: { id: bookingId },
        data: { status: 'RETURNED' }
      });

      if (booking.equipment_id) {
        await tx.equipment.update({
          where: { id: booking.equipment_id },
          data: { status: 'AVAILABLE' }
        });
      }

      if (booking.kit_id) {
        await tx.equipment.updateMany({
          where: { kit_id: booking.kit_id },
          data: { status: 'AVAILABLE' }
        });
        const kit = await tx.kit.findUnique({
          where: { id: booking.kit_id },
          select: { main_body_id: true }
        });
        if (kit?.main_body_id) {
          await tx.equipment.update({
            where: { id: kit.main_body_id },
            data: { status: 'AVAILABLE' }
          });
        }
      }
    });

    const updatedBooking = await db.equipmentBooking.findUnique({
      where: { id: bookingId }
    });
    return Response.json(updatedBooking);
  } catch (err) {
    console.error("[PUT /api/equipment-bookings/[id]/return]", err);
    return Response.json({ error: "Failed to return booking" }, { status: 500 });
  }
}

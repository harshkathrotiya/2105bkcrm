import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "warehouse.view");
    if (!auth.ok) return auth.response!;

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
    if (booking.status === "OUT" || booking.status === "RETURNED") {
      return Response.json({ error: `Booking is already ${booking.status.toLowerCase()}` }, { status: 409 });
    }

    const nowStr = new Date().toISOString();

    // Availability is derived from the booking lifecycle + date range, NOT from a
    // permanent equipment.status flag. Confirming a booking only marks the booking
    // as OUT; the equipment's status column (AVAILABLE / MAINTENANCE / SOLD / …) is
    // left untouched so an item is never permanently stuck as "in use".
    await db.equipmentBooking.update({
      where: { id: bookingId },
      data: { status: 'OUT', confirmed_by_id: 'system', confirmed_at: nowStr }
    });

    const updatedBooking = await db.equipmentBooking.findUnique({
      where: { id: bookingId }
    });
    return Response.json(updatedBooking);
  } catch (err) {
    console.error("[PUT /api/equipment-bookings/[id]/confirm]", err);
    return Response.json({ error: "Failed to confirm booking" }, { status: 500 });
  }
}

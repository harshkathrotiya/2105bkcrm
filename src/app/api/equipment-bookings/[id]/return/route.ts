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
    if (booking.status === "RETURNED") {
      return Response.json({ error: "Booking has already been returned" }, { status: 409 });
    }
    if (booking.status !== "OUT" && booking.status !== "BOOKED") {
      return Response.json({ error: "Booking must be in BOOKED or OUT status to be returned" }, { status: 409 });
    }

    // Returning only closes the booking. Equipment.status is left untouched — we must
    // NOT force it back to AVAILABLE, since that would wrongly clear a genuine
    // MAINTENANCE / SOLD / RETIRED state. Availability is derived from the booking
    // lifecycle + date range. See [id]/confirm/route.ts.
    await db.equipmentBooking.update({
      where: { id: bookingId },
      data: { status: 'RETURNED' }
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

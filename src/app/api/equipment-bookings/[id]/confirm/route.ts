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

    await db.$transaction(async (tx) => {
      await tx.equipmentBooking.update({
        where: { id: bookingId },
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

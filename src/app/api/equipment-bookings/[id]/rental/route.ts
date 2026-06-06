import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import { db } from "@/lib/db";
import { Validator } from "@/lib/validate";

// PUT /api/equipment-bookings/[id]/rental
// Records the equipment rental for a staff-owned equipment booking. The rental
// is ALWAYS credited to the equipment OWNER (equipment.owner_staff_id), regardless
// of which staff member uses the equipment at the event. Setting ratePerDay = 0
// clears the rental.
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

    const body = await request.json();
    const v = new Validator(body);
    v.required("ratePerDay", "rental rate per day").nonNegativeNumber("ratePerDay", "rental rate per day");
    if (v.hasErrors()) return v.response();

    const ratePerDay = parseFloat(body.ratePerDay);

    const booking = await db.equipmentBooking.findUnique({
      where: { id: bookingId },
      include: { equipment: true },
    });
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }
    if (!booking.equipment_id || !booking.equipment) {
      return Response.json(
        { error: "Rental can only be recorded for an equipment booking (not a kit or vendor booking)" },
        { status: 400 }
      );
    }
    if (booking.equipment.ownership_type !== "STAFF" || !booking.equipment.owner_staff_id) {
      return Response.json(
        { error: "Rental applies only to staff-owned equipment" },
        { status: 400 }
      );
    }

    // Days = inclusive span of the booking dates (mirrors vendor cost calc)
    const start = new Date(booking.booked_from);
    const end = new Date(booking.booked_to);
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const ownerStaffId = ratePerDay > 0 ? booking.equipment.owner_staff_id : null;
    const totalRental = ratePerDay > 0 ? ratePerDay * days : null;
    const ratePersisted = ratePerDay > 0 ? ratePerDay : null;

    const updated = await db.equipmentBooking.update({
      where: { id: bookingId },
      data: {
        rental_owner_staff_id: ownerStaffId,
        rental_rate_per_day: ratePersisted,
        total_rental: totalRental,
      },
    });

    return Response.json({
      id: updated.id,
      rentalOwnerStaffId: updated.rental_owner_staff_id,
      rentalRatePerDay: updated.rental_rate_per_day,
      totalRental: updated.total_rental,
      days,
    });
  } catch (err) {
    console.error("[PUT /api/equipment-bookings/[id]/rental]", err);
    return Response.json({ error: "Failed to save equipment rental" }, { status: 500 });
  }
}

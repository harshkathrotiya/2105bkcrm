import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getInquiryById } from "@/lib/queries/inquiries";
import { getAllKits } from "@/lib/queries/kits";
import { getEquipment } from "@/lib/queries/equipment";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const inquiryId = searchParams.get("inquiryId");

    if (!inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }

    const inquiryRow = await db.inquiry.findUnique({
      where: { id: inquiryId },
      include: { client: true }
    });
    if (!inquiryRow) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const inquiry = {
      id: inquiryRow.id,
      clientId: inquiryRow.client_id,
      eventType: inquiryRow.event_type,
      eventName: inquiryRow.event_name || "",
      clientName: inquiryRow.client?.name || "Unknown",
      startDate: inquiryRow.start_date,
      endDate: inquiryRow.end_date,
      startTime: inquiryRow.start_time,
      endTime: inquiryRow.end_time,
      venue: inquiryRow.venue,
      notes: inquiryRow.notes,
      status: inquiryRow.status,
      department: inquiryRow.department,
    };

    // Get the latest quotation for this inquiry (highest revision suffix, then newest created_at)
    const allQuotations = await db.quotation.findMany({
      where: { inquiry_id: inquiryId },
      orderBy: { created_at: "desc" },
    });
    const quotation = allQuotations.sort((a: any, b: any) => {
      const aRev = parseInt(a.quote_no?.match(/-(\d+)$/)?.[1] ?? "-1");
      const bRev = parseInt(b.quote_no?.match(/-(\d+)$/)?.[1] ?? "-1");
      return bRev - aRev;
    })[0] ?? null;
    
    let quoteRows: any[] = [];
    if (quotation) {
      try {
        quoteRows = JSON.parse(quotation.equipment);
      } catch {
        quoteRows = [];
      }
    }

    // Get existing bookings for this inquiry
    const bookings = await db.equipmentBooking.findMany({
      where: { inquiry_id: inquiryId }
    });

    // Get staff assignments for this inquiry (to read/write equipment_rate_per_day)
    const staffAssignments = await db.staffAssignment.findMany({
      where: { inquiry_id: inquiryId },
      include: { staff: true },
    });

    // Fetch all overlapping active bookings for the inquiry dates, excluding this inquiry itself
    const overlappingBookings = await db.equipmentBooking.findMany({
      where: {
        inquiry_id: { not: inquiryId },
        status: { not: "RETURNED" },
        booked_from: { lte: inquiry.endDate },
        booked_to: { gte: inquiry.startDate },
      }
    });

    const bookedEquipmentIds = new Set(
      overlappingBookings
        .filter((b) => b.equipment_id !== null)
        .map((b) => b.equipment_id as number)
    );
    const bookedKitIds = new Set(
      overlappingBookings
        .filter((b) => b.kit_id !== null)
        .map((b) => b.kit_id as number)
    );

    const checkIsEquipmentBooked = (itemId: number, kitId: number | null | undefined): boolean => {
      if (bookedEquipmentIds.has(itemId)) return true;
      if (kitId && bookedKitIds.has(kitId)) return true;
      return false;
    };

    // Fetch all equipment
    const { items: allEquipment } = await getEquipment();
    
    const equipmentWithStatus = allEquipment.map((item) => {
      const isBooked = checkIsEquipmentBooked(item.id, item.kitId);
      
      // Find if booked for THIS inquiry
      const thisBooking = bookings.find(b => b.equipment_id === item.id);

      return {
        ...item,
        isBookedForRange: isBooked,
        bookedForThisInquiry: !!thisBooking,
        bookingDetails: thisBooking || null,
      };
    });

    // Fetch all kits
    const allKitsList = await getAllKits();
    const kitsWithStatus = allKitsList.map((kit) => {
      const thisBooking = bookings.find(b => b.kit_id === kit.id);

      // Replicate getKitAvailabilityStatus logic in-memory using our checkIsEquipmentBooked helper
      const mainBodyId = kit.mainBodyId;
      const accessories = kit.items?.filter((item) => item.id !== mainBodyId) || [];
      let availabilityStatus: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" = "UNAVAILABLE";

      if (mainBodyId) {
        const mainBodyItem = kit.items?.find((item) => item.id === mainBodyId);
        if (!mainBodyItem) {
          availabilityStatus = "UNAVAILABLE";
        } else {
          const isMainBodyBooked = checkIsEquipmentBooked(mainBodyId, kit.id);
          const isMainBodyOutOfService = mainBodyItem.status === "MAINTENANCE" || mainBodyItem.status === "SOLD" || mainBodyItem.status === "RETIRED";

          if (isMainBodyBooked || isMainBodyOutOfService) {
            availabilityStatus = "UNAVAILABLE";
          } else {
            let hasMissingAccessory = false;
            for (const item of accessories) {
              const isBooked = checkIsEquipmentBooked(item.id, kit.id);
              const isOutOfService = item.status === "MAINTENANCE" || item.status === "SOLD" || item.status === "RETIRED";
              if (isBooked || isOutOfService) {
                hasMissingAccessory = true;
                break;
              }
            }
            availabilityStatus = hasMissingAccessory ? "PARTIAL" : "AVAILABLE";
          }
        }
      } else {
        if (accessories.length === 0) {
          availabilityStatus = "AVAILABLE";
        } else {
          let bookedAccessoriesCount = 0;
          for (const item of accessories) {
            const isBooked = checkIsEquipmentBooked(item.id, kit.id);
            const isOutOfService = item.status === "MAINTENANCE" || item.status === "SOLD" || item.status === "RETIRED";
            if (isBooked || isOutOfService) {
              bookedAccessoriesCount++;
            }
          }

          if (bookedAccessoriesCount === 0) {
            availabilityStatus = "AVAILABLE";
          } else if (bookedAccessoriesCount === accessories.length) {
            availabilityStatus = "UNAVAILABLE";
          } else {
            availabilityStatus = "PARTIAL";
          }
        }
      }

      return {
        ...kit,
        availabilityStatus,
        bookedForThisInquiry: !!thisBooking,
        bookingDetails: thisBooking || null,
      };
    });

    return Response.json({
      inquiry,
      quotation: quotation ? {
        id: quotation.id,
        quoteNo: quotation.quote_no,
        equipment: quoteRows,
      } : null,
      bookings: bookings.map((b: any) => ({
        id: b.id,
        equipmentId: b.equipment_id,
        kitId: b.kit_id,
        position: b.position,
        status: b.status,
        vendorId: b.vendor_id,
        vendorCostPerDay: b.vendor_cost_per_day,
        totalVendorCost: b.total_vendor_cost,
        bookedFrom: b.booked_from,
        bookedTo: b.booked_to,
      })),
      equipment: equipmentWithStatus,
      kits: kitsWithStatus,
      staffAssignments: staffAssignments.map((a: any) => ({
        id: a.id,
        staffId: a.staff_id,
        staffName: a.staff?.name || "",
        positionName: a.position_name,
        positionNo: a.position_no,
        daysAssigned: a.days_assigned,
        ratePerDay: a.rate_per_day,
        withEquipment: !!a.with_equipment,
        equipmentRatePerDay: a.equipment_rate_per_day || 0,
        totalAmount: a.total_amount,
      })),
    });
  } catch (err) {
    console.error("[GET /api/warehouse/check]", err);
    return Response.json({ error: "Failed to perform warehouse check" }, { status: 500 });
  }
}

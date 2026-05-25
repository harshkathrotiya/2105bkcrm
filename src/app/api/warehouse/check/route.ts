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

    const inquiry = await getInquiryById(inquiryId);
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    // Get the quotation for this inquiry
    const quotation = await db.quotation.findFirst({
      where: { inquiry_id: inquiryId }
    });
    
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

    // Fetch all overlapping active bookings for the inquiry dates in a single query
    const overlappingBookings = await db.equipmentBooking.findMany({
      where: {
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
      })),
      equipment: equipmentWithStatus,
      kits: kitsWithStatus,
    });
  } catch (err) {
    console.error("[GET /api/warehouse/check]", err);
    return Response.json({ error: "Failed to perform warehouse check" }, { status: 500 });
  }
}

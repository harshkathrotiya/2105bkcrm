import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getInquiryById } from "@/lib/queries/inquiries";
import { getKitAvailabilityStatus, getAllKits } from "@/lib/queries/kits";
import { getEquipment, isEquipmentBooked } from "@/lib/queries/equipment";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const inquiryId = searchParams.get("inquiryId");

    if (!inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }

    const inquiry = getInquiryById(inquiryId);
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    // Get the quotation for this inquiry
    const quotation = db.prepare("SELECT * FROM quotations WHERE inquiry_id = ?").get(inquiryId) as any;
    let quoteRows: any[] = [];
    if (quotation) {
      try {
        quoteRows = JSON.parse(quotation.equipment);
      } catch (err) {
        quoteRows = [];
      }
    }

    // Get existing bookings for this inquiry
    const bookings = db.prepare("SELECT * FROM equipment_bookings WHERE inquiry_id = ?").all(inquiryId) as any[];

    // Fetch all equipment with their availability status for the inquiry dates
    const { items: allEquipment } = getEquipment();
    const equipmentWithStatus = allEquipment.map((item) => {
      const isBooked = isEquipmentBooked(item.id, inquiry.startDate, inquiry.endDate);
      
      // Find if booked for THIS inquiry
      const thisBooking = bookings.find(b => b.equipment_id === item.id);

      return {
        ...item,
        isBookedForRange: isBooked,
        bookedForThisInquiry: !!thisBooking,
        bookingDetails: thisBooking || null,
      };
    });

    // Fetch all kits with their availability status for the inquiry dates
    const allKitsList = getAllKits();
    const kitsWithStatus = allKitsList.map((kit) => {
      const availabilityStatus = getKitAvailabilityStatus(kit.id, inquiry.startDate, inquiry.endDate);
      const thisBooking = bookings.find(b => b.kit_id === kit.id);

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
      bookings: bookings.map((b) => ({
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

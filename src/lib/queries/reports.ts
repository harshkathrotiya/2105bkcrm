import { db } from "@/lib/db";

export async function getExpenseReport(inquiryId: string) {
  const inquiry = await db.inquiry.findUnique({
    where: { id: inquiryId },
    include: { client: true },
  });

  if (!inquiry) return null;

  // Fetch staff assignments
  const staffAssignments = await db.staffAssignment.findMany({
    where: { inquiry_id: inquiryId },
    include: { staff: true },
  });

  // Fetch equipment bookings that require a rental vendor
  const vendorBookings = await db.equipmentBooking.findMany({
    where: { 
      inquiry_id: inquiryId,
      vendor_id: { not: null }
    },
    include: { 
      vendor: true,
      equipment: true,
      kit: true
    },
  });

  const totalStaffCost = staffAssignments.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalVendorCost = vendorBookings.reduce((acc, curr) => acc + (curr.total_vendor_cost || 0), 0);

  return {
    inquiry,
    staffAssignments: staffAssignments.map(a => ({
      id: a.id,
      staffId: a.staff_id,
      staffName: a.staff.name,
      role: a.staff.role,
      staffType: a.staff.staff_type,
      daysAssigned: a.days_assigned,
      ratePerDay: a.rate_per_day,
      totalAmount: a.total_amount,
      isDuplicate: a.is_duplicate === 1,
      reportingTime: a.reporting_time,
    })),
    vendorBookings: vendorBookings.map(b => ({
      id: b.id,
      position: b.position,
      itemName: b.equipment?.product_name || b.kit?.name || "Equipment",
      vendorName: b.vendor?.name || "Unknown Vendor",
      costPerDay: b.vendor_cost_per_day || 0,
      totalCost: b.total_vendor_cost || 0,
      bookedFrom: b.booked_from,
      bookedTo: b.booked_to,
    })),
    totalStaffCost,
    totalVendorCost,
    totalExpense: totalStaffCost + totalVendorCost,
  };
}

export async function getPLReport(inquiryId: string) {
  const expenseData = await getExpenseReport(inquiryId);
  if (!expenseData) return null;

  // Find approved quotation for revenue, fallback to draft/sent (excluding revised)
  const quotations = await db.quotation.findMany({
    where: { inquiry_id: inquiryId },
    orderBy: { created_at: "desc" },
  });
  
  const approvedQuotation = quotations.find(q => q.status === "Approved") || quotations.find(q => q.status !== "Revised") || null;

  const revenue = approvedQuotation ? approvedQuotation.total : 0;
  const subtotalRevenue = approvedQuotation ? approvedQuotation.subtotal : 0;
  const cgst = approvedQuotation ? approvedQuotation.cgst : 0;
  const sgst = approvedQuotation ? approvedQuotation.sgst : 0;

  const totalExpense = expenseData.totalExpense;
  const netProfit = subtotalRevenue - totalExpense; // Profit calculated on subtotal before taxes
  const profitMargin = subtotalRevenue > 0 ? (netProfit / subtotalRevenue) * 100 : 0;

  return {
    inquiry: expenseData.inquiry,
    quotation: approvedQuotation ? {
      quoteNo: approvedQuotation.quote_no,
      subtotal: approvedQuotation.subtotal,
      cgst: approvedQuotation.cgst,
      sgst: approvedQuotation.sgst,
      total: approvedQuotation.total,
    } : null,
    revenue,
    subtotalRevenue,
    cgst,
    sgst,
    totalStaffCost: expenseData.totalStaffCost,
    totalVendorCost: expenseData.totalVendorCost,
    totalExpense,
    netProfit,
    profitMargin,
  };
}

export async function getClientRequirements(inquiryId: string) {
  const inquiry = await db.inquiry.findUnique({
    where: { id: inquiryId },
    include: { client: true },
  });

  if (!inquiry) return null;

  // Fetch staff assignments with Aadhar details
  const staffAssignments = await db.staffAssignment.findMany({
    where: { inquiry_id: inquiryId },
    include: { staff: true },
  });

  return {
    inquiry,
    staffRoster: staffAssignments.map(a => ({
      name: a.staff.name,
      role: a.staff.role,
      position: a.position_name,
      reportingTime: a.reporting_time,
      aadharNumber: a.staff.aadhar_number || "Missing",
      aadharUploaded: !!(a.staff.aadhar_front && a.staff.aadhar_back),
    })),
    powerRequirements: inquiry.power_requirements,
    tablesSpace: inquiry.tables_space,
    otherRequirements: inquiry.other_requirements,
  };
}

export async function updateClientRequirements(
  inquiryId: string,
  data: {
    powerRequirements?: string;
    tablesSpace?: string;
    otherRequirements?: string;
  }
) {
  return db.inquiry.update({
    where: { id: inquiryId },
    data: {
      power_requirements: data.powerRequirements,
      tables_space: data.tablesSpace,
      other_requirements: data.otherRequirements,
    },
  });
}

export async function getStaffBrief(inquiryId: string, staffId: number) {
  const inquiry = await db.inquiry.findUnique({
    where: { id: inquiryId },
    include: { client: true },
  });

  if (!inquiry) return null;

  const staff = await db.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) return null;

  const assignment = await db.staffAssignment.findFirst({
    where: { inquiry_id: inquiryId, staff_id: staffId },
  });

  // Calculate event scale details
  const totalStaff = await db.staffAssignment.count({
    where: { inquiry_id: inquiryId },
  });

  const uniqueStaffIds = await db.staffAssignment.groupBy({
    by: ["staff_id"],
    where: { inquiry_id: inquiryId },
  });

  // Count camera positions
  const assignments = await db.staffAssignment.findMany({
    where: { inquiry_id: inquiryId },
  });
  const cameraCount = assignments.filter(a => 
    a.position_name?.toLowerCase().includes("center") ||
    a.position_name?.toLowerCase().includes("side") ||
    a.position_name?.toLowerCase().includes("wireless") ||
    a.position_name?.toLowerCase().includes("photo")
  ).length;

  const hasCrane = assignments.some(a => 
    a.position_name?.toLowerCase().includes("crane")
  );

  return {
    inquiry,
    staff,
    assignment: assignment ? {
      id: assignment.id,
      positionName: assignment.position_name,
      reportingTime: assignment.reporting_time,
      daysAssigned: assignment.days_assigned,
      ratePerDay: assignment.rate_per_day,
      totalAmount: assignment.total_amount,
    } : null,
    eventScale: {
      totalStaff: uniqueStaffIds.length,
      cameraCount,
      hasControlRoom: true, // Defaults based on typical BK Media center/side configuration
      hasCrane,
    },
  };
}

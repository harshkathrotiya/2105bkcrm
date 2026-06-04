/**
 * queries/staff.ts — typed DB helpers for staff, staff_assignments, and staff_payments using Prisma
 */

import { db, withRetry } from "@/lib/db";
import type { Staff, StaffAssignment, StaffPayment } from "@/lib/types";

export async function getAllStaff(params?: {
  search?: string;
  type?: string;
  paymentType?: string;
  status?: string;
  department?: "VIDEO" | "LED" | "BOTH";
}): Promise<(Staff & { status: "Available" | "Deployed"; pendingPayment: number })[]> {
  const todayStr = new Date().toISOString().split("T")[0];

  const where: any = { is_active: 1 };
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { role: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params?.type) {
    where.staff_type = params.type;
  }
  if (params?.paymentType) {
    where.payment_type = params.paymentType;
  }
  if (params?.department) {
    if (params.department === "VIDEO") {
      where.department = { in: ["VIDEO", "BOTH"] };
    } else if (params.department === "LED") {
      where.department = { in: ["LED", "BOTH"] };
    } else {
      where.department = params.department;
    }
  }

  const staffRows = await db.staff.findMany({
    where,
    include: {
      assignments: {
        include: { inquiry: true }
      },
      payments: true,
    },
    orderBy: { name: "asc" }
  });

  const result = staffRows.map((s: any) => {
    // Check if deployed today
    const isDeployed = s.assignments.some((a: any) => 
      a.inquiry?.status === "Confirmed" &&
      a.inquiry.start_date <= todayStr &&
      a.inquiry.end_date >= todayStr
    );

    // Calculate pending payment
    const totalAmount = s.assignments.reduce((sum: number, a: any) => sum + (a.total_amount || 0), 0);
    const totalPaid = s.payments
      .filter((p: any) => p.payment_type === "PER_EVENT")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const pendingPayment = Math.max(0, totalAmount - totalPaid);

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      role: s.role as any,
      staffType: s.staff_type as "INHOUSE" | "EXTERNAL",
      paymentType: s.payment_type as "PER_DAY" | "MONTHLY",
      ratePerDay: s.rate_per_day,
      monthlySalary: s.monthly_salary,
      withEquipment: s.with_equipment === 1,
      equipmentDesc: s.equipment_desc,
      equipmentRatePerDay: s.equipment_rate_per_day,
      aadharNumber: s.aadhar_number,
      aadharFront: s.aadhar_front,
      aadharBack: s.aadhar_back,
      isActive: s.is_active === 1,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      department: s.department as "VIDEO" | "LED" | "BOTH",
      status: (isDeployed ? "Deployed" : "Available") as "Deployed" | "Available",
      pendingPayment,
    };
  });

  if (params?.status === "DEPLOYED") {
    return result.filter(r => r.status === "Deployed");
  } else if (params?.status === "AVAILABLE") {
    return result.filter(r => r.status === "Available");
  }
  return result;
}

export async function getStaffById(id: number): Promise<Staff | undefined> {
  const s = await db.staff.findUnique({ where: { id } });
  if (!s) return undefined;
  return {
    id: s.id,
    name: s.name,
    phone: s.phone,
    role: s.role as any,
    staffType: s.staff_type as "INHOUSE" | "EXTERNAL",
    paymentType: s.payment_type as "PER_DAY" | "MONTHLY",
    ratePerDay: s.rate_per_day,
    monthlySalary: s.monthly_salary,
    withEquipment: s.with_equipment === 1,
    equipmentDesc: s.equipment_desc,
    equipmentRatePerDay: s.equipment_rate_per_day,
    aadharNumber: s.aadhar_number,
    aadharFront: s.aadhar_front,
    aadharBack: s.aadhar_back,
    isActive: s.is_active === 1,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    department: s.department as "VIDEO" | "LED" | "BOTH",
  };
}

export async function createStaff(staff: Omit<Staff, "id" | "createdAt" | "isActive">): Promise<Staff> {
  const nowStr = new Date().toISOString();
  const s = await db.staff.create({
    data: {
      name: staff.name,
      phone: staff.phone,
      role: staff.role,
      staff_type: staff.staffType,
      payment_type: staff.paymentType,
      rate_per_day: staff.ratePerDay ?? null,
      monthly_salary: staff.monthlySalary ?? null,
      with_equipment: staff.withEquipment ? 1 : 0,
      equipment_desc: staff.equipmentDesc ?? null,
      equipment_rate_per_day: staff.equipmentRatePerDay ?? null,
      aadhar_number: staff.aadharNumber ?? null,
      aadhar_front: staff.aadharFront ?? null,
      aadhar_back: staff.aadharBack ?? null,
      is_active: 1,
      created_at: nowStr,
      department: staff.department ?? "VIDEO",
    }
  });

  return { ...staff, id: s.id, isActive: true, createdAt: nowStr };
}

export async function updateStaff(id: number, patch: Partial<Omit<Staff, "id" | "createdAt">>): Promise<Staff | undefined> {
  const existing = await getStaffById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };
  const nowStr = new Date().toISOString();

  await db.staff.update({
    where: { id },
    data: {
      name: merged.name,
      phone: merged.phone,
      role: merged.role,
      staff_type: merged.staffType,
      payment_type: merged.paymentType,
      rate_per_day: merged.ratePerDay ?? null,
      monthly_salary: merged.monthlySalary ?? null,
      with_equipment: merged.withEquipment ? 1 : 0,
      equipment_desc: merged.equipmentDesc ?? null,
      equipment_rate_per_day: merged.equipmentRatePerDay ?? null,
      aadhar_number: merged.aadharNumber ?? null,
      aadhar_front: merged.aadharFront ?? null,
      aadhar_back: merged.aadharBack ?? null,
      updated_at: nowStr,
      department: merged.department ?? "VIDEO",
    }
  });

  return await getStaffById(id);
}

export async function deleteStaff(id: number): Promise<boolean> {
  try {
    await db.staff.update({ where: { id }, data: { is_active: 0 } });
    return true;
  } catch {
    return false;
  }
}

export async function reactivateStaff(id: number): Promise<boolean> {
  try {
    await db.staff.update({ where: { id }, data: { is_active: 1 } });
    return true;
  } catch {
    return false;
  }
}

export async function getAllStaffIncludingInactive(): Promise<Staff[]> {
  const rows = await db.staff.findMany({
    where: { is_active: 0 },
    orderBy: { name: "asc" }
  });
  return rows.map((s: any) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    role: s.role as any,
    staffType: s.staff_type as "INHOUSE" | "EXTERNAL",
    paymentType: s.payment_type as "PER_DAY" | "MONTHLY",
    ratePerDay: s.rate_per_day,
    monthlySalary: s.monthly_salary,
    withEquipment: s.with_equipment === 1,
    equipmentDesc: s.equipment_desc,
    equipmentRatePerDay: s.equipment_rate_per_day,
    aadharNumber: s.aadhar_number,
    aadharFront: s.aadhar_front,
    aadharBack: s.aadhar_back,
    isActive: s.is_active === 1,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    department: s.department as "VIDEO" | "LED" | "BOTH",
  }));
}

export interface StaffHistoryItem {
  id: number;
  inquiryId: string;
  eventName: string;
  eventType: string;
  startDate: string;
  endDate: string;
  days: number;
  positionName: string;
  amount: number;
  paymentStatus: "Paid" | "Pending";
}

export async function getStaffHistory(staffId: number): Promise<StaffHistoryItem[]> {
  const assignments = await db.staffAssignment.findMany({
    where: { staff_id: staffId },
    include: {
      inquiry: { include: { client: true } },
      payments: true,
    },
    orderBy: { inquiry: { start_date: "desc" } }
  });

  return assignments.map((a: any) => {
    const paidAmount = a.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const isPaid = paidAmount >= a.total_amount;

    return {
      id: a.id,
      inquiryId: a.inquiry_id,
      eventName: `${a.inquiry?.client?.name} - ${a.inquiry?.event_type}`,
      eventType: a.inquiry?.event_type,
      startDate: a.inquiry?.start_date,
      endDate: a.inquiry?.end_date,
      days: a.days_assigned,
      positionName: a.position_name || "Staff",
      amount: a.total_amount,
      paymentStatus: isPaid ? "Paid" : "Pending",
    };
  });
}

export async function getStaffYtdSummary(staffId: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const fyStart = now.getMonth() >= 3 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;
  const fyEnd = now.getMonth() >= 3 ? `${currentYear + 1}-03-31` : `${currentYear}-03-31`;

  const assignments = await db.staffAssignment.findMany({
    where: {
      staff_id: staffId,
      inquiry: {
        start_date: { gte: fyStart, lte: fyEnd }
      }
    },
    include: { payments: true }
  });

  const eventsWorked = assignments.length;
  const totalDays = assignments.reduce((s: number, a: any) => s + a.days_assigned, 0);
  const totalEarned = assignments.reduce((s: number, a: any) => s + a.total_amount, 0);

  let paidPerEvent = 0;
  for (const a of assignments) {
    paidPerEvent += a.payments.reduce((s: number, p: any) => s + p.amount, 0);
  }

  const monthlyPayments = await db.staffPayment.aggregate({
    _sum: { amount: true },
    where: {
      staff_id: staffId,
      payment_type: "MONTHLY_SALARY",
      paid_at: { gte: fyStart, lte: fyEnd }
    }
  });

  const paidMonthly = monthlyPayments._sum.amount || 0;
  const paid = paidPerEvent + paidMonthly;
  const totalEarnedWithMonthly = totalEarned + paidMonthly;
  const pending = Math.max(0, totalEarnedWithMonthly - paid);

  return { eventsWorked, totalDays, totalEarned: totalEarnedWithMonthly, paid, pending };
}

export async function getStaffAssignments(inquiryId: string) {
  const assignments = await withRetry(() => db.staffAssignment.findMany({
    where: { inquiry_id: inquiryId },
    include: {
      staff: true,
      payments: { orderBy: { paid_at: "desc" } }
    }
  }));

  return assignments.map((a: any) => {
    const paidAmount = a.payments.reduce((s: number, p: any) => s + p.amount, 0);
    const lastPayment = a.payments[0];

    return {
      id: a.id,
      staffId: a.staff_id,
      inquiryId: a.inquiry_id,
      positionNo: a.position_no,
      positionName: a.position_name,
      daysAssigned: a.days_assigned,
      ratePerDay: a.rate_per_day,
      equipmentRatePerDay: a.equipment_rate_per_day,
      totalAmount: a.total_amount,
      isDuplicate: a.is_duplicate === 1,
      confirmedDup: a.confirmed_dup === 1,
      reportingTime: a.reporting_time,
      createdAt: a.created_at,
      staffName: a.staff?.name,
      staffType: a.staff?.staff_type,
      // withEquipment on the assignment = did they actually bring equipment on this job
      withEquipment: a.with_equipment === 1,
      // staffOwnsEquipment = whether the staff profile is flagged as equipment-owning (for the UI prompt)
      staffOwnsEquipment: a.staff?.with_equipment === 1,
      staffEquipmentRatePerDay: a.staff?.equipment_rate_per_day,
      equipmentDesc: a.staff?.equipment_desc,
      paidAmount,
      paidAt: lastPayment?.paid_at || null,
      paymentMethod: lastPayment?.payment_method || null,
      referenceNo: lastPayment?.reference_no || null,
    };
  });
}

export async function checkDuplicateAssignment(inquiryId: string, staffId: number) {
  const a = await db.staffAssignment.findFirst({
    where: { inquiry_id: inquiryId, staff_id: staffId }
  });
  if (a) return { isDuplicate: true, existingPosition: a.position_name || "" };
  return { isDuplicate: false };
}

export async function assignStaff(assignment: Omit<StaffAssignment, "id" | "totalAmount" | "isDuplicate" | "confirmedDup" | "createdAt">): Promise<StaffAssignment> {
  const withEquipment = assignment.withEquipment ?? false;
  const equipmentRatePerDay = withEquipment ? (assignment.equipmentRatePerDay ?? 0) : 0;
  const totalAmount = (assignment.ratePerDay + equipmentRatePerDay) * assignment.daysAssigned;
  const nowStr = new Date().toISOString();

  const dupCheck = await checkDuplicateAssignment(assignment.inquiryId, assignment.staffId);
  const isDuplicate = dupCheck.isDuplicate ? 1 : 0;

  let newId = 0;

  await db.$transaction(async (tx) => {
    const res = await tx.staffAssignment.create({
      data: {
        staff_id: assignment.staffId,
        inquiry_id: assignment.inquiryId,
        position_no: assignment.positionNo ?? null,
        position_name: assignment.positionName ?? null,
        days_assigned: assignment.daysAssigned,
        rate_per_day: assignment.ratePerDay,
        with_equipment: withEquipment ? 1 : 0,
        equipment_rate_per_day: equipmentRatePerDay,
        total_amount: totalAmount,
        is_duplicate: isDuplicate,
        confirmed_dup: 0,
        reporting_time: assignment.reportingTime ?? "09:00 AM",
        created_at: nowStr,
      }
    });
    newId = res.id;

    if (isDuplicate) {
      await tx.staffAssignment.updateMany({
        where: { inquiry_id: assignment.inquiryId, staff_id: assignment.staffId },
        data: { is_duplicate: 1 }
      });
    }
  });

  return {
    id: newId,
    ...assignment,
    withEquipment,
    equipmentRatePerDay,
    totalAmount,
    isDuplicate: isDuplicate === 1,
    confirmedDup: false,
    createdAt: nowStr,
  };
}

export async function confirmDuplicate(assignmentId: number): Promise<boolean> {
  try {
    await db.staffAssignment.update({ where: { id: assignmentId }, data: { confirmed_dup: 1 } });
    return true;
  } catch {
    return false;
  }
}

export async function deleteAssignment(id: number): Promise<boolean> {
  const assignment = await db.staffAssignment.findUnique({ where: { id } });
  if (!assignment) return false;

  await db.staffAssignment.delete({ where: { id } });

  const remaining = await db.staffAssignment.count({
    where: { inquiry_id: assignment.inquiry_id, staff_id: assignment.staff_id }
  });
  
  if (remaining <= 1) {
    await db.staffAssignment.updateMany({
      where: { inquiry_id: assignment.inquiry_id, staff_id: assignment.staff_id },
      data: { is_duplicate: 0, confirmed_dup: 0 }
    });
  }

  return true;
}

export async function getStaffPayments(params: {
  inquiryId?: string;
  month?: string;
  status?: "PENDING" | "PAID";
  staffId?: number;
}) {
  const where: any = {};
  if (params.inquiryId) where.inquiry_id = params.inquiryId;
  if (params.month) where.month = params.month;
  if (params.staffId) where.staff_id = params.staffId;

  const rows = await db.staffPayment.findMany({
    where,
    include: { staff: true },
    orderBy: { paid_at: "desc" }
  });

  return rows.map((r: any) => ({
    id: r.id,
    staffId: r.staff_id,
    staffName: r.staff?.name,
    staffRole: r.staff?.role,
    staffType: r.staff?.staff_type,
    assignmentId: r.assignment_id,
    inquiryId: r.inquiry_id,
    amount: r.amount,
    paymentType: r.payment_type,
    paymentMethod: r.payment_method,
    referenceNo: r.reference_no,
    month: r.month,
    paidAt: r.paid_at,
    notes: r.notes,
  }));
}

export async function recordStaffPayment(payment: Omit<StaffPayment, "id" | "paidAt">): Promise<StaffPayment> {
  const nowStr = new Date().toISOString();
  const res = await db.staffPayment.create({
    data: {
      staff_id: payment.staffId,
      assignment_id: payment.assignmentId ?? null,
      inquiry_id: payment.inquiryId ?? null,
      amount: payment.amount,
      payment_type: payment.paymentType,
      payment_method: payment.paymentMethod,
      reference_no: payment.referenceNo ?? null,
      month: payment.month ?? null,
      paid_at: nowStr,
      paid_by_id: payment.paidById ?? "system",
      notes: payment.notes ?? null,
    }
  });

  return {
    id: res.id,
    ...payment,
    paidById: payment.paidById ?? "system",
    paidAt: nowStr,
  };
}

export async function getMonthlyReport(month: string) {
  const monthStart = `${month}-01`;
  const [yr, mn] = month.split("-").map(Number);
  const monthEnd = `${month}-${String(new Date(yr, mn, 0).getDate()).padStart(2, "0")}`;

  const staffList = await db.staff.findMany({
    where: { is_active: 1 }
  });

  const assignments = await db.staffAssignment.findMany({
    where: {
      inquiry: {
        start_date: { gte: monthStart, lte: monthEnd }
      }
    },
    include: { payments: true }
  });

  const perDayStaff = [];
  const monthlyStaff = [];

  for (const s of staffList) {
    if (s.payment_type === 'PER_DAY') {
      const staffAssignments = assignments.filter((a: any) => a.staff_id === s.id);
      if (staffAssignments.length > 0) {
        const eventsCount = new Set(staffAssignments.map((a: any) => a.inquiry_id)).size;
        const totalDays = staffAssignments.reduce((sum: number, a: any) => sum + a.days_assigned, 0);
        const totalAmount = staffAssignments.reduce((sum: number, a: any) => sum + a.total_amount, 0);
        const paid = staffAssignments.reduce((sum: number, a: any) => sum + a.payments.reduce((pSum: number, p: any) => pSum + p.amount, 0), 0);
        
        perDayStaff.push({
          staff: { id: s.id, name: s.name, role: s.role, staffType: s.staff_type, ratePerDay: s.rate_per_day },
          events: eventsCount,
          totalDays,
          totalAmount,
          paid,
          pending: Math.max(0, totalAmount - paid),
        });
      }
    } else if (s.payment_type === 'MONTHLY') {
      const payRow = await db.staffPayment.findFirst({
        where: { staff_id: s.id, payment_type: 'MONTHLY_SALARY', month }
      });
      monthlyStaff.push({
        staff: { id: s.id, name: s.name, role: s.role, staffType: s.staff_type },
        monthlySalary: s.monthly_salary,
        status: payRow ? "Paid" : "Pending",
        paymentDetails: payRow ? {
          id: payRow.id,
          amount: payRow.amount,
          paymentMethod: payRow.payment_method,
          referenceNo: payRow.reference_no,
          paidAt: payRow.paid_at,
        } : null,
      });
    }
  }

  const perDayTotal = perDayStaff.reduce((s: number, x: any) => s + x.totalAmount, 0);
  const perDayPaid = perDayStaff.reduce((s: number, x: any) => s + x.paid, 0);
  const perDayPending = perDayStaff.reduce((s: number, x: any) => s + x.pending, 0);

  const monthlyTotal = monthlyStaff.reduce((s: number, x: any) => s + (x.monthlySalary || 0), 0);
  const monthlyPaid = monthlyStaff.reduce((s: number, x: any) => s + (x.status === "Paid" ? (x.monthlySalary || 0) : 0), 0);
  const monthlyPending = monthlyStaff.reduce((s: number, x: any) => s + (x.status === "Pending" ? (x.monthlySalary || 0) : 0), 0);

  return {
    perDayStaff,
    monthlyStaff,
    totals: {
      total: perDayTotal + monthlyTotal,
      paid: perDayPaid + monthlyPaid,
      pending: perDayPending + monthlyPending,
    },
  };
}

export async function getStaffAvailability(startDate: string, endDate: string, roleFilter?: string) {
  const where: any = { is_active: 1 };
  if (roleFilter && roleFilter !== "All roles") {
    where.role = roleFilter;
  }
  
  // Single query: fetch all staff with their conflicting assignments in one round-trip
  const staffRows = await db.staff.findMany({
    where,
    include: {
      assignments: {
        where: {
          inquiry: {
            status: "Confirmed",
            start_date: { lte: endDate },
            end_date: { gte: startDate },
          },
        },
        include: { inquiry: true },
      },
    },
  });

  const reqStart = new Date(startDate);
  const reqEnd = new Date(endDate);

  const result = [];
  for (const row of staffRows) {
    const conflicts = row.assignments;

    let status: "FREE" | "PARTIAL" | "BUSY" = "FREE";
    if (conflicts.length > 0) {
      const isFullyCovered = conflicts.some((c) => {
        const confStart = new Date(c.inquiry.start_date);
        const confEnd = new Date(c.inquiry.end_date);
        return confStart <= reqStart && confEnd >= reqEnd;
      });
      status = isFullyCovered ? "BUSY" : "PARTIAL";
    }

    result.push({
      id: row.id,
      name: row.name,
      phone: row.phone,
      role: row.role,
      staffType: row.staff_type,
      paymentType: row.payment_type,
      ratePerDay: row.rate_per_day,
      monthlySalary: row.monthly_salary,
      withEquipment: row.with_equipment === 1,
      equipmentDesc: row.equipment_desc,
      equipmentRatePerDay: row.equipment_rate_per_day,
      aadharNumber: row.aadhar_number,
      aadharFront: row.aadhar_front,
      aadharBack: row.aadhar_back,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status,
      conflicts: conflicts.map((c: any) => ({
        eventName: c.inquiry.event_type,
        startDate: c.inquiry.start_date,
        endDate: c.inquiry.end_date,
      })),
    });
  }

  return result;
}

/**
 * queries/staff.ts — typed DB helpers for staff, staff_assignments, and staff_payments
 */

import { db } from "@/lib/db";
import type { Staff, StaffAssignment, StaffPayment } from "@/lib/types";

export interface StaffRow {
  id: number;
  name: string;
  phone: string;
  role: string;
  staff_type: "INHOUSE" | "EXTERNAL";
  payment_type: "PER_DAY" | "MONTHLY";
  rate_per_day: number | null;
  monthly_salary: number | null;
  with_equipment: number;
  equipment_desc: string | null;
  aadhar_number: string | null;
  aadhar_front: string | null;
  aadhar_back: string | null;
  is_active: number;
  created_at: string;
  updated_at: string | null;
}

function rowToStaff(row: StaffRow): Staff {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    role: row.role as any,
    staffType: row.staff_type,
    paymentType: row.payment_type,
    ratePerDay: row.rate_per_day,
    monthlySalary: row.monthly_salary,
    withEquipment: row.with_equipment === 1,
    equipmentDesc: row.equipment_desc,
    aadharNumber: row.aadhar_number,
    aadharFront: row.aadhar_front,
    aadharBack: row.aadhar_back,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllStaff(params?: {
  search?: string;
  type?: string; // INHOUSE | EXTERNAL
  paymentType?: string; // PER_DAY | MONTHLY
  status?: string; // AVAILABLE | DEPLOYED
}): (Staff & { status: "Available" | "Deployed"; pendingPayment: number })[] {
  const todayStr = new Date().toISOString().split("T")[0];

  // We fetch all staff and join pending payments from staff_assignments and staff_payments.
  // We also check if they are currently assigned to any confirmed inquiry today.
  let sql = `
    SELECT 
      s.*,
      CASE WHEN (
        SELECT COUNT(*)
        FROM staff_assignments sa
        JOIN inquiries i ON sa.inquiry_id = i.id
        WHERE sa.staff_id = s.id 
          AND i.status = 'Confirmed'
          AND i.start_date <= ? 
          AND i.end_date >= ?
      ) > 0 THEN 'Deployed' ELSE 'Available' END as current_status,
      
      -- Calculate total pending payment = SUM(assignments.total_amount) - SUM(payments.amount) for per_event
      COALESCE((
        SELECT SUM(sa.total_amount)
        FROM staff_assignments sa
        WHERE sa.staff_id = s.id
      ), 0) - COALESCE((
        SELECT SUM(sp.amount)
        FROM staff_payments sp
        WHERE sp.staff_id = s.id AND sp.payment_type = 'PER_EVENT'
      ), 0) as pending_payment
    FROM staff s
    WHERE s.is_active = 1
  `;

  const args: any[] = [todayStr, todayStr];

  if (params?.search) {
    sql += ` AND (s.name LIKE ? OR s.role LIKE ? OR s.phone LIKE ?)`;
    const term = `%${params.search}%`;
    args.push(term, term, term);
  }

  if (params?.type) {
    sql += ` AND s.staff_type = ?`;
    args.push(params.type);
  }

  if (params?.paymentType) {
    sql += ` AND s.payment_type = ?`;
    args.push(params.paymentType);
  }

  // Filter by calculated status (Available / Deployed)
  if (params?.status) {
    if (params.status === "DEPLOYED") {
      sql += ` AND (
        SELECT COUNT(*)
        FROM staff_assignments sa
        JOIN inquiries i ON sa.inquiry_id = i.id
        WHERE sa.staff_id = s.id 
          AND i.status = 'Confirmed'
          AND i.start_date <= ? 
          AND i.end_date >= ?
      ) > 0`;
      args.push(todayStr, todayStr);
    } else if (params.status === "AVAILABLE") {
      sql += ` AND (
        SELECT COUNT(*)
        FROM staff_assignments sa
        JOIN inquiries i ON sa.inquiry_id = i.id
        WHERE sa.staff_id = s.id 
          AND i.status = 'Confirmed'
          AND i.start_date <= ? 
          AND i.end_date >= ?
      ) = 0`;
      args.push(todayStr, todayStr);
    }
  }

  sql += ` ORDER BY s.name ASC`;

  const rows = db.prepare(sql).all(...args) as (StaffRow & { current_status: "Available" | "Deployed"; pending_payment: number })[];

  return rows.map((row) => ({
    ...rowToStaff(row),
    status: row.current_status,
    pendingPayment: row.pending_payment,
  }));
}

export function getStaffById(id: number): Staff | undefined {
  const row = db.prepare("SELECT * FROM staff WHERE id = ? AND is_active = 1").get(id) as StaffRow | undefined;
  return row ? rowToStaff(row) : undefined;
}

export function createStaff(staff: Omit<Staff, "id" | "createdAt" | "isActive">): Staff {
  const nowStr = new Date().toISOString();
  const res = db.prepare(`
    INSERT INTO staff (name, phone, role, staff_type, payment_type, rate_per_day, monthly_salary,
                       with_equipment, equipment_desc, aadhar_number, aadhar_front, aadhar_back, is_active, created_at)
    VALUES (@name, @phone, @role, @staffType, @paymentType, @ratePerDay, @monthlySalary,
            @withEquipment, @equipmentDesc, @aadharNumber, @aadharFront, @aadharBack, 1, @createdAt)
  `).run({
    name: staff.name,
    phone: staff.phone,
    role: staff.role,
    staffType: staff.staffType,
    paymentType: staff.paymentType,
    ratePerDay: staff.ratePerDay ?? null,
    monthlySalary: staff.monthlySalary ?? null,
    withEquipment: staff.withEquipment ? 1 : 0,
    equipmentDesc: staff.equipmentDesc ?? null,
    aadharNumber: staff.aadharNumber ?? null,
    aadharFront: staff.aadharFront ?? null,
    aadharBack: staff.aadharBack ?? null,
    createdAt: nowStr,
  });

  return {
    id: res.lastInsertRowid as number,
    ...staff,
    isActive: true,
    createdAt: nowStr,
  };
}

export function updateStaff(id: number, patch: Partial<Omit<Staff, "id" | "createdAt">>): Staff | undefined {
  const existing = getStaffById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };
  const nowStr = new Date().toISOString();

  db.prepare(`
    UPDATE staff SET
      name = @name,
      phone = @phone,
      role = @role,
      staff_type = @staffType,
      payment_type = @paymentType,
      rate_per_day = @ratePerDay,
      monthly_salary = @monthlySalary,
      with_equipment = @withEquipment,
      equipment_desc = @equipmentDesc,
      aadhar_number = @aadharNumber,
      aadhar_front = @aadharFront,
      aadhar_back = @aadharBack,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id,
    name: merged.name,
    phone: merged.phone,
    role: merged.role,
    staffType: merged.staffType,
    paymentType: merged.paymentType,
    ratePerDay: merged.ratePerDay ?? null,
    monthlySalary: merged.monthlySalary ?? null,
    withEquipment: merged.withEquipment ? 1 : 0,
    equipmentDesc: merged.equipmentDesc ?? null,
    aadharNumber: merged.aadharNumber ?? null,
    aadharFront: merged.aadharFront ?? null,
    aadharBack: merged.aadharBack ?? null,
    updatedAt: nowStr,
  });

  return getStaffById(id);
}

export function deleteStaff(id: number): boolean {
  const res = db.prepare("UPDATE staff SET is_active = 0 WHERE id = ?").run(id);
  return res.changes > 0;
}

export function reactivateStaff(id: number): boolean {
  const res = db.prepare("UPDATE staff SET is_active = 1 WHERE id = ?").run(id);
  return res.changes > 0;
}

export function getAllStaffIncludingInactive(): Staff[] {
  const rows = db.prepare("SELECT * FROM staff WHERE is_active = 0 ORDER BY name ASC").all() as StaffRow[];
  return rows.map(rowToStaff);
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

export function getStaffHistory(staffId: number): StaffHistoryItem[] {
  // Query all assignments for this staff, including the inquiries details
  const rows = db.prepare(`
    SELECT 
      sa.id as assignment_id,
      sa.inquiry_id,
      sa.position_name,
      sa.days_assigned,
      sa.rate_per_day,
      sa.total_amount,
      i.event_type,
      i.start_date,
      i.end_date,
      c.name as client_name
    FROM staff_assignments sa
    JOIN inquiries i ON sa.inquiry_id = i.id
    JOIN clients c ON i.client_id = c.id
    WHERE sa.staff_id = ?
    ORDER BY i.start_date DESC
  `).all(staffId) as any[];

  return rows.map((r) => {
    // Check if there is a payment linked to this assignment
    const payment = db.prepare("SELECT SUM(amount) as paid FROM staff_payments WHERE assignment_id = ?").get(r.assignment_id) as { paid: number | null };
    const paidAmount = payment?.paid || 0;
    const isPaid = paidAmount >= r.total_amount;

    return {
      id: r.assignment_id,
      inquiryId: r.inquiry_id,
      eventName: `${r.client_name} - ${r.event_type}`,
      eventType: r.event_type,
      startDate: r.start_date,
      endDate: r.end_date,
      days: r.days_assigned,
      positionName: r.position_name || "Staff",
      amount: r.total_amount,
      paymentStatus: isPaid ? "Paid" : "Pending",
    };
  });
}

export function getStaffYtdSummary(staffId: number): {
  eventsWorked: number;
  totalDays: number;
  totalEarned: number;
  paid: number;
  pending: number;
} {
  const currentYear = new Date().getFullYear();
  // Financial Year runs from April 1st of currentYear-1 to March 31st of currentYear (or depending on current date)
  // Let's determine the FY range dynamically based on current date
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;
  const fyEnd = now.getMonth() >= 3 ? `${currentYear + 1}-03-31` : `${currentYear}-03-31`;

  // Get total assignments for FY
  const assignments = db.prepare(`
    SELECT sa.id, sa.total_amount, sa.days_assigned
    FROM staff_assignments sa
    JOIN inquiries i ON sa.inquiry_id = i.id
    WHERE sa.staff_id = ? AND i.start_date >= ? AND i.start_date <= ?
  `).all(staffId, fyStart, fyEnd) as { id: number; total_amount: number; days_assigned: number }[];

  const eventsWorked = assignments.length;
  const totalDays = assignments.reduce((s, a) => s + a.days_assigned, 0);
  const totalEarned = assignments.reduce((s, a) => s + a.total_amount, 0);

  // Total paid from payments in this FY (per_event payments linked to assignments in this FY, and monthly payments in this FY)
  const assignmentIds = assignments.map(a => a.id);
  let paidPerEvent = 0;
  if (assignmentIds.length > 0) {
    const placeholders = assignmentIds.map(() => "?").join(",");
    const row = db.prepare(`
      SELECT SUM(amount) as total
      FROM staff_payments
      WHERE staff_id = ? AND assignment_id IN (${placeholders})
    `).get(staffId, ...assignmentIds) as { total: number | null };
    paidPerEvent = row?.total || 0;
  }

  // Also query any monthly salary payments in this FY
  const monthlyRow = db.prepare(`
    SELECT SUM(amount) as total
    FROM staff_payments
    WHERE staff_id = ? AND payment_type = 'MONTHLY_SALARY' AND paid_at >= ? AND paid_at <= ?
  `).get(staffId, fyStart, fyEnd) as { total: number | null };
  const paidMonthly = monthlyRow?.total || 0;

  const paid = paidPerEvent + paidMonthly;
  // Note: for monthly staff, their "totalEarned" is also dynamic. But in FY summary card, the total earned is event assignments (for per day staff) + monthly payouts
  const totalEarnedWithMonthly = totalEarned + paidMonthly;
  const pending = Math.max(0, totalEarnedWithMonthly - paid);

  return {
    eventsWorked,
    totalDays,
    totalEarned: totalEarnedWithMonthly,
    paid,
    pending,
  };
}

export function getStaffAssignments(inquiryId: string): (StaffAssignment & {
  staffName: string;
  staffType: "INHOUSE" | "EXTERNAL";
  withEquipment: boolean;
  equipmentDesc: string | null;
  paidAmount: number;
  paidAt: string | null;
  paymentMethod: string | null;
  referenceNo: string | null;
})[] {
  const rows = db.prepare(`
    SELECT 
      sa.*, 
      s.name as staff_name, 
      s.staff_type, 
      s.with_equipment, 
      s.equipment_desc,
      COALESCE((
        SELECT SUM(sp.amount)
        FROM staff_payments sp
        WHERE sp.assignment_id = sa.id
      ), 0) as paid_amount,
      (
        SELECT sp.paid_at
        FROM staff_payments sp
        WHERE sp.assignment_id = sa.id
        ORDER BY sp.paid_at DESC
        LIMIT 1
      ) as paid_at,
      (
        SELECT sp.payment_method
        FROM staff_payments sp
        WHERE sp.assignment_id = sa.id
        ORDER BY sp.paid_at DESC
        LIMIT 1
      ) as payment_method,
      (
        SELECT sp.reference_no
        FROM staff_payments sp
        WHERE sp.assignment_id = sa.id
        ORDER BY sp.paid_at DESC
        LIMIT 1
      ) as reference_no
    FROM staff_assignments sa
    JOIN staff s ON sa.staff_id = s.id
    WHERE sa.inquiry_id = ?
  `).all(inquiryId) as any[];

  return rows.map((r) => ({
    id: r.id,
    staffId: r.staff_id,
    inquiryId: r.inquiry_id,
    positionNo: r.position_no,
    positionName: r.position_name,
    daysAssigned: r.days_assigned,
    ratePerDay: r.rate_per_day,
    totalAmount: r.total_amount,
    isDuplicate: r.is_duplicate === 1,
    confirmedDup: r.confirmed_dup === 1,
    createdAt: r.created_at,
    staffName: r.staff_name,
    staffType: r.staff_type,
    withEquipment: r.with_equipment === 1,
    equipmentDesc: r.equipment_desc,
    paidAmount: r.paid_amount,
    paidAt: r.paid_at,
    paymentMethod: r.payment_method,
    referenceNo: r.reference_no,
  }));
}

export function checkDuplicateAssignment(inquiryId: string, staffId: number): { isDuplicate: boolean; existingPosition?: string } {
  const row = db.prepare(`
    SELECT position_name 
    FROM staff_assignments 
    WHERE inquiry_id = ? AND staff_id = ?
    LIMIT 1
  `).get(inquiryId, staffId) as { position_name: string } | undefined;

  if (row) {
    return { isDuplicate: true, existingPosition: row.position_name };
  }
  return { isDuplicate: false };
}

export function assignStaff(assignment: Omit<StaffAssignment, "id" | "totalAmount" | "isDuplicate" | "confirmedDup" | "createdAt">): StaffAssignment {
  const totalAmount = assignment.ratePerDay * assignment.daysAssigned;
  const nowStr = new Date().toISOString();

  // Check if duplicate assignment exists
  const dupCheck = checkDuplicateAssignment(assignment.inquiryId, assignment.staffId);
  const isDuplicate = dupCheck.isDuplicate ? 1 : 0;

  // Insert assignment
  const res = db.prepare(`
    INSERT INTO staff_assignments (staff_id, inquiry_id, position_no, position_name, days_assigned, rate_per_day, total_amount, is_duplicate, confirmed_dup, created_at)
    VALUES (@staffId, @inquiryId, @positionNo, @positionName, @daysAssigned, @ratePerDay, @totalAmount, @isDuplicate, 0, @createdAt)
  `).run({
    staffId: assignment.staffId,
    inquiryId: assignment.inquiryId,
    positionNo: assignment.positionNo ?? null,
    positionName: assignment.positionName ?? null,
    daysAssigned: assignment.daysAssigned,
    ratePerDay: assignment.ratePerDay,
    totalAmount,
    isDuplicate,
    createdAt: nowStr,
  });

  const id = res.lastInsertRowid as number;

  // If there are other assignments for this staff in this inquiry, update them all to is_duplicate = 1
  if (isDuplicate) {
    db.prepare(`
      UPDATE staff_assignments 
      SET is_duplicate = 1 
      WHERE inquiry_id = ? AND staff_id = ?
    `).run(assignment.inquiryId, assignment.staffId);
  }

  return {
    id,
    ...assignment,
    totalAmount,
    isDuplicate: isDuplicate === 1,
    confirmedDup: false,
    createdAt: nowStr,
  };
}

export function confirmDuplicate(assignmentId: number): boolean {
  const res = db.prepare("UPDATE staff_assignments SET confirmed_dup = 1 WHERE id = ?").run(assignmentId);
  return res.changes > 0;
}

export function deleteAssignment(id: number): boolean {
  // Find assignment to check duplicate status first
  const assignment = db.prepare("SELECT * FROM staff_assignments WHERE id = ?").get(id) as { staff_id: number; inquiry_id: string } | undefined;
  if (!assignment) return false;

  const res = db.prepare("DELETE FROM staff_assignments WHERE id = ?").run(id);
  
  // Recalculate duplicate status for remaining assignments of this staff
  const remaining = db.prepare("SELECT id FROM staff_assignments WHERE inquiry_id = ? AND staff_id = ?").all(assignment.inquiry_id, assignment.staff_id) as { id: number }[];
  if (remaining.length <= 1) {
    db.prepare("UPDATE staff_assignments SET is_duplicate = 0, confirmed_dup = 0 WHERE inquiry_id = ? AND staff_id = ?").run(assignment.inquiry_id, assignment.staff_id);
  }

  return res.changes > 0;
}

export interface StaffPaymentRow {
  id: number;
  staffId: number;
  staffName: string;
  staffRole: string;
  staffType: "INHOUSE" | "EXTERNAL";
  assignmentId: number | null;
  inquiryId: string | null;
  amount: number;
  paymentType: "PER_EVENT" | "MONTHLY_SALARY";
  paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
  referenceNo: string | null;
  month: string | null;
  paidAt: string;
  notes: string | null;
}

export function getStaffPayments(params: {
  inquiryId?: string;
  month?: string;
  status?: "PENDING" | "PAID";
  staffId?: number;
}): StaffPaymentRow[] {
  let sql = `
    SELECT
      sp.id,
      sp.staff_id,
      s.name  AS staff_name,
      s.role  AS staff_role,
      s.staff_type,
      sp.assignment_id,
      sp.inquiry_id,
      sp.amount,
      sp.payment_type,
      sp.payment_method,
      sp.reference_no,
      sp.month,
      sp.paid_at,
      sp.notes
    FROM staff_payments sp
    JOIN staff s ON sp.staff_id = s.id
    WHERE 1=1
  `;
  const args: any[] = [];

  if (params.inquiryId) {
    sql += ` AND sp.inquiry_id = ?`;
    args.push(params.inquiryId);
  }

  if (params.month) {
    sql += ` AND sp.month = ?`;
    args.push(params.month);
  }

  if (params.staffId) {
    sql += ` AND sp.staff_id = ?`;
    args.push(params.staffId);
  }

  // "status" filter: PAID means rows exist (all rows in staff_payments are paid records).
  // PENDING means assignments that have no matching payment yet.
  // For simplicity, this endpoint returns actual payment records (all are "PAID" records).
  // Callers wanting pending should use the monthly-report or history endpoints.
  if (params.status === "PAID" || !params.status) {
    // no extra filter — all rows in staff_payments are paid
  }

  sql += ` ORDER BY sp.paid_at DESC`;

  const rows = db.prepare(sql).all(...args) as any[];

  return rows.map((r) => ({
    id: r.id,
    staffId: r.staff_id,
    staffName: r.staff_name,
    staffRole: r.staff_role,
    staffType: r.staff_type,
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

export function recordStaffPayment(payment: Omit<StaffPayment, "id" | "paidAt">): StaffPayment {
  const nowStr = new Date().toISOString();
  const res = db.prepare(`
    INSERT INTO staff_payments (staff_id, assignment_id, inquiry_id, amount, payment_type, payment_method, reference_no, month, paid_at, paid_by_id, notes)
    VALUES (@staffId, @assignmentId, @inquiryId, @amount, @paymentType, @paymentMethod, @referenceNo, @month, @paidAt, @paidById, @notes)
  `).run({
    staffId: payment.staffId,
    assignmentId: payment.assignmentId ?? null,
    inquiryId: payment.inquiryId ?? null,
    amount: payment.amount,
    paymentType: payment.paymentType,
    paymentMethod: payment.paymentMethod,
    referenceNo: payment.referenceNo ?? null,
    month: payment.month ?? null,
    paidAt: nowStr,
    paidById: payment.paidById ?? "system",
    notes: payment.notes ?? null,
  });

  return {
    id: res.lastInsertRowid as number,
    ...payment,
    paidById: payment.paidById ?? "system",
    paidAt: nowStr,
  };
}

export function getMonthlyReport(month: string) {
  // `month` format: "YYYY-MM" (e.g. "2026-05")
  // Section 1: Per day staff table
  // Fetch all staff who have assignments in this month OR who have per_day payments in this month
  const monthStart = `${month}-01`;
  // Determine month end date
  const [yr, mn] = month.split("-").map(Number);
  const monthEnd = `${month}-${String(new Date(yr, mn, 0).getDate()).padStart(2, "0")}`;

  // We find all unique staff members who worked (or have assignments) in inquiries that overlap or fall within this month.
  // Actually, we can check assignments where the inquiries start_date falls within the month.
  const assignmentsRows = db.prepare(`
    SELECT 
      s.id as staff_id,
      s.name,
      s.role,
      s.staff_type,
      s.rate_per_day,
      COUNT(DISTINCT sa.inquiry_id) as events_count,
      SUM(sa.days_assigned) as total_days,
      SUM(sa.total_amount) as total_amount
    FROM staff_assignments sa
    JOIN staff s ON sa.staff_id = s.id
    JOIN inquiries i ON sa.inquiry_id = i.id
    WHERE i.start_date >= ? AND i.start_date <= ? AND s.payment_type = 'PER_DAY' AND s.is_active = 1
    GROUP BY s.id
  `).all(monthStart, monthEnd) as any[];

  const perDayStaff = assignmentsRows.map((r) => {
    // Find amount paid so far for this month's event payments
    // We can query payments linked to these assignments
    const assignments = db.prepare(`
      SELECT sa.id
      FROM staff_assignments sa
      JOIN inquiries i ON sa.inquiry_id = i.id
      WHERE sa.staff_id = ? AND i.start_date >= ? AND i.start_date <= ?
    `).all(r.staff_id, monthStart, monthEnd) as { id: number }[];

    let paid = 0;
    if (assignments.length > 0) {
      const placeholders = assignments.map(() => "?").join(",");
      const payRow = db.prepare(`
        SELECT SUM(amount) as total
        FROM staff_payments
        WHERE staff_id = ? AND assignment_id IN (${placeholders})
      `).get(r.staff_id, ...assignments.map(a => a.id)) as { total: number | null };
      paid = payRow?.total || 0;
    }

    const pending = Math.max(0, r.total_amount - paid);

    return {
      staff: {
        id: r.staff_id,
        name: r.name,
        role: r.role,
        staffType: r.staff_type,
        ratePerDay: r.rate_per_day,
      },
      events: r.events_count,
      totalDays: r.total_days,
      totalAmount: r.total_amount,
      paid,
      pending,
    };
  });

  // Section 2: Monthly fixed salary staff
  // Fetch all staff members whose payment_type is 'MONTHLY'
  const monthlyStaffRows = db.prepare(`
    SELECT id, name, role, staff_type, monthly_salary
    FROM staff
    WHERE payment_type = 'MONTHLY' AND is_active = 1
  `).all() as any[];

  const monthlyStaff = monthlyStaffRows.map((r) => {
    // Check if paid for this month
    const payRow = db.prepare(`
      SELECT id, amount, payment_method, reference_no, paid_at
      FROM staff_payments
      WHERE staff_id = ? AND payment_type = 'MONTHLY_SALARY' AND month = ?
      LIMIT 1
    `).get(r.id, month) as any | undefined;

    return {
      staff: {
        id: r.id,
        name: r.name,
        role: r.role,
        staffType: r.staff_type,
      },
      monthlySalary: r.monthly_salary,
      status: payRow ? "Paid" : "Pending",
      paymentDetails: payRow ? {
        id: payRow.id,
        amount: payRow.amount,
        paymentMethod: payRow.payment_method,
        referenceNo: payRow.reference_no,
        paidAt: payRow.paid_at,
      } : null,
    };
  });

  // Totals calculations
  const perDayTotal = perDayStaff.reduce((s, x) => s + x.totalAmount, 0);
  const perDayPaid = perDayStaff.reduce((s, x) => s + x.paid, 0);
  const perDayPending = perDayStaff.reduce((s, x) => s + x.pending, 0);

  const monthlyTotal = monthlyStaff.reduce((s, x) => s + x.monthlySalary, 0);
  const monthlyPaid = monthlyStaff.reduce((s, x) => s + (x.status === "Paid" ? x.monthlySalary : 0), 0);
  const monthlyPending = monthlyStaff.reduce((s, x) => s + (x.status === "Pending" ? x.monthlySalary : 0), 0);

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

export function getStaffAvailability(startDate: string, endDate: string, roleFilter?: string) {
  // Query all active staff
  let sql = `SELECT * FROM staff WHERE is_active = 1`;
  const args: any[] = [];
  if (roleFilter && roleFilter !== "All roles") {
    sql += ` AND role = ?`;
    args.push(roleFilter);
  }
  
  const staffRows = db.prepare(sql).all(...args) as StaffRow[];

  return staffRows.map((row) => {
    // Check conflicts inside the date range.
    // Conflicts occur when staff is assigned to an inquiry where start_date and end_date overlap with [startDate, endDate],
    // and the inquiry status is 'Confirmed'.
    const conflicts = db.prepare(`
      SELECT 
        i.event_type as event_name, 
        i.start_date, 
        i.end_date
      FROM staff_assignments sa
      JOIN inquiries i ON sa.inquiry_id = i.id
      WHERE sa.staff_id = ?
        AND i.status = 'Confirmed'
        AND NOT (i.end_date < ? OR i.start_date > ?)
    `).all(row.id, startDate, endDate) as { event_name: string; start_date: string; end_date: string }[];

    let status: "FREE" | "PARTIAL" | "BUSY" = "FREE";

    if (conflicts.length > 0) {
      // Determine if it fully covers the dates or partially
      // For simplicity, if there's any conflict, we check if it overlaps the entire range or just part.
      // If any single conflict covers the entire range, or total conflict days cover it, it's BUSY.
      // Let's implement this: if conflict overlaps all days of [startDate, endDate], it's BUSY.
      // Else it's PARTIAL.
      
      const reqStart = new Date(startDate);
      const reqEnd = new Date(endDate);
      
      let isFullyCovered = false;
      for (const c of conflicts) {
        const confStart = new Date(c.start_date);
        const confEnd = new Date(c.end_date);
        if (confStart <= reqStart && confEnd >= reqEnd) {
          isFullyCovered = true;
          break;
        }
      }

      if (isFullyCovered) {
        status = "BUSY";
      } else {
        // If conflicts cover all days in range, set to BUSY. Otherwise PARTIAL.
        // Let's say if we have conflicts, default is BUSY if conflicts are >= requested days, else PARTIAL.
        // We can check if any conflict is Red (occupies start and end). If conflicts exist, let's look at the dates.
        // If the number of conflicts covers all requested days, or let's simplify:
        // If there's an active conflict, check if it starts before/on start and ends on/after end -> BUSY.
        // Otherwise, if it starts after start or ends before end -> PARTIAL.
        // Let's verify: "Partial: Some days overlap (not full range)", "Busy: Fully booked for the date range".
        // That is exactly: if a conflict spans the whole range, it is BUSY. If it spans only a few days of the range, it is PARTIAL.
        // What if there are multiple conflicts that together span the whole range? For a single operator, they can't have conflicting events on different days anyway.
        // So we can assume: if there is a conflict that covers only part of the range, it's PARTIAL, unless they are busy for all days.
        // Let's do:
        status = "PARTIAL";
        // Check if any conflict covers the entire range
        const coversEntire = conflicts.some(c => new Date(c.start_date) <= reqStart && new Date(c.end_date) >= reqEnd);
        if (coversEntire) {
          status = "BUSY";
        } else {
          // If the conflicts completely cover the requested date range, set to BUSY.
          // We can check if they have conflicts on all dates between startDate and endDate.
          const datesInRange: string[] = [];
          for (let d = new Date(reqStart); d <= reqEnd; d.setDate(d.getDate() + 1)) {
            datesInRange.push(d.toISOString().split("T")[0]);
          }
          const conflictingDates = new Set<string>();
          for (const c of conflicts) {
            const cs = new Date(c.start_date);
            const ce = new Date(c.end_date);
            for (let d = new Date(cs); d <= ce; d.setDate(d.getDate() + 1)) {
              conflictingDates.add(d.toISOString().split("T")[0]);
            }
          }
          const allBusy = datesInRange.every(date => conflictingDates.has(date));
          if (allBusy) {
            status = "BUSY";
          }
        }
      }
    }

    return {
      ...rowToStaff(row),
      status,
      conflicts: conflicts.map(c => ({
        eventName: c.event_name,
        startDate: c.start_date,
        endDate: c.end_date,
      })),
    };
  });
}

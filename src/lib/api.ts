/**
 * api.ts — typed fetch helpers for the BK CRM REST API.
 *
 * All functions return the raw JSON response (or throw on error).
 */

import type { Client, Inquiry, Quotation, Invoice, CalendarEvent, Equipment, Kit, Vendor, Staff, StaffAssignment, StaffPayment, ClientEquipmentRate } from "./types";

export type OptionItem = {
  id: number;
  type: "STAFF_ROLE" | "QUOTATION_POSITION" | "EQUIPMENT_CATEGORY";
  value: string;
  metaEquip?: string | null;
  metaRate?: number | null;
  sortOrder: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirect}`;
    }
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Clients ──────────────────────────────────────────────────────────────────

export function fetchClients(): Promise<Client[]> {
  return request("/api/clients");
}

export function fetchClient(id: string): Promise<Client> {
  return request(`/api/clients/${id}`);
}

export function createClient(
  data: Omit<Client, "id"> & { id: string }
): Promise<Client> {
  return request("/api/clients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateClient(
  id: string,
  data: Partial<Omit<Client, "id">>
): Promise<Client> {
  return request(`/api/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteClient(id: string): Promise<void> {
  return request(`/api/clients/${id}`, { method: "DELETE" });
}

// ── Inquiries ────────────────────────────────────────────────────────────────

export function fetchInquiries(): Promise<Inquiry[]> {
  return request("/api/inquiries");
}

export function fetchInquiry(id: string): Promise<Inquiry> {
  return request(`/api/inquiries/${id}`);
}

export function createInquiry(
  data: Omit<Inquiry, "id"> & { id: string }
): Promise<Inquiry> {
  return request("/api/inquiries", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateInquiry(
  id: string,
  data: Partial<Omit<Inquiry, "id">>
): Promise<Inquiry> {
  return request(`/api/inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteInquiry(id: string): Promise<void> {
  return request(`/api/inquiries/${id}`, { method: "DELETE" });
}

// ── Quotations ───────────────────────────────────────────────────────────────

export function fetchQuotations(): Promise<Quotation[]> {
  return request("/api/quotations");
}

export function fetchQuotation(id: string): Promise<Quotation> {
  return request(`/api/quotations/${id}`);
}

export function createQuotation(
  data: Omit<Quotation, "id"> & { id: string }
): Promise<Quotation> {
  return request("/api/quotations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateQuotation(
  id: string,
  data: Partial<Omit<Quotation, "id">>
): Promise<Quotation> {
  return request(`/api/quotations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteQuotation(id: string): Promise<void> {
  return request(`/api/quotations/${id}`, { method: "DELETE" });
}

// ── Invoices (API is available if needed, but frontend uses context for now) ──

export function fetchInvoices(): Promise<Invoice[]> {
  return request("/api/invoices");
}

export function fetchInvoice(id: string): Promise<Invoice> {
  return request(`/api/invoices/${id}`);
}

export function createInvoice(
  data: Omit<Invoice, "id"> & { id: string }
): Promise<Invoice> {
  return request("/api/invoices", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, "id">>
): Promise<Invoice> {
  return request(`/api/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteInvoice(id: string): Promise<void> {
  return request(`/api/invoices/${id}`, { method: "DELETE" });
}

// ── Calendar ─────────────────────────────────────────────────────────────────

export function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  return request("/api/calendar");
}

export function createCalendarEvent(
  data: Omit<CalendarEvent, "id"> & { id: string }
): Promise<CalendarEvent> {
  return request("/api/calendar", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteCalendarEvent(id: string): Promise<void> {
  return request(`/api/calendar/${id}`, { method: "DELETE" });
}

export function createCalendarEventsBulk(
  events: CalendarEvent[]
): Promise<CalendarEvent[]> {
  return request("/api/calendar/bulk", {
    method: "POST",
    body: JSON.stringify({ events }),
  });
}

export function deleteCalendarEventsBulk(ids: string[]): Promise<void> {
  return request("/api/calendar/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

// ── Equipment ────────────────────────────────────────────────────────────────

export interface EquipmentFetchResult {
  items: Equipment[];
  total: number;
  page: number;
  limit: number;
  categoryCounts: Record<string, number>;
}

export interface EquipmentSummary {
  totalValue: number;
  totalCount: number;
  categories: Record<string, { count: number; value: number }>;
}

export function fetchEquipment(params?: {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  department?: string;
  ownerStaffId?: number;
}): Promise<EquipmentFetchResult> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", params.page.toString());
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.department) query.set("department", params.department);
  if (params?.ownerStaffId) query.set("ownerStaffId", params.ownerStaffId.toString());
  return request(`/api/equipment?${query.toString()}`);
}

export function fetchEquipmentItem(id: number): Promise<Equipment> {
  return request(`/api/equipment/${id}`);
}

export function createEquipment(data: Omit<Equipment, "id" | "createdAt">): Promise<Equipment> {
  return request("/api/equipment", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEquipment(id: number, data: Partial<Omit<Equipment, "id" | "createdAt">>): Promise<Equipment> {
  return request(`/api/equipment/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteEquipment(id: number): Promise<void> {
  return request(`/api/equipment/${id}`, { method: "DELETE" });
}

export function fetchAssetSummary(): Promise<EquipmentSummary> {
  return request("/api/equipment/asset-summary");
}

export function importEquipmentCSV(csvText: string): Promise<{ success: boolean; count: number }> {
  return request("/api/equipment/import-csv", {
    method: "POST",
    body: JSON.stringify({ csvText }),
  });
}

// ── Kits ─────────────────────────────────────────────────────────────────────

export function fetchKits(params?: { startDate?: string; endDate?: string; department?: string }): Promise<Kit[]> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  if (params?.department) query.set("department", params.department);
  return request(`/api/kits?${query.toString()}`);
}

export function fetchKit(id: number): Promise<Kit> {
  return request(`/api/kits/${id}`);
}

export function createKit(data: { name: string; description?: string | null; mainBodyId?: number | null; mainBodyQty?: number | null; accessories?: { id: number; quantity: number }[] }): Promise<Kit> {
  return request("/api/kits", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateKit(id: number, data: Partial<{ name: string; description: string | null; mainBodyId: number | null; mainBodyQty: number | null }>): Promise<Kit> {
  return request(`/api/kits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteKit(id: number): Promise<void> {
  return request(`/api/kits/${id}`, { method: "DELETE" });
}

export function addItemToKit(kitId: number, equipmentId: number, quantity?: number): Promise<void> {
  return request(`/api/kits/${kitId}/add-item`, {
    method: "POST",
    body: JSON.stringify({ equipmentId, quantity }),
  });
}

export function removeItemFromKit(kitId: number, equipmentId: number): Promise<void> {
  return request(`/api/kits/${kitId}/remove-item/${equipmentId}`, {
    method: "DELETE",
  });
}

// ── Vendors ──────────────────────────────────────────────────────────────────

export function fetchVendors(): Promise<(Vendor & { timesUsed: number })[]> {
  return request("/api/vendors");
}

export function fetchVendor(id: number): Promise<Vendor> {
  return request(`/api/vendors/${id}`);
}

export function createVendor(data: Omit<Vendor, "id" | "createdAt" | "isActive">): Promise<Vendor> {
  return request("/api/vendors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateVendor(id: number, data: Partial<Omit<Vendor, "id" | "createdAt">>): Promise<Vendor> {
  return request(`/api/vendors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function fetchVendorHistory(id: number): Promise<{ history: any[]; ytdSpend: number }> {
  return request(`/api/vendors/${id}/history`);
}

// ── Warehouse Check & Bookings ───────────────────────────────────────────────

export interface WarehouseCheckResult {
  inquiry: Inquiry;
  quotation: {
    id: string;
    quoteNo: string;
    equipment: any[];
  } | null;
  bookings: any[];
  equipment: any[];
  kits: any[];
  staffAssignments: {
    id: number;
    staffId: number;
    staffName: string;
    positionName: string | null;
    positionNo: number | null;
    daysAssigned: number;
    ratePerDay: number;
    withEquipment: boolean;
    equipmentRatePerDay: number;
    totalAmount: number;
  }[];
}

export function fetchWarehouseCheck(inquiryId: string): Promise<WarehouseCheckResult> {
  return request(`/api/warehouse/check?inquiryId=${inquiryId}`);
}

export function createEquipmentBooking(data: {
  inquiryId: string;
  equipmentId?: number | null;
  kitId?: number | null;
  position?: string | null;
  bookedFrom: string;
  bookedTo: string;
  vendorId?: number | null;
  vendorCostPerDay?: number | null;
}): Promise<any> {
  return request("/api/equipment-bookings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function confirmEquipmentBooking(id: number): Promise<any> {
  return request(`/api/equipment-bookings/${id}/confirm`, {
    method: "PUT",
  });
}

// Records equipment rental for a staff-owned equipment booking. Rental is always
// credited to the equipment owner. Pass ratePerDay = 0 to clear the rental.
export function updateBookingRental(
  id: number,
  ratePerDay: number
): Promise<{
  id: number;
  rentalOwnerStaffId: number | null;
  rentalRatePerDay: number | null;
  totalRental: number | null;
  days: number;
}> {
  return request(`/api/equipment-bookings/${id}/rental`, {
    method: "PUT",
    body: JSON.stringify({ ratePerDay }),
  });
}

export function returnEquipmentBooking(id: number): Promise<any> {
  return request(`/api/equipment-bookings/${id}/return`, {
    method: "PUT",
  });
}

export function bulkConfirmBookings(bookingIds: number[]): Promise<{ success: boolean; count: number }> {
  return request("/api/equipment-bookings/bulk-confirm", {
    method: "POST",
    body: JSON.stringify({ bookingIds }),
  });
}

// ── Staff ────────────────────────────────────────────────────────────────────

export interface StaffFetchParams {
  search?: string;
  type?: string;
  paymentType?: string;
  status?: string;
  department?: string;
}

export function fetchStaff(params?: StaffFetchParams): Promise<(Staff & { status: "Available" | "Deployed"; pendingPayment: number })[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.type) query.set("type", params.type);
  if (params?.paymentType) query.set("paymentType", params.paymentType);
  if (params?.status) query.set("status", params.status);
  if (params?.department) query.set("department", params.department);
  return request(`/api/staff?${query.toString()}`);
}

export function fetchStaffItem(id: number): Promise<Staff> {
  return request(`/api/staff/${id}`);
}

export function createStaff(data: Omit<Staff, "id" | "createdAt" | "isActive">): Promise<Staff> {
  return request("/api/staff", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateStaff(id: number, data: Partial<Omit<Staff, "id" | "createdAt">>): Promise<Staff> {
  return request(`/api/staff/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteStaff(id: number): Promise<void> {
  return request(`/api/staff/${id}`, { method: "DELETE" });
}

export function reactivateStaff(id: number): Promise<{ success: boolean; message: string }> {
  return request(`/api/staff/${id}/reactivate`, { method: "POST" });
}

export function fetchInactiveStaff(): Promise<Staff[]> {
  return request("/api/staff/inactive");
}

export function fetchStaffHistory(id: number): Promise<any[]> {
  return request(`/api/staff/${id}/history`);
}

export function fetchStaffSummary(id: number): Promise<any> {
  return request(`/api/staff/${id}/summary`);
}

// Per-event equipment rental owed to this staff member as the OWNER of the gear.
export function fetchStaffRentals(id: number): Promise<{
  bookingId: number;
  inquiryId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  equipmentName: string;
  ratePerDay: number;
  totalRental: number;
}[]> {
  return request(`/api/staff/${id}/rentals`);
}

// ── Staff Assignments ────────────────────────────────────────────────────────

export function fetchStaffAssignments(inquiryId: string): Promise<(StaffAssignment & { staffName: string; staffType: "INHOUSE" | "EXTERNAL"; withEquipment: boolean; equipmentDesc: string | null })[]> {
  return request(`/api/staff-assignments?inquiryId=${inquiryId}`);
}

export function createStaffAssignment(data: Omit<StaffAssignment, "id" | "totalAmount" | "isDuplicate" | "confirmedDup" | "createdAt">): Promise<StaffAssignment> {
  return request("/api/staff-assignments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateStaffAssignment(
  id: number,
  data: Partial<{ daysAssigned: number; ratePerDay: number; positionName: string; positionNo: number | null; withEquipment: boolean; equipmentRatePerDay: number }>
): Promise<StaffAssignment> {
  return request(`/api/staff-assignments/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteStaffAssignment(id: number): Promise<void> {
  return request(`/api/staff-assignments?id=${id}`, { method: "DELETE" });
}

export function checkDuplicateAssignment(inquiryId: string, staffId: number): Promise<{ isDuplicate: boolean; existingPosition?: string }> {
  return request("/api/staff-assignments/check-duplicate", {
    method: "POST",
    body: JSON.stringify({ inquiryId, staffId }),
  });
}

export function confirmDuplicateAssignment(assignmentId: number): Promise<void> {
  return request("/api/staff-assignments/confirm-duplicate", {
    method: "POST",
    body: JSON.stringify({ assignmentId }),
  });
}

// ── Staff Payments ───────────────────────────────────────────────────────────

export function recordStaffPayment(data: Omit<StaffPayment, "id" | "paidAt">): Promise<StaffPayment> {
  return request("/api/staff-payments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function recordBulkStaffPayments(payments: Omit<StaffPayment, "id" | "paidAt">[]): Promise<any> {
  return request("/api/staff-payments/bulk", {
    method: "POST",
    body: JSON.stringify({ payments }),
  });
}

export function fetchStaffPayments(params?: {
  inquiryId?: string;
  month?: string;
  status?: "PENDING" | "PAID";
  staffId?: number;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.inquiryId) query.set("inquiryId", params.inquiryId);
  if (params?.month) query.set("month", params.month);
  if (params?.status) query.set("status", params.status);
  if (params?.staffId) query.set("staffId", params.staffId.toString());
  return request(`/api/staff-payments?${query.toString()}`);
}

export function fetchMonthlyReport(month: string): Promise<{
  perDayStaff: any[];
  monthlyStaff: any[];
  totals: { total: number; paid: number; pending: number };
}> {
  return request(`/api/staff-payments/monthly-report?month=${month}`);
}

// ── Availability ─────────────────────────────────────────────────────────────

export function checkStaffAvailability(startDate: string, endDate: string, role?: string): Promise<(Staff & { status: "FREE" | "PARTIAL" | "BUSY"; conflicts: any[] })[]> {
  const query = new URLSearchParams({ startDate, endDate });
  if (role) query.set("role", role);
  return request(`/api/staff/availability?${query.toString()}`);
}

// ── Dispatch Boxes ────────────────────────────────────────────────────────────

export interface DispatchBox {
  id: number;
  inquiryId: string;
  boxNumber: number;
  contents: string;
  cabinets: number;
  vehicle: "Vehicle 1" | "Vehicle 2";
  source: "BK_MEDIA" | "VENDOR";
}

export function fetchDispatchBoxes(inquiryId: string): Promise<DispatchBox[]> {
  return request(`/api/inquiries/${inquiryId}/dispatch-boxes`);
}

export function createDispatchBox(inquiryId: string, data: Omit<DispatchBox, "id" | "inquiryId">): Promise<DispatchBox> {
  return request(`/api/inquiries/${inquiryId}/dispatch-boxes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateDispatchBox(inquiryId: string, boxId: number, data: Partial<Omit<DispatchBox, "id" | "inquiryId">>): Promise<DispatchBox> {
  return request(`/api/inquiries/${inquiryId}/dispatch-boxes/${boxId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteDispatchBox(inquiryId: string, boxId: number): Promise<void> {
  return request(`/api/inquiries/${inquiryId}/dispatch-boxes/${boxId}`, {
    method: "DELETE",
  });
}


// ── Option lists (dynamic dropdowns: staff roles, quotation positions) ─────────

export function fetchOptions(type: OptionItem["type"]): Promise<OptionItem[]> {
  return request(`/api/options?type=${encodeURIComponent(type)}`);
}

export function addOption(
  type: OptionItem["type"],
  value: string,
  meta?: { equip?: string; rate?: number }
): Promise<OptionItem> {
  return request("/api/options", {
    method: "POST",
    body: JSON.stringify({ type, value, ...meta }),
  });
}

export function removeOption(type: OptionItem["type"], value: string): Promise<void> {
  return request(`/api/options?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}`, {
    method: "DELETE",
  });
}

export function updateOption(
  type: OptionItem["type"],
  oldValue: string,
  newValue: string
): Promise<void> {
  return request("/api/options", {
    method: "PUT",
    body: JSON.stringify({ type, oldValue, newValue }),
  });
}


// ── Client equipment rate overrides (client-specific pricing) ──────────────────

export function fetchClientRates(clientId: string): Promise<ClientEquipmentRate[]> {
  return request(`/api/clients/${clientId}/rates`);
}

export function saveClientRate(
  clientId: string,
  equipmentId: number,
  rate: number
): Promise<ClientEquipmentRate> {
  return request(`/api/clients/${clientId}/rates`, {
    method: "POST",
    body: JSON.stringify({ equipmentId, rate }),
  });
}

export function deleteClientRate(clientId: string, equipmentId: number): Promise<void> {
  return request(`/api/clients/${clientId}/rates/${equipmentId}`, {
    method: "DELETE",
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function login(username: string, password: string): Promise<{ user: { id: string; username: string; name: string; role: string } }> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout(): Promise<void> {
  return request("/api/auth/logout", { method: "POST" });
}

// ── Reports ──────────────────────────────────────────────────────────────────

export function fetchClientRequirements(inquiryId: string): Promise<Record<string, unknown>> {
  return request(`/api/reports/client-requirements?inquiryId=${encodeURIComponent(inquiryId)}`);
}

export function saveClientRequirements(
  inquiryId: string,
  data: { powerRequirements: string; tablesSpace: string; otherRequirements: string }
): Promise<Record<string, unknown>> {
  return request("/api/reports/client-requirements", {
    method: "POST",
    body: JSON.stringify({ inquiryId, ...data }),
  });
}

export function fetchExpenseReport(inquiryId: string): Promise<Record<string, unknown>> {
  return request(`/api/reports/expense?inquiryId=${encodeURIComponent(inquiryId)}`);
}

export function fetchPLReport(inquiryId: string): Promise<Record<string, unknown>> {
  return request(`/api/reports/pl?inquiryId=${encodeURIComponent(inquiryId)}`);
}

export function fetchStaffBrief(inquiryId: string, staffId: string): Promise<Record<string, unknown>> {
  return request(`/api/reports/staff-brief?inquiryId=${encodeURIComponent(inquiryId)}&staffId=${encodeURIComponent(staffId)}`);
}

export function broadcastStaffBrief(inquiryId: string, staffId: string, messageText: string): Promise<Record<string, unknown>> {
  return request("/api/reports/staff-brief", {
    method: "POST",
    body: JSON.stringify({ inquiryId, staffId, messageText }),
  });
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  is_active: number;
  created_at: string;
}

export function fetchUsers(): Promise<UserRow[]> {
  return request("/api/users");
}

export function createUser(data: { username: string; name: string; password: string; role: string }): Promise<UserRow> {
  return request("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(id: string, data: { name?: string; role?: string; password?: string; is_active?: number }): Promise<UserRow> {
  return request(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteUser(id: string): Promise<void> {
  return request(`/api/users/${id}`, { method: "DELETE" });
}

// ── Roles & Permissions ───────────────────────────────────────────────────────

export function fetchRoles(): Promise<{ roles: Record<string, string[]> }> {
  return request("/api/roles");
}

export function setRolePermissions(role: string, permissions: string[]): Promise<void> {
  return request("/api/roles", {
    method: "POST",
    body: JSON.stringify({ role, permissions }),
  });
}

export function deleteRole(role: string): Promise<void> {
  return request("/api/roles", {
    method: "DELETE",
    body: JSON.stringify({ role }),
  });
}

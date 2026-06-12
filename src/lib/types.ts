export interface Client {
  id: string;
  initials: string;
  bg: string;
  fg: string;
  name: string;
  contact: string;
  mobile: string;
  email: string;
  gst: string;
  pan: string;
  addressLine: string;
  city: string;
  district: string;
  state: string;
  pin: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt?: string;
}

export interface Inquiry {
  id: string;
  clientId: string;
  eventType: string;
  eventName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  notes: string;
  status: "New" | "Quoted" | "Confirmed" | "Cancelled";
  createdAt: string;
  updatedAt?: string;
  department?: "VIDEO" | "LED" | "MERGED";
  screenWidth?: number;
  screenHeight?: number;
  screenAreaSqft?: number;
  totalCabinets?: number;
  ledType?: string;
  ratePerSqft?: number;
  location?: string;
  stageType?: string;
  dispatchDate?: string;
  dispatchTime?: string;
  vehicle1Number?: string;
  vehicle1Driver?: string;
  vehicle2Number?: string;
  vehicle2Driver?: string;
  crewCount?: number;
}

export interface QuotationRow {
  no: number;
  position: string;
  equip: string;
  rate: number;
  days: number;
  amount: number;
}

export interface Quotation {
  id: string;
  inquiryId: string;
  clientName: string;
  eventName: string;
  quoteNo: string;
  startDate: string;
  endDate: string;
  days: number;
  venue: string;
  status: "Draft" | "Sent" | "Approved" | "Revised";
  equipment: QuotationRow[];
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  createdAt: string;
  updatedAt?: string;
  sentAt: string | null;
  approvedAt: string | null;
  revisionNumber?: number;
  signedCopyUrl?: string;
}

export interface Invoice {
  id: string;
  quotationId: string;
  invoiceNo: string;
  clientName: string;
  eventName: string;
  startDate: string;
  endDate: string;
  venue: string;
  videographyAmount: number;
  photographyAmount: number;
  advance: number;
  balance: number;
  status: "Unpaid" | "Partial paid" | "Paid";
  advanceReceived: boolean;
  advanceReceivedAt: string | null;
  advanceRef: string;
  advanceMethod: string;
  balanceReceived: boolean;
  balanceReceivedAt: string | null;
  balanceRef: string;
  balanceMethod: string;
  hddDelivered: boolean;
  deinstallDone?: boolean;
  createdAt: string;
  updatedAt?: string;
  dueDate: string;
}

export interface CalendarEvent {
  id: string;
  date: number;
  month: number;
  year: number;
  label: string;
  type: "inquiry" | "quotation" | "confirmed" | "completed";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export interface Equipment {
  id: number;
  productName: string;
  category: "CAMERA" | "LENS" | "VIDEO_MIXER" | "VIDEO_RECORDER" | "AUDIO_MIXER" | "WIRELESS_TX" | "MONITOR" | "TALLY_SYSTEM" | "INTERCOM" | "STREAMING_DEVICE" | "CONVERTER" | "SPLITTER" | "NETWORK" | "CABLE" | "GIMBAL" | "TRIPOD" | "CONTROLLER" | "INTERNET_DEVICE" | "UPS" | "STORAGE" | "ACCESSORY" | "LED_PANEL" | "LED_PROCESSOR" | "LED_CABLE" | "LED_ACCESSORY" | string;
  itemType: "INDIVIDUAL" | "BULK";
  quantity: number;
  quantityUnit: "pieces" | "pair" | "metre";
  serialNumber?: string | null;
  bodyName?: string | null;
  kitId?: number | null;
  kitName?: string | null;
  respPerson?: string | null;
  purchaseDate?: string | null;
  purchaseFrom?: string | null;
  billNumber?: string | null;
  purchasePrice?: number | null;
  status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "SOLD" | "RETIRED";
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  ownershipType: "INHOUSE" | "VENDOR" | "STAFF";
  vendorId?: number | null;
  vendorName?: string | null;
  ownerStaffId?: number | null;
  ownerStaffName?: string | null;
  defaultRate?: number | null;
  department?: "VIDEO" | "LED" | "AUDIO" | "LIGHTS" | string;
  // Derived (not stored): true when an active booking (OUT/BOOKED, not RETURNED)
  // covers today. Availability is date-based, not a permanent status flag.
  inUseToday?: boolean;
}

export interface Kit {
  id: number;
  name: string;
  description?: string | null;
  mainBodyId?: number | null;
  createdAt: string;
  items?: Equipment[];
  availabilityStatus?: string | null;
  department?: "VIDEO" | "LED";
}

export interface EquipmentBooking {
  id: number;
  inquiryId: string;
  equipmentId?: number | null;
  kitId?: number | null;
  position?: string | null;
  bookedFrom: string;
  bookedTo: string;
  status: "BOOKED" | "OUT" | "RETURNED";
  vendorId?: number | null;
  vendorCostPerDay?: number | null;
  totalVendorCost?: number | null;
  confirmedById?: string | null;
  confirmedAt?: string | null;
}

export interface Vendor {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  specialization?: string | null;
  city?: string | null;
  gstNumber?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  equipments?: Equipment[];
}

export interface Staff {
  id: number;
  name: string;
  phone: string;
  role: "Videographer" | "Photographer" | "Crane operator" | "Drone operator" | "LED operator" | "Audio operator" | "Editor" | "Photo editor" | "Other";
  staffType: "INHOUSE" | "EXTERNAL";
  paymentType: "PER_DAY" | "MONTHLY";
  ratePerDay?: number | null;
  monthlySalary?: number | null;
  withEquipment: boolean;
  equipmentDesc?: string | null;
  equipmentRatePerDay?: number | null;
  aadharNumber?: string | null;
  aadharFront?: string | null;
  aadharBack?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  department?: "VIDEO" | "LED" | "BOTH";
}

export interface StaffAssignment {
  id: number;
  staffId: number;
  inquiryId: string;
  positionNo?: number | null;
  positionName?: string | null;
  daysAssigned: number;
  ratePerDay: number;
  withEquipment?: boolean;
  equipmentRatePerDay?: number;
  totalAmount: number;
  isDuplicate: boolean;
  confirmedDup: boolean;
  reportingTime?: string;
  createdAt: string;
}

export interface ClientEquipmentRate {
  id: number;
  clientId: string;
  equipmentId: number;
  equipmentName?: string;
  rate: number;
  createdAt: string;
  updatedAt?: string | null;
}

export interface StaffPayment {
  id: number;
  staffId: number;
  assignmentId?: number | null;
  inquiryId?: string | null;
  amount: number;
  paymentType: "PER_EVENT" | "MONTHLY_SALARY" | "EQUIPMENT_RENTAL";
  paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
  referenceNo?: string | null;
  month?: string | null;
  paidAt: string;
  paidById?: string | null;
  notes?: string | null;
}

// ── LED Department Types ──────────────────────────────────────────────────────

export type LedType = "P4" | "P3" | "P2" | "FLOOR" | "P4_CURVED";
export type LedOperatorSource = "IN_HOUSE" | "EXTERNAL";
export type LedScreenStatus = "OFF" | "SETUP" | "LIVE" | "ISSUE";
export type LedExpenseCategory = "TRANSPORT" | "FOOD" | "MISC" | "CUSTOM";

export interface LedCompanyLot {
  id: number;
  name: string;
  ledType: LedType;
  cabinetHeightMm: number;
  cabinetWidthMm: number;
  cabinetsPerBox: number;
  totalCabinets: number;
  createdAt: string;
  updatedAt?: string | null;
  // derived (never stored)
  sqftForPricing?: number;   // totalCabinets × 4
  totalBoxes?: number;       // ceil(totalCabinets / cabinetsPerBox)
}

export interface LedWarehouseAllocation {
  id: number;
  inquiryId: string;
  lotId: number;
  lot?: LedCompanyLot;
  allocatedSqft: number;
  createdAt: string;
}

export interface LedVendorArrangement {
  id: number;
  inquiryId: string;
  vendorName: string;
  ledType: LedType;
  sqft: number;
  ratePerSqftPerDay: number;
  createdAt: string;
  // derived
  vendorCost?: number; // sqft × ratePerSqftPerDay × eventDays
}

export interface LedScreenPosition {
  id: number;
  inquiryId: string;
  positionNo: number;
  place: string;
  location: string;
  ledType: LedType;
  targetHeightFt: number;
  targetWidthFt: number;
  quantity: number;
  cabinetHeightMm: number;
  cabinetWidthMm: number;
  operatorStaffId?: number | null;
  operatorStaff?: Staff | null;
  operatorSource?: LedOperatorSource | null;
  createdAt: string;
  // derived (computed server-side)
  sqftPerScreen?: number;
  totalSqft?: number;
  hCabs?: number;
  wCabs?: number;
  clearHeightMm?: number;
  clearHeightFt?: number;
  clearWidthMm?: number;
  clearWidthFt?: number;
}

export interface LedDayStatus {
  id: number;
  inquiryId: string;
  positionNo: number;
  dayIndex: number;
  status: LedScreenStatus;
  notes: string;
  dayDone: boolean;
}

export interface LedIssueLog {
  id: number;
  inquiryId: string;
  text: string;
  loggedAt: string;
}

export interface LedOperationsLog {
  id: number;
  inquiryId: string;
  logTime: string;
  text: string;
  loggedAt: string;
}

export interface LedExpense {
  id: number;
  inquiryId: string;
  category: LedExpenseCategory;
  label: string;
  amount: number;
  createdAt: string;
}

export interface LedWarehouseView {
  requiredSqft: number;
  eventDays: number;
  ratePerSqft: number;
  clientBilling: number;
  lots: Array<{
    lot: LedCompanyLot;
    allocatedSqft: number;
    remainingSqft: number;
    usagePct: number;
    allocationId: number | null;
  }>;
  vendors: LedVendorArrangement[];
  bkMediaTotal: number;
  vendorTotal: number;
  shortfall: number;
  coveragePct: number;
  vendorCost: number;
  netMargin: number;
}

export interface LedPositionsSummary {
  positions: LedScreenPosition[];
  summary: {
    totalPositions: number;
    totalSqftPerDay: number;
    places: string[];
  };
}

export interface LedExpensePnL {
  clientBilling: number;
  staffCost: number;
  vendorCost: number;
  transport: number;
  food: number;
  misc: number;
  extraTotal: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  expenses: LedExpense[];
  expenseBreakdown: {
    vendorPct: number;
    staffPct: number;
    transportPct: number;
    foodPct: number;
    miscPct: number;
    extraPct: number;
  };
}

export interface LedExecutionView {
  positions: LedScreenPosition[];
  dayStatuses: LedDayStatus[];
  issues: LedIssueLog[];
  logs: LedOperationsLog[];
  eventDays: number;
  startDate: string;
}

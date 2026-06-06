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
  department?: "VIDEO" | "LED";
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
  paymentType: "PER_EVENT" | "MONTHLY_SALARY";
  paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
  referenceNo?: string | null;
  month?: string | null;
  paidAt: string;
  paidById?: string | null;
  notes?: string | null;
}



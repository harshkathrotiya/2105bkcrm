/**
 * validate.ts — shared input validation helpers for all API routes.
 *
 * Usage:
 *   const v = new Validator(body);
 *   v.required("name").minLength("name", 2).maxLength("name", 100);
 *   v.phone("mobile").email("email").date("startDate");
 *   if (v.hasErrors()) return v.response();
 */

export class Validator {
  private errors: string[] = [];
  private data: Record<string, any>;

  constructor(data: Record<string, any>) {
    this.data = data;
  }

  // ── Presence ──────────────────────────────────────────────────────────────

  required(field: string, label?: string): this {
    const val = this.data[field];
    if (val === undefined || val === null || String(val).trim() === "") {
      this.errors.push(`${label ?? field} is required`);
    }
    return this;
  }

  // ── String ────────────────────────────────────────────────────────────────

  minLength(field: string, min: number, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim().length < min) {
      this.errors.push(`${label ?? field} must be at least ${min} characters`);
    }
    return this;
  }

  maxLength(field: string, max: number, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim().length > max) {
      this.errors.push(`${label ?? field} must be at most ${max} characters`);
    }
    return this;
  }

  // ── Numbers ───────────────────────────────────────────────────────────────

  positiveNumber(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null) {
      const n = Number(val);
      if (isNaN(n) || n <= 0) {
        this.errors.push(`${label ?? field} must be a positive number`);
      }
    }
    return this;
  }

  nonNegativeNumber(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null) {
      const n = Number(val);
      if (isNaN(n) || n < 0) {
        this.errors.push(`${label ?? field} must be 0 or greater`);
      }
    }
    return this;
  }

  integer(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null) {
      const n = Number(val);
      if (isNaN(n) || !Number.isInteger(n)) {
        this.errors.push(`${label ?? field} must be a whole number`);
      }
    }
    return this;
  }

  positiveInteger(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null) {
      const n = Number(val);
      if (isNaN(n) || !Number.isInteger(n) || n <= 0) {
        this.errors.push(`${label ?? field} must be a positive whole number`);
      }
    }
    return this;
  }

  // ── Formats ───────────────────────────────────────────────────────────────

  /** Exactly 10 digits */
  phone(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (!/^\d{10}$/.test(String(val).trim())) {
        this.errors.push(`${label ?? field} must be exactly 10 digits`);
      }
    }
    return this;
  }

  /** Basic email format */
  email(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim())) {
        this.errors.push(`${label ?? field} must be a valid email address`);
      }
    }
    return this;
  }

  /** YYYY-MM-DD */
  date(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())) {
        this.errors.push(`${label ?? field} must be in YYYY-MM-DD format`);
      } else {
        const d = new Date(String(val).trim());
        if (isNaN(d.getTime())) {
          this.errors.push(`${label ?? field} is not a valid date`);
        }
      }
    }
    return this;
  }

  /** endDate must be >= startDate */
  dateRange(startField: string, endField: string): this {
    const s = this.data[startField];
    const e = this.data[endField];
    if (s && e && /^\d{4}-\d{2}-\d{2}$/.test(s) && /^\d{4}-\d{2}-\d{2}$/.test(e)) {
      if (new Date(e) < new Date(s)) {
        this.errors.push(`End date must be on or after start date`);
      }
    }
    return this;
  }

  /** YYYY-MM */
  yearMonth(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (!/^\d{4}-\d{2}$/.test(String(val).trim())) {
        this.errors.push(`${label ?? field} must be in YYYY-MM format`);
      }
    }
    return this;
  }

  /** 12 digits (Aadhar) */
  aadhar(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (!/^\d{12}$/.test(String(val).trim())) {
        this.errors.push(`${label ?? field} must be exactly 12 digits`);
      }
    }
    return this;
  }

  /** GST: 15-char alphanumeric */
  gst(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(String(val).trim().toUpperCase())) {
        this.errors.push(`${label ?? field} must be a valid 15-character GST number`);
      }
    }
    return this;
  }

  /** PAN: 10-char alphanumeric */
  pan(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(String(val).trim().toUpperCase())) {
        this.errors.push(`${label ?? field} must be a valid 10-character PAN number`);
      }
    }
    return this;
  }

  /** PIN code: 6 digits */
  pin(field: string, label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (!/^\d{6}$/.test(String(val).trim())) {
        this.errors.push(`${label ?? field} must be a 6-digit PIN code`);
      }
    }
    return this;
  }

  // ── Enums ─────────────────────────────────────────────────────────────────

  oneOf(field: string, allowed: readonly string[], label?: string): this {
    const val = this.data[field];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (!allowed.includes(String(val))) {
        this.errors.push(`${label ?? field} must be one of: ${allowed.join(", ")}`);
      }
    }
    return this;
  }

  // ── Arrays ────────────────────────────────────────────────────────────────

  nonEmptyArray(field: string, label?: string): this {
    const val = this.data[field];
    if (!Array.isArray(val) || val.length === 0) {
      this.errors.push(`${label ?? field} must be a non-empty array`);
    }
    return this;
  }

  // ── Result ────────────────────────────────────────────────────────────────

  /** Manually add a validation error (for custom / cross-field checks) */
  add(_field: string, message: string): this {
    this.errors.push(message);
    return this;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  firstError(): string {
    return this.errors[0] ?? "Validation failed";
  }

  allErrors(): string[] {
    return [...this.errors];
  }

  /** Returns a 400 Response with all errors */
  response(): Response {
    return Response.json(
      { error: this.firstError(), errors: this.allErrors() },
      { status: 400 }
    );
  }
}

// ── Standalone helpers ────────────────────────────────────────────────────────

export function isValidDate(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(new Date(val).getTime());
}

export function isValidId(val: any): boolean {
  const n = Number(val);
  return !isNaN(n) && Number.isInteger(n) && n > 0;
}

export const STAFF_ROLES = [
  "Videographer", "Photographer", "Crane operator", "Drone operator",
  "LED operator", "Audio operator", "Editor", "Photo editor", "Other",
] as const;

export const STAFF_TYPES = ["INHOUSE", "EXTERNAL"] as const;
export const PAYMENT_TYPES = ["PER_DAY", "MONTHLY"] as const;
export const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"] as const;
export const STAFF_PAYMENT_TYPES = ["PER_EVENT", "MONTHLY_SALARY"] as const;

export const EQUIPMENT_CATEGORIES = [
  "CAMERA", "VIDEO_MIXER", "VIDEO_RECORDER", "AUDIO_MIXER",
  "WIRELESS_TX", "UPS", "ACCESSORY",
  "LED_PANEL", "LED_PROCESSOR", "LED_CABLE", "LED_ACCESSORY",
] as const;

export const EQUIPMENT_STATUSES = [
  "AVAILABLE", "IN_USE", "MAINTENANCE", "SOLD", "RETIRED",
] as const;

export const INQUIRY_STATUSES = ["New", "Quoted", "Confirmed", "Cancelled"] as const;
export const QUOTATION_STATUSES = ["Draft", "Sent", "Approved", "Revised"] as const;
export const INVOICE_STATUSES = ["Unpaid", "Partial paid", "Paid"] as const;
export const CALENDAR_TYPES = ["inquiry", "quotation", "confirmed", "completed"] as const;

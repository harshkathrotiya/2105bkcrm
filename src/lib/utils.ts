/**
 * utils.ts — shared business logic utilities
 */

// ── Financial Year ────────────────────────────────────────────────────────────
// April 1 → March 31. Month is 1-indexed (1=Jan, 4=Apr).
export function getFY(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-indexed
  if (m >= 4) {
    // e.g. May 2026 → "26-27"
    return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
  } else {
    // e.g. Feb 2026 → "25-26"
    return `${String(y - 1).slice(2)}-${String(y).slice(2)}`;
  }
}

// ── Quote Number ──────────────────────────────────────────────────────────────
// Format: BKM/{FY}/{MM}/{NNN}  e.g. BKM/26-27/05/016
// NNN = sequential count of quotations in this FY, padded to 3 digits.
export function generateQuoteNo(existingQuoteNos: string[], date: Date = new Date()): string {
  const fy = getFY(date);
  const mm = String(date.getMonth() + 1).padStart(2, "0");

  // Count existing quotations in this FY to get next sequential number
  const fyPrefix = `BKM/${fy}/`;
  const countInFY = existingQuoteNos.filter((n) => n.startsWith(fyPrefix) && !n.includes("-", fyPrefix.length + 6)).length;
  const nnn = String(countInFY + 1).padStart(3, "0");

  return `BKM/${fy}/${mm}/${nnn}`;
}

// ── Revision Number ───────────────────────────────────────────────────────────
// Appends -1, -2, -3 to the base quote number.
export function generateRevisionNo(baseQuoteNo: string, existingQuoteNos: string[]): string {
  // Strip any existing revision suffix
  const base = baseQuoteNo.replace(/-\d+$/, "");
  const revisions = existingQuoteNos.filter((n) => n.startsWith(base + "-"));
  const nextRev = revisions.length + 1;
  return `${base}-${nextRev}`;
}

// ── Invoice Number ────────────────────────────────────────────────────────────
// Format: BKM-INV-{FY}/{MM}/{NNN}  e.g. BKM-INV-26-27/05/008
export function generateInvoiceNo(existingInvoiceNos: string[], date: Date = new Date()): string {
  const fy = getFY(date);
  const mm = String(date.getMonth() + 1).padStart(2, "0");

  const fyPrefix = `BKM-INV-${fy}/`;
  const countInFY = existingInvoiceNos.filter((n) => n.startsWith(fyPrefix)).length;
  const nnn = String(countInFY + 1).padStart(3, "0");

  return `BKM-INV-${fy}/${mm}/${nnn}`;
}

// ── Duration ──────────────────────────────────────────────────────────────────
export function calcDays(startDate: string, endDate: string): number {
  const s = new Date(startDate);
  const e = new Date(endDate);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
}

// ── Time to minutes (for comparison) ─────────────────────────────────────────
export function timeToMinutes(t: string): number {
  // e.g. "09:00 AM", "10:00 PM"
  const [time, period] = t.split(" ");
  const [h, m] = time.split(":").map(Number);
  let hours = h % 12;
  if (period === "PM") hours += 12;
  return hours * 60 + m;
}

// ── Hours between two times ───────────────────────────────────────────────────
export function calcHours(startTime: string, endTime: string, days: number): number {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const dailyHours = (endMins - startMins) / 60;
  return Math.round(dailyHours * days);
}

// Gujarat GST: CGST 9% + SGST 9% = 18% total
export const CGST_RATE = 0.09;
export const SGST_RATE = 0.09;

export function computeGst(subtotal: number): { cgst: number; sgst: number; total: number } {
  const cgst = Math.round(subtotal * CGST_RATE);
  const sgst = Math.round(subtotal * SGST_RATE);
  return { cgst, sgst, total: subtotal + cgst + sgst };
}

/**
 * Quotation number: BKM/FY/MM/NNN  e.g. BKM/26-27/05/016
 * Financial year: April–March. A date in May 2026 → FY 26-27.
 */
export function formatQuotationNo(serial: number, date: Date = new Date()): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
  const mm = String(month).padStart(2, "0");
  const nnn = String(serial).padStart(3, "0");
  return `BKM/${fy}/${mm}/${nnn}`;
}

/** Invoice number: BKM-INV/FY/MM/NNN  e.g. BKM-INV-26-27/05/008 */
export function formatInvoiceNo(serial: number, date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
  const mm = String(month).padStart(2, "0");
  const nnn = String(serial).padStart(3, "0");
  return `BKM-INV-${fy}/${mm}/${nnn}`;
}

/** HDD size rule: >500 GB → 2TB, >200 GB → 1TB, else 500GB */
export function suggestHddSize(gb: number): string {
  if (gb > 500) return "2TB";
  if (gb > 200) return "1TB";
  return "500GB";
}

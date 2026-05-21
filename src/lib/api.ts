/**
 * api.ts — typed fetch helpers for the BK CRM REST API.
 *
 * All functions return the raw JSON response (or throw on error).
 */

import type { Client, Inquiry, Quotation, Invoice, CalendarEvent } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
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

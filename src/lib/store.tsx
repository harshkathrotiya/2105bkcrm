"use client";

import { type ReactNode } from "react";
import { ClientsProvider } from "./clients-context";
import { InquiriesProvider } from "./inquiries-context";
import { QuotationsProvider } from "./quotations-context";
import { InvoicesProvider } from "./invoices-context";
import { CalendarProvider } from "./calendar-context";
import { EquipmentProvider } from "./equipment-context";
import { KitsProvider } from "./kits-context";
import { VendorsProvider } from "./vendors-context";

// Re-export all hooks from a single import
export { useClients } from "./clients-context";
export { useInquiries } from "./inquiries-context";
export { useQuotations } from "./quotations-context";
export { useInvoices } from "./invoices-context";
export { useCalendar } from "./calendar-context";
export { useTheme } from "./theme-context";
export { useEquipment } from "./equipment-context";
export { useKits } from "./kits-context";
export { useVendors } from "./vendors-context";

// Re-export types
export type {
  Client,
  Inquiry,
  Quotation,
  QuotationRow,
  Invoice,
  CalendarEvent,
  Equipment,
  Kit,
  Vendor,
} from "./types";

// Re-export utilities
export { generateId } from "./types";

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <ClientsProvider>
      <InquiriesProvider>
        <QuotationsProvider>
          <InvoicesProvider>
            <CalendarProvider>
              <EquipmentProvider>
                <KitsProvider>
                  <VendorsProvider>
                    {children}
                  </VendorsProvider>
                </KitsProvider>
              </EquipmentProvider>
            </CalendarProvider>
          </InvoicesProvider>
        </QuotationsProvider>
      </InquiriesProvider>
    </ClientsProvider>
  );
}

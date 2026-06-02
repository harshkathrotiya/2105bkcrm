import { Suspense } from "react";
import Screen12InvoiceList from "@/components/screens/Screen12InvoiceList";

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="card !p-4 m-8 text-[12px] text-tx3">Loading invoices…</div>}>
      <Screen12InvoiceList />
    </Suspense>
  );
}

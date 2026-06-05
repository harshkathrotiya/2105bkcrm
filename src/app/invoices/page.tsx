import { Suspense } from "react";
import Screen12InvoiceList from "@/components/screens/Screen12InvoiceList";
import PageSkeleton from "@/components/ui/PageSkeleton";

export default function InvoicesPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} cols={5} />}>
      <Screen12InvoiceList />
    </Suspense>
  );
}

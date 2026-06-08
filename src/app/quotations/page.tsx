import { Suspense } from "react";
import Screen11QuotationList from "@/components/screens/Screen11QuotationList";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function QuotationsPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={6} cols={5} message="Loading quotations..." />
      </div>
    }>
      <Screen11QuotationList />
    </Suspense>
  );
}

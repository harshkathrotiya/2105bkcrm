import { Suspense } from "react";
import Screen05QuotationForm from "@/components/screens/Screen05QuotationForm";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function NewQuotationPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="form" rows={4} message="Loading quotation form..." />
      </div>
    }>
      <Screen05QuotationForm />
    </Suspense>
  );
}

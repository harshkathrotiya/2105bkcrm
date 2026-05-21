import { Suspense } from "react";
import Screen05QuotationForm from "@/components/screens/Screen05QuotationForm";

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-tx2">Loading...</div>}>
      <Screen05QuotationForm />
    </Suspense>
  );
}

import { Suspense } from "react";
import Screen04NewInquiry from "@/components/screens/Screen04NewInquiry";

export default function NewInquiryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-tx2">Loading...</div>}>
      <Screen04NewInquiry />
    </Suspense>
  );
}

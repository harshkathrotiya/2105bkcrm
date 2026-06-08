import { Suspense } from "react";
import Screen04NewInquiry from "@/components/screens/Screen04NewInquiry";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function NewInquiryPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="form" rows={4} message="Loading inquiry form..." />
      </div>
    }>
      <Screen04NewInquiry />
    </Suspense>
  );
}

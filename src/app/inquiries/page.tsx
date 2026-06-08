import { Suspense } from "react";
import Screen10InquiryList from "@/components/screens/Screen10InquiryList";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function InquiriesPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={6} cols={5} message="Loading inquiries..." />
      </div>
    }>
      <Screen10InquiryList />
    </Suspense>
  );
}

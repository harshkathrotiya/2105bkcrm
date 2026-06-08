import { Suspense } from "react";
import Screen18VendorList from "@/components/screens/Screen18VendorList";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function VendorsPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="list" rows={5} message="Loading vendors..." />
      </div>
    }>
      <Screen18VendorList />
    </Suspense>
  );
}

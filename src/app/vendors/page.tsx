import { Suspense } from "react";
import Screen18VendorList from "@/components/screens/Screen18VendorList";

function VendorsSkeleton() {
  return (
    <div className="card !p-4 m-8">
      <div className="flex items-center justify-center gap-3 py-6">
        <div className="w-5 h-5 rounded-full border-2 border-b2 border-t-acc animate-spin" />
        <span className="text-[12px] text-tx3">Loading vendors...</span>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  return (
    <Suspense fallback={<VendorsSkeleton />}>
      <Screen18VendorList />
    </Suspense>
  );
}

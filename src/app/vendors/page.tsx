import { Suspense } from "react";
import Screen18VendorList from "@/components/screens/Screen18VendorList";

function VendorsSkeleton() {
  return (
    <div className="card !p-4 m-8">
      <div className="flex items-center justify-center gap-3 py-6">
        <div className="flex gap-1.5">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{background:"var(--tx3)",animationDelay:`${i*150}ms`}}/>)}</div>
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

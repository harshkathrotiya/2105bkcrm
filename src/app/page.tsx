import { Suspense } from "react";
import Screen00Dashboard from "@/components/screens/Screen00Dashboard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function Home() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="dashboard" message="Loading CRM Dashboard..." />
      </div>
    }>
      <Screen00Dashboard />
    </Suspense>
  );
}

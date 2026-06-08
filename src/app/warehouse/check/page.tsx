import { Suspense } from "react";
import Screen17WarehouseCheck from "@/components/screens/Screen17WarehouseCheck";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function WarehouseCheckPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={5} cols={5} message="Loading warehouse check..." />
      </div>
    }>
      <Screen17WarehouseCheck />
    </Suspense>
  );
}

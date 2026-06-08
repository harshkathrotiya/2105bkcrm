import { Suspense } from "react";
import Screen13EquipmentList from "@/components/screens/Screen13EquipmentList";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function EquipmentMasterPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={6} cols={6} message="Loading equipment master list..." />
      </div>
    }>
      <Screen13EquipmentList />
    </Suspense>
  );
}

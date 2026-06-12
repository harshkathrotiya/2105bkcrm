import { Suspense } from "react";
import EquipmentTabs from "@/components/screens/EquipmentTabs";
import DeptEquipment from "@/components/screens/dept/DeptEquipment";
import LedStockScreen from "@/components/screens/led/LedStockScreen";
import RoleRouter from "@/components/screens/dept/RoleRouter";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function EquipmentMasterPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={6} cols={6} message="Loading equipment..." />
      </div>
    }>
      <RoleRouter
        admin={<EquipmentTabs />}
        dept={<DeptEquipment />}
        ledDept={<LedStockScreen />}
      />
    </Suspense>
  );
}

import { Suspense } from "react";
import Screen13EquipmentList from "@/components/screens/Screen13EquipmentList";
import DeptEquipment from "@/components/screens/dept/DeptEquipment";
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
        admin={<Screen13EquipmentList />}
        dept={<DeptEquipment />}
      />
    </Suspense>
  );
}

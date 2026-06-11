import { Suspense } from "react";
import Screen16KitList from "@/components/screens/Screen16KitList";
import DeptKits from "@/components/screens/dept/DeptKits";
import RoleRouter from "@/components/screens/dept/RoleRouter";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function KitsPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={5} cols={5} message="Loading kits..." />
      </div>
    }>
      <RoleRouter
        admin={<Screen16KitList />}
        dept={<DeptKits />}
      />
    </Suspense>
  );
}

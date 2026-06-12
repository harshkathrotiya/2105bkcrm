import { Suspense } from "react";
import Screen00Dashboard from "@/components/screens/Screen00Dashboard";
import LedDeptDashboard from "@/components/screens/dept/LedDeptDashboard";
import RoleRouter from "@/components/screens/dept/RoleRouter";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function Home() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="dashboard" message="Loading CRM Dashboard..." />
      </div>
    }>
      <RoleRouter
        admin={<Screen00Dashboard />}
        dept={<Screen00Dashboard />}
        ledDept={<LedDeptDashboard />}
      />
    </Suspense>
  );
}

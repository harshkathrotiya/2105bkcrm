import { Suspense } from "react";
import Screen20StaffList from "@/components/screens/Screen20StaffList";
import DeptStaff from "@/components/screens/dept/DeptStaff";
import RoleRouter from "@/components/screens/dept/RoleRouter";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export const metadata = {
  title: "Staff Directory — BK Media CRM",
  description: "Manage crew members, type classifications, status and salaries.",
};

export default function StaffListPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={6} cols={7} message="Loading staff directory..." />
      </div>
    }>
      <RoleRouter
        admin={<Screen20StaffList />}
        dept={<DeptStaff />}
      />
    </Suspense>
  );
}

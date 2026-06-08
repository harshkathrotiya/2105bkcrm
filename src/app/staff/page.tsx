import { Suspense } from "react";
import Screen20StaffList from "@/components/screens/Screen20StaffList";
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
      <Screen20StaffList />
    </Suspense>
  );
}

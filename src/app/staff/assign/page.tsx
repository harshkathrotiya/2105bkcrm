import { Suspense } from "react";
import Screen23AssignPosition from "@/components/screens/Screen23AssignPosition";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export const metadata = {
  title: "Operator Position Assignments — BK Media CRM",
  description: "Assign operators to quotation positions.",
};

export default function AssignPositionPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={5} cols={5} message="Loading assignments..." />
      </div>
    }>
      <Screen23AssignPosition />
    </Suspense>
  );
}

import { Suspense } from "react";
import Screen23AssignPosition from "@/components/screens/Screen23AssignPosition";

export const metadata = {
  title: "Operator Position Assignments — BK Media CRM",
  description: "Assign operators to quotation positions.",
};

export default function AssignPositionPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-tx3">Loading assignments...</div>}>
      <Screen23AssignPosition />
    </Suspense>
  );
}

import { Suspense } from "react";
import Screen24PerEventPayment from "@/components/screens/Screen24PerEventPayment";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export const metadata = {
  title: "Per Event Staff Payments — BK Media CRM",
  description: "Track payouts and mark staff members paid for specific event inquiries.",
};

export default function StaffPaymentsPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={5} cols={5} message="Loading payments..." />
      </div>
    }>
      <Screen24PerEventPayment />
    </Suspense>
  );
}

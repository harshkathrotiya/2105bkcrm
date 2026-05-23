import { Suspense } from "react";
import Screen24PerEventPayment from "@/components/screens/Screen24PerEventPayment";

export const metadata = {
  title: "Per Event Staff Payments — BK Media CRM",
  description: "Track payouts and mark staff members paid for specific event inquiries.",
};

export default function StaffPaymentsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-tx3">Loading payments...</div>}>
      <Screen24PerEventPayment />
    </Suspense>
  );
}

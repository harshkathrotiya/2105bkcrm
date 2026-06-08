import { Suspense } from "react";
import Screen03Calendar from "@/components/screens/Screen03Calendar";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export const metadata = {
  title: "Calendar — BK Media CRM",
  description: "View and manage all scheduled events — inquiries, quotations, and confirmed bookings.",
};

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="dashboard" rows={6} message="Loading calendar..." />
      </div>
    }>
      <Screen03Calendar />
    </Suspense>
  );
}

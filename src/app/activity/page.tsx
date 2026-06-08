import { Suspense } from "react";
import ScreenActivityFeed from "@/components/screens/ScreenActivityFeed";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export const metadata = {
  title: "Activity Feed — BK Media CRM",
  description: "Complete log of all CRM activity — inquiries, payments, clients, equipment, and quotations.",
};

export default function ActivityPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="list" rows={6} message="Loading activity feed..." />
      </div>
    }>
      <ScreenActivityFeed />
    </Suspense>
  );
}

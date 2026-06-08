import { Suspense } from "react";
import Screen01ClientList from "@/components/screens/Screen01ClientList";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export const metadata = {
  title: "Client Directory — BK Media CRM",
  description: "Manage client details, contact information, events, and revenue.",
};

export default function ClientsPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="clients" rows={6} message="Loading clients..." />
      </div>
    }>
      <Screen01ClientList />
    </Suspense>
  );
}

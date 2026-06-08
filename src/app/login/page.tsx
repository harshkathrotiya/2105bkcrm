import { Suspense } from "react";
import Screen31Login from "@/components/screens/Screen31Login";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export const metadata = {
  title: "Login — BK Media CRM",
  description: "Secure login for BK Media CRM Video Department.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="m-8 max-w-md mx-auto">
        <LoadingSkeleton type="form" rows={2} message="Loading Login..." />
      </div>
    }>
      <Screen31Login />
    </Suspense>
  );
}

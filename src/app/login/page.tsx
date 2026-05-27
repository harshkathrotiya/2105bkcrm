import { Suspense } from "react";
import Screen31Login from "@/components/screens/Screen31Login";

export const metadata = {
  title: "Login — BK Media CRM",
  description: "Secure login for BK Media CRM Video Department.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="card !p-4 m-8">
        <div className="flex items-center justify-center gap-3 py-6">
          <div className="w-5 h-5 rounded-full border-2 border-b2 border-t-acc animate-spin" />
          <span className="text-[12px] text-tx3">Loading Login...</span>
        </div>
      </div>
    }>
      <Screen31Login />
    </Suspense>
  );
}

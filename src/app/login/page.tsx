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
          <div className="flex gap-1.5">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{background:"var(--tx3)",animationDelay:`${i*150}ms`}}/>)}</div>
          <span className="text-[12px] text-tx3">Loading Login...</span>
        </div>
      </div>
    }>
      <Screen31Login />
    </Suspense>
  );
}

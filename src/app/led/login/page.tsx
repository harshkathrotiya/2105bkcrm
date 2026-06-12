import { Suspense } from "react";
import LedLogin from "@/components/screens/led/LedLogin";

export const metadata = {
  title: "LED Department Login — BK Media CRM",
};

export default function LedLoginPage() {
  return (
    <Suspense fallback={null}>
      <LedLogin />
    </Suspense>
  );
}

import { Suspense } from "react";
import Screen24PerEventPayment from "@/components/screens/Screen24PerEventPayment";

export const metadata = {
  title: "Per Event Staff Payments — BK Media CRM",
  description: "Track payouts and mark staff members paid for specific event inquiries.",
};

function PaymentsSkeleton() {
  return (
    <div className="card !p-4 m-8">
      <div className="flex items-center justify-center gap-3 py-6">
        <div className="w-5 h-5 rounded-full border-2 border-b2 border-t-acc animate-spin" />
        <span className="text-[12px] text-tx3">Loading payments...</span>
      </div>
      <div className="space-y-3">
        <div className="flex gap-3 pb-2 border-b border-b1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3 rounded-sm animate-pulse flex-1" style={{ background: "var(--b1)" }} />
          ))}
        </div>
        {[1, 2, 3, 4].map((r) => (
          <div key={r} className="flex gap-3 py-2 border-b border-tbl-line last:border-b-0">
            {[1, 2, 3, 4, 5].map((c) => (
              <div
                key={c}
                className="h-4 rounded-sm animate-pulse"
                style={{ background: "var(--b1)", opacity: 1 - (c - 1) * 0.12, flex: c === 1 ? 0.6 : 1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StaffPaymentsPage() {
  return (
    <Suspense fallback={<PaymentsSkeleton />}>
      <Screen24PerEventPayment />
    </Suspense>
  );
}

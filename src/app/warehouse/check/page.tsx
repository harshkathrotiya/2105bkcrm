import { Suspense } from "react";
import Screen17WarehouseCheck from "@/components/screens/Screen17WarehouseCheck";

function WarehouseSkeleton() {
  return (
    <div className="card !p-4 m-8">
      <div className="flex items-center justify-center gap-3 py-6">
        <div className="flex gap-1.5">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{background:"var(--tx3)",animationDelay:`${i*150}ms`}}/>)}</div>
        <span className="text-[12px] text-tx3">Loading warehouse check...</span>
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

export default function WarehouseCheckPage() {
  return (
    <Suspense fallback={<WarehouseSkeleton />}>
      <Screen17WarehouseCheck />
    </Suspense>
  );
}

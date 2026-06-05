import { Suspense } from "react";
import Screen17KitDetail from "@/components/screens/Screen17KitDetail";

function KitDetailSkeleton() {
  return (
    <div className="card !p-4 m-8">
      <div className="flex items-center justify-center gap-3 py-6">
        <div className="flex gap-1.5">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{background:"var(--tx3)",animationDelay:`${i*150}ms`}}/>)}</div>
        <span className="text-[12px] text-tx3">Loading kit details...</span>
      </div>
    </div>
  );
}

export default async function KitDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const numericId = parseInt(id, 10);
  
  return (
    <Suspense fallback={<KitDetailSkeleton />}>
      <Screen17KitDetail kitId={numericId} />
    </Suspense>
  );
}

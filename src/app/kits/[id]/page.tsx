import { Suspense } from "react";
import Screen17KitDetail from "@/components/screens/Screen17KitDetail";

function KitDetailSkeleton() {
  return (
    <div className="card !p-4 m-8">
      <div className="flex items-center justify-center gap-3 py-6">
        <div className="w-5 h-5 rounded-full border-2 border-b2 border-t-acc animate-spin" />
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

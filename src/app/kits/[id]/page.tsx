import { Suspense } from "react";
import Screen17KitDetail from "@/components/screens/Screen17KitDetail";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default async function KitDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const numericId = parseInt(id, 10);
  
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="detail" message="Loading kit details..." />
      </div>
    }>
      <Screen17KitDetail kitId={numericId} />
    </Suspense>
  );
}

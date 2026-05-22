import { Suspense } from "react";
import Screen16KitList from "@/components/screens/Screen16KitList";

export default function KitsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-tx2">Loading kits...</div>}>
      <Screen16KitList />
    </Suspense>
  );
}

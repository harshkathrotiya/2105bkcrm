import { Suspense } from "react";
import Screen17WarehouseCheck from "@/components/screens/Screen17WarehouseCheck";

export default function WarehouseCheckPage() {
  return (
    <Suspense fallback={<div className="p-8 text-tx2">Loading warehouse check...</div>}>
      <Screen17WarehouseCheck />
    </Suspense>
  );
}

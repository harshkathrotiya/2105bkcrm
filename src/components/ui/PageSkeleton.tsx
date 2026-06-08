"use client";

import LoadingSkeleton from "./LoadingSkeleton";

export default function PageSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="m-8">
      <LoadingSkeleton rows={rows} cols={cols} type="table" />
    </div>
  );
}

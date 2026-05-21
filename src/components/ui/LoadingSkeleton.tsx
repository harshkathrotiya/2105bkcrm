"use client";

/**
 * LoadingSkeleton — shows a centered spinner + optional skeleton rows
 * to prevent "No data" flash while API calls are in flight.
 */

interface SkeletonRow {
  cols: number;
  widths?: string[];
}

interface LoadingSkeletonProps {
  /** Number of skeleton rows to show (default 5) */
  rows?: number;
  /** Column configuration for skeleton rows */
  rowConfig?: SkeletonRow[];
  /** Optional message below the spinner */
  message?: string;
}

export default function LoadingSkeleton({
  rows = 5,
  rowConfig,
  message = "Loading…",
}: LoadingSkeletonProps) {
  // If explicit row config is provided, use it; otherwise generate uniform rows
  const skeletonRows =
    rowConfig ??
    Array.from({ length: rows }, () => ({
      cols: 5,
      widths: undefined,
    } as SkeletonRow));

  return (
    <div className="card !p-4">
      {/* Spinner */}
      <div className="flex items-center justify-center gap-3 py-6">
        <div className="w-5 h-5 rounded-full border-2 border-b2 border-t-bl animate-spin" />
        <span className="text-[12px] text-tx3">{message}</span>
      </div>

      {/* Skeleton table */}
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex gap-3 pb-2 border-b border-b1">
          {Array.from({ length: skeletonRows[0]?.cols ?? 5 }, (_, i) => (
            <div
              key={`hdr-${i}`}
              className="h-3 rounded-sm animate-pulse"
              style={{
                background: "var(--b1)",
                flex: 1,
              }}
            />
          ))}
        </div>

        {/* Data rows */}
        {skeletonRows.map((_row, ri) => (
          <div
            key={`row-${ri}`}
            className="flex gap-3 py-2 border-b border-tbl-line last:border-b-0"
          >
            {Array.from({ length: _row.cols }, (_, ci) => (
              <div
                key={`cell-${ri}-${ci}`}
                className="h-4 rounded-sm animate-pulse"
                style={{
                  background: "var(--b1)",
                  opacity: 1 - ci * 0.12,
                  flex: ci === 0 ? 0.6 : 1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

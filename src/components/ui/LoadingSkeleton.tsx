"use client";

/**
 * LoadingSkeleton — shows a centered spinner overlay + optional skeleton rows
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
  /** Layout type: 'table' or 'list' (default 'table') */
  type?: "table" | "list";
}

export default function LoadingSkeleton({
  rows = 5,
  rowConfig,
  message = "Loading…",
  type = "table",
}: LoadingSkeletonProps) {
  // Generate rows for table skeleton
  const skeletonRows =
    rowConfig ??
    Array.from({ length: rows }, () => ({
      cols: 5,
      widths: undefined,
    } as SkeletonRow));

  return (
    <div className="card !p-4 relative overflow-hidden min-h-[140px] transition-all duration-300">
      {/* 1. Loading Spinner Overlay (Glassmorphism & Theme-Aware) */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 transition-all duration-300"
        style={{
          background: "color-mix(in srgb, var(--s1) 75%, transparent)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      >
        <div className="w-7 h-7 rounded-full border-2 border-b1 border-t-acc animate-spin shadow-sm" />
        <span className="text-[11.5px] font-medium text-tx2 tracking-wider animate-pulse">{message}</span>
      </div>

      {/* 2. Skeleton Background Content (Slightly dimmed for contrast) */}
      <div className="opacity-30 select-none pointer-events-none space-y-3">
        {type === "list" ? (
          // List layout (e.g. Sidebar kits list)
          <div className="space-y-2">
            {Array.from({ length: rows }).map((_, index) => (
              <div 
                key={`list-row-${index}`}
                className="p-3 border border-tbl-line rounded-lg flex flex-col gap-2"
                style={{ background: "var(--alt2)" }}
              >
                {/* Top line: Name + Badge */}
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-24 rounded-sm" style={{ background: "var(--b1)" }} />
                  <div className="h-4 w-12 rounded-full" style={{ background: "var(--b1)" }} />
                </div>
                {/* Middle line: Description */}
                <div className="h-3 w-32 rounded-sm" style={{ background: "var(--b1)" }} />
                {/* Bottom line: Item count + Price */}
                <div className="flex justify-between items-center pt-1">
                  <div className="h-2.5 w-10 rounded-sm" style={{ background: "var(--b1)" }} />
                  <div className="h-2.5 w-12 rounded-sm" style={{ background: "var(--b1)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Table layout (default)
          <>
            {/* Header row */}
            <div className="flex gap-3 pb-2.5 border-b border-b1">
              {Array.from({ length: skeletonRows[0]?.cols ?? 5 }, (_, i) => (
                <div
                  key={`hdr-${i}`}
                  className="h-3 rounded-sm"
                  style={{
                    background: "var(--b1)",
                    flex: i === 0 ? 1.5 : 1,
                  }}
                />
              ))}
            </div>

            {/* Data rows */}
            {skeletonRows.map((_row, ri) => (
              <div
                key={`row-${ri}`}
                className="flex gap-3 py-2.5 border-b border-tbl-line last:border-b-0"
              >
                {Array.from({ length: _row.cols }, (_, ci) => (
                  <div
                    key={`cell-${ri}-${ci}`}
                    className="h-4 rounded-sm"
                    style={{
                      background: "var(--b1)",
                      opacity: 1 - ci * 0.12,
                      flex: ci === 0 ? 1.5 : 1,
                    }}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}


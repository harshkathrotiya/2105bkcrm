"use client";

interface SkeletonRow {
  cols: number;
  widths?: string[];
}

interface LoadingSkeletonProps {
  rows?: number;
  rowConfig?: SkeletonRow[];
  message?: string;
  type?: "table" | "list";
}

function ShimmerBar({ width = "100%", height = "12px", radius = "6px", style }: { width?: string; height?: string; radius?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "var(--b1)",
        backgroundImage: "linear-gradient(90deg, var(--b1) 0%, var(--b2) 50%, var(--b1) 100%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s ease-in-out infinite",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export default function LoadingSkeleton({
  rows = 5,
  rowConfig,
  type = "table",
}: LoadingSkeletonProps) {
  const skeletonRows =
    rowConfig ??
    Array.from({ length: rows }, () => ({ cols: 5, widths: undefined } as SkeletonRow));

  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div
        className="card !p-4"
        role="status"
        aria-busy="true"
        aria-label="Loading..."
        style={{ overflow: "hidden" }}
      >
        {type === "list" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: rows }).map((_, i) => (
              <div
                key={i}
                style={{
                  padding: "12px",
                  border: "1px solid var(--b1)",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <ShimmerBar width="40%" height="13px" />
                  <ShimmerBar width="15%" height="18px" radius="999px" />
                </div>
                <ShimmerBar width="60%" height="11px" />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <ShimmerBar width="20%" height="10px" />
                  <ShimmerBar width="18%" height="10px" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Header row */}
            <div style={{ display: "flex", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--b1)", marginBottom: 4 }}>
              {Array.from({ length: skeletonRows[0]?.cols ?? 5 }, (_, i) => (
                <ShimmerBar
                  key={i}
                  height="11px"
                  style={{ flex: i === 0 ? 1.5 : 1, opacity: 0.6 }}
                />
              ))}
            </div>

            {/* Data rows */}
            {skeletonRows.map((row, ri) => (
              <div
                key={ri}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: ri < skeletonRows.length - 1 ? "1px solid var(--b1)" : "none",
                  alignItems: "center",
                }}
              >
                {Array.from({ length: row.cols }, (_, ci) => (
                  <ShimmerBar
                    key={ci}
                    height="14px"
                    style={{
                      flex: ci === 0 ? 1.5 : 1,
                      opacity: 1 - ci * 0.1,
                      animationDelay: `${(ri * row.cols + ci) * 40}ms`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

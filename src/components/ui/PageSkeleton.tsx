"use client";

const SHIMMER = {
  background: "var(--b1)",
  backgroundImage: "linear-gradient(90deg, var(--b1) 0%, var(--b2) 50%, var(--b1) 100%)",
  backgroundSize: "200% 100%",
  animation: "skeleton-shimmer 1.4s ease-in-out infinite",
  borderRadius: 6,
} as React.CSSProperties;

export default function PageSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      <style>{`@keyframes skeleton-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="card !p-4 m-8" role="status" aria-busy="true" aria-label="Loading...">
        {/* Header shimmer */}
        <div style={{ display: "flex", gap: 10, paddingBottom: 14, borderBottom: "1px solid var(--b1)", marginBottom: 4 }}>
          {Array.from({ length: cols }, (_, i) => (
            <div key={i} style={{ ...SHIMMER, flex: i === 0 ? 1.5 : 1, height: 11, opacity: 0.6, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        {/* Row shimmers */}
        {Array.from({ length: rows }, (_, ri) => (
          <div key={ri} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: ri < rows - 1 ? "1px solid var(--b1)" : "none", alignItems: "center" }}>
            {Array.from({ length: cols }, (_, ci) => (
              <div key={ci} style={{ ...SHIMMER, flex: ci === 0 ? 1.5 : 1, height: 14, opacity: 1 - ci * 0.1, animationDelay: `${(ri * cols + ci) * 40}ms` }} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

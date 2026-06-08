"use client";

import React from "react";

interface SkeletonRow {
  cols: number;
  widths?: string[];
}

interface LoadingSkeletonProps {
  rows?: number;
  cols?: number;
  rowConfig?: SkeletonRow[];
  message?: string;
  type?: "table" | "list" | "form" | "detail" | "dashboard" | "clients";
}

export function ShimmerBar({
  width = "100%",
  height = "12px",
  radius = "6px",
  style,
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  radius?: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`shimmer-premium ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: radius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export default function LoadingSkeleton({
  rows = 5,
  cols = 5,
  rowConfig,
  message,
  type = "table",
}: LoadingSkeletonProps) {
  const skeletonRows =
    rowConfig ??
    Array.from({ length: rows }, () => ({ cols, widths: undefined } as SkeletonRow));

  const renderContent = () => {
    switch (type) {
      case "list":
        return (
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
                  <ShimmerBar width="40%" height="13px" style={{ animationDelay: `${i * 80}ms` }} />
                  <ShimmerBar width="15%" height="18px" radius="999px" style={{ animationDelay: `${i * 80 + 40}ms` }} />
                </div>
                <ShimmerBar width="60%" height="11px" style={{ animationDelay: `${i * 80 + 20}ms` }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <ShimmerBar width="20%" height="10px" style={{ animationDelay: `${i * 80 + 30}ms` }} />
                  <ShimmerBar width="18%" height="10px" style={{ animationDelay: `${i * 80 + 50}ms` }} />
                </div>
              </div>
            ))}
          </div>
        );

      case "form":
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {Array.from({ length: rows * 2 }).map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <ShimmerBar
                  width={`${30 + (i % 3) * 10}%`}
                  height="8px"
                  style={{ animationDelay: `${i * 50}ms`, opacity: 0.6 }}
                />
                <ShimmerBar width="100%" height="38px" radius="8px" style={{ animationDelay: `${i * 50 + 20}ms` }} />
              </div>
            ))}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--b1)",
              }}
            >
              <ShimmerBar width="90px" height="36px" radius="8px" style={{ animationDelay: "200ms" }} />
              <ShimmerBar width="120px" height="36px" radius="8px" style={{ animationDelay: "250ms" }} />
            </div>
          </div>
        );

      case "detail":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Back button + Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <ShimmerBar width="80px" height="28px" radius="6px" style={{ animationDelay: "0ms" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <ShimmerBar width="100px" height="32px" radius="8px" style={{ animationDelay: "40ms" }} />
                <ShimmerBar width="100px" height="32px" radius="8px" style={{ animationDelay: "80ms" }} />
              </div>
            </div>

            {/* Main Header Card */}
            <div className="card !p-4" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 0 }}>
              <ShimmerBar width="60px" height="60px" radius="50%" style={{ animationDelay: "120ms" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <ShimmerBar width="40%" height="20px" style={{ animationDelay: "140ms" }} />
                <ShimmerBar width="20%" height="11px" style={{ animationDelay: "160ms" }} />
              </div>
            </div>

            {/* Two Column Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {/* Left Column (Details) */}
              <div className="card !p-4" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 0 }}>
                <ShimmerBar width="50%" height="12px" style={{ marginBottom: 8, opacity: 0.6 }} />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--tbl-line)",
                    }}
                  >
                    <ShimmerBar width="30%" height="10px" style={{ animationDelay: `${i * 50 + 200}ms` }} />
                    <ShimmerBar width="40%" height="10px" style={{ animationDelay: `${i * 50 + 220}ms` }} />
                  </div>
                ))}
              </div>

              {/* Right Column (Content/Table) */}
              <div
                className="card !p-4"
                style={{ display: "flex", flexDirection: "column", gap: 10, gridColumn: "span 2", marginBottom: 0 }}
              >
                <ShimmerBar width="30%" height="14px" style={{ marginBottom: 8, opacity: 0.7 }} />
                <div style={{ display: "flex", gap: 10, paddingBottom: 8, borderBottom: "1px solid var(--b1)" }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ShimmerBar key={i} height="10px" style={{ flex: 1, opacity: 0.6 }} />
                  ))}
                </div>
                {Array.from({ length: 4 }).map((_, ri) => (
                  <div
                    key={ri}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: ri < 3 ? "1px solid var(--tbl-line)" : "none",
                    }}
                  >
                    {Array.from({ length: 4 }).map((_, ci) => (
                      <ShimmerBar
                        key={ci}
                        height="12px"
                        style={{ flex: 1, animationDelay: `${(ri * 4 + ci) * 30 + 300}ms` }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "dashboard":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Metrics row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="card !p-4"
                  style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 0 }}
                >
                  <ShimmerBar width="40%" height="10px" style={{ animationDelay: `${i * 60}ms`, opacity: 0.6 }} />
                  <ShimmerBar width="70%" height="24px" style={{ animationDelay: `${i * 60 + 30}ms` }} />
                </div>
              ))}
            </div>

            {/* Two columns row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {Array.from({ length: 2 }).map((_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="card !p-4"
                  style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 0 }}
                >
                  <ShimmerBar width="30%" height="14px" style={{ marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 10, paddingBottom: 8, borderBottom: "1px solid var(--b1)" }}>
                    {[1, 2, 3].map((i) => (
                      <ShimmerBar key={i} height="10px" style={{ flex: 1, opacity: 0.6 }} />
                    ))}
                  </div>
                  {Array.from({ length: 4 }).map((_, ri) => (
                    <div
                      key={ri}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: ri < 3 ? "1px solid var(--tbl-line)" : "none",
                      }}
                    >
                      {[1, 2, 3].map((ci) => (
                        <ShimmerBar
                          key={ci}
                          height="12px"
                          style={{ flex: 1, animationDelay: `${(ri * 3 + ci + cardIdx * 12) * 30 + 200}ms` }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );

      case "clients":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Metrics cards row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "12px",
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="met"
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <ShimmerBar width="55%" height="11px" style={{ animationDelay: `${i * 60}ms`, opacity: 0.55 }} />
                  <ShimmerBar width="45%" height="26px" style={{ animationDelay: `${i * 60 + 30}ms` }} />
                </div>
              ))}
            </div>

            {/* Search + filter toolbar */}
            <div style={{ display: "flex", gap: 8 }}>
              <ShimmerBar width="100%" height="36px" radius="8px" style={{ flex: 1, animationDelay: "80ms" }} />
              <ShimmerBar width="140px" height="36px" radius="8px" style={{ flexShrink: 0, animationDelay: "110ms" }} />
            </div>

            {/* Table header */}
            <div
              style={{
                display: "flex",
                gap: 12,
                paddingBottom: 10,
                borderBottom: "1px solid var(--b1)",
                alignItems: "center",
              }}
            >
              {/* Avatar col */}
              <div style={{ width: 32, flexShrink: 0 }} />
              {/* Client name col */}
              <ShimmerBar height="10px" style={{ flex: 2.2, opacity: 0.45, animationDelay: "0ms" }} />
              {/* Mobile */}
              <ShimmerBar height="10px" style={{ width: 130, flexShrink: 0, opacity: 0.45, animationDelay: "40ms" }} />
              {/* Last activity */}
              <ShimmerBar height="10px" style={{ width: 120, flexShrink: 0, opacity: 0.45, animationDelay: "80ms" }} />
              {/* Revenue */}
              <ShimmerBar height="10px" style={{ width: 130, flexShrink: 0, opacity: 0.45, animationDelay: "120ms" }} />
              {/* Status */}
              <ShimmerBar height="10px" style={{ width: 90, flexShrink: 0, opacity: 0.45, animationDelay: "160ms" }} />
              {/* Action */}
              <div style={{ width: 60, flexShrink: 0 }} />
            </div>

            {/* Table rows */}
            {Array.from({ length: rows }).map((_, ri) => (
              <div
                key={ri}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "11px 0",
                  borderBottom: ri < rows - 1 ? "1px solid var(--tbl-line)" : "none",
                  alignItems: "center",
                  minHeight: "52px",
                }}
              >
                {/* Avatar circle */}
                <ShimmerBar
                  width="32px"
                  height="32px"
                  radius="50%"
                  style={{ flexShrink: 0, animationDelay: `${ri * 50}ms` }}
                />
                {/* Client name + subtitle */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 2.2 }}>
                  <ShimmerBar width="60%" height="13px" style={{ animationDelay: `${ri * 50 + 10}ms` }} />
                  <ShimmerBar width="40%" height="10px" style={{ opacity: 0.5, animationDelay: `${ri * 50 + 20}ms` }} />
                </div>
                {/* Mobile */}
                <ShimmerBar
                  height="13px"
                  radius="5px"
                  style={{ width: 130, flexShrink: 0, animationDelay: `${ri * 50 + 30}ms` }}
                />
                {/* Last activity: dot + text */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, width: 120, flexShrink: 0 }}>
                  <ShimmerBar width="8px" height="8px" radius="50%" style={{ flexShrink: 0, animationDelay: `${ri * 50 + 40}ms` }} />
                  <ShimmerBar height="12px" style={{ flex: 1, animationDelay: `${ri * 50 + 45}ms` }} />
                </div>
                {/* Revenue */}
                <ShimmerBar
                  height="13px"
                  radius="5px"
                  style={{ width: 130, flexShrink: 0, animationDelay: `${ri * 50 + 55}ms` }}
                />
                {/* Status badge */}
                <ShimmerBar
                  height="22px"
                  radius="999px"
                  style={{ width: 70, flexShrink: 0, animationDelay: `${ri * 50 + 65}ms` }}
                />
                {/* Action button */}
                <ShimmerBar
                  height="28px"
                  radius="7px"
                  style={{ width: 60, flexShrink: 0, animationDelay: `${ri * 50 + 75}ms` }}
                />
              </div>
            ))}
          </div>
        );

      case "table":
      default:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Header row */}
            <div
              style={{
                display: "flex",
                gap: 12,
                paddingBottom: 12,
                borderBottom: "1px solid var(--b1)",
                marginBottom: 4,
              }}
            >
              {Array.from({ length: skeletonRows[0]?.cols ?? cols }, (_, i) => (
                <ShimmerBar
                  key={i}
                  height="12px"
                  radius="4px"
                  style={{
                    flex: i === 0 ? 1.5 : 1,
                    opacity: 0.5,
                    animationDelay: `${i * 60}ms`,
                  }}
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
                  padding: "14px 0",
                  borderBottom: ri < skeletonRows.length - 1 ? "1px solid var(--tbl-line)" : "none",
                  alignItems: "center",
                  minHeight: "48px",
                }}
              >
                {Array.from({ length: row.cols }).map((_, ci) => (
                  <ShimmerBar
                    key={ci}
                    height="18px"
                    radius="5px"
                    style={{
                      flex: ci === 0 ? 1.5 : 1,
                      opacity: 1 - ci * 0.08,
                      animationDelay: `${(ri * row.cols + ci) * 40}ms`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        );
    }
  };

  if (type === "clients") {
    return (
      <div role="status" aria-busy="true" aria-label={message || "Loading..."}>
        {renderContent()}
      </div>
    );
  }

  return (
    <div
      className="card !p-5"
      role="status"
      aria-busy="true"
      aria-label={message || "Loading..."}
      style={{ overflow: "hidden" }}
    >
      {message && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 24 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--tx3)",
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: "12px", color: "var(--tx3)", fontWeight: 500, letterSpacing: "0.02em" }}>
            {message}
          </span>
        </div>
      )}
      {renderContent()}
    </div>
  );
}

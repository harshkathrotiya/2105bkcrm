"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

// Fatal fallback: replaces the root layout when even the layout fails to render
// (e.g. a server/data outage). It must be fully self-contained — its own <html>/<body>
// and inline styles, since app providers and CSS may be unavailable here.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1115",
          color: "#e7e9ee",
          fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          padding: "40px 20px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "440px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              fontSize: "28px",
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 10px" }}>
            We&apos;re having trouble right now
          </h1>
          <p style={{ fontSize: "14px", color: "#9aa0ab", lineHeight: 1.6, margin: "0 0 24px" }}>
            The service is temporarily unavailable. Please try again in a moment.
            If the problem continues, contact your administrator.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                background: "transparent",
                color: "#e7e9ee",
                border: "1px solid #2b2f38",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
          {error?.digest && (
            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "20px", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}

"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

// Friendly fallback shown when an unexpected runtime error happens anywhere inside
// the app. The raw error / stack trace is never shown to the user — only logged.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Log for debugging (server logs can be matched via error.digest)
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "420px" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "var(--sem-am-bg)",
            border: "1px solid var(--sem-am-bdr)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "18px",
          }}
        >
          <AlertTriangle size={26} color="var(--sem-am-tx)" />
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--tx)", margin: "0 0 8px" }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: "13.5px", color: "var(--tx3)", lineHeight: 1.55, margin: "0 0 20px" }}>
          We hit an unexpected problem loading this page. This is usually temporary —
          please try again. If it keeps happening, contact support.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={() => unstable_retry()}>
            Try again
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Go to Dashboard
          </button>
        </div>
        {error?.digest && (
          <p style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "18px", fontFamily: "var(--font-mono)" }}>
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

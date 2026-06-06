import Link from "next/link";
import { Compass } from "lucide-react";

// Friendly 404 shown for unknown URLs (keeps the app shell/nav).
export default function NotFound() {
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
            background: "var(--sem-bl-bg)",
            border: "1px solid var(--sem-bl-bdr)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "18px",
          }}
        >
          <Compass size={26} color="var(--sem-bl-tx)" />
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--tx)", margin: "0 0 8px" }}>
          Page not found
        </h2>
        <p style={{ fontSize: "13.5px", color: "var(--tx3)", lineHeight: 1.55, margin: "0 0 20px" }}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <Link href="/" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

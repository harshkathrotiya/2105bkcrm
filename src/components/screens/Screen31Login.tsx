"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Screen31Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/clients";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Success -> force a reload to clients or redirect URL to re-trigger middleware and context state
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message || "An error occurred during login.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 120px)",
        padding: "20px",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "32px",
          background: "var(--s1)",
          border: "1px solid var(--b1)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--acc)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              boxShadow: "0 4px 12px rgba(247,183,49,0.25)",
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: "bold", color: "#000" }}>BK</span>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--tx)", margin: 0 }}>
            Welcome to BK Media
          </h2>
          <p style={{ fontSize: "11.5px", color: "var(--tx3)", marginTop: "4px", margin: 0 }}>
            Sign in to access Video Department CRM
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "var(--sem-rd-bg)",
              border: "1px solid var(--sem-rd-bdr)",
              color: "var(--sem-rd-tx)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "12px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "14px" }}>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="field">
            <label className="flbl" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="finp"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label className="flbl" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="finp"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              height: "38px",
              justifyContent: "center",
              marginTop: "8px",
              fontSize: "13px",
              fontWeight: 500,
            }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In ↗"}
          </button>
        </form>

        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "10.5px",
            color: "var(--tx3)",
            background: "var(--s2)",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--b1)",
          }}
        >
          Default Local Admin: <strong>admin</strong> / <strong>admin</strong>
        </div>
      </div>
    </div>
  );
}

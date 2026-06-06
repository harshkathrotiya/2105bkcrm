"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { TextField } from "../ui/Field";
import Button from "../ui/Button";
import * as api from "@/lib/api";

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
      await api.login(username.trim(), password.trim());
      // Force a full navigation to re-trigger middleware and context state
      window.location.href = redirectUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during login.");
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
            <span style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>BK</span>
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
            role="alert"
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
            <AlertTriangle size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <TextField
            label="Username"
            type="text"
            placeholder="e.g. admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoComplete="username"
            required
          />

          <TextField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            style={{
              width: "100%",
              height: "38px",
              justifyContent: "center",
              marginTop: "8px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
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

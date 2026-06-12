"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Monitor } from "lucide-react";
import { TextField } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import * as api from "@/lib/api";

export default function LedLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

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
      const res = await api.login(username.trim(), password.trim());
      const role = res.user?.role;
      const dept = res.user?.department;
      if (role === "Staff") {
        window.location.href = "/my-schedule";
      } else if (role === "Department Head" && dept === "LED") {
        window.location.href = redirectUrl;
      } else if (role === "Admin" || role === "Manager" || role === "Operator") {
        window.location.href = "/clients";
      } else {
        window.location.href = redirectUrl;
      }
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
        minHeight: "100vh",
        padding: "20px",
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#1E293B",
          border: "1px solid #334155",
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #3B82F6, #7C3AED)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
            }}
          >
            <Monitor size={26} color="#fff" />
          </div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#3B82F6", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }}>
            BK Media
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#F1F5F9", margin: 0, lineHeight: 1.2 }}>
            LED Department
          </h2>
          <p style={{ fontSize: "12px", color: "#64748B", marginTop: "6px" }}>
            Sign in to access the LED portal
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#FCA5A5",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "12px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0F172A",
                border: "1px solid #334155",
                borderRadius: "10px",
                fontSize: "13px",
                color: "#F1F5F9",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#334155")}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0F172A",
                border: "1px solid #334155",
                borderRadius: "10px",
                fontSize: "13px",
                color: "#F1F5F9",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#334155")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              width: "100%",
              height: "42px",
              background: loading ? "#1E3A5F" : "linear-gradient(135deg, #3B82F6, #2563EB)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 14px rgba(59,130,246,0.4)",
              transition: "all 0.15s",
              letterSpacing: "0.02em",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "10px",
            color: "#475569",
            borderTop: "1px solid #1E293B",
            paddingTop: "16px",
          }}
        >
          BK Media CRM · LED Department Portal
        </div>
      </div>
    </div>
  );
}

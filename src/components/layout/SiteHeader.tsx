"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/theme-context";
import { useCurrentUser } from "@/lib/use-current-user";
import { ROLE_COLORS } from "@/lib/constants";
import GlobalSearch from "./GlobalSearch";
import * as api from "@/lib/api";

export default function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside-click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // proceed to login regardless
    }
    window.location.href = "/login";
  };

  const displayName = user?.name || user?.username || "—";
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleColor = user ? (ROLE_COLORS[user.role] ?? "var(--tx2)") : "var(--tx3)";

  return (
    <header className="site-hdr">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-acc flex items-center justify-center">
            <span className="text-[10px] font-bold text-black">BK</span>
          </div>
          <div>
            <div className="text-[13px] font-medium text-tx leading-tight">BK Media</div>
            <div className="text-[9px] text-tx3 leading-tight -mt-[1px]">CRM · Video Department</div>
          </div>
        </div>
      </div>

      {/* Global search — center */}
      <div className="hidden md:flex flex-1 justify-center px-4">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        <div className="w-[1px] h-4 bg-b1 mx-1 hidden sm:block" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-1 rounded-md outline-none hover:bg-s2 focus-visible:ring-2 focus-visible:ring-bl"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <div
              className="w-7 h-7 rounded-full bg-s2 border border-b1 flex items-center justify-center text-[11px] font-medium"
              style={{ color: roleColor }}
            >
              {initials}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-[11px] text-tx">{displayName}</span>
              {user && (
                <span className="text-[9px] font-medium" style={{ color: roleColor }}>
                  {user.role}
                </span>
              )}
            </div>
            <svg
              className={`text-tx3 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Account"
              className="absolute right-0 mt-2 w-52 z-[200] rounded-lg border border-b1 bg-s1 shadow-lg"
              style={{ padding: "6px" }}
            >
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--b1)", marginBottom: "4px" }}>
                <div className="text-[12px] font-medium text-tx truncate">{displayName}</div>
                {user && (
                  <div className="text-[10px] text-tx3 truncate">
                    @{user.username} · {user.role}
                  </div>
                )}
              </div>
              <button
                role="menuitem"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-2.5 text-[12px] text-rd hover:bg-s2 disabled:opacity-60 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer outline-none text-left rounded-md transition-colors"
                style={{ padding: "8px 12px" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

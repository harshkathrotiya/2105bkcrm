"use client";

import { useTheme } from "@/lib/theme-context";

export default function SiteHeader() {
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

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
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
        <div className="w-[1px] h-4 bg-b1 mx-1 hidden sm:block" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 ml-1 cursor-pointer bg-transparent border-none p-0 outline-none hover:opacity-85"
          title="Sign Out"
        >
          <div className="w-7 h-7 rounded-full bg-s2 border border-b1 flex items-center justify-center text-[11px] font-medium text-tx2">
            V
          </div>
          <div className="text-[11px] text-tx hidden sm:block">Sign Out</div>
        </button>
      </div>
    </header>
  );
}

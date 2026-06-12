"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { CalendarDays, IndianRupee, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import { useTheme } from "@/lib/theme-context";
import Image from "next/image";

const NAV = [
  { label: "Dashboard",   path: "/my-schedule",        icon: LayoutDashboard },
  { label: "My Schedule", path: "/my-schedule/events",  icon: CalendarDays },
  { label: "My Payments", path: "/my-payments",         icon: IndianRupee },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { theme } = useTheme();
  const initials = (user?.name ?? "S").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #E2E8F0" }}>
          <Image src="/bkcrmdarkmode.png" alt="BK Media" width={90} height={90} style={{ objectFit: "contain", filter: theme === "dark" ? "none" : "invert(1)" }} unoptimized priority />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ label, path, icon: Icon }) => {
            const active = isActive(path);
            return (
              <Link key={path} href={path} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8,
                background: active ? "#EFF6FF" : "transparent",
                color: active ? "#1D4ED8" : "#64748B",
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F1F5F9"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

        {/* Top bar with account in top-right */}
        <header style={{ height: 52, background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 20px", flexShrink: 0 }}>
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 8 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F1F5F9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#3B82F6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", lineHeight: 1.2 }}>{user?.name ?? "Staff"}</div>
                <div style={{ fontSize: 10, color: "#94A3B8" }}>Staff</div>
              </div>
              <ChevronDown size={12} color="#94A3B8" style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 200, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 200, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{user?.name ?? "Staff"}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>@{user?.username} · Staff</div>
                </div>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#EF4444", textAlign: "left" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FEF2F2"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

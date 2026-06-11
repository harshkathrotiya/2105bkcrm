"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, IndianRupee, LogOut, LayoutDashboard } from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import Image from "next/image";

const NAV = [
  { label: "Dashboard", path: "/my-schedule", icon: LayoutDashboard },
  { label: "My Schedule", path: "/my-schedule/events", icon: CalendarDays },
  { label: "My Payments", path: "/my-payments", icon: IndianRupee },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const initials = (user?.name ?? "S").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const isActive = (path: string) => pathname === path;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #E2E8F0" }}>
          <Image src="/bkmlogo.jpeg?v=4" alt="BK Media" width={90} height={90} style={{ objectFit: "contain" }} unoptimized priority />
        </div>

        {/* User pill */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#3B82F6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name ?? "Staff"}</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Staff</div>
            </div>
          </div>
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

        {/* Logout */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #E2E8F0" }}>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent",
              color: "#64748B", fontSize: 13, cursor: "pointer", textAlign: "left",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FEE2E2"; (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#64748B"; }}
            >
              <LogOut size={15} strokeWidth={1.8} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}

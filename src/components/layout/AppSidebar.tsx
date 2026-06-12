"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useTheme } from "@/lib/theme-context";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Receipt,
  CalendarDays,
  Wrench,
  Layers,
  Handshake,
  UserCheck,
  Building2,
  Settings,
} from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import { useLang } from "@/lib/lang-context";
import { NAV_ITEMS } from "@/lib/permissions";
import { ShimmerBar } from "../ui/LoadingSkeleton";

const NAV_LABEL_KEY: Record<string, string> = {
  "Dashboard":  "nav_dashboard",
  "Clients":    "nav_clients",
  "Inquiries":  "nav_inquiries",
  "Quotations": "nav_quotations",
  "Invoices":   "nav_invoices",
  "Calendar":   "nav_calendar",
  "Warehouse":  "nav_warehouse",
  "Equipment":  "nav_equipment",
  "Kits":       "nav_kits",
  "Vendors":    "nav_vendors",
  "Staff":      "nav_staff",
  "Settings":   "nav_settings",
};

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Receipt,
  CalendarDays,
  Wrench,
  Layers,
  Handshake,
  UserCheck,
  Building2,
  Settings,
};

export default function AppSidebar() {
  const pathname = usePathname();
  const { can, loading } = useCurrentUser();
  const { theme } = useTheme();
  const { t } = useLang();
  const lastNavTime = useRef<Record<string, number>>({});

  function throttledNav(path: string, e: React.MouseEvent) {
    const now = Date.now();
    if (now - (lastNavTime.current[path] ?? 0) < 500) {
      e.preventDefault();
      return;
    }
    lastNavTime.current[path] = now;
  }

  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    if (path.startsWith("/settings")) {
      return pathname.startsWith("/settings");
    }
    return pathname === path || pathname.startsWith(path + "/");
  };

  const visibleItems = loading
    ? [] // show nothing while loading — avoids flicker of forbidden items
    : NAV_ITEMS.filter((item) => item.alwaysVisible || can(item.permission));

  return (
    <aside className="app-sidebar">
      {/* Brand — top of sidebar */}
      <Link href="/" className="app-sidebar-brand">
        <Image
          src="/bkcrmdarkmode.png"
          alt="BK Media"
          width={110}
          height={110}
          className="app-sidebar-brand-logo"
          style={{ filter: theme === "dark" ? "none" : "invert(1)" }}
          priority
          unoptimized
        />
      </Link>
      <nav className="app-sidebar-nav">
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="app-nav-item"
              style={{
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
              }}
            >
              <ShimmerBar width={15} height={15} radius="4px" style={{ opacity: 0.7 }} />
              <ShimmerBar width={50 + (i % 4) * 12} height={11} radius="3px" style={{ opacity: 0.6 }} />
            </div>
          ))
        ) : (
          visibleItems.map((item) => {
            const Icon = ICON_MAP[item.iconName] ?? Users;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`app-nav-item ${isActive(item.path) ? "active" : ""}`}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive(item.path) ? "page" : undefined}
                onClick={(e) => throttledNav(item.path, e)}
              >
                <span className="app-nav-icon" aria-hidden="true">
                  <Icon size={15} strokeWidth={1.8} />
                </span>
                <span className="app-nav-label">{NAV_LABEL_KEY[item.label] ? t(NAV_LABEL_KEY[item.label] as any) : item.label}</span>
              </Link>
            );
          })
        )}
      </nav>
    </aside>
  );
}

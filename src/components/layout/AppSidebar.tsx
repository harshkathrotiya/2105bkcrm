"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { NAV_ITEMS } from "@/lib/permissions";

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

  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    if (path.startsWith("/settings")) {
      return pathname.startsWith("/settings");
    }
    return pathname === path || pathname.startsWith(path + "/");
  };

  const visibleItems = loading
    ? [] // show nothing while loading — avoids flicker of forbidden items
    : NAV_ITEMS.filter((item) => can(item.permission));

  return (
    <aside className="app-sidebar">
      <nav className="app-sidebar-nav">
        {visibleItems.map((item) => {
          const Icon = ICON_MAP[item.iconName] ?? Users;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`app-nav-item ${isActive(item.path) ? "active" : ""}`}
              title={item.label}
            >
              <span className="app-nav-icon">
                <Icon size={15} strokeWidth={1.8} />
              </span>
              <span className="app-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

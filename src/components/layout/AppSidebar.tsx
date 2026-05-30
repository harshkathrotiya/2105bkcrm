"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  ClipboardList,
  FileText,
  Receipt,
  CalendarDays,
  Wrench,
  Layers,
  Handshake,
  UserCheck,
} from "lucide-react";

const navItems = [
  { label: "Clients",    path: "/clients",    icon: Users },
  { label: "Inquiries",  path: "/inquiries",  icon: ClipboardList },
  { label: "Quotations", path: "/quotations", icon: FileText },
  { label: "Invoices",   path: "/invoices",   icon: Receipt },
  { label: "Calendar",   path: "/calendar",   icon: CalendarDays },
  { label: "Equipment",  path: "/equipment",  icon: Wrench },
  { label: "Kits",       path: "/kits",       icon: Layers },
  { label: "Vendors",    path: "/vendors",    icon: Handshake },
  { label: "Staff",      path: "/staff",      icon: UserCheck },
];

export default function AppSidebar() {
  const pathname = usePathname();

  // A nav item is active when the current path starts with its path segment
  const isActive = (path: string) => {
    if (pathname === path) return true;
    return pathname.startsWith(path + "/");
  };

  return (
    <aside className="app-sidebar">
      <nav className="app-sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`app-nav-item ${isActive(item.path) ? "active" : ""}`}
            title={item.label}
          >
            <span className="app-nav-icon">
              <item.icon size={15} strokeWidth={1.8} />
            </span>
            <span className="app-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

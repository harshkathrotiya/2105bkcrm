"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Clients",    path: "/clients",    icon: "◎" },
  { label: "Inquiries",  path: "/inquiries",  icon: "✎" },
  { label: "Quotations", path: "/quotations", icon: "📄" },
  { label: "Invoices",   path: "/invoices",   icon: "⊡" },
  { label: "Calendar",   path: "/calendar",   icon: "☰" },
  { label: "Equipment",  path: "/equipment",  icon: "📷" },
  { label: "Kits",       path: "/kits",       icon: "📦" },
  { label: "Vendors",    path: "/vendors",    icon: "🤝" },
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
            <span className="app-nav-icon">{item.icon}</span>
            <span className="app-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

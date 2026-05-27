"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import AppSidebar from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <SiteHeader />
      <div className="app-body">
        <AppSidebar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

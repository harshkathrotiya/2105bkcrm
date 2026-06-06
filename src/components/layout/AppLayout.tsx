"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import AppSidebar from "./AppSidebar";
import { StoreProvider } from "@/lib/store";

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
    <StoreProvider>
      <div className="app-layout">
        <AppSidebar />
        <div className="app-main-col">
          <SiteHeader />
          <main className="app-content">{children}</main>
        </div>
      </div>
    </StoreProvider>
  );
}

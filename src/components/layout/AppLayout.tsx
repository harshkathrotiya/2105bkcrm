"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import SiteHeader from "./SiteHeader";
import AppSidebar from "./AppSidebar";
import { StoreProvider } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";

interface AppLayoutProps {
  children: React.ReactNode;
}

const STAFF_PATHS = ["/my-schedule", "/my-payments"];

function AppLayoutInner({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const isDept = user?.role === "Department Head";
  const isStaff = user?.role === "Staff";
  const isLoginPage = pathname === "/login";
  const isStaffPage = STAFF_PATHS.some((p) => pathname.startsWith(p));

  // Apply dept-theme class for Department Head role
  useEffect(() => {
    if (loading) return;
    if (isDept) {
      document.documentElement.classList.add("dept-theme");
    } else {
      document.documentElement.classList.remove("dept-theme");
    }
    return () => {
      document.documentElement.classList.remove("dept-theme");
    };
  }, [isDept, loading]);

  // Redirect staff to their portal; redirect non-staff away from staff pages
  useEffect(() => {
    if (loading) return;
    if (isStaff && !isStaffPage && !isLoginPage) {
      router.replace("/my-schedule");
    }
    if (!isStaff && isStaffPage) {
      router.replace("/");
    }
  }, [isStaff, isStaffPage, isLoginPage, loading]);

  if (isLoginPage) return <>{children}</>;

  // Staff portal has its own layout (StaffLayout) — skip admin sidebar/header
  if (isStaff || isStaffPage) return <>{children}</>;

  return (
    <div className="app-layout">
      <AppSidebar />
      <div className="app-main-col">
        <SiteHeader />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return (
    <StoreProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </StoreProvider>
  );
}

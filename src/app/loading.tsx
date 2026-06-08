"use client";

import { usePathname } from "next/navigation";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function RootLoading() {
  const pathname = usePathname() || "";

  // Determine the best skeleton layout based on the route pathname
  let type: "dashboard" | "form" | "detail" | "table" | "list" = "table";
  let message = "Loading page content...";

  if (pathname === "/" || pathname === "/calendar" || pathname === "/activity") {
    type = "dashboard";
    message = "Loading dashboard...";
  } else if (
    pathname.includes("/new") ||
    pathname.includes("/edit") ||
    pathname.includes("/settings") ||
    pathname.includes("/permissions")
  ) {
    type = "form";
    message = "Loading form...";
  } else if (
    // Detail views (e.g., /staff/12, /equipment/4, /kits/1, etc.)
    /\/inquiries\/\w+/.test(pathname) ||
    /\/staff\/\w+/.test(pathname) ||
    /\/equipment\/\w+/.test(pathname) ||
    /\/clients\/\w+/.test(pathname) ||
    /\/kits\/\w+/.test(pathname) ||
    pathname.includes("/preview") ||
    pathname.includes("/brief")
  ) {
    type = "detail";
    message = "Loading details...";
  } else if (pathname.includes("/vendors")) {
    type = "list";
    message = "Loading list...";
  }

  return (
    <div className="m-8">
      <LoadingSkeleton type={type} message={message} />
    </div>
  );
}

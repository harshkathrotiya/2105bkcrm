import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT, type SessionPayload } from "@/lib/auth";
import { ROUTE_PERMISSION, NAV_ITEMS } from "@/lib/permissions";

function firstAllowedPath(role: string, permissions: string[] | undefined): string {
  if (role === "Admin") return "/";
  const perms = permissions ?? [];
  const item = NAV_ITEMS.find((n) => perms.includes(n.permission));
  return item?.path ?? "/login";
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("bk-media-session")?.value;
  const { pathname } = request.nextUrl;
  let payload: SessionPayload | null = null;

  // Auth API — always allow
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  payload = token ? await verifyJWT(token) : null;
  const isAuthenticated = !!payload;

  // Redirect authenticated users away from login
  if (pathname === "/login") {
    if (isAuthenticated) return NextResponse.redirect(new URL("/clients", request.url));
    return NextResponse.next();
  }

  // Unauthenticated API calls → 401
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return NextResponse.next();
  }

  // All other page routes — require auth
  const protectedRoutes = [
    "/clients", "/inquiries", "/quotations", "/invoices",
    "/calendar", "/equipment", "/kits", "/vendors",
    "/staff", "/warehouse", "/reports", "/settings",
  ];

  const isProtected = pathname === "/" || protectedRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Permission check — find matching route rule
  if (isAuthenticated && payload) {
    const role = payload.role;
    const permissions = payload.permissions;
    const matched = ROUTE_PERMISSION.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(prefix + "/")
    );
    if (matched) {
      const hasRight = role === "Admin" || (permissions && permissions.includes(matched.permission));
      if (!hasRight) {
        // Bounce to the user's first allowed page (NOT the dashboard, which now
        // requires its own permission — bouncing there could loop forever).
        const landing = firstAllowedPath(role, permissions);
        if (pathname === landing) return NextResponse.next(); // already there; avoid loop
        const url = new URL(landing, request.url);
        url.searchParams.set("forbidden", "1");
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};

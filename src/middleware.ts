import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT, type SessionPayload } from "@/lib/auth";
import { ROUTE_PERMISSION, NAV_ITEMS, ROLE_PERMISSIONS } from "@/lib/permissions";

function getEffectivePermissions(role: string, jwtPermissions: string[] | undefined): string[] {
  if (role === "Admin") return ["*"];
  // Use static ROLE_PERMISSIONS for built-in roles so middleware never uses stale JWT perms.
  // Fall back to JWT perms for custom DB-only roles.
  const staticPerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  return staticPerms ? [...staticPerms] : (jwtPermissions ?? []);
}

function firstAllowedPath(role: string, permissions: string[]): string {
  if (role === "Admin") return "/";
  const item = NAV_ITEMS.find((n) => permissions.includes(n.permission));
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

  // Redirect authenticated users away from login pages
  if (pathname === "/login" || pathname === "/led/login") {
    if (isAuthenticated) {
      const role = payload?.role;
      const dept = payload?.department;
      if (role === "Staff") return NextResponse.redirect(new URL("/my-schedule", request.url));
      if (role === "Department Head" && dept === "LED") return NextResponse.redirect(new URL("/", request.url));
      return NextResponse.redirect(new URL("/clients", request.url));
    }
    return NextResponse.next();
  }

  // Staff portal routes — require auth, no permission check
  if (pathname.startsWith("/my-schedule") || pathname.startsWith("/my-payments")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
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
    "/led/inquiries", "/led/stock",
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
    const permissions = getEffectivePermissions(role, payload.permissions);
    const matched = ROUTE_PERMISSION.find(({ prefix }) =>
      prefix === "/"
        ? pathname === "/"
        : pathname === prefix || pathname.startsWith(prefix + "/")
    );
    if (matched) {
      const hasRight = permissions.includes("*") || permissions.includes(matched.permission);
      if (!hasRight) {
        const landing = firstAllowedPath(role, permissions);
        if (pathname === landing) return NextResponse.next();
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

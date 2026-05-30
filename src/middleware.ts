import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { ROUTE_PERMISSION, hasPermission } from "@/lib/permissions";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("bk-media-session")?.value;
  const { pathname } = request.nextUrl;

  // Auth API — always allow
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const payload = token ? await verifyJWT(token) : null;
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

  const isProtected = protectedRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Permission check — find matching route rule
  if (isAuthenticated && payload) {
    const role = (payload as any).role as string;
    const permissions = (payload as any).permissions as string[] | undefined;
    const matched = ROUTE_PERMISSION.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(prefix + "/")
    );
    if (matched) {
      const hasRight = role === "Admin" || (permissions && permissions.includes(matched.permission));
      if (!hasRight) {
        // Redirect to home with a 403-style bounce
        return NextResponse.redirect(new URL("/?forbidden=1", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};

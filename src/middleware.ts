import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("bk-media-session")?.value;
  const { pathname } = request.nextUrl;

  // Let auth API calls through
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const payload = token ? await verifyJWT(token) : null;
  const isAuthenticated = !!payload;

  // If visiting /login and already authenticated, redirect to /clients
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/clients", request.url));
    }
    return NextResponse.next();
  }

  // Protect all API routes under /api/ (except /api/auth)
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return NextResponse.next();
  }

  // Protect all page paths
  const protectedRoutes = [
    "/clients",
    "/inquiries",
    "/quotations",
    "/invoices",
    "/calendar",
    "/equipment",
    "/kits",
    "/vendors",
    "/staff",
    "/warehouse",
    "/reports"
  ];

  const isProtected = protectedRoutes.some((route) => 
    pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all pages and api routes
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};

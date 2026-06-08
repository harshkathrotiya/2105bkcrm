import type { NextRequest } from "next/server";
import { db, withRetry } from "@/lib/db";
import { signJWT } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { getRolePermissions } from "@/lib/role-permissions";

// In-memory brute-force protection (resets on server restart; good enough for single-instance)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();

    const entry = loginAttempts.get(ip);
    if (entry && entry.count >= MAX_ATTEMPTS && now < entry.resetAt) {
      const minutes = Math.ceil((entry.resetAt - now) / 60000);
      return Response.json({ error: `Too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.` }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password) {
      return Response.json({ error: "Username and password are required" }, { status: 400 });
    }

    // Auto-seed admin user if no users exist
    const userCount = await withRetry(() => db.user.count());
    if (userCount === 0) {
      const hash = await bcrypt.hash("admin", 12);
      await withRetry(() => db.user.create({
        data: {
          id: "admin-user",
          username: "admin",
          name: "Administrator",
          password: hash,
          role: "Admin",
          is_active: 1,
          created_at: new Date().toISOString().split("T")[0],
        },
      }));
    }

    const user = await withRetry(() => db.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    }));

    const passwordOk = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordOk) {
      // Record failed attempt
      const prev = loginAttempts.get(ip);
      loginAttempts.set(ip, {
        count: (prev?.count ?? 0) + 1,
        resetAt: now + LOCKOUT_MS,
      });
      return Response.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Clear attempts on successful login
    loginAttempts.delete(ip);

    // Fetch user permissions for their role (single source of truth shared
    // with /api/auth/me, so the sidebar and route middleware never disagree).
    const permissions = await getRolePermissions(user.role);

    // Sign session JWT
    const token = await signJWT({
      userId: user.id,
      username: user.username,
      name: user.name ?? "",
      role: user.role,
      permissions,
    });

    // Set cookie headers
    const cookieString = `bk-media-session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400; Secure=${process.env.NODE_ENV === "production" ? "true" : "false"}`;

    return new Response(JSON.stringify({ success: true, user: { id: user.id, username: user.username, role: user.role } }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieString,
      },
    });
  } catch (err) {
    console.error("[POST /api/auth/login] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

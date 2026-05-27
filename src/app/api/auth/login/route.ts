import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signJWT } from "@/lib/auth";
import crypto from "node:crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password are required" }, { status: 400 });
    }

    // Auto-seed admin user if no users exist
    const userCount = await db.user.count();
    if (userCount === 0) {
      await db.user.create({
        data: {
          id: "admin-user",
          username: "admin",
          password: hashPassword("admin"),
          role: "Admin",
          created_at: new Date().toISOString().split("T")[0],
        },
      });
    }

    const user = await db.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (!user || user.password !== hashPassword(password)) {
      return Response.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Sign session JWT
    const token = await signJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
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

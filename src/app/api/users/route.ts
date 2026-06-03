import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { roleExists } from "@/lib/role-permissions";
import bcrypt from "bcryptjs";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get("bk-media-session")?.value;
  const payload = token ? await verifyJWT(token) : null;
  if (!payload || payload.role !== "Admin") return null;
  return payload;
}

// GET /api/users — list all users (Admin only)
export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await db.user.findMany({
    orderBy: { created_at: "asc" },
    select: { id: true, username: true, name: true, role: true, is_active: true, created_at: true },
  });
  return Response.json(users);
}

// POST /api/users — create user (Admin only)
export async function POST(request: NextRequest) {
  if (!await requireAdmin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { username, name, password, role } = body;

  if (!username?.trim() || !password?.trim() || !role) {
    return Response.json({ error: "username, password and role are required" }, { status: 400 });
  }
  if (!(await roleExists(role))) {
    return Response.json({ error: `Unknown role "${role}". Create it under Settings › Permissions first.` }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { username: username.trim().toLowerCase() } });
  if (existing) {
    return Response.json({ error: "Username already taken" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: {
      username: username.trim().toLowerCase(),
      name: name?.trim() ?? "",
      password: hash,
      role,
      is_active: 1,
      created_at: new Date().toISOString().split("T")[0],
    },
    select: { id: true, username: true, name: true, role: true, is_active: true, created_at: true },
  });

  return Response.json(user, { status: 201 });
}

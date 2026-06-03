import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRolePermissions } from "@/lib/role-permissions";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("bk-media-session")?.value;
    if (!token) return Response.json({ error: "Unauthenticated" }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return Response.json({ error: "Unauthenticated" }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.is_active) return Response.json({ error: "User not found" }, { status: 404 });

    return Response.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: await getRolePermissions(user.role),
    });
  } catch (err) {
    console.error("[GET /api/auth/me]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

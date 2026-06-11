import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import bcrypt from "bcryptjs";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get("bk-media-session")?.value;
  const payload = token ? await verifyJWT(token) : null;
  if (!payload || payload.role !== "Admin") return null;
  return payload;
}

// PATCH /api/users/[id] — update user (Admin only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { name, role, is_active, password, department } = body;

  const data: any = { updated_at: new Date().toISOString().split("T")[0] };

  if (name !== undefined) data.name = name.trim();
  if (role !== undefined) {
    if (admin.userId === id && role !== "Admin") {
      return Response.json({ error: "You cannot demote your own Admin role." }, { status: 400 });
    }
    const adminCount = await db.user.count({ where: { role: "Admin", is_active: 1, id: { not: id } } });
    if (role !== "Admin" && adminCount === 0) {
      return Response.json({ error: "Cannot change role — at least one active Admin must remain." }, { status: 400 });
    }
    data.role = role;
  }
  if (is_active !== undefined) {
    if (is_active === 0) {
      const adminCount = await db.user.count({ where: { role: "Admin", is_active: 1, id: { not: id } } });
      if (adminCount === 0) {
        return Response.json({ error: "Cannot deactivate — at least one active Admin must remain." }, { status: 400 });
      }
    }
    data.is_active = is_active;
  }
  if (password) {
    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    data.password = await bcrypt.hash(password, 12);
  }
  if (department !== undefined) data.department = department;

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, role: true, department: true, is_active: true, created_at: true },
  });

  return Response.json(user);
}

// DELETE /api/users/[id] — delete user (Admin only, cannot delete self)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (admin.userId === id) {
    return Response.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  const adminCount = await db.user.count({ where: { role: "Admin", is_active: 1, id: { not: id } } });
  if (adminCount === 0) {
    return Response.json({ error: "Cannot delete the last active Admin account." }, { status: 400 });
  }

  await db.user.delete({ where: { id } });
  return Response.json({ success: true });
}

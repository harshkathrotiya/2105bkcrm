import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { ROLE_MARKER, DEFAULT_ROLES, isDefaultRole } from "@/lib/role-permissions";

export async function GET() {
  try {
    const count = await db.rolePermission.count();
    if (count === 0) {
      // Seed default permissions from static config
      const toInsert: { role: string; permission: string }[] = [];
      for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
        for (const perm of perms) {
          toInsert.push({ role, permission: perm });
        }
      }
      if (toInsert.length > 0) {
        await db.rolePermission.createMany({ data: toInsert });
      }
    }

    // Idempotent backfill: ensure built-in roles have `dashboard.view`
    // (added after the original seed). Only writes when actually missing.
    const dashRows = await db.rolePermission.findMany({
      where: { permission: "dashboard.view", role: { in: DEFAULT_ROLES } },
      select: { role: true },
    });
    const haveDash = new Set(dashRows.map((r) => r.role));
    const missingDash = DEFAULT_ROLES.filter((r) => !haveDash.has(r));
    if (missingDash.length > 0) {
      await db.rolePermission.createMany({
        data: missingDash.map((role) => ({ role, permission: "dashboard.view" })),
      });
    }

    const all = await db.rolePermission.findMany();
    const grouped: Record<string, string[]> = {};

    // Always ensure default roles exist as keys.
    for (const r of DEFAULT_ROLES) grouped[r] = [];

    all.forEach((item) => {
      if (!grouped[item.role]) grouped[item.role] = [];
      // Hide the existence-marker from the real permission list.
      if (item.permission === ROLE_MARKER) return;
      grouped[item.role].push(item.permission);
    });

    // Admin must always have all permissions
    const allPermissions = Object.keys(ROLE_PERMISSIONS.Admin || {});
    if (allPermissions.length > 0 && grouped["Admin"].length === 0) {
      grouped["Admin"] = ROLE_PERMISSIONS.Admin as unknown as string[];
    }

    return NextResponse.json({ roles: grouped });
  } catch (err: any) {
    console.error("[GET /api/roles] error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { role, permissions } = await req.json();
    if (!role || typeof role !== "string" || !Array.isArray(permissions)) {
      return NextResponse.json({ error: "Invalid role or permissions array" }, { status: 400 });
    }

    const trimmedRole = role.trim();
    if (!trimmedRole) {
      return NextResponse.json({ error: "Role name cannot be empty" }, { status: 400 });
    }

    // Security guard: Admin permissions cannot be modified
    if (trimmedRole.toLowerCase() === "admin") {
      return NextResponse.json({ error: "Admin role permissions are locked and cannot be modified." }, { status: 403 });
    }

    // Always write a marker row so the role exists even with no permissions.
    const data = [
      { role: trimmedRole, permission: ROLE_MARKER },
      ...permissions
        .filter((p: unknown): p is string => typeof p === "string" && p !== ROLE_MARKER)
        .map((p: string) => ({ role: trimmedRole, permission: p })),
    ];

    // Replace this role's permission rows with the new set. We deliberately do
    // NOT wrap this in a $transaction: with the tiny connection pool (max: 2)
    // any transaction can fail to acquire a connection in time (Prisma P2028).
    // Running the two statements sequentially each grabs+releases a connection
    // quickly. The delete+insert is idempotent (the marker row guarantees the
    // role still "exists"), so the brief gap between them is harmless for what
    // is low-frequency role config.
    await db.rolePermission.deleteMany({ where: { role: trimmedRole } });
    await db.rolePermission.createMany({ data, skipDuplicates: true });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/roles] error:", err);
    return NextResponse.json({ error: err.message || "Failed to save role permissions" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { role } = await req.json();
    if (!role || typeof role !== "string") {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }
    const trimmedRole = role.trim();

    // Cannot delete the built-in roles.
    if (isDefaultRole(trimmedRole)) {
      return NextResponse.json(
        { error: `The built-in "${trimmedRole}" role cannot be deleted.` },
        { status: 403 },
      );
    }

    // Cannot delete a role that is still assigned to one or more users.
    const inUse = await db.user.count({ where: { role: trimmedRole } });
    if (inUse > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${trimmedRole}" — it is assigned to ${inUse} user${
            inUse === 1 ? "" : "s"
          }. Reassign them first.`,
        },
        { status: 409 },
      );
    }

    await db.rolePermission.deleteMany({ where: { role: trimmedRole } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/roles] error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete role" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  try {
    let count = await db.rolePermission.count();
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

    const all = await db.rolePermission.findMany();
    // Group by role
    const grouped: Record<string, string[]> = {};
    
    // Always ensure default roles exist in the object keys
    grouped["Admin"] = [];
    grouped["Manager"] = [];
    grouped["Operator"] = [];

    all.forEach((item) => {
      if (!grouped[item.role]) {
        grouped[item.role] = [];
      }
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

    await db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { role: trimmedRole } });
      if (permissions.length > 0) {
        const data = permissions.map((p: string) => ({ role: trimmedRole, permission: p }));
        await tx.rolePermission.createMany({ data });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/roles] error:", err);
    return NextResponse.json({ error: err.message || "Failed to save role permissions" }, { status: 500 });
  }
}

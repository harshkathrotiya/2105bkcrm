// NOTE: server-only module — imports `db`. Only import this from route handlers,
// never from client components.
import type { NextRequest } from "next/server";
import { db } from "./db";
import { verifyJWT } from "./auth";
import { ROLE_PERMISSIONS, type Role, type Permission } from "./permissions";

/**
 * Roles live only as (role, permission) rows in `role_permissions`. An empty
 * role is persisted with this sentinel marker so it still exists; the marker is
 * never a real permission and must be filtered out everywhere.
 */
export const ROLE_MARKER = "__role__";

export const DEFAULT_ROLES = ["Admin", "Manager", "Operator"];

/** True if `role` is a built-in default (case-insensitive). */
export function isDefaultRole(role: string): boolean {
  return DEFAULT_ROLES.some((r) => r.toLowerCase() === role.trim().toLowerCase());
}

/** True if `role` exists — a built-in default or a custom role with DB rows. */
export async function roleExists(role: string): Promise<boolean> {
  const trimmed = role.trim();
  if (!trimmed) return false;
  if (isDefaultRole(trimmed)) return true;
  const found = await db.rolePermission.count({ where: { role: trimmed } });
  return found > 0;
}

/**
 * Resolve a role's effective permissions — the single source of truth used by
 * BOTH login (JWT) and /api/auth/me (client `can()`), so the sidebar and the
 * route middleware never disagree.
 *
 * - Admin always has every permission.
 * - Any other role (default OR custom) reads its granted permissions from the
 *   DB, with the existence marker filtered out.
 * - As a safety net, if a DEFAULT role has no DB rows yet (un-seeded), fall
 *   back to its static permission list.
 */
export async function getRolePermissions(role: string): Promise<string[]> {
  if (role === "Admin") {
    return [...ROLE_PERMISSIONS.Admin];
  }

  const rows = await db.rolePermission.findMany({ where: { role } });
  const perms = rows.map((r) => r.permission).filter((p) => p !== ROLE_MARKER);

  if (perms.length === 0 && isDefaultRole(role)) {
    return [...(ROLE_PERMISSIONS[role as Role] ?? [])] as Permission[];
  }
  return perms;
}

export interface AuthResult {
  ok: boolean;
  /** Set when ok === false — a ready-to-return 401/403 JSON Response. */
  response?: Response;
  payload?: { userId: string; username: string; role: string };
}

/**
 * Server-side permission guard for API write routes. Verifies the session,
 * then re-resolves the role's permissions from the DB (so permission changes
 * take effect without forcing a re-login) and checks for `permission`.
 *
 * Usage in a route handler:
 *   const auth = await requirePermission(request, "clients.create");
 *   if (!auth.ok) return auth.response;
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission,
): Promise<AuthResult> {
  const token = request.cookies.get("bk-media-session")?.value;
  const payload = token ? await verifyJWT(token) : null;
  if (!payload?.userId) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role = payload.role as string;
  if (role === "Admin") {
    return { ok: true, payload };
  }

  const perms = await getRolePermissions(role);
  if (!perms.includes(permission)) {
    return {
      ok: false,
      response: Response.json(
        { error: `You don't have permission to do this (${permission}).` },
        { status: 403 },
      ),
    };
  }
  return { ok: true, payload };
}

// ─────────────────────────────────────────────────────────────────────────────
// Roles & Permissions — single source of truth
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = ["Admin", "Manager", "Operator"] as const;
export type Role = typeof ROLES[number];

// Every named permission in the system
export type Permission =
  | "clients.view"
  | "clients.create"
  | "clients.edit"
  | "clients.delete"
  | "inquiries.view"
  | "inquiries.create"
  | "inquiries.edit"
  | "quotations.view"
  | "quotations.create"
  | "quotations.edit"
  | "invoices.view"
  | "invoices.edit"
  | "calendar.view"
  | "equipment.view"
  | "equipment.create"
  | "equipment.edit"
  | "equipment.delete"
  | "kits.view"
  | "kits.edit"
  | "vendors.view"
  | "vendors.edit"
  | "staff.view"
  | "staff.create"
  | "staff.edit"
  | "staff.payments"
  | "reports.view"
  | "warehouse.view"
  | "settings.users"; // manage user accounts

// What each role can do by default
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Admin: [
    "clients.view", "clients.create", "clients.edit", "clients.delete",
    "inquiries.view", "inquiries.create", "inquiries.edit",
    "quotations.view", "quotations.create", "quotations.edit",
    "invoices.view", "invoices.edit",
    "calendar.view",
    "equipment.view", "equipment.create", "equipment.edit", "equipment.delete",
    "kits.view", "kits.edit",
    "vendors.view", "vendors.edit",
    "staff.view", "staff.create", "staff.edit", "staff.payments",
    "reports.view",
    "warehouse.view",
    "settings.users",
  ],
  Manager: [
    "clients.view", "clients.create", "clients.edit",
    "inquiries.view", "inquiries.create", "inquiries.edit",
    "quotations.view", "quotations.create", "quotations.edit",
    "invoices.view", "invoices.edit",
    "calendar.view",
    "equipment.view",
    "kits.view",
    "vendors.view",
    "staff.view", "staff.create", "staff.edit",
    "reports.view",
    "warehouse.view",
  ],
  Operator: [
    "clients.view",
    "inquiries.view",
    "quotations.view",
    "invoices.view",
    "calendar.view",
    "equipment.view",
    "kits.view",
    "vendors.view",
    "staff.view",
    "warehouse.view",
  ],
};

// Map app route prefix → required permission
export const ROUTE_PERMISSION: { prefix: string; permission: Permission }[] = [
  { prefix: "/clients",        permission: "clients.view" },
  { prefix: "/inquiries",      permission: "inquiries.view" },
  { prefix: "/quotations",     permission: "quotations.view" },
  { prefix: "/invoices",       permission: "invoices.view" },
  { prefix: "/calendar",       permission: "calendar.view" },
  { prefix: "/equipment",      permission: "equipment.view" },
  { prefix: "/kits",           permission: "kits.view" },
  { prefix: "/vendors",        permission: "vendors.view" },
  { prefix: "/staff",          permission: "staff.view" },
  { prefix: "/warehouse",      permission: "warehouse.view" },
  { prefix: "/reports",        permission: "reports.view" },
  { prefix: "/settings/users", permission: "settings.users" },
];

// Nav items shown in the sidebar — filtered by permission
export const NAV_ITEMS: { label: string; path: string; permission: Permission; iconName: string }[] = [
  { label: "Clients",    path: "/clients",         permission: "clients.view",   iconName: "Users" },
  { label: "Inquiries",  path: "/inquiries",       permission: "inquiries.view", iconName: "ClipboardList" },
  { label: "Quotations", path: "/quotations",      permission: "quotations.view",iconName: "FileText" },
  { label: "Invoices",   path: "/invoices",        permission: "invoices.view",  iconName: "Receipt" },
  { label: "Calendar",   path: "/calendar",        permission: "calendar.view",  iconName: "CalendarDays" },
  { label: "Warehouse",  path: "/warehouse/check", permission: "warehouse.view", iconName: "Building2" },
  { label: "Equipment",  path: "/equipment",       permission: "equipment.view", iconName: "Wrench" },
  { label: "Kits",       path: "/kits",            permission: "kits.view",      iconName: "Layers" },
  { label: "Vendors",    path: "/vendors",         permission: "vendors.view",   iconName: "Handshake" },
  { label: "Staff",      path: "/staff",           permission: "staff.view",     iconName: "UserCheck" },
  { label: "Settings",   path: "/settings/users",  permission: "settings.users", iconName: "Settings" },
];

export function hasPermission(role: string, permission: Permission, customPermissions?: string[]): boolean {
  if (role === "Admin") return true;
  if (customPermissions) {
    return customPermissions.includes(permission);
  }
  const perms = ROLE_PERMISSIONS[role as Role];
  return !!perms?.includes(permission);
}

export function permissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as Role] ?? [];
}

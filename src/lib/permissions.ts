// ─────────────────────────────────────────────────────────────────────────────
// Roles & Permissions — single source of truth
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = ["Admin", "Manager", "Operator", "Department Head", "Staff"] as const;
export type Role = typeof ROLES[number];

// Every named permission in the system
export type Permission =
  | "dashboard.view"
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

export const MODULE_PERMISSIONS: Record<string, { key: Permission; label: string }[]> = {
  "Dashboard": [
    { key: "dashboard.view", label: "View the operational dashboard & KPIs" },
  ],
  "Clients Module": [
    { key: "clients.view", label: "View clients list & details" },
    { key: "clients.create", label: "Add new client profile" },
    { key: "clients.edit", label: "Edit existing client details" },
    { key: "clients.delete", label: "Delete client accounts" },
  ],
  "Inquiries Module": [
    { key: "inquiries.view", label: "View inquiry list & timeline" },
    { key: "inquiries.create", label: "Add new event inquiry" },
    { key: "inquiries.edit", label: "Modify event details" },
  ],
  "Quotations Module": [
    { key: "quotations.view", label: "View quotation list & history" },
    { key: "quotations.create", label: "Generate event quotation" },
    { key: "quotations.edit", label: "Edit pricing rows & totals" },
  ],
  "Invoices & Payments": [
    { key: "invoices.view", label: "View tax invoices list" },
    { key: "invoices.edit", label: "Record advance/balance & update payments" },
  ],
  "Calendar Module": [
    { key: "calendar.view", label: "View operational monthly calendar" },
  ],
  "Equipment Inventory": [
    { key: "equipment.view", label: "View equipment catalog & stock" },
    { key: "equipment.create", label: "Add new catalog items" },
    { key: "equipment.edit", label: "Update product details & ownership" },
    { key: "equipment.delete", label: "Remove catalog items from database" },
  ],
  "Kits Module": [
    { key: "kits.view", label: "View kits and components lists" },
    { key: "kits.edit", label: "Manage items inside specific kits" },
  ],
  "Vendors & Rentals": [
    { key: "vendors.view", label: "View vendor directories" },
    { key: "vendors.edit", label: "Manage sub-hire vendor details" },
  ],
  "Staff & Deployments": [
    { key: "staff.view", label: "View staff list, availability, & profiles" },
    { key: "staff.create", label: "Add new staff records" },
    { key: "staff.edit", label: "Modify staff profile information" },
    { key: "staff.payments", label: "Manage staff payouts & event payment history" },
  ],
  "Warehouse & Logistics": [
    { key: "warehouse.view", label: "Perform warehouse checks & confirm dispatches" },
  ],
  "Analytics & Reports": [
    { key: "reports.view", label: "View P&L details, salary reports, & expense sheets" },
  ],
  "System Administration": [
    { key: "settings.users", label: "Manage user credentials, roles & permissions matrix" },
  ],
};

// What each role can do by default
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Admin: [
    "dashboard.view",
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
    "dashboard.view",
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
    "dashboard.view",
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
  "Department Head": [
    "dashboard.view",
    "inquiries.view",
    "calendar.view",
    "equipment.view",
    "equipment.edit",
    "kits.view",
    "staff.view",
    "staff.create",
    "staff.edit",
    "staff.payments",
    "kits.edit",
  ],
  Staff: [],
};

// Map app route prefix → required permission
export const ROUTE_PERMISSION: { prefix: string; permission: Permission }[] = [
  { prefix: "/",               permission: "dashboard.view" },
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
  { prefix: "/settings",       permission: "settings.users" },
];

// Nav items shown in the sidebar — filtered by permission
export const NAV_ITEMS: { label: string; path: string; permission: Permission; iconName: string; alwaysVisible?: boolean }[] = [
  { label: "Dashboard",  path: "/",                permission: "dashboard.view", iconName: "LayoutDashboard" },
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

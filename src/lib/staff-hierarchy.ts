/**
 * Derives a progressive-drill-down organisation hierarchy from the flat staff
 * list. The data model has no explicit `reportsTo` column, so the tree is built
 * structurally:
 *
 *   Director (BK Media)
 *     └── Department      (Video / LED / Warehouse + future depts)
 *           └── Role group  (Videographer, Editor, LED operator, …)
 *                 └── Person   (individual staff member)
 *
 * Future departments (Transport, Sound, Accounts, Sales) appear automatically
 * as soon as staff with that department exist — no redesign required.
 */

import type { Staff } from "./types";

export type StaffWithStatus = Staff & {
  status: "Available" | "Deployed";
  pendingPayment: number;
};

export type OrgNodeKind = "director" | "department" | "role" | "person";

export interface OrgNode {
  id: string;
  kind: OrgNodeKind;
  label: string;
  /** secondary line, e.g. role for a person or "12 staff" for a dept */
  sub?: string;
  /** department key this node belongs to, for colour theming */
  dept?: string;
  /** present only for kind === "person" */
  staff?: StaffWithStatus;
  /** live roll-up counts (director / department / role nodes) */
  counts?: {
    total: number;
    available: number;
    deployed: number;
  };
  children: OrgNode[];
}

/** Department display config — drives labels, colours and future-proofing. */
export const DEPARTMENTS: {
  key: string;
  label: string;
  /** which Staff.department value(s) feed this column */
  match: (s: Staff) => boolean;
  color: string;
  future?: boolean;
}[] = [
  { key: "VIDEO", label: "Video Department", color: "#6366f1", match: (s) => s.department === "VIDEO" || s.department === "BOTH" },
  { key: "LED", label: "LED Department", color: "#0ea5e9", match: (s) => s.department === "LED" || s.department === "BOTH" },
  { key: "WAREHOUSE", label: "Warehouse", color: "#f59e0b", match: () => false, future: true },
  { key: "TRANSPORT", label: "Transport", color: "#10b981", match: () => false, future: true },
  { key: "SOUND", label: "Sound", color: "#ec4899", match: () => false, future: true },
  { key: "ACCOUNTS", label: "Accounts", color: "#8b5cf6", match: () => false, future: true },
];

export function departmentColor(key?: string): string {
  return DEPARTMENTS.find((d) => d.key === key)?.color ?? "#6366f1";
}

function rollup(staff: StaffWithStatus[]) {
  return {
    total: staff.length,
    available: staff.filter((s) => s.status === "Available").length,
    deployed: staff.filter((s) => s.status === "Deployed").length,
  };
}

/**
 * Build the full org tree. `staff` should be the active, status-augmented list
 * from the staff context. Empty real departments are kept so managers can see
 * the structure; future departments render as ghost columns.
 */
export function buildOrgTree(staff: StaffWithStatus[]): OrgNode {
  const active = staff.filter((s) => s.isActive);

  const departments: OrgNode[] = DEPARTMENTS.map((dept) => {
    const deptStaff = dept.future ? [] : active.filter(dept.match);

    // group people by role within the department
    const byRole = new Map<string, StaffWithStatus[]>();
    for (const person of deptStaff) {
      const list = byRole.get(person.role) ?? [];
      list.push(person);
      byRole.set(person.role, list);
    }

    const roleNodes: OrgNode[] = [...byRole.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([role, people]) => ({
        id: `role:${dept.key}:${role}`,
        kind: "role" as const,
        label: role,
        sub: `${people.length} ${people.length === 1 ? "member" : "members"}`,
        dept: dept.key,
        counts: rollup(people),
        children: people
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((person) => ({
            id: `person:${person.id}`,
            kind: "person" as const,
            label: person.name,
            sub: person.role,
            dept: dept.key,
            staff: person,
            children: [],
          })),
      }));

    return {
      id: `dept:${dept.key}`,
      kind: "department" as const,
      label: dept.label,
      sub: dept.future
        ? "Coming soon"
        : `${deptStaff.length} staff · ${byRole.size} ${byRole.size === 1 ? "role" : "roles"}`,
      dept: dept.key,
      counts: rollup(deptStaff),
      children: roleNodes,
    };
  });

  return {
    id: "director",
    kind: "director",
    label: "BK Media",
    sub: "Director",
    counts: rollup(active),
    children: departments,
  };
}

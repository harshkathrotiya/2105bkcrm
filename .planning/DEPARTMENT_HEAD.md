# Department Head Role — Full Implementation Plan

---

## 1. What Exists Today (Relevant to This Role)

### User model (`prisma/schema.prisma`)
```
id, username, name, password, role, is_active, created_at, updated_at
```
**Missing:** No `department` field. Must be added.

### Existing roles (`src/lib/permissions.ts`)
- Admin, Manager, Operator — hardcoded in `ROLES` array
- Permissions resolved in `getRolePermissions()` in `src/lib/role-permissions.ts`
- Custom roles are supported via DB rows in `role_permissions` table

### JWT payload today (`src/app/api/auth/login/route.ts`)
```ts
{ userId, username, name, role, permissions }
```
**Missing:** No `department` in JWT. Must be added so API routes can filter without a DB call.

### `/api/auth/me` response today
```ts
{ id, username, name, role, permissions }
```
**Missing:** No `department`. Must be added so `useCurrentUser()` knows the dept.

### User creation form (`Screen32UsersSettings.tsx`)
Fields: `name`, `username`, `password`, `role`
**Missing:** No `department` selector. Must appear when role = "Department Head".

### Department fields already in DB models
- `Inquiry.department` → "VIDEO" | "LED" | "MERGED"
- `Equipment.department` → "VIDEO" | "LED"
- `Staff.department` → "VIDEO" | "LED" | "BOTH"
- `Kit.department` → "VIDEO" | "LED"

All query APIs already accept `?department=` filter — just not enforced per user yet.

---

## 2. Changes Required

### Step 1 — Schema: Add `department` to User
**File:** `prisma/schema.prisma`

Add one field to the User model:
```prisma
department String @default("VIDEO") // "VIDEO" | "LED" — only relevant when role = "Department Head"
```

Run: `npx prisma db push` then `npx prisma generate`

---

### Step 2 — Permissions: Add "Department Head" role
**File:** `src/lib/permissions.ts`

Add to `ROLES`:
```ts
export const ROLES = ["Admin", "Manager", "Operator", "Department Head"] as const;
```

Add to `ROLE_PERMISSIONS`:
```ts
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
],
```

No access to: `clients.*`, `quotations.*`, `invoices.*`, `vendors.*`, `reports.view`, `warehouse.view`, `settings.users`

---

### Step 3 — JWT: Add `department` to token
**File:** `src/app/api/auth/login/route.ts`

When building the JWT payload, read `user.department` from the DB row and include it:
```ts
const token = await signJWT({
  userId: user.id,
  username: user.username,
  name: user.name ?? "",
  role: user.role,
  department: user.department ?? "VIDEO",  // ← add this
  permissions,
});
```

Also update `verifyJWT` return type in `src/lib/auth.ts` to include `department?: string`.

---

### Step 4 — `/api/auth/me`: Return `department`
**File:** `src/app/api/auth/me/route.ts`

Add `department` to the response:
```ts
return Response.json({
  id: user.id,
  username: user.username,
  name: user.name,
  role: user.role,
  department: user.department,   // ← add this
  permissions: await getRolePermissions(user.role),
});
```

---

### Step 5 — API Route Enforcement (department scoping)
When `role === "Department Head"`, all queries must be filtered by `user.department` from the JWT.

**Files to update:**

#### `src/app/api/inquiries/route.ts`
Read JWT → if role = "Department Head", force `where.department = payload.department`

#### `src/app/api/equipment/route.ts`
Read JWT → if role = "Department Head", force `department` filter

#### `src/app/api/staff/route.ts`
Read JWT → if role = "Department Head", force `department IN [payload.department, "BOTH"]`

#### `src/app/api/kits/route.ts`
Read JWT → if role = "Department Head", force `department = payload.department`

Pattern for each route:
```ts
const token = request.cookies.get("bk-media-session")?.value;
const payload = token ? await verifyJWT(token) : null;
if (payload?.role === "Department Head" && payload.department) {
  where.department = payload.department; // force filter, ignore any client-sent department param
}
```

---

### Step 6 — User creation form: Add department selector
**File:** `src/components/screens/Screen32UsersSettings.tsx`

Add `newDepartment` state (default "VIDEO").

In the create modal, show a department selector **only when** `newRole === "Department Head"`:
```tsx
{newRole === "Department Head" && (
  <div className="field span2">
    <div className="flbl">Department *</div>
    <select className="fsel" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)}>
      <option value="VIDEO">Video</option>
      <option value="LED">LED</option>
    </select>
  </div>
)}
```

Pass `department: newDepartment` in the `createUser()` API call when role = "Department Head".

Same pattern for the edit modal — show dept selector when editing a Department Head user.

---

### Step 7 — `createUser` / `updateUser` API: Accept `department`
**File:** `src/app/api/auth/users/route.ts` (or wherever user CRUD lives)

Accept `department` in the request body and save it to `db.user.create / update`.

---

### Step 8 — `useCurrentUser` hook: Expose `department`
**File:** `src/lib/use-current-user.ts`

The hook reads from `/api/auth/me`. Once Step 4 is done, expose `user.department` from the hook so client components can read it if needed.

---

### Step 9 — Sidebar: No change needed
The sidebar already filters nav items by `can(permission)`. Since Department Head has no `clients.view`, `quotations.view`, `invoices.view`, `vendors.view`, `reports.view`, `warehouse.view`, or `settings.users` — those items automatically disappear.

Department Head will see:
- Dashboard
- Inquiries
- Calendar
- Equipment
- Kits
- Staff

---

## 3. What Does NOT Need to Change

- No new screens — all existing screens already support department filtering via query params
- No sidebar logic changes — permission-based filtering already handles it
- No new permission keys — reusing existing ones is sufficient
- No middleware changes — route-level enforcement is in the API routes

---

## 4. Role Badge Color (Screen32)

Add to `ROLE_BADGE` map in `Screen32UsersSettings.tsx`:
```ts
"Department Head": "am",  // amber
```

---

## 5. Build Order (exact sequence)

1. `prisma/schema.prisma` → add `department` to User model → `db push` → `generate`
2. `src/lib/permissions.ts` → add "Department Head" to ROLES + ROLE_PERMISSIONS
3. `src/app/api/auth/login/route.ts` → add `department` to JWT
4. `src/app/api/auth/me/route.ts` → return `department` in response
5. `src/lib/auth.ts` → update JWT payload type to include `department`
6. `src/lib/use-current-user.ts` → expose `department` from hook
7. `src/app/api/inquiries/route.ts` → enforce dept filter
8. `src/app/api/equipment/route.ts` → enforce dept filter
9. `src/app/api/staff/route.ts` → enforce dept filter
10. `src/app/api/kits/route.ts` → enforce dept filter
11. `src/app/api/auth/users/route.ts` → accept + save `department`
12. `src/components/screens/Screen32UsersSettings.tsx` → add dept selector + badge color

---

## 6. Decisions (Finalised)

- [x] Department Head can **view inquiries only** — no create/edit
- [x] Dashboard shows dept-specific KPIs: active events this month, staff deployed, equipment in use, pending staff payments
- [x] **My Team** is a separate sidebar page — shows staff in their department with current assignment + availability
- [x] Same sidebar shell/layout as current — different page content inside
- [x] No new layout needed — permission filtering handles sidebar items automatically
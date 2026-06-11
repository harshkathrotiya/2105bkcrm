# Department Head Role

## What is it?

A restricted login role scoped to one department (VIDEO or LED). Department Heads can view and manage their own department's staff, equipment, kits, and inquiries — nothing else.

---

## Login & Department Assignment

When an Admin creates a Department Head user, they assign a department:

- **VIDEO** — sees only VIDEO staff, equipment, inquiries
- **LED** — sees only LED staff, equipment, inquiries

The department is stored in the JWT session and available via `useCurrentUser().user.department`.

---

## What They Can Access

| Section | Can View | Can Edit/Create | Notes |
|---------|:--------:|:---------------:|-------|
| Dashboard | ✓ | — | |
| Inquiries | ✓ | — | Own dept only (+ MERGED) |
| Calendar | ✓ | — | |
| Equipment | ✓ | ✓ | Own dept only |
| Kits | ✓ | ✓ | Own dept only |
| Staff | ✓ | ✓ | Own dept only (+ BOTH) |
| Staff Payments | ✓ | ✓ | Own dept only |
| Clients | — | — | No access |
| Quotations | — | — | No access |
| Invoices | — | — | No access |
| Vendors | — | — | No access |
| Reports | — | — | No access |
| Warehouse | — | — | No access |
| Settings / Users | — | — | No access |

---

## Screens (Dept-Specific UI)

`RoleRouter.tsx` intercepts routes and renders dept screens instead of admin screens.

| Route | Dept Screen | Filter Applied |
|-------|-------------|----------------|
| `/inquiries` | `DeptInquiries` | `department === user.department` or `MERGED` |
| `/inquiries/[id]` | `DeptInquiryDetail` | Own dept only |
| `/equipment` | `DeptEquipment` | `department === user.department` |
| `/kits` | `DeptKits` | Own dept kits |
| `/staff` | `DeptStaff` | `department === user.department` or `BOTH` |

Staff with `department = BOTH` are visible to all dept heads (shared crew).
Inquiries with `department = MERGED` are visible to all dept heads (joint events).

---

## Theme

Department Head login automatically applies a light color theme to the entire app (sidebar, background, cards) — separate from the main dark admin theme.

- Page background: `#F4F6F9`
- Cards: `#FFFFFF`
- Accent / buttons: `#3B82F6` (blue)
- Sidebar: white with blue active state

This is applied by adding `dept-theme` class to `<html>` in `AppLayout.tsx` when `user.role === "Department Head"`. Removing the class restores the admin theme instantly.

---

## Permissions

```
dashboard.view
calendar.view
inquiries.view
equipment.view
equipment.create
equipment.edit
kits.view
kits.edit
staff.view
staff.create
staff.edit
staff.payments
```

---

## How to Create a Dept Head User

1. Login as **Admin**
2. Go to `/settings/users`
3. Click **New User**
4. Set Role → **Department Head**
5. Select Department → **VIDEO** or **LED**
6. Save

The user can log in immediately and will only see their department's data.

---

## Files

| File | Purpose |
|------|---------|
| `src/components/screens/dept/RoleRouter.tsx` | Intercepts routes, renders dept screens |
| `src/components/screens/dept/DeptInquiries.tsx` | Dept inquiry list |
| `src/components/screens/dept/DeptInquiryDetail.tsx` | Inquiry detail |
| `src/components/screens/dept/DeptEquipment.tsx` | Equipment list (dept filtered) |
| `src/components/screens/dept/DeptKits.tsx` | Kits list |
| `src/components/screens/dept/DeptStaff.tsx` | Staff list (dept filtered) |
| `src/components/layout/AppLayout.tsx` | Applies/removes `dept-theme` class |
| `src/app/globals.css` | `:root.dept-theme` CSS overrides |
| `src/lib/permissions.ts` | `Department Head` permission list |

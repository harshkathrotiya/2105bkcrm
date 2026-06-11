# BK Media CRM — Project Documentation

Internal operations management system for a video/LED production company. Handles the full event lifecycle: client inquiry → quotation → invoice → equipment deployment → staff assignment → payment settlement.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router) |
| UI | React 19.2.4 |
| Language | TypeScript 5 |
| Database | PostgreSQL via Prisma 7.8.0 |
| Auth | JWT (bcryptjs, custom) |
| Styling | Tailwind CSS 4 + CSS custom properties |
| Icons | Lucide React 1.17.0 |
| Charts | Recharts 3.8.1 |
| Org chart | @xyflow/react 12.11.0 |

---

## Project Structure

```
src/
├── app/                    # Next.js pages + API routes
│   ├── layout.tsx
│   ├── page.tsx            # Dashboard
│   ├── globals.css         # CSS vars + theme system
│   ├── activity/
│   ├── calendar/
│   ├── clients/
│   ├── equipment/
│   ├── inquiries/
│   ├── invoices/
│   ├── kits/
│   ├── login/
│   ├── quotations/
│   ├── reports/
│   ├── settings/
│   ├── staff/
│   ├── vendors/
│   ├── warehouse/
│   └── api/
├── components/
│   ├── layout/             # AppLayout, AppSidebar, SiteHeader, GlobalSearch
│   ├── screens/            # Full-page screen components
│   │   └── dept/           # Department Head role screens
│   ├── staff/              # Staff org chart
│   └── ui/                 # Reusable UI primitives
└── lib/
    ├── queries/            # Prisma query helpers (server-side)
    ├── api.ts              # Client-side fetch functions
    ├── auth.ts             # JWT sign/verify
    ├── db.ts               # Prisma client singleton
    ├── permissions.ts      # Static role/permission map
    ├── role-permissions.ts # DB-backed role helper
    ├── store.tsx           # Global React context (all modules)
    └── types.ts            # TypeScript interfaces
```

---

## Pages & Routes

### Clients
| Route | Screen | Description |
|-------|--------|-------------|
| `/clients` | Screen01ClientList | Client directory |
| `/clients/new` | Screen02AddClient | Create client |
| `/clients/[id]` | Screen02EditClient | Edit client + custom rates |

### Inquiries
| Route | Screen | Description |
|-------|--------|-------------|
| `/inquiries` | Screen10InquiryList | Inquiry list with filters |
| `/inquiries/new` | Screen04NewInquiry | Create inquiry |
| `/inquiries/[id]` | Screen34InquiryHub | Inquiry detail hub |
| `/inquiries/[id]/quotation` | Screen05QuotationForm | Build quotation |
| `/inquiries/[id]/crew` | Screen23AssignPosition | Assign staff positions |
| `/inquiries/[id]/expense` | Screen27ExpenseReport | Expense breakdown |
| `/inquiries/[id]/pl` | Screen28PLReport | P&L report |
| `/inquiries/[id]/requirements` | Screen29ClientRequirements | Client requirements |
| `/inquiries/[id]/brief/[staffId]` | Screen30StaffBrief | Staff deployment brief |
| `/inquiries/[id]/warehouse` | Screen17WarehouseCheck | Equipment dispatch check |
| `/inquiries/[id]/invoice` | Screen08Invoice | Invoice for inquiry |

### Quotations
| Route | Screen | Description |
|-------|--------|-------------|
| `/quotations` | Screen11QuotationList | All quotations |
| `/quotations/[id]/pdf` | Screen06QuotationPDF | PDF preview + download |

### Invoices
| Route | Screen | Description |
|-------|--------|-------------|
| `/invoices` | Screen12InvoiceList | Invoice list |
| `/invoices/[id]` | Screen08Invoice | Invoice detail |
| `/invoices/[id]/payment` | Screen09PaymentTracking | Payment timeline |

### Equipment
| Route | Screen | Description |
|-------|--------|-------------|
| `/equipment` | Screen13EquipmentList | Inventory |
| `/equipment/new` | Screen14AddEditEquipment | Add equipment |
| `/equipment/[id]` | Screen15EquipmentDetail | Detail + bookings |
| `/equipment/[id]/edit` | Screen14AddEditEquipment | Edit equipment |
| `/equipment/history` | Screen35EquipmentHistory | Booking history |

### Kits
| Route | Screen | Description |
|-------|--------|-------------|
| `/kits` | Screen16KitList | Kit directory |
| `/kits/[id]` | Screen17KitDetail | Kit detail + availability |

### Staff
| Route | Screen | Description |
|-------|--------|-------------|
| `/staff` | Screen20StaffList | Staff directory |
| `/staff/new` | Screen21AddEditStaff | Add staff |
| `/staff/[id]` | Screen22StaffProfile | Profile, history, FY summary |
| `/staff/[id]/edit` | Screen21AddEditStaff | Edit staff |
| `/staff/explorer` | Screen23StaffExplorer | Org chart |
| `/staff/payments` | Screen24PerEventPayment | Per-event payments |
| `/staff/availability` | Screen26AvailabilityCheck | Availability by date |
| `/staff/reports` | Screen25MonthlyPaymentReport | Monthly salary report |

### Other
| Route | Screen | Description |
|-------|--------|-------------|
| `/` | Screen00Dashboard | KPI dashboard + charts |
| `/calendar` | Screen03Calendar | Operational calendar |
| `/vendors` | Screen18VendorList | Vendor directory |
| `/warehouse/check` | Screen17WarehouseCheck | Dispatch readiness |
| `/reports/assets/pdf` | Screen19AssetReportPDF | Asset valuation PDF |
| `/settings/users` | Screen32UsersSettings | User management (Admin only) |
| `/settings/permissions` | Screen33PermissionsMatrix | Permissions matrix |
| `/activity` | ScreenActivityFeed | Activity log |
| `/login` | Screen31Login | Login |

---

## Department Head Screens

`RoleRouter.tsx` intercepts routes for `Department Head` users and renders dept-specific screens. Data is auto-filtered to the logged-in user's department.

| Route | Dept Screen | Filter |
|-------|-------------|--------|
| `/inquiries` | DeptInquiries | `department === user.department` or `MERGED` |
| `/inquiries/[id]` | DeptInquiryDetail | Own dept only |
| `/equipment` | DeptEquipment | `department === user.department` |
| `/kits` | DeptKits | Own dept kits |
| `/staff` | DeptStaff | `department === user.department` or `BOTH` |

---

## Database Models

### User
```
id, username (unique), name, password (bcrypt)
role (Admin | Manager | Operator | Department Head | custom)
department (VIDEO | LED), is_active, created_at, updated_at
```

### Client
```
id, initials, bg, fg (avatar colors), name, contact, mobile, email, gst, pan
address_line, city, district, state, pin, status (Active | Inactive)
→ inquiries[], equipment_rates[]
```

### Inquiry
```
id, client_id, event_type, event_name, start_date, end_date, start_time, end_time
venue, location, notes, status (New | Quoted | Confirmed | Cancelled)
department (VIDEO | LED | MERGED), crew_count

LED: screen_width, screen_height, screen_area_sqft, total_cabinets, led_type, rate_per_sqft, stage_type
Dispatch: dispatch_date, dispatch_time, vehicle1_number, vehicle1_driver, vehicle2_number, vehicle2_driver
→ quotations[], staff_assignments[], equipment_bookings[], dispatch_boxes[]
```

### Quotation
```
id, inquiry_id, client_name, event_name, quote_no, start_date, end_date, days, venue
status (Draft | Sent | Approved | Revised), equipment (JSON array), subtotal, cgst, sgst, total
revision_number, signed_copy_url, created_at, sent_at, approved_at
→ invoices[], revisions[]
```

### QuotationRevision
```
id, quotation_id, version, equipment (JSON), subtotal, cgst, sgst, total, saved_at
```

### Invoice
```
id, quotation_id, invoice_no, client_name, event_name, start_date, end_date, venue
videography_amount, photography_amount, advance, balance
status (Unpaid | Partial paid | Paid)
advance_received, advance_received_at, advance_ref, advance_method
balance_received, balance_received_at, balance_ref, balance_method
hdd_delivered, hdd_size_gb, deinstall_done, due_date
```

### Equipment
```
id, product_name, category, item_type (INDIVIDUAL | BULK)
quantity, quantity_unit (pieces | pair | metre)
serial_number, body_name, department (VIDEO | LED), kit_id
status (AVAILABLE | IN_USE | MAINTENANCE | SOLD | RETIRED)
default_rate, purchase_date, purchase_from, bill_number, purchase_price
ownership_type (INHOUSE | VENDOR | STAFF), vendor_id, owner_staff_id, notes
```

### Kit
```
id, name, description, main_body_id, department (VIDEO | LED)
→ equipment[], equipment_bookings[]
```

### Staff
```
id, name, phone, role, staff_type (INHOUSE | EXTERNAL)
payment_type (PER_DAY | MONTHLY), rate_per_day, monthly_salary
with_equipment, equipment_desc, equipment_rate_per_day
aadhar_number, aadhar_front, aadhar_back, is_active
department (VIDEO | LED | BOTH)
→ assignments[], payments[], owned_equipment[]
```

### StaffAssignment
```
id, staff_id, inquiry_id, position_no, position_name
days_assigned, rate_per_day, with_equipment, equipment_rate_per_day
total_amount, is_duplicate, confirmed_dup, reporting_time
```

### StaffPayment
```
id, staff_id, assignment_id, inquiry_id, amount
payment_type (PER_EVENT | MONTHLY_SALARY | EQUIPMENT_RENTAL)
payment_method (CASH | UPI | BANK_TRANSFER | CHEQUE)
reference_no, month, paid_at, paid_by_id, notes
```

### EquipmentBooking
```
id, inquiry_id, equipment_id, kit_id, position, booked_from, booked_to
status (BOOKED | OUT | RETURNED)
vendor_id, vendor_cost_per_day, total_vendor_cost
rental_owner_staff_id, rental_rate_per_day, total_rental
```

### Vendor
```
id, name, phone, email, specialization, city, gst_number, notes, is_active
```

### RolePermission
```
id, role, permission  —  UNIQUE(role, permission)
```

### OptionList
```
id, type (STAFF_ROLE | QUOTATION_POSITION), value
meta_equip, meta_rate, sort_order, is_active
```

### ClientEquipmentRate
```
id, client_id, equipment_id, rate  —  UNIQUE(client_id, equipment_id)
```

### LedDispatchBox
```
id, inquiry_id, box_number, contents, cabinets
vehicle (Vehicle 1 | Vehicle 2), source (BK_MEDIA | VENDOR)
```

---

## API Routes

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → JWT cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user from JWT |

### Users (Admin only)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/users` | List / create |
| PATCH/DELETE | `/api/users/[id]` | Update / delete |

### Roles
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/roles` | List / update permissions |

### Clients
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/clients` | List / create |
| GET/PATCH/DELETE | `/api/clients/[id]` | Get / update / delete |
| GET/POST | `/api/clients/[id]/rates` | Rate list / add |
| PATCH/DELETE | `/api/clients/[id]/rates/[equipmentId]` | Update / remove |

### Inquiries
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/inquiries` | List / create |
| GET/PATCH/DELETE | `/api/inquiries/[id]` | Get / update / delete |
| GET/POST | `/api/inquiries/[id]/dispatch-boxes` | Box list / add |
| PATCH/DELETE | `/api/inquiries/[id]/dispatch-boxes/[boxId]` | Update / remove |

### Quotations
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/quotations` | List / create |
| GET/PATCH/DELETE | `/api/quotations/[id]` | Get / update / delete |
| GET/POST | `/api/quotations/[id]/revisions` | Version history |

### Invoices
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/invoices` | List / create |
| GET/PATCH | `/api/invoices/[id]` | Get / record payment |

### Equipment
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/equipment` | List / create |
| GET/PATCH/DELETE | `/api/equipment/[id]` | Get / update / delete |
| POST | `/api/equipment/import-csv` | Bulk import |
| GET | `/api/equipment/asset-summary` | Asset totals |
| GET | `/api/equipment/history` | Booking history |

### Equipment Bookings
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/equipment-bookings` | List / create |
| POST | `/api/equipment-bookings/[id]/confirm` | Mark OUT |
| PATCH | `/api/equipment-bookings/[id]/rental` | Set rental rate |
| POST | `/api/equipment-bookings/[id]/return` | Mark RETURNED |
| POST | `/api/equipment-bookings/bulk-confirm` | Bulk confirm |

### Kits
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/kits` | List / create |
| GET/PATCH/DELETE | `/api/kits/[id]` | Get / update / delete |
| POST | `/api/kits/[id]/add-item` | Add item |
| DELETE | `/api/kits/[id]/remove-item/[equipmentId]` | Remove item |

### Staff
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/staff` | List / create |
| GET/PATCH/DELETE | `/api/staff/[id]` | Get / update / deactivate |
| GET | `/api/staff/[id]/history` | Event history |
| GET | `/api/staff/[id]/summary` | FY earnings |
| POST | `/api/staff/[id]/reactivate` | Re-activate |
| GET | `/api/staff/[id]/rentals` | Rental income |
| GET | `/api/staff/availability` | Availability by date |
| GET | `/api/staff/inactive` | Inactive list |

### Staff Assignments
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/staff-assignments` | List / create |
| PATCH/DELETE | `/api/staff-assignments/[id]` | Update / delete |
| POST | `/api/staff-assignments/check-duplicate` | Double-booking check |
| POST | `/api/staff-assignments/confirm-duplicate` | Force confirm |

### Staff Payments
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/staff-payments` | List / record |
| POST | `/api/staff-payments/bulk` | Bulk record |
| GET | `/api/staff-payments/monthly-report` | Monthly summary |

### Vendors
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/vendors` | List / create |
| GET/PATCH/DELETE | `/api/vendors/[id]` | Get / update / delete |
| GET | `/api/vendors/[id]/history` | Booking history |

### Calendar
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/calendar` | Events for month / create |
| PATCH/DELETE | `/api/calendar/[id]` | Update / delete |
| POST | `/api/calendar/bulk` | Bulk create |
| POST | `/api/calendar/bulk-delete` | Bulk delete |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/pl` | P&L report |
| GET | `/api/reports/expense` | Expense breakdown |
| GET | `/api/reports/staff-brief` | Staff brief |
| GET | `/api/reports/client-requirements` | Client requirements |

### Misc
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/options` | Dropdown options |
| GET | `/api/warehouse/check` | Equipment readiness |

---

## Roles & Permissions

### 4 Built-in Roles

| Role | Description |
|------|-------------|
| **Admin** | Full access including user management |
| **Manager** | Create/edit everything except user management and equipment delete |
| **Operator** | Read-only across all modules |
| **Department Head** | Scoped to own department — equipment, kits, staff, inquiries |

### Permission Matrix

| Permission | Admin | Manager | Operator | Dept Head |
|------------|:-----:|:-------:|:--------:|:---------:|
| dashboard.view | ✓ | ✓ | ✓ | ✓ |
| clients.view | ✓ | ✓ | ✓ | — |
| clients.create | ✓ | ✓ | — | — |
| clients.edit | ✓ | ✓ | — | — |
| clients.delete | ✓ | — | — | — |
| inquiries.view | ✓ | ✓ | ✓ | ✓ |
| inquiries.create | ✓ | ✓ | — | — |
| inquiries.edit | ✓ | ✓ | — | — |
| quotations.view | ✓ | ✓ | ✓ | — |
| quotations.create | ✓ | ✓ | — | — |
| quotations.edit | ✓ | ✓ | — | — |
| invoices.view | ✓ | ✓ | ✓ | — |
| invoices.edit | ✓ | ✓ | — | — |
| calendar.view | ✓ | ✓ | ✓ | ✓ |
| equipment.view | ✓ | ✓ | ✓ | ✓ |
| equipment.create | ✓ | ✓ | — | ✓ |
| equipment.edit | ✓ | ✓ | — | ✓ |
| equipment.delete | ✓ | — | — | — |
| kits.view | ✓ | ✓ | ✓ | ✓ |
| kits.edit | ✓ | ✓ | — | ✓ |
| vendors.view | ✓ | ✓ | ✓ | — |
| vendors.edit | ✓ | ✓ | — | — |
| staff.view | ✓ | ✓ | ✓ | ✓ |
| staff.create | ✓ | ✓ | — | ✓ |
| staff.edit | ✓ | ✓ | — | ✓ |
| staff.payments | ✓ | — | — | ✓ |
| reports.view | ✓ | ✓ | ✓ | — |
| warehouse.view | ✓ | ✓ | ✓ | — |
| settings.users | ✓ | — | — | — |

### How Permissions Work
1. `ROLE_PERMISSIONS` in `src/lib/permissions.ts` — static source of truth
2. `role_permissions` DB table — stores custom overrides
3. `getEffectivePermissions(role)` — merges static + DB
4. JWT session bakes in `permissions[]` at login
5. `src/middleware.ts` — guards routes via `ROUTE_GUARDS` map
6. Client-side — `useCurrentUser().can("permission.key")` gates UI

---

## Theme System

### Base Themes
- **Dark** (default) — CSS vars on `:root`
- **Light** — `.light` class on `<html>`, toggled via `ThemeProvider`, persisted in `localStorage` (`bk-crm-theme`)

### Department Head Theme
When `user.role === "Department Head"`, `AppLayout.tsx` adds `dept-theme` to `<html>`:
```ts
document.documentElement.classList.toggle("dept-theme", isDept)
```
`globals.css` scopes a full light palette under `:root.dept-theme`:
- Page bg `#F4F6F9`, white cards, blue `#3B82F6` accent
- White sidebar with blue active state
- `.btn-primary` overridden to blue

### Key CSS Variables
```
--bg              page background
--s1              card / panel surface
--b1, --b2        border colors
--tx, --tx2, --tx3  text hierarchy
--bl              blue accent
--sidebar-bg, --sidebar-active, --sidebar-tx-active
--sem-gr/am/rd/bl-bg/bdr/tx    semantic badge colors
```

---

## State Management

All contexts combined in `<StoreProvider>` mounted in `AppLayout.tsx`.

| Hook | Returns |
|------|---------|
| `useCurrentUser()` | `{ user, loading, can, refresh }` |
| `useInquiries()` | `{ inquiries, loading, refreshInquiries, dispatchInquiry }` |
| `useClients()` | `{ clients, loading, refreshClients }` |
| `useQuotations()` | `{ quotations, loading }` |
| `useInvoices()` | `{ invoices, loading }` |
| `useEquipment()` | `{ equipment, loading, refreshEquipment }` |
| `useKits()` | `{ kits, loading, refreshKits, dispatchKits }` |
| `useStaff()` | `{ staff, loading, refreshStaff, dispatchStaff }` |
| `useVendors()` | `{ vendors, loading }` |
| `useTheme()` | `{ theme, toggleTheme, setTheme }` |

---

## Key Workflows

### New Event → Invoice
```
1. Create Client       /clients/new
2. Create Inquiry      /inquiries/new
3. Build Quotation     /inquiries/[id]/quotation
4. Approve Quotation   Draft → Sent → Approved
5. Create Invoice      auto-created from approved quotation
6. Record Advance      /invoices/[id]
7. Record Balance      /invoices/[id]
8. Mark Paid           Unpaid → Partial paid → Paid
```

### Staff Assignment & Payment
```
1. Create inquiry
2. Assign crew         /inquiries/[id]/crew
   → duplicate-booking guard + confirm flow
3. Event completes → record payment /staff/payments
4. View FY summary     /staff/[id]
```

### Equipment Booking
```
1. Book      → status: BOOKED
2. Dispatch  → confirm → status: OUT
3. Return    → status: RETURNED
4. Vendor cost tracked per booking
5. Staff-owned gear → rental income credited to owner
```

### Quotation Versioning
```
1. Draft created       revision_number: 1
2. Edited after Sent   → old version saved to QuotationRevision
                       → revision_number++, status → Draft
3. All versions        /quotations/[id]/revisions
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=minimum-32-character-secret
```

## Running Locally

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

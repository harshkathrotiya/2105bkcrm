# BK Media CRM — Functional Requirements Document
## Staff Module

**Version:** 1.0
**Date:** May 2026
**Stack:** Next.js · Node.js / Express.js · PostgreSQL (Prisma)
**Scope:** Staff Management · Position Assignment · Payment Tracking · Availability

---

## Table of Contents

1. [Overview](#1-overview)
2. [Module 1 — Staff List](#2-module-1--staff-list)
3. [Module 2 — Add / Edit Staff](#3-module-2--add--edit-staff)
4. [Module 3 — Staff Profile](#4-module-3--staff-profile)
5. [Module 4 — Position Assignment](#5-module-4--position-assignment)
6. [Module 5 — Per Event Payment](#6-module-5--per-event-payment)
7. [Module 6 — Monthly Payment Report](#7-module-6--monthly-payment-report)
8. [Module 7 — Availability Check](#8-module-7--availability-check)
9. [Business Rules](#9-business-rules)
10. [Validations](#10-validations)
11. [Database Schema](#11-database-schema)
12. [API Summary](#12-api-summary)

---

## 1. Overview

Staff module manages all BK Media staff — in-house and external. Handles profile, Aadhar, position assignment per event, payment tracking (per day and monthly), and availability checking.

**Key concepts:**
- **In-house staff** — permanent employees (per day or monthly salary)
- **External staff** — contract staff hired per event
- **Per day staff** — paid based on event days worked
- **Monthly staff** — fixed salary every month regardless of events
- **With equipment** — some external staff bring own equipment (crane, drone, FPV)
- **Position assignment** — 1 staff = 1 position per event (duplicate requires confirmation)

---

## 2. Module 1 — Staff List

### 2.1 Staff List View

**Purpose:** View and manage all staff members.

**Features:**
- Display all staff with pagination (20 per page)
- Search by name, role, phone number
- Filter by staff type (In-house / External)
- Filter by payment type (Monthly / Per day)
- Filter by status (Available / Deployed)
- Total pending payment shown in sidebar
- "Add staff" button
- "Export" button — download staff list PDF/CSV

**Sidebar filters with count:**

| Filter | Description |
|--------|-------------|
| All staff | Total count |
| In-house | Permanent employees |
| External | Contract/freelance |
| Monthly | Fixed salary staff |
| Per day | Event-based payment |
| Available | Not assigned to any current event |
| Deployed | Currently at an event |

**Table columns:**

| Column | Description |
|--------|-------------|
| Avatar | Initials from name, color-coded |
| Name | Full name + mobile below |
| Staff type | In-house (green) / External (amber) badge |
| Role | Videographer, Photographer, Crane operator etc. |
| Payment | Rs.X/day or Rs.X/month |
| With equipment | "No" or "+Crane" / "+Drone" / "+FPV" badge |
| Status | Available (green) / Deployed (blue) badge |

**Top metrics (4 cards):**
1. Total staff count
2. Available count
3. Deployed count
4. Total pending payment (Rs.)

---

## 3. Module 2 — Add / Edit Staff

### 3.1 Add Staff Form

**Purpose:** Create new staff profile.

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Full name | Text | Yes | Min 2 chars |
| Mobile number | Number | Yes | Exactly 10 digits |
| Role | Dropdown | Yes | Fixed list (see below) |
| Staff type | Dropdown | Yes | In-house / External |
| Payment type | Dropdown | Yes | Per day / Monthly |
| Rate per day (Rs.) | Number | If per day | Shown only when Per day selected |
| Monthly salary (Rs.) | Number | If monthly | Shown only when Monthly selected |
| With equipment | Checkbox | No | If checked: show equipment description field |
| Equipment description | Text | If checked | e.g. Crane 32ft, DJI Drone, FPV |
| Aadhar number | Text | No | Auto-format XXXX XXXX XXXX |
| Aadhar front | File upload | No | Image file |
| Aadhar back | File upload | No | Image file |

**Role dropdown options:**
- Videographer
- Photographer
- Crane operator
- Drone operator
- LED operator
- Audio operator
- Editor
- Photo editor
- Other

**Payment type toggle behavior:**
- Select "Per day" → show "Rate per day" field, hide "Monthly salary"
- Select "Monthly" → show "Monthly salary" field, hide "Rate per day"

**Equipment checkbox behavior:**
- Unchecked → "With equipment" = No
- Checked → show "Equipment description" text field
- Description saved and shown in staff list + warehouse check

**Right panel — live preview:**
- Avatar with initials + color
- Staff type badge
- Payment type + rate
- With equipment: Yes/No
- Aadhar status: Uploaded / Not uploaded

**Right panel — validation checklist:**
- Full name (required)
- Mobile 10 digits (required)
- Role (required)
- Staff type (required)
- Payment rate (required)
- Aadhar (optional but recommended)

### 3.2 Edit Staff

- Same form as Add, pre-filled with existing data
- All fields editable
- Payment type can be changed
- On save: update record → success toast

---

## 4. Module 3 — Staff Profile

### 4.1 Profile Page

**Purpose:** View complete staff information, history, and payments.

**Left panel:**
- Large avatar with initials
- Full name, role
- Staff type + status badges
- Mobile number
- Payment type + rate
- With equipment: Yes/No
- Aadhar number
- Aadhar front/back uploaded status (checkmark or missing)

**FY Summary card:**
| Field | Description |
|-------|-------------|
| Events worked | Count of events this financial year |
| Total days | Sum of days across all events (per day staff) |
| Total earned | Sum of all payments due this FY |
| Paid | Amount actually paid |
| Pending | Earned minus paid |

**Right panel — Event history table:**

| Column | Description |
|--------|-------------|
| Event | Event name |
| Dates | Start-end dates |
| Days | Number of days |
| Amount | Rate x days (per day) or pro-rated (monthly) |
| Payment | Paid / Pending badge |

**Right panel — Current deployment:**
- If deployed: shows event name + dates + position
- If available: shows "No active event — Available for assignment"

**Right panel — Payment timeline:**
- Chronological list of all payments
- Each entry: event name, dates, amount, paid/pending status

---

## 5. Module 4 — Position Assignment

### 5.1 Assignment Screen

**Purpose:** Assign staff to positions for a specific event/inquiry.

**Trigger:** After warehouse check confirmed → operator assignment screen.

**Header info:** Event name, dates, days (read-only).

**Sidebar:**
- Event info (name, dates, days)
- Summary (total positions, assigned, pending)
- Total staff cost

**Position table columns:**

| Column | Description |
|--------|-------------|
| No. | Position number |
| Position | From quotation (Center Tally, Crane 1 etc.) |
| Equipment | Equipment type for this position |
| Operator dropdown | Grouped: In-house staff / External staff |
| Source | In-house (green) / External (amber) badge — auto-fills on select |
| With equipment | Badge if staff brings own equipment |
| Pay/day | Auto-fills from staff rate on select |

**Operator dropdown groups:**
```
-- In-house --
Rishi Kumar
Dev Vora
Nirav Parmar
...
-- External --
Jignesh Rao (Crane op.)
Karan Patel (Drone op.)
...
```

### 5.2 Duplicate Assignment Logic

**Rule:** 1 staff = 1 position per event. If same staff assigned to 2 positions:

1. Row turns amber background
2. Warning popup appears:
   - "Duplicate assignment — confirm?"
   - "[Staff name] already assigned to [Position 1]. Assign to [Position 2] as well?"
   - Two buttons: "Yes, assign both positions" / "Cancel"
3. If confirmed: staff assigned to both, payment still counted once (1 rate x days)
4. If cancelled: dropdown resets to blank

**Note:** Staff payment is unique per staff per event, regardless of number of positions.

### 5.3 Payment Summary Table

Below position table, auto-calculates:

| Column | Description |
|--------|-------------|
| Staff name | Name |
| Type | In-house / External badge |
| Positions | Count (shows warning if > 1) |
| Rate/day | Staff rate |
| Total (N days) | Rate x event days |

**Grand total:** Sum of all unique staff payments.

---

## 6. Module 5 — Per Event Payment

### 6.1 Per Event Payment Screen

**Purpose:** Record payment to each staff after event.

**Triggered from:** Event detail page → "Staff payments" tab.

**Top metrics:** Total payable, Paid, Pending, Staff count.

**Payment method selector in sidebar:**
- UPI
- Cash
- Bank transfer
- Cheque

**Per staff payment card:**

Each staff shown as a card:
- Avatar + name + role + type
- Position count + days
- Rate x days = total amount
- If paid (green card):
  - Amount displayed
  - Payment date, method, reference shown
- If pending (amber card):
  - Amount displayed
  - Payment method dropdown (UPI/Cash/Bank/Cheque)
  - Reference number text input
  - "Mark paid" button

**"Pay all pending" button:**
- Marks all pending staff as paid
- Uses method selected in sidebar
- Prompts for reference number if needed

---

## 7. Module 6 — Monthly Payment Report

### 7.1 Monthly Report

**Purpose:** View all staff payments for a specific month — per day + monthly salary.

**Month selector:** Dropdown in topbar (e.g. May 2026, April 2026...)

**Top metrics:** Total payable (month), Paid, Pending, Staff count.

**Sidebar filters:** All / Pending only / Paid / Per day / Monthly.

**Section 1 — Per day staff table:**

| Column | Description |
|--------|-------------|
| Name | Name + role |
| Type | In-house / External |
| Events / Days | e.g. 3 events / 8 days |
| Rate/day | Per day rate |
| Total | Rate x total days |
| Paid | Amount paid so far |
| Pending | Total minus paid |
| Action | "Pay" button or "Paid" badge |

**Section 2 — Monthly salary staff table:**

| Column | Description |
|--------|-------------|
| Name | Name + role |
| Type | In-house |
| Monthly salary | Fixed salary amount |
| Status | Paid / Pending |
| Action | "Pay" button or "Paid" badge |

**Note box:** "Monthly staff: Fixed salary every month. Independent of events."

**Actions:**
- "Pay" per staff → mark paid with method + date
- "Pay all pending" → bulk mark all pending as paid
- "Download PDF" → generate monthly payment report PDF

---

## 8. Module 7 — Availability Check

### 8.1 Availability Check Screen

**Purpose:** Check which staff are free for a specific date range before assignment.

**Input (in sidebar):**
- From date
- To date
- Role filter (All roles / Videographer / Photographer etc.)
- "Check" button

**Results — top metrics:** Total / Available / Partial / Busy.

**Staff cards (color coded):**

| Status | Color | Condition |
|--------|-------|-----------|
| Free | Green | No events overlap with date range |
| Partial | Amber | Some days overlap (not full range) |
| Busy | Red | Fully booked for the date range |

Each card shows:
- Avatar + name
- Role + type + rate/day
- If partial: "Partial: Busy [dates] — [event name]"
- If busy: "Busy: [event name] ([dates])"

---

## 9. Business Rules

### Staff Assignment Rules

| Rule | Description |
|------|-------------|
| 1 position per staff | Default: 1 staff = 1 position per event |
| Duplicate confirmation | If same staff assigned twice → warning popup → confirm |
| Payment unique | Staff paid once per event regardless of position count |
| External staff | Can be added on-the-fly from assignment screen |

### Payment Rules

| Rule | Description |
|------|-------------|
| Per day calculation | Rate per day x number of event days = payment |
| Monthly calculation | Fixed salary, independent of event count |
| Partial payment | Multiple partial payments allowed |
| Payment methods | Cash, UPI, Bank transfer, Cheque |
| Reference tracking | UPI/bank reference stored per payment |

### Equipment Rules

| Rule | Description |
|------|-------------|
| Staff equipment | Noted in profile, shown in warehouse check |
| Booking | Staff with equipment: both staff + equipment booked together |
| Rate | Equipment cost included in staff rate (single rate) |

### Financial Year

```
April 1 to March 31
FY summary resets each April 1
```

---

## 10. Validations

### Add Staff
| Field | Rule |
|-------|------|
| Full name | Required, min 2 chars |
| Mobile | Required, exactly 10 digits, numeric only |
| Role | Required |
| Staff type | Required |
| Rate per day | Required if Per day, must be > 0 |
| Monthly salary | Required if Monthly, must be > 0 |
| Aadhar number | If entered: 12 digits, auto-format XXXX XXXX XXXX |

### Position Assignment
| Field | Rule |
|-------|------|
| Operator | Required for each position before proceeding |
| Duplicate | Show warning if same staff assigned twice |

### Payment Recording
| Field | Rule |
|-------|------|
| Amount | Must be > 0 |
| Payment method | Required |
| Reference | Optional (required for bank transfer) |

---

## 11. Database Schema (Prisma)

```prisma
model Staff {
  id              Int       @id @default(autoincrement())
  name            String
  phone           String    // 10 digits
  role            String
  // VIDEOGRAPHER | PHOTOGRAPHER | CRANE_OPERATOR | DRONE_OPERATOR
  // LED_OPERATOR | AUDIO_OPERATOR | EDITOR | PHOTO_EDITOR | OTHER
  staffType       String    // INHOUSE | EXTERNAL
  paymentType     String    // PER_DAY | MONTHLY
  ratePerDay      Decimal?  @db.Decimal(10,2)   // If PER_DAY
  monthlySalary   Decimal?  @db.Decimal(10,2)   // If MONTHLY
  withEquipment   Boolean   @default(false)
  equipmentDesc   String?   // e.g. "Crane 32ft, DJI Drone"
  aadharNumber    String?
  aadharFront     String?   // File path
  aadharBack      String?   // File path
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  assignments     StaffAssignment[]
  payments        StaffPayment[]
  user            User?
}

model StaffAssignment {
  id              Int      @id @default(autoincrement())
  staffId         Int
  staff           Staff    @relation(fields: [staffId], references: [id])
  inquiryId       Int
  inquiry         Inquiry  @relation(fields: [inquiryId], references: [id])
  positionNo      Int?
  positionName    String?  // Center Tally, Crane 1, Drone etc.
  daysAssigned    Int
  ratePerDay      Decimal  @db.Decimal(10,2)
  totalAmount     Decimal  @db.Decimal(12,2)    // ratePerDay x daysAssigned
  isDuplicate     Boolean  @default(false)       // True if staff assigned 2+ positions
  confirmedDup    Boolean  @default(false)       // Confirmed duplicate
  createdAt       DateTime @default(now())

  payments        StaffPayment[]
}

model StaffPayment {
  id              Int             @id @default(autoincrement())
  staffId         Int
  staff           Staff           @relation(fields: [staffId], references: [id])
  assignmentId    Int?
  assignment      StaffAssignment? @relation(fields: [assignmentId], references: [id])
  inquiryId       Int?
  amount          Decimal         @db.Decimal(12,2)
  paymentType     String          // PER_EVENT | MONTHLY_SALARY
  paymentMethod   String          // CASH | UPI | BANK_TRANSFER | CHEQUE
  referenceNo     String?
  month           String?         // "2026-05" for monthly salary
  paidAt          DateTime        @default(now())
  paidById        Int?
  notes           String?
}
```

---

## 12. API Summary

Base URL: `/api/v1`

### Staff
```
GET    /staff?type=INHOUSE&paymentType=PER_DAY&status=AVAILABLE&search=&page=&limit=
POST   /staff
GET    /staff/:id
PUT    /staff/:id
DELETE /staff/:id           // soft delete - isActive = false
POST   /staff/:id/aadhar    // upload aadhar front + back (multipart)

GET    /staff/:id/history   // event history + payments
GET    /staff/:id/summary   // FY summary (events, days, earned, paid, pending)
```

### Staff Assignments
```
GET    /staff-assignments?inquiryId=
POST   /staff-assignments
       Body: {
         inquiryId,
         staffId,
         positionNo?,
         positionName?,
         daysAssigned,
         ratePerDay
       }
PUT    /staff-assignments/:id
DELETE /staff-assignments/:id
POST   /staff-assignments/check-duplicate
       Body: { inquiryId, staffId }
       Returns: { isDuplicate: true/false, existingPosition?: string }
POST   /staff-assignments/confirm-duplicate
       Body: { assignmentId }
```

### Staff Payments
```
GET    /staff-payments?inquiryId=&month=2026-05&status=PENDING
POST   /staff-payments
       Body: { staffId, assignmentId?, amount, paymentType, paymentMethod, referenceNo?, month? }
POST   /staff-payments/bulk
       Body: { payments: [{ staffId, assignmentId, amount, paymentMethod, referenceNo? }] }
GET    /staff-payments/monthly-report?month=2026-05
       Returns: {
         perDayStaff: [{ staff, events, totalDays, totalAmount, paid, pending }],
         monthlyStaff: [{ staff, monthlySalary, status }],
         totals: { total, paid, pending }
       }
```

### Availability
```
GET    /staff/availability?startDate=2026-05-22&endDate=2026-05-25&role=
       Returns: [{
         ...staff,
         status: FREE | PARTIAL | BUSY,
         conflicts: [{ eventName, startDate, endDate }]
       }]
```

---

*BK Media CRM — Staff Module Functional Requirements v1.0*
*Staff Management - Assignment - Payment - Availability*
*Stack: Next.js + Node.js + PostgreSQL (Prisma)*
*May 2026*

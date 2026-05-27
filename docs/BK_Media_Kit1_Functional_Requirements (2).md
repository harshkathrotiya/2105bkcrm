# BK Media CRM — Functional Requirements Document
## Kit 1: Video Department

**Version:** 1.0  
**Date:** May 2026  
**Stack:** Next.js · Node.js / Express.js · PostgreSQL (Prisma)  
**Scope:** Video Department — Phase 1  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles](#2-user-roles)
3. [Module 1 — Client Management](#3-module-1--client-management)
4. [Module 2 — Calendar](#4-module-2--calendar)
5. [Module 3 — Inquiry](#5-module-3--inquiry)
6. [Module 4 — Quotation](#6-module-4--quotation)
7. [Module 5 — Approval](#7-module-5--approval)
8. [Module 6 — Invoice](#8-module-6--invoice)
9. [Module 7 — Payment Tracking](#9-module-7--payment-tracking)
10. [Business Rules](#10-business-rules)
11. [Validations](#11-validations)
12. [API Summary](#12-api-summary)

---

## 1. System Overview

BK Media CRM is an internal business management system for BK Media, Vadodara.  
Kit 1 covers the complete Video Department workflow:

```
Client → Inquiry → Quotation → Approval → Invoice → Payment
```

---

## 2. User Roles

| Role | Access |
|------|--------|
| Admin | Full access to all modules |
| Accounts | Invoices, payments, expense reports |
| Operational | Inquiries, quotations, approvals |
| Staff | View own assignments and payments only |

---

## 3. Module 1 — Client Management

### 3.1 Client List

**Purpose:** View and manage all clients.

**Features:**
- Display all clients in a table with pagination (20 per page)
- Search by client name, contact person, or phone number
- Filter by status: All / Active / Inactive
- Each row shows: Avatar initials, Client name, Contact person, Mobile, Events count, Status badge
- Click any row → navigate to Client Detail page
- "New client" button → navigate to Add Client form

**Columns:**
| Column | Description |
|--------|-------------|
| Avatar | Auto-generated initials from client name |
| Client name | Primary name + contact person below |
| Mobile | 10-digit number |
| Contact person | Contact person name |
| Events | Count of all inquiries for this client |
| Status | Active / Inactive badge |

---

### 3.2 Add Client

**Purpose:** Create a new client record.

**Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Client name | Text | Yes | Min 2 chars |
| Mobile number | Number | Yes | Exactly 10 digits, numbers only, no +91 |
| Contact person | Text | Yes | Min 2 chars |
| Email | Email | No | Valid email format if entered |
| GST number | Text | No | Exactly 15 characters, auto UPPERCASE |
| PAN number | Text | No | Exactly 10 characters, auto UPPERCASE |
| Address line | Textarea | No | Free text |
| City | Text | Yes | Min 2 chars |
| District | Text | Yes | Min 2 chars |
| State | Dropdown | Yes | List of all Indian states, default: Gujarat |
| PIN code | Number | No | Exactly 6 digits |

**Behavior:**
- Right panel shows live preview card as user types
- Validation checklist updates in real time (✓ green / ○ grey)
- GST field: auto converts to UPPERCASE, blocks special characters
- PAN field: auto converts to UPPERCASE, blocks special characters
- Mobile field: blocks non-numeric input, max 10 digits
- Save button → validates all required fields → shows inline errors if invalid
- On success → redirect to Client List with success toast

---

### 3.3 Edit Client

**Purpose:** Update existing client information.

**Behavior:**
- Same form as Add Client, pre-filled with existing data
- "Edit" badge shown in topbar
- Save → update record → show success toast
- No field is locked — all fields editable

---

## 4. Module 2 — Calendar

### 4.1 Calendar View

**Purpose:** Visual monthly overview of all video department events.

**Features:**
- Monthly grid view (7 columns: Sun–Sat)
- Navigate between months with ‹ Prev / Next › buttons
- "Today" button → jump to current month, highlight today's date
- Events display as colored chips inside date cells:
  - Span multi-day events across cells
  - Show event name on start date, show "↔ Client" on continuation days
- Click event chip → Event detail popup below calendar
- "New inquiry" button in topbar

**Event Color Coding:**

| Status | Color | Background |
|--------|-------|------------|
| Inquiry | Blue | #0A1A3A / text #4F8EF7 |
| Quotation sent | Amber | #2E1F0A / text #F5A623 |
| Confirmed | Green | #0F2E22 / text #2DD4A0 |
| Completed | Grey | #1A1A1A / text #888888 |

**Event Detail Popup (on click):**
- Event title
- Client name
- Date range
- Status badge
- "View inquiry →" button

---

## 5. Module 3 — Inquiry

### 5.1 Inquiry Form

**Purpose:** Create a new video department inquiry.

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Select client | Dropdown | Yes | Search + select from existing clients. Shows client phone on select. |
| Event type | Dropdown | Yes | Corporate event, Religious event, Wedding, Conference/Summit, Concert/Show, Government event, Other |
| Start date | Date picker | Yes | — |
| Start time | Time picker | Yes | Default: 09:00 AM |
| End date | Date picker | Yes | Must be ≥ start date |
| End time | Time picker | Yes | Default: 09:00 PM |
| Venue | Text | Yes | Event venue name + city |
| Special notes | Textarea | No | Any special requirements |

**Behavior:**
- Client select → shows client phone number below dropdown
- Start + End date/time → auto-calculate and display duration (days + hours)
- If end date < start date OR end datetime ≤ start datetime → red border on end fields + error message: "End date/time must be after start"
- Duration displayed as blue info bar: "3 days · 60 hours · 9:00 AM → 9:00 PM"
- Right panel: live summary of all fields
- Right panel: date visual preview (start date → end date → days count)
- Save → validate all required → success → redirect to Inquiry detail
- Inquiry auto-saved with status = INQUIRY
- Inquiry appears on calendar immediately after save

---

### 5.2 Inquiry List

**Purpose:** View all video department inquiries.

**Features:**
- Search by client name, event name, quotation number
- Filter by status pills: All / Inquiry / Quotation sent / Confirmed / Completed
- Filter by month dropdown
- Table columns: Quotation no., Client/Event, Dates, Amount, Status, Action
- Click row → Inquiry detail page

**Status definitions:**

| Status | Meaning |
|--------|---------|
| INQUIRY | Just created, no quotation yet |
| QUOTATION_SENT | Quotation generated and sent to client |
| CONFIRMED | Client approved quotation |
| COMPLETED | Event done, invoice paid |
| CANCELLED | Event cancelled |

---

## 6. Module 4 — Quotation

### 6.1 Quotation Form

**Purpose:** Build equipment-wise quotation for the inquiry.

**Event info strip (read-only):**
- Client name, Event name, Dates, Days, Venue, Quotation number (auto), Status

**Quotation Number Auto-generation:**
```
Format: BKM/{FY}/{MM}/{NNN}
Example: BKM/26-27/05/016

Financial Year: April–March
  Month >= 4 → FY = "YY-(YY+1)"   e.g. May 2026 → "26-27"
  Month < 4  → FY = "(YY-1)-YY"   e.g. Feb 2026 → "25-26"

NNN = sequential number per FY, padded to 3 digits, resets April 1
Revision format: BKM/26-27/05/016-1, -2, -3...
```

**Equipment Table:**

| Column | Type | Behavior |
|--------|------|----------|
| No. | Auto | Sequential row number |
| Position | Dropdown | Select from fixed list below |
| Equipment type | Text (read-only) | Auto-fills when position selected |
| Rate/day (₹) | Number | Auto-fills when position selected, **editable** |
| Days | Number | Auto-fills from event total days, **editable** |
| Amount (₹) | Calculated | rate × days, auto-updates |
| Delete | Button | Remove row |

**Position list with defaults:**

| Position | Equipment Type | Default Rate/day |
|----------|---------------|-----------------|
| Center Tally | FS6 | ₹20,000 |
| Center Semi Wide | FS6 | ₹20,000 |
| Center Full Wide | Z150 | ₹8,000 |
| Left Side | FS6 | ₹20,000 |
| Right Side | FS6 | ₹20,000 |
| Wireless 1 | FX3 + Wireless | ₹10,000 |
| Wireless 2 | FX3 + Wireless | ₹10,000 |
| Wireless 3 | FX3 + Wireless | ₹10,000 |
| Wireless 4 | FX3 + Wireless | ₹10,000 |
| Photo 1 | DSLR | ₹8,000 |
| Photo 2 | DSLR | ₹8,000 |
| Photo 3 | DSLR | ₹8,000 |
| Photo 4 | DSLR | ₹8,000 |
| Source PC | PC | ₹5,000 |
| Youtube Live | Live PC | ₹5,000 |
| Editor | Editor | ₹5,000 |
| Photo Editor | Photo Editor | ₹5,000 |
| Video Crane 32 Feet | Crane 32 Feet | ₹15,000 |
| Drone | Drone | ₹12,000 |
| FPV | FPV | ₹15,000 |

**GST Calculation (real-time):**
```
Subtotal  = sum of all (rate × days)
CGST      = subtotal × 9%
SGST      = subtotal × 9%
Total     = subtotal + CGST + SGST

Note: Intra-state Gujarat — CGST + SGST (not IGST)
```

**Actions:**
- "+ Add row" → append empty row to table
- "✕" on row → delete row, recalculate totals
- "Preview PDF" → open PDF preview modal
- "Save quotation" → save, status = DRAFT

---

### 6.2 Quotation PDF Preview

**Purpose:** Preview the PDF before sending to client.

**IMPORTANT — What client sees vs what is hidden:**

| Field | Shown to client | Hidden from client |
|-------|-----------------|--------------------|
| Position | ✓ Yes | — |
| Equipment description | ✓ Yes | — |
| Days | ✓ Yes | — |
| Rate per day | ✗ No | Hidden |
| Amount per item | ✗ No | Hidden |
| Subtotal | ✓ Yes | — |
| CGST 9% | ✓ Yes | — |
| SGST 9% | ✓ Yes | — |
| Total | ✓ Yes | — |

**PDF layout:**
1. Header: BK Media logo/name, address, GST number — right: Quotation number, date, valid days
2. Bill to: Client name, contact
3. Event strip: Event name, dates, days, venue
4. Equipment table: No. / Position / Equipment description / Days (4 columns only)
5. Totals box: Subtotal / CGST / SGST / Total
6. Footer: Authorised signatory + stamp + Client acceptance signature

**Actions on this screen:**
- "WhatsApp →" — share PDF link via WhatsApp
- "Email →" — send PDF via email
- "Download PDF" — download PDF file
- "+ Revise" — create new revision (appends -1, -2...)
- "✓ Mark approved" — move to Approval screen

---

## 7. Module 5 — Approval

### 7.1 Quotation Approval

**Purpose:** Record client's approval of the quotation.

**Workflow indicator:** Inquiry → Quotation → **Approval** → Invoice → Payment

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Approval date | Date | Yes | Default: today |
| Signed copy | File upload | No | Upload scanned signed quotation PDF |
| Notes | Text | No | Any notes |

**Behavior:**
- Shows quotation summary: client, quotation no., total amount, sent date, valid till
- Timeline panel shows: inquiry created → quotation generated → sent to client → approval pending
- "Confirm approval" button → validates → updates inquiry status to CONFIRMED
- On confirmation → show advance payment section
- Advance = 50% of gross total (shown as info, not enforced)

---

## 8. Module 6 — Invoice

### 8.1 Invoice Generation

**Purpose:** Generate and send tax invoice to client after event completion.

**Invoice Number Format:**
```
Format: BKM-INV-{FY}/{MM}/{NNN}
Example: BKM-INV-26-27/05/008
Sequential per financial year, same FY logic as quotation number
```

**IMPORTANT — Invoice line items (Video department):**

Video department invoice has exactly **2 line items only:**
1. Videography services — [event name] · [venue] · [dates]
2. Photography services — [event name] · [venue] · [dates]

**No item-wise rates are shown to client.**

**Invoice PDF layout:**
1. Header: BK Media details — right: Invoice number, invoice date, due date
2. Bill to: Client name, ref quotation number
3. Event strip: Event name, dates, venue
4. 2-line service table: No. / Service description / Days / Amount
5. Totals: Subtotal / CGST 9% / SGST 9% / Gross total / Less advance / Balance payable
6. Bank details (optional)
7. Terms: "Hard disk delivery only after receipt of full payment"
8. Footer: Signature + stamp + client signature

**GST on invoice:**
```
Subtotal   = Videography amount + Photography amount
CGST       = subtotal × 9%
SGST       = subtotal × 9%
Gross total = subtotal + CGST + SGST
Advance     = amount already received (50% typically)
Balance     = gross total − advance
```

---

## 9. Module 7 — Payment Tracking

### 9.1 Payment Recording

**Purpose:** Record and track payments received from client.

**Payment entry fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Amount | Number | Yes | Amount received |
| Payment type | Dropdown | Yes | Advance / Balance / Full |
| Payment method | Dropdown | Yes | Cash / UPI / Bank transfer / Cheque |
| Reference number | Text | No | UPI transaction ID, NEFT ref, cheque no. |
| Date | Date | Yes | Date payment received |
| Notes | Text | No | Any notes |

**Behavior:**
- Shows invoice total, amount received, balance remaining
- Each payment recorded as a separate entry
- Payment history shown with timeline
- When balance = 0 → invoice status automatically changes to PAID
- Invoice status: PENDING → PARTIAL → PAID

**HDD Delivery:**
- HDD delivery section shown after invoice generated
- "Mark HDD delivered" button is **disabled** until full payment received
- On full payment received → button enables
- Delivery details: Total data (GB), HDD size recommendation, delivery status

**HDD Size Recommendation Logic:**
```
Total GB > 500  →  2 TB
Total GB > 200  →  1 TB
Total GB ≤ 200  →  500 GB
```

---

## 10. Business Rules

### Quotation Rules
1. Quotation number is auto-generated — never manually entered
2. Financial year: April 1 to March 31
3. Revision: append -1, -2, -3 to original number
4. Only one active quotation per inquiry (old ones become REVISED)
5. Rates are editable even after auto-fill

### GST Rules
1. Gujarat intra-state: CGST 9% + SGST 9% = 18% total
2. CGST and SGST always equal
3. GST applied on subtotal only
4. Amounts rounded to 2 decimal places

### Invoice Rules
1. Invoice generated only after quotation is APPROVED
2. Video department: exactly 2 line items only
3. Rate/day amounts never shown to client on invoice
4. Invoice due date: typically 7 days from invoice date

### Payment Rules
1. Advance typically 50% of gross total (not enforced by system)
2. HDD cannot be marked delivered until balance_amount = 0
3. Multiple partial payments allowed
4. Payment methods: Cash, UPI, Bank transfer, Cheque

### Calendar Rules
1. Event appears on calendar from start_date to end_date (inclusive)
2. Color changes automatically with status
3. Multiple events can overlap on same date

---

## 11. Validations

### Client Form
| Field | Rule |
|-------|------|
| Client name | Required, min 2 chars |
| Mobile | Required, exactly 10 digits, numeric only |
| Contact person | Required, min 2 chars |
| City | Required |
| District | Required |
| State | Required (dropdown) |
| GST | If entered: exactly 15 chars, alphanumeric, auto UPPERCASE |
| PAN | If entered: exactly 10 chars, alphanumeric, auto UPPERCASE |
| PIN | If entered: exactly 6 digits |

### Inquiry Form
| Field | Rule |
|-------|------|
| Client | Required, must select from list |
| Event type | Required |
| Start date | Required |
| Start time | Required |
| End date | Required, must be ≥ start date |
| End time | If same date: must be > start time |
| Venue | Required, min 3 chars |

### Quotation Form
| Field | Rule |
|-------|------|
| Position | Required for each row |
| Rate/day | Required, must be > 0 |
| Days | Required, must be ≥ 1 |
| Min rows | At least 1 equipment row |

---

## 12. API Summary

Base URL: `/api/v1`

### Clients
```
GET    /clients?search=&status=&page=&limit=
POST   /clients
GET    /clients/:id
PUT    /clients/:id
```

### Inquiries
```
GET    /inquiries?dept=VIDEO&status=&month=&page=
POST   /inquiries
GET    /inquiries/:id
PUT    /inquiries/:id
PUT    /inquiries/:id/status
```

### Quotations
```
GET    /quotations?inquiryId=
POST   /quotations
GET    /quotations/:id
PUT    /quotations/:id
POST   /quotations/:id/revise
POST   /quotations/:id/approve
POST   /quotations/:id/send
GET    /quotations/:id/pdf
GET    /quotations/next-number
```

### Video Quotation Items
```
POST   /video/quotation-items/bulk
PUT    /video/quotation-items/:id
DELETE /video/quotation-items/:id
```

### Invoices
```
GET    /invoices?inquiryId=
POST   /invoices
GET    /invoices/:id
GET    /invoices/:id/pdf
POST   /invoices/:id/record-payment
GET    /invoices/next-number
```

### Calendar
```
GET    /calendar/events?month=2026-05&dept=VIDEO
```

---

## Appendix — Equipment Default Rates (Seed Data)

```javascript
const videoEquipmentDefaults = [
  { position: 'Center Tally',       type: 'FS6',            ratePerDay: 20000 },
  { position: 'Center Semi Wide',   type: 'FS6',            ratePerDay: 20000 },
  { position: 'Center Full Wide',   type: 'Z150',           ratePerDay: 8000  },
  { position: 'Left Side',          type: 'FS6',            ratePerDay: 20000 },
  { position: 'Right Side',         type: 'FS6',            ratePerDay: 20000 },
  { position: 'Wireless 1',         type: 'FX3 + Wireless', ratePerDay: 10000 },
  { position: 'Wireless 2',         type: 'FX3 + Wireless', ratePerDay: 10000 },
  { position: 'Wireless 3',         type: 'FX3 + Wireless', ratePerDay: 10000 },
  { position: 'Wireless 4',         type: 'FX3 + Wireless', ratePerDay: 10000 },
  { position: 'Photo 1',            type: 'DSLR',           ratePerDay: 8000  },
  { position: 'Photo 2',            type: 'DSLR',           ratePerDay: 8000  },
  { position: 'Photo 3',            type: 'DSLR',           ratePerDay: 8000  },
  { position: 'Photo 4',            type: 'DSLR',           ratePerDay: 8000  },
  { position: 'Source PC',          type: 'PC',             ratePerDay: 5000  },
  { position: 'Youtube Live',       type: 'Live PC',        ratePerDay: 5000  },
  { position: 'Editor',             type: 'Editor',         ratePerDay: 5000  },
  { position: 'Photo Editor',       type: 'Photo Editor',   ratePerDay: 5000  },
  { position: 'Video Crane 32 Feet',type: 'Crane 32 Feet',  ratePerDay: 15000 },
  { position: 'Drone',              type: 'Drone',          ratePerDay: 12000 },
  { position: 'FPV',                type: 'FPV',            ratePerDay: 15000 },
];
```

---

*BK Media CRM — Kit 1 Functional Requirements*  
*Video Department · Next.js + Node.js + PostgreSQL*  
*Version 1.0 · May 2026*

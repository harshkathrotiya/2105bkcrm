# BK Media CRM — Business Requirements & Workflow Document

**Organization:** BK Media Group, Vadodara, Gujarat  
**System Purpose:** End-to-end event production management — from client inquiry through equipment dispatch, crew coordination, invoicing, and profitability analysis  
**Service Divisions:** Video Production & LED Screen Rental (can operate independently or as a merged service)

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [User Roles & Access](#2-user-roles--access)
3. [Module: Client Management](#3-module-client-management)
4. [Module: Inquiry Management](#4-module-inquiry-management)
5. [Module: Quotation Management](#5-module-quotation-management)
6. [Module: Invoice & Payment Tracking](#6-module-invoice--payment-tracking)
7. [Module: Equipment Management](#7-module-equipment-management)
8. [Module: Equipment Kits](#8-module-equipment-kits)
9. [Module: Warehouse & Logistics](#9-module-warehouse--logistics)
10. [Module: Staff & Crew Management](#10-module-staff--crew-management)
11. [Module: Vendor Management](#11-module-vendor-management)
12. [Module: Calendar](#12-module-calendar)
13. [Module: Reports & Analytics](#13-module-reports--analytics)
14. [Module: Settings & Administration](#14-module-settings--administration)
15. [End-to-End Event Lifecycle Workflow](#15-end-to-end-event-lifecycle-workflow)
16. [LED Operations Workflow](#16-led-operations-workflow)
17. [Staff Payroll Workflow](#17-staff-payroll-workflow)
18. [Business Rules & Calculations](#18-business-rules--calculations)

---

## 1. Business Overview

BK Media Group is an event production company that provides two core services:

- **Video Department:** Videography, photography, editing, live streaming, drone operations, and crane shots for events
- **LED Department:** LED screen rental, installation, and operation for indoor and outdoor events

For larger events, both departments can be combined into a **Merged** engagement where a single inquiry, quotation, and invoice covers both video and LED services.

The CRM manages the complete lifecycle of every event — from the first client phone call through final payment collection and post-event profit analysis. It also tracks all company assets (equipment and kits), manages staff assignments and payroll, and coordinates logistics with third-party vendors.

---

## 2. User Roles & Access

The system has three user roles. Each role determines what a user can see and do across all modules.

### Admin
Full control over the entire system. Admins can:
- Create, edit, and delete records in any module
- Manage user accounts and set permissions for other roles
- Approve quotations and record payments
- Access all reports and financial data
- Configure system-wide settings (dropdown values, permission matrix)

### Manager
Operational control without the ability to manage users or permissions. Managers can:
- Handle the full client-to-invoice workflow (create, edit, approve)
- Manage equipment, staff, and vendors
- Access all reports and the warehouse module
- Cannot access user management or permission settings

### Operator
Read-only access for staff who need visibility but should not make changes. Operators can:
- View clients, inquiries, quotations, invoices, calendar
- View equipment, kits, vendors, and staff records
- Cannot create, edit, delete, or approve anything
- Cannot access settings, payments, or reports

---

## 3. Module: Client Management

### Purpose
Maintain a master directory of all clients. Every inquiry must be linked to a client.

### Key Information Stored Per Client
- Full name, contact person name, phone number, email address
- GST number and PAN number (for tax invoicing)
- Complete address (street, city, district, state, pin code)
- Active / Inactive status
- Custom display color (for visual identification in lists)

### Client-Specific Equipment Rates
By default, equipment has a standard day rate. For premium or long-term clients, the system allows overriding the default day rate on a per-equipment basis. When a quotation is built for that client, the override rate is used automatically instead of the standard rate.

### What You Can Do
- Search and filter the client list by name, phone, or city
- View the full inquiry history for any client
- Deactivate clients without deleting their history
- Export client data

---

## 4. Module: Inquiry Management

### Purpose
An inquiry is the starting point for every event. It captures all the details about what the client needs, and it serves as the central hub linking the quotation, crew, equipment, and invoice for that event.

### Creating an Inquiry
When a client contacts BK Media for an event, a new inquiry is created capturing:
- **Client:** Which client is making the request
- **Event Name:** The name or description of the event
- **Event Type:** Corporate / Wedding / Religious / Conference / Concert / Government / Other
- **Department:** VIDEO only, LED only, or MERGED (both)
- **Event Dates & Times:** Start and end date/time
- **Venue:** Location of the event
- **Notes:** Any special requirements or context

**For LED or Merged inquiries, additional details are required:**
- Screen dimensions (width and height in square feet)
- LED panel type: P4 / P3 / P2 / FLOOR / P4 Curved
- Installation location: Indoor or Outdoor
- Stage type
- Rate per square foot

### Inquiry Hub (Central Workflow Screen)
Once an inquiry is created, all subsequent work happens inside the Inquiry Hub — a single screen with tabs covering every phase of the event:

| Tab | Purpose |
|-----|---------|
| **Overview** | Event details, client info, status summary |
| **Quotation** | Build and manage the pricing proposal |
| **Warehouse** | Check equipment availability, confirm dispatch |
| **Crew** | Assign and manage staff for the event |
| **Preview** | Generate and preview the client-facing quotation PDF |
| **Invoice** | Create and track the tax invoice and payments |

### Inquiry Status Progression
`New` → `Quoted` → `Confirmed` → `Completed`

---

## 5. Module: Quotation Management

### Purpose
A quotation is the formal pricing proposal sent to the client. It lists every service position (camera operator, photographer, drone, LED screens, etc.) with daily rates and the number of days. Once the client approves it, the event is considered confirmed.

### Quotation Structure
- **Quote Number Format:** `BKM/FY/MM/NNN` — where FY is the financial year (April–March), MM is the month, and NNN is a sequential number
- Each quotation has a list of **positions** — named line items that represent each service or equipment being provided
- Each position has: position name, equipment assigned, rate per day, number of days

### Default Positions Available
The system comes with a pre-set list of standard positions including:
- Camera positions (Center Tally, Center Full Wide)
- Audio/wireless positions (Wireless 1–4)
- Photo positions (Photo 1–4)
- Drone, Crane, Editor, and others
- Custom positions can be added by managers and admins

### Pricing & GST
| Component | Calculation |
|-----------|------------|
| Subtotal | Sum of (Rate × Days) for all positions |
| CGST | Subtotal × 9% |
| SGST | Subtotal × 9% |
| **Total** | **Subtotal + CGST + SGST** |

Gujarat state GST rates apply (9% CGST + 9% SGST = 18% total GST).

### Quotation Lifecycle

1. **Draft** — Being prepared internally
2. **Sent** — Shared with the client for review
3. **Revised** — Client requested changes; revision number increments in the quote number
4. **Approved** — Client has signed/confirmed; inquiry moves to Confirmed status

### Client Communication
- A PDF version of the quotation can be generated for sharing
- WhatsApp delivery is tracked (simulated; planned for real WhatsApp Business API integration)
- Signed copy upload is supported once the client approves

---

## 6. Module: Invoice & Payment Tracking

### Purpose
Once a quotation is approved and the event is complete, an invoice is raised against the client for payment collection.

### Invoice Structure
- **Invoice Number Format:** `BKM-INV-FY/MM/NNN`
- Invoice is split into two separate line amounts:
  - **Videography Amount** (video services)
  - **Photography Amount** (photo services)
- Event details (dates, venue, client info) are carried over from the inquiry

### Payment Collection
| Stage | Details |
|-------|---------|
| **Advance Payment** | Date, amount, payment method, reference number |
| **Balance Payment** | Date, amount, payment method, reference number |
| **Payment Methods** | Cash / UPI / Bank Transfer / Cheque |
| **Status** | Unpaid → Partial Paid → Paid |

### Deliverables Tracking
After the event, the invoice screen tracks two final steps:
- **HDD Delivery:** Confirm delivery of recorded footage (system suggests HDD size based on footage volume: >500 GB → 2TB, >200 GB → 1TB, otherwise 500 GB)
- **Deinstall Completion:** Confirm that LED screens or equipment have been taken down and returned

### Invoice Due Date
A due date can be set on each invoice for payment follow-up.

---

## 7. Module: Equipment Management

### Purpose
Track every piece of equipment owned by the company, rented from vendors, or brought in by staff. The system maintains availability status and enables warehouse booking for events.

### Equipment Attributes
- Product name, category, serial number, quantity
- Department: VIDEO or LED
- Status: Available / In Use / Under Maintenance / Sold / Retired
- Purchase date, supplier name, bill number, purchase price
- Responsible person, notes

### Equipment Ownership Types
| Type | Meaning |
|------|---------|
| **In-House** | Owned by BK Media Group |
| **Vendor** | Belongs to a third-party vendor; rented when needed |
| **Staff** | Belongs to a staff member who brings it to assignments |

### Equipment Categories
**Video:** Camera, Video Mixer, Video Recorder, Audio Mixer, Wireless TX, UPS, Accessory  
**LED:** LED Panel, LED Processor, LED Cable, LED Accessory

### Day Rates
- Every equipment item has a **default day rate** used in quotations
- For specific clients, a **rate override** can be set so that client always gets a different rate for that equipment

---

## 8. Module: Equipment Kits

### Purpose
A kit is a pre-configured bundle of equipment items that are always used together. Instead of booking individual items, an entire kit can be assigned to an event as a single unit.

### Kit Details
- Kit name, department (VIDEO or LED)
- List of equipment items in the kit
- Main body — the primary/central piece of equipment in the kit

### Usage
Kits appear as bookable options in the Quotation and Warehouse modules. Booking a kit automatically reserves all items within it for the event dates.

---

## 9. Module: Warehouse & Logistics

### Purpose
Before an event, the warehouse team verifies that all booked equipment is physically available, confirms dispatch, and manages the handover process. For LED events, this includes detailed dispatch box tracking.

### Equipment Availability Check
- The system shows all equipment booked for an upcoming event
- It flags conflicts — if equipment is already booked for overlapping dates
- Once verified as available, equipment status is updated to **Booked**

### Dispatch & Handover
- When equipment leaves the warehouse, its status is updated to **Out** (dispatched)
- Dispatch date and time are recorded
- On return, status is updated to **Returned**

### Vendor Sub-Hire Tracking
If equipment must be sourced from a vendor for the event:
- Vendor, cost per day, and total cost are recorded
- Confirmation workflow tracks when vendor has confirmed availability

### LED Dispatch Management (LED Events Only)
For LED events, equipment is organized into dispatch boxes:

| Field | Description |
|-------|------------|
| Box Number | Sequential box identifier |
| Contents | Description of what's in the box |
| Cabinet Count | Number of LED cabinets in the box |
| Vehicle Assignment | Vehicle 1 or Vehicle 2 |
| Source | BK Media (in-house) or Vendor equipment |

- Dispatch date and time are set at the event level
- Two vehicles (Vehicle 1, Vehicle 2) can each be assigned a driver
- All boxes are assigned to a specific vehicle for transport planning

---

## 10. Module: Staff & Crew Management

### Purpose
Manage all personnel — both in-house employees and external freelancers — and handle their assignment to events and payroll processing.

### Staff Profile
- Name, phone number
- Role: Videographer / Photographer / Crane Operator / Drone Operator / LED Operator / Audio Operator / Editor / Photo Editor / Other
- Staff Type: In-House (employee) or External (freelancer)
- Department: Video / LED / Both
- Payment Type: Per-Day (event-based) or Monthly (fixed salary)
  - Per-Day staff have a day rate
  - Monthly staff have a fixed monthly salary
- Equipment ownership: If the staff member owns equipment and brings it to jobs, their equipment's daily rate is tracked separately
- Aadhar card verification (front and back document upload)
- Active / Inactive status

### Staff Assignment to Events
When building the crew for an event:
1. Each **position** in the quotation can be assigned to a specific staff member
2. The assignment records: position name, equipment, number of days, rate per day, total amount, and reporting time
3. The system checks for **availability conflicts** — if a staff member is already assigned to another event on overlapping dates, a warning is shown
4. The system detects **duplicate assignments** — if the same staff member is assigned to two positions on the same event, a confirmation is required before saving

### Staff Payments
**Per-Event Payment:**
- Triggered after the event completes
- Linked to the specific assignment
- Records: amount, payment method (Cash/UPI/Bank Transfer/Cheque), reference number, date

**Monthly Salary:**
- Fixed amount processed each month
- Records: month, amount, payment method, reference number

**Payment Report:**
- View all staff payment records filtered by month
- Filter options: All / Pending / Paid / Per-Day staff only / Monthly staff only
- Bulk payment processing

### Staff Brief Generation
Before an event, a staff brief document is generated containing:
- Event name, date, time, venue
- Each assigned position with equipment and reporting time
- This brief is broadcast to all assigned staff via WhatsApp (currently simulated; planned for WhatsApp Business API)

---

## 11. Module: Vendor Management

### Purpose
Maintain a directory of third-party vendors who supply equipment on a rental basis. Vendors fill the gap when BK Media's in-house equipment is insufficient for an event.

### Vendor Profile
- Name, phone, email
- Specialization (type of equipment they supply)
- City, GST number
- Notes, Active/Inactive status

### Vendor Usage in Events
- Equipment items can be flagged as vendor-owned, linking them to a specific vendor
- When such equipment is booked for an event, the vendor cost per day is recorded
- Total vendor cost for the event is calculated automatically
- Vendor utilization is tracked (how many times each vendor has been used)

---

## 12. Module: Calendar

### Purpose
Provide a visual month-by-month view of all events so the team can see at a glance what is scheduled, identify busy periods, and plan resources.

### Calendar View
- Month view with all events marked on their dates
- Event types displayed with visual distinction: Inquiry / Quoted / Confirmed / Completed
- Quick access to navigate to any event from the calendar

---

## 13. Module: Reports & Analytics

### P&L Report (Profitability)
For any event or range of events, the P&L report shows:
- **Revenue:** Invoice subtotal + GST
- **Expenses:** Staff payroll costs + Vendor sub-hire costs
- **Net Profit:** Revenue minus Expenses
- **Profit Margin %:** Net Profit as a percentage of revenue
- Printable / saveable as PDF

### Staff Salary Report
Monthly breakdown of all staff payments:
- Total amount paid per staff member
- Split by per-event vs. monthly salary payments
- Filter by month and payment status

### Asset Report
Complete inventory summary:
- Total asset count and value
- Equipment listed by category and status
- Printable inventory list

### Expense Report
Operational expense breakdown:
- Staff costs by event
- Vendor costs by event
- Miscellaneous expenses

### Warehouse Check Report
Pre-event logistics summary:
- Equipment availability status for upcoming events
- Dispatch readiness
- LED dispatch box contents and vehicle assignments

---

## 14. Module: Settings & Administration

### User Management
- Create and manage system user accounts
- Set username and password for each user
- Assign role (Admin / Manager / Operator)
- Activate or deactivate accounts

### Permission Matrix
- A visual grid showing which permissions are enabled for each role
- Roles on one axis, permissions on the other
- Admins can toggle any permission for any role
- Changes take effect immediately

### Dropdown Configuration
- Manage the master lists used in dropdown menus across the system
- Configurable lists include: staff roles, quotation position names
- Add, edit, or reorder dropdown options without a developer

---

## 15. End-to-End Event Lifecycle Workflow

This is the primary business workflow that every event follows from first contact to final payment.

---

### Step 1 — Client Inquiry
**Who:** Sales / Manager / Admin  
**What happens:**
- Client calls or contacts BK Media for an event
- A new **Inquiry** is created and linked to the client (or a new client is created if first-time)
- Event details are recorded: name, type, dates, venue, department (Video / LED / Merged), and LED specs if applicable
- Inquiry status is set to **New**

---

### Step 2 — Quotation Preparation
**Who:** Manager / Admin  
**What happens:**
- Inside the Inquiry Hub, go to the **Quotation** tab
- Add positions for each service being provided (camera operators, photographers, drone, LED screens, etc.)
- Assign equipment to positions; rates are pulled from the equipment master (or client-specific overrides if set)
- Set the number of days per position
- System calculates subtotal, CGST, SGST, and total automatically
- Quotation is saved as **Draft**

---

### Step 3 — Client Review & Approval
**Who:** Manager / Admin  
**What happens:**
- Go to the **Preview** tab to generate the quotation PDF
- Share with client via WhatsApp or email (WhatsApp delivery is tracked)
- Client may request changes → revise the quotation (revision number increments in the quote number)
- Once client approves → mark quotation as **Approved**
- Inquiry status moves to **Quoted** → **Confirmed**

---

### Step 4 — Equipment Planning & Warehouse Check
**Who:** Warehouse Team / Manager  
**What happens:**
- Go to the **Warehouse** tab in the Inquiry Hub
- Review all equipment needed for the event
- System checks availability against event dates and flags any conflicts
- Book available equipment (status → Booked)
- For items not available in-house, arrange vendor sub-hire: select vendor, set cost per day, confirm with vendor

---

### Step 5 — Crew Assignment
**Who:** Manager / Admin  
**What happens:**
- Go to the **Crew** tab in the Inquiry Hub
- Assign staff to each quotation position
- System warns if a staff member is already booked on overlapping dates
- System flags if the same staff member is assigned to more than one position on the same event (duplicate) → requires confirmation
- Set reporting time for each staff member

---

### Step 6 — Pre-Event Preparation
**Who:** Operations Team / Manager  
**What happens:**
- Generate the **Staff Brief** (event details + crew list) and broadcast to all staff via WhatsApp
- For LED events: create dispatch boxes, assign vehicles and drivers
- Confirm equipment dispatch: mark equipment as **Out** when it leaves the warehouse
- Verify vendor confirmations

---

### Step 7 — Invoicing
**Who:** Admin / Manager  
**What happens:**
- Go to the **Invoice** tab in the Inquiry Hub
- Create the invoice from the approved quotation
- Split the amount into Videography and Photography line items
- Set the payment due date
- Record advance payment when received (amount, method, reference)
- Record balance payment when received
- Invoice status: **Unpaid** → **Partial Paid** → **Paid**

---

### Step 8 — Post-Event Closeout
**Who:** Admin / Manager / Operations  
**What happens:**
- Confirm HDD delivery to client (footage delivery)
- Confirm deinstall completion (equipment return for LED events)
- Mark equipment as **Returned** in the warehouse module
- Process staff payments for all assignments on the event
- View P&L report for the event to review profitability

---

## 16. LED Operations Workflow

LED events have additional logistics requirements beyond the standard video workflow.

### At Inquiry Creation
- Record screen dimensions (width × height in sq ft)
- Select LED panel type (P4 / P3 / P2 / FLOOR / P4 Curved)
- Set location (Indoor / Outdoor)
- System calculates LED cost = Area (sqft) × Rate per sqft × Days

### Equipment Selection
- Book LED panels, processors, cables, and accessories
- Add vendor equipment for supplemental LED panels if in-house stock is insufficient

### Dispatch Box Creation
Each dispatch box represents a physical unit of LED cabinets being transported:
1. Assign a box number
2. Describe the contents (e.g., "P4 panels — front row")
3. Enter cabinet count
4. Assign to Vehicle 1 or Vehicle 2
5. Mark source as BK Media (in-house) or Vendor

### Vehicle & Driver Assignment
- Set dispatch date and time for the event
- Assign a driver to Vehicle 1 and optionally Vehicle 2
- Each dispatch box is linked to its assigned vehicle

### Post-Event
- Confirm all dispatch boxes have been received back
- Record deinstall completion on the invoice
- Process LED operator payments

---

## 17. Staff Payroll Workflow

### Monthly Salary Staff
1. At the start of each month, the system lists all monthly-salary staff with their fixed salary amounts
2. Manager or Admin processes each payment (records method, reference, date)
3. Payment status moves from **Pending** to **Paid**
4. Monthly salary report reflects all payments for the month

### Per-Day Staff (Event-Based)
1. After an event is completed, the system lists all staff assigned to that event
2. For each assignment, the payment amount = Days × Rate Per Day (as set at time of assignment)
3. If the staff member also brought personal equipment, an additional equipment rate is added
4. Manager or Admin records payment (method, reference, date)
5. Payment status moves from **Pending** to **Paid**

### Availability Management
Before assigning staff to a new event:
- The system checks all existing assignments for that staff member
- If the staff member has another event on overlapping dates, a **warning** is displayed
- The user can still proceed with the assignment if confirmed
- This prevents double-booking of critical crew members

---

## 18. Business Rules & Calculations

### Financial Year
- Runs from **April to March** (India standard)
- Quote and invoice numbers reference the financial year (e.g., FY 25-26 for April 2025–March 2026)
- All month-end reports and P&L analysis follow this financial year

### Quote Number Format
`BKM / [FY] / [MM] / [NNN]`  
Example: `BKM/25-26/06/001` = First quote raised in June of FY 2025-26

### Invoice Number Format
`BKM-INV-[FY]/[MM]/[NNN]`

### GST Calculation (Gujarat)
- CGST = Subtotal × 9%
- SGST = Subtotal × 9%
- Total = Subtotal + CGST + SGST
- Applies to all quotations and invoices

### LED Area & Pricing
- Area = Screen Width (ft) × Screen Height (ft)
- LED Cost = Area × Rate per sqft × Number of Days

| LED Type | Indicative Rate |
|----------|----------------|
| P4 | ₹50 / sqft / day |
| P3 | ₹65 / sqft / day |
| P2 | ₹85 / sqft / day |
| FLOOR | ₹90 / sqft / day |
| P4 Curved | ₹60 / sqft / day |

### HDD Delivery Sizing
| Footage Volume | HDD Recommended |
|---------------|----------------|
| > 500 GB | 2 TB |
| 201–500 GB | 1 TB |
| ≤ 200 GB | 500 GB |

### Event Profitability
- **Revenue** = Videography Amount + Photography Amount + Taxes
- **Staff Cost** = Sum of all staff assignment amounts for the event
- **Vendor Cost** = Sum of all vendor equipment rental costs for the event
- **Net Profit** = Revenue − Staff Cost − Vendor Cost
- **Profit Margin** = (Net Profit ÷ Subtotal Revenue) × 100%

### Staff Payment Rules
- A staff member's payment for an event = (Days Assigned × Rate Per Day) + (Equipment Rate Per Day × Days, if staff brought own equipment)
- Monthly salary staff are paid a fixed amount regardless of event count for that month
- All payments require: amount, method (Cash/UPI/Bank Transfer/Cheque), reference number, and date

---

*Document version: June 2026 — covers all modules present in the current BK Media CRM system.*

# LED Department — Full Implementation Plan

> **Scope**: This plan covers the LED department as a completely separate workflow from VIDEO.
> No merging. LED has its own inquiry → quotation → warehouse → operator assignment → dispatch → execution → invoice → expense flow.
> The existing VIDEO screens are untouched. LED gets its own screens, models, and API routes.

---

## 1. What the LED Department Does (Business Context)

BK Media rents LED screen panels to event clients. The business model is:

- Client pays **per sq.ft per day** (e.g. ₹50/sq.ft/day)
- BK Media owns physical LED cabinets stored in their warehouse, organized by **company lots** (NVS, VCORE, etc.)
- Each cabinet = **4 sq.ft** (fixed pricing metric — not the actual physical area)
- If BK Media doesn't have enough panels for a job, they arrange the shortfall from **vendor companies** at a lower rate (e.g. ₹35/sq.ft/day) — the difference is their margin
- An event has **multiple screen positions** across multiple places (Sabha Mandap, OutDoor Campus, etc.)
- Each position has a type: **P4 | P3 | P2 | Floor LED | P4 Curved**
- An operator is assigned to each position for the event duration
- After the event, BK Media generates an expense report showing client billing minus all costs = net profit

---

## 2. LED vs VIDEO — Key Differences

| Aspect | VIDEO | LED |
|---|---|---|
| Pricing unit | Per equipment item per day | Per sq.ft per day |
| Inventory unit | Equipment items + Kits | Cabinet lots (sq.ft) |
| Availability check | Equipment item booking conflicts | Sq.ft allocation vs. requirement |
| Vendor fill | Not applicable | Vendor lot added for shortfall sq.ft |
| Screen positions | Not applicable | Place-wise position table (location, H×W, type) |
| Operator assignment | Not applicable | One operator per screen position |
| Cabinet math | Not applicable | Target ft → cabinets → actual clear mm/ft |
| Execution tracking | Not applicable | Day-by-day screen status (Off/Setup/Live/Issue) |

---

## 3. Core Calculations — Exact Formulas

### 3.1 Cabinet Area (Pricing)
```
sqft_for_pricing = total_cabinets × 4
```
This is **not** the physical area. It is the standardized pricing metric used across all LED types regardless of cabinet physical size.

### 3.2 Cabinet Physical Size → Clear Size
Used to tell the client the actual visible screen dimensions for their structural setup.

```
// Given: cabinet_height_mm, cabinet_width_mm, target_height_ft, target_width_ft

h_cabs_needed  = Math.round((target_height_ft × 304.8) / cabinet_height_mm)
w_cabs_needed  = Math.round((target_width_ft  × 304.8) / cabinet_width_mm)

actual_clear_height_mm = h_cabs_needed × cabinet_height_mm
actual_clear_width_mm  = w_cabs_needed × cabinet_width_mm

actual_clear_height_ft = actual_clear_height_mm / 304.8   // round to 2 decimals
actual_clear_width_ft  = actual_clear_width_mm  / 304.8   // round to 2 decimals
```

**Why**: Cabinets are 576mm. 8ft = 2438mm. 2438 ÷ 576 = 4.23 → round to 4 cabs. 4 × 576 = 2304mm = 7.56ft. So target 8ft → actual clear 7.56ft. Client must design their table/truss for 7.56ft, not 8ft.

### 3.3 Screen Area (Sq.ft for Billing)
```
screen_area_sqft = (screen_height_ft × screen_width_ft)
// OR equivalently: total_cabinets × 4
```
Both methods give the same number. The quotation always shows both the physical H×W and the sq.ft used for billing.

### 3.4 Total Event Billing
```
client_billing = total_sqft_per_day × rate_per_sqft × event_days
```
Example: 6300 sq.ft × ₹50/sq.ft/day × 5 days = ₹15,75,000

### 3.5 GST on Quotation / Invoice
```
subtotal  = client_billing (before tax)
cgst      = subtotal × 0.09
sgst      = subtotal × 0.09
total_with_gst = subtotal + cgst + sgst   // effectively subtotal × 1.18
```

### 3.6 Warehouse Availability
```
bk_media_allocated = Σ (each_company_lot.allocated_sqft)
vendor_sqft        = Σ (each_vendor.sqft)
total_covered      = bk_media_allocated + vendor_sqft
shortfall          = MAX(0, required_sqft - total_covered)
coverage_pct       = MIN(100, ROUND(total_covered / required_sqft × 100))

// Proceed to next step only when shortfall === 0
```

### 3.7 Vendor Cost
```
vendor_cost = Σ (vendor.sqft × vendor.rate_per_sqft_per_day × event_days)
```

### 3.8 Staff Cost
```
staff_cost = Σ (staff.rate_per_day × staff.days_worked)
```

### 3.9 Boxes Required (for dispatch planning)
```
boxes_needed = Math.ceil(total_cabinets / cabinets_per_box)
```

### 3.10 P&L / Net Profit
```
total_expenses = staff_cost + vendor_cost + transport + food + misc + extra_expenses
net_profit     = client_billing - total_expenses
profit_margin  = ROUND(net_profit / client_billing × 100)   // %
```

---

## 4. Data Models — New Prisma Models Required

All new models are LED-specific and independent of video models.

### 4.1 `LedCompanyLot` — Warehouse Stock
Stores BK Media's owned LED panel inventory, organized by supplier company.

```prisma
model LedCompanyLot {
  id              Int      @id @default(autoincrement())
  name            String                       // "NVS", "VCORE"
  led_type        String                       // "P4" | "P3" | "P2" | "FLOOR" | "P4_CURVED"
  cabinet_height_mm Int    @default(576)       // physical cabinet height in mm
  cabinet_width_mm  Int    @default(576)       // physical cabinet width in mm
  cabinets_per_box  Int    @default(5)         // how many cabinets fit in one transport box
  total_cabinets  Int                          // total cabinets owned
  created_at      String
  updated_at      String?
  event_allocations LedWarehouseAllocation[]

  @@map("led_company_lots")
}
```

**Derived fields** (computed, never stored):
- `sqft_for_pricing = total_cabinets × 4`
- `total_boxes = Math.ceil(total_cabinets / cabinets_per_box)`

### 4.2 `LedWarehouseAllocation` — Per-Event Allocation from a Company Lot
Links a company lot to a specific inquiry, recording how many sq.ft are allocated.

```prisma
model LedWarehouseAllocation {
  id              Int          @id @default(autoincrement())
  inquiry_id      String
  inquiry         Inquiry      @relation(fields: [inquiry_id], references: [id], onDelete: Cascade)
  lot_id          Int
  lot             LedCompanyLot @relation(fields: [lot_id], references: [id], onDelete: Cascade)
  allocated_sqft  Float                        // how many sq.ft of this lot go to this event
  created_at      String

  @@unique([inquiry_id, lot_id])
  @@map("led_warehouse_allocations")
}
```

### 4.3 `LedVendorArrangement` — Vendor-Supplied Panels for an Event
When BK Media's stock is not enough, vendor panels fill the shortfall.

```prisma
model LedVendorArrangement {
  id              Int      @id @default(autoincrement())
  inquiry_id      String
  inquiry         Inquiry  @relation(fields: [inquiry_id], references: [id], onDelete: Cascade)
  vendor_name     String
  led_type        String                       // "P4" | "P3" | "P2" | "FLOOR" | "P4_CURVED"
  sqft            Float                        // sq.ft arranged from this vendor
  rate_per_sqft_per_day Float                 // cost BK Media pays the vendor
  created_at      String

  @@map("led_vendor_arrangements")
}
```

**Derived fields** (computed):
- `vendor_cost = sqft × rate_per_sqft_per_day × event_days`

### 4.4 `LedScreenPosition` — Screen Positions for an Event
Each row is one physical screen at a specific place and location within the venue.

```prisma
model LedScreenPosition {
  id              Int      @id @default(autoincrement())
  inquiry_id      String
  inquiry         Inquiry  @relation(fields: [inquiry_id], references: [id], onDelete: Cascade)
  position_no     Int                          // sequential number (1, 2, 3...)
  place           String                       // "Sabha Mandap" | "OutDoor Campus" | custom
  location        String                       // specific sub-location within place
  led_type        String                       // "P4" | "P3" | "P2" | "FLOOR" | "P4_CURVED"
  target_height_ft Float                       // requested height in ft
  target_width_ft  Float                       // requested width in ft
  quantity        Int      @default(1)         // number of identical screens at this position
  cabinet_height_mm Int    @default(576)       // cabinet size used for clear-size calculation
  cabinet_width_mm  Int    @default(576)
  operator_staff_id Int?                       // assigned operator (FK to Staff)
  operator_staff   Staff?  @relation(fields: [operator_staff_id], references: [id], onDelete: SetNull)
  operator_source  String? @default("IN_HOUSE") // "IN_HOUSE" | "EXTERNAL"
  created_at      String

  @@index([inquiry_id])
  @@map("led_screen_positions")
}
```

**Derived fields** (all computed from stored fields, never persisted):
- `sqft_per_screen = target_height_ft × target_width_ft`
- `total_sqft = sqft_per_screen × quantity`
- `h_cabs = Math.round((target_height_ft × 304.8) / cabinet_height_mm)`
- `w_cabs = Math.round((target_width_ft × 304.8) / cabinet_width_mm)`
- `actual_clear_height_mm = h_cabs × cabinet_height_mm`
- `actual_clear_width_mm  = w_cabs × cabinet_width_mm`
- `actual_clear_height_ft = actual_clear_height_mm / 304.8`
- `actual_clear_width_ft  = actual_clear_width_mm  / 304.8`

### 4.5 `LedDayStatus` — Day-by-Day Screen Status During Execution
Tracks each screen's operational status for each day of the event.

```prisma
model LedDayStatus {
  id              Int      @id @default(autoincrement())
  inquiry_id      String
  inquiry         Inquiry  @relation(fields: [inquiry_id], references: [id], onDelete: Cascade)
  position_no     Int                          // FK-by-convention to LedScreenPosition.position_no
  day_index       Int                          // 0 = setup day, 1..N = event days
  status          String   @default("OFF")     // "OFF" | "SETUP" | "LIVE" | "ISSUE"
  notes           String   @default("")
  day_done        Boolean  @default(false)     // operator has marked this day complete

  @@unique([inquiry_id, position_no, day_index])
  @@map("led_day_statuses")
}
```

### 4.6 `LedIssueLog` — Issues Reported During Execution
```prisma
model LedIssueLog {
  id          Int    @id @default(autoincrement())
  inquiry_id  String
  inquiry     Inquiry @relation(fields: [inquiry_id], references: [id], onDelete: Cascade)
  text        String
  logged_at   String                           // ISO timestamp

  @@map("led_issue_logs")
}
```

### 4.7 `LedOperationsLog` — Operations Notes During Execution
```prisma
model LedOperationsLog {
  id          Int    @id @default(autoincrement())
  inquiry_id  String
  inquiry     Inquiry @relation(fields: [inquiry_id], references: [id], onDelete: Cascade)
  log_time    String                           // "HH:MM" format
  text        String
  logged_at   String

  @@map("led_operations_logs")
}
```

### 4.8 `LedExpense` — Other Expenses for an Event
Transport, food, misc, and any custom line items.

```prisma
model LedExpense {
  id          Int    @id @default(autoincrement())
  inquiry_id  String
  inquiry     Inquiry @relation(fields: [inquiry_id], references: [id], onDelete: Cascade)
  category    String                           // "TRANSPORT" | "FOOD" | "MISC" | "CUSTOM"
  label       String                           // display name for CUSTOM
  amount      Float
  created_at  String

  @@map("led_expenses")
}
```

### 4.9 Existing `Inquiry` model additions needed
Add these FK relations to the existing `Inquiry` model:

```prisma
// Add to existing Inquiry model:
led_screen_positions    LedScreenPosition[]
led_warehouse_allocations LedWarehouseAllocation[]
led_vendor_arrangements LedVendorArrangement[]
led_day_statuses        LedDayStatus[]
led_issue_logs          LedIssueLog[]
led_operations_logs     LedOperationsLog[]
led_expenses            LedExpense[]
```

---

## 5. The LED Workflow — Step by Step

```
[1] New LED Inquiry
      ↓
[2] Add Screen Positions (place + location + type + H×W)
      ↓
[3] LED Quotation (auto-calculates sq.ft, rate, GST → send PDF to client)
      ↓
[4] Client Approves Quotation
      ↓
[5] Clear Size Document (cabinet math → actual mm/ft for client's structural team)
      ↓
[6] Client Requirements PDF (staff list, power, structural, schedule → send to client)
      ↓
[7] Warehouse Check (allocate BK Media lots + add vendor lots until shortfall = 0)
      ↓
[8] Operator Assignment (assign staff to each screen position)
      ↓
[9] Dispatch Planning (assign staff + equipment to vehicles)
      ↓
[10] Event Execution (day-by-day screen status: Off/Setup/Live/Issue)
      ↓
[11] Expense Report (staff + vendor + transport + food → P&L)
      ↓
[12] Invoice (generate, track advance + balance, de-install after full payment)
```

---

## 6. New API Routes Required

All routes are under `/api/led/` prefix to keep them fully separate from video routes.

### 6.1 Warehouse Stock (Company Lots)
```
GET    /api/led/lots                    → list all company lots (with derived sqft, boxes)
POST   /api/led/lots                    → create lot
PATCH  /api/led/lots/[id]              → update lot
DELETE /api/led/lots/[id]              → delete lot
```

### 6.2 Warehouse Allocation (per event)
```
GET    /api/led/inquiries/[id]/warehouse        → get allocations + vendors + P&L for event
POST   /api/led/inquiries/[id]/warehouse/lots   → upsert allocation from a company lot
DELETE /api/led/inquiries/[id]/warehouse/lots/[allocationId]
POST   /api/led/inquiries/[id]/warehouse/vendors → add vendor arrangement
PATCH  /api/led/inquiries/[id]/warehouse/vendors/[vendorId]
DELETE /api/led/inquiries/[id]/warehouse/vendors/[vendorId]
```

**GET response shape**:
```ts
{
  required_sqft: number,           // from inquiry — sum of all screen positions × qty
  event_days: number,
  rate_per_sqft: number,           // from inquiry
  client_billing: number,          // required_sqft × rate_per_sqft × event_days
  lots: Array<{
    lot: LedCompanyLot,
    allocated_sqft: number,
    remaining_sqft: number,        // lot.total_cabinets×4 - allocated_sqft
    usage_pct: number
  }>,
  vendors: LedVendorArrangement[],
  bk_media_total: number,          // sum of allocated_sqft
  vendor_total: number,            // sum of vendor sqft
  shortfall: number,               // required - bk_media_total - vendor_total
  vendor_cost: number,             // sum of vendor.sqft × vendor.rate × event_days
  net_margin: number               // client_billing - vendor_cost
}
```

### 6.3 Screen Positions
```
GET    /api/led/inquiries/[id]/positions        → list positions with derived clear sizes
POST   /api/led/inquiries/[id]/positions        → create position
PATCH  /api/led/inquiries/[id]/positions/[posId]
DELETE /api/led/inquiries/[id]/positions/[posId]
POST   /api/led/inquiries/[id]/positions/reorder → update position_no sequence
```

**GET response** includes all derived values computed server-side:
```ts
{
  positions: Array<{
    ...LedScreenPosition,
    sqft_per_screen: number,
    total_sqft: number,
    h_cabs: number,
    w_cabs: number,
    clear_height_mm: number,
    clear_height_ft: number,
    clear_width_mm: number,
    clear_width_ft: number,
    operator_staff: Staff | null
  }>,
  summary: {
    total_positions: number,
    total_sqft_per_day: number,
    places: string[]            // distinct place names
  }
}
```

### 6.4 Operator Assignment
```
PATCH  /api/led/inquiries/[id]/positions/[posId]/operator
       body: { staff_id: number | null, operator_source: "IN_HOUSE" | "EXTERNAL" }
```

### 6.5 Event Execution
```
GET    /api/led/inquiries/[id]/execution         → all day statuses + issues + logs
PATCH  /api/led/inquiries/[id]/execution/status  → update one screen's status for a day
       body: { position_no, day_index, status, notes }
POST   /api/led/inquiries/[id]/execution/status/bulk   → set all screens on a day to LIVE
POST   /api/led/inquiries/[id]/execution/day-done      → toggle day_done for a day_index
POST   /api/led/inquiries/[id]/execution/issues        → add issue log entry
DELETE /api/led/inquiries/[id]/execution/issues/[id]
POST   /api/led/inquiries/[id]/execution/logs          → add operations log entry
```

### 6.6 Expenses
```
GET    /api/led/inquiries/[id]/expenses          → all expenses + P&L summary
POST   /api/led/inquiries/[id]/expenses          → add expense line
PATCH  /api/led/inquiries/[id]/expenses/[expId]
DELETE /api/led/inquiries/[id]/expenses/[expId]
```

**GET response P&L shape**:
```ts
{
  client_billing: number,
  staff_cost: number,       // from StaffPayment records for this inquiry
  vendor_cost: number,      // from LedVendorArrangement × event_days
  transport: number,
  food: number,
  misc: number,
  extra_total: number,
  total_expenses: number,
  net_profit: number,
  profit_margin: number,    // %
  expenses: LedExpense[],
  expense_breakdown: {
    vendor_pct: number,
    staff_pct: number,
    other_pct: number
  }
}
```

---

## 7. Screens to Build (Component List)

All new screens follow the exact same design system as existing screens (same tokens, same card/table styles, same dark mode). No new UI patterns — just new data and layouts.

### Screen: LED Warehouse Stock Management
**Route**: `/led/stock`
**Purpose**: Admin manages BK Media's owned cabinet inventory.

**Data flow**:
1. Load all `LedCompanyLot` records
2. For each lot, compute: `sqft = total_cabinets × 4`, `boxes = ceil(cabs / cpb)`
3. Show totals: companies count, total cabinets, total sq.ft, total boxes
4. CRUD operations on lots

**Inputs** (create/edit lot):
- Company name (text)
- LED type (select: P4 / P3 / P2 / Floor LED / P4 Curved)
- Cabinet height mm (number, default 576)
- Cabinet width mm (number, default 576)
- Cabinets per box (number, default 5)
- Total cabinets (number)

**Auto-calculated on screen** (not saved, shown live while typing):
- Preview sq.ft = `total_cabinets × 4`
- Preview boxes = `ceil(total_cabinets / cabinets_per_box)`
- Clear size example for 8×14ft screen using the entered cabinet dimensions

---

### Screen: LED Quotation (positions + pricing)
**Route**: Part of existing inquiry flow for LED department inquiries
**Purpose**: Build the place-wise quotation with per-position pricing.

**Data flow**:
1. Load inquiry + existing `LedScreenPosition` records
2. For each position, compute: `sqft = h × w × quantity`, `amount = sqft × rate × days`
3. Subtotals per place, then CGST/SGST, then grand total
4. Show send/approve controls and revision history

**Key calculations on render**:
```
for each position:
  sqft      = target_height_ft × target_width_ft × quantity
  amount    = sqft × rate_per_sqft × event_days

subtotal    = Σ all position amounts
cgst        = subtotal × 0.09
sgst        = subtotal × 0.09
grand_total = subtotal + cgst + sgst
```

**Inputs** (add/edit position):
- Place name (text or select from existing places on this inquiry)
- Location (text — e.g. "On Stage", "Center Dom")
- LED type (select)
- Target height ft (number)
- Target width ft (number)
- Quantity (number, default 1)

When `target_height_ft` or `target_width_ft` changes → live preview of sqft and amount updates instantly.

---

### Screen: LED Clear Size Document
**Route**: PDF/printable view linked from quotation
**Purpose**: Show client the actual cabinet-snapped dimensions for their structural team.

**Data flow**:
1. Load screen positions for the inquiry
2. Load company lot cabinet dimensions (or use the position's stored `cabinet_height_mm` / `cabinet_width_mm`)
3. Compute clear sizes for every position using the cabinet math formula (§3.2)
4. Display place-wise table: Target H×W → H cabs + W cabs → Clear H mm/ft + Clear W mm/ft

**Interactive calculator card** (sidebar):
- Input: cabinet H mm, cabinet W mm, target H ft, target W ft
- Instantly shows: cabs needed, actual clear mm, actual clear ft for H and W

---

### Screen: LED Warehouse Availability Check
**Route**: `/inquiries/[id]/led-warehouse`
**Purpose**: For a specific event inquiry, allocate BK Media lots and add vendor panels until shortfall = 0.

**Data flow on load**:
1. Load inquiry → get `required_sqft` (sum of all screen positions), `event_days`, `rate_per_sqft`
2. Load all `LedCompanyLot` records with their current allocations for this event
3. Load all `LedVendorArrangement` records for this event
4. Compute all metrics (§3.6, §3.7)

**Live recalculation** (every input change triggers):
```
bk_total    = Σ company allocations
vendor_total = Σ vendor sqft
shortfall   = MAX(0, required_sqft - bk_total - vendor_total)
coverage_pct = MIN(100, ROUND((bk_total + vendor_total) / required_sqft × 100))
vendor_cost = Σ (vendor.sqft × vendor.rate × event_days)
net_margin  = client_billing - vendor_cost
```

**Allocation constraint**: `0 ≤ allocated_sqft ≤ lot.total_cabinets × 4`

**Proceed button**: disabled while `shortfall > 0`

**P&L summary** (live):
- Client billing: `required_sqft × rate_per_sqft × event_days`
- Vendor cost: computed above
- Net margin: difference
- All update in real time as allocations / vendors change

---

### Screen: LED Operator Assignment
**Route**: `/inquiries/[id]/led-operators`
**Purpose**: Assign one operator to each screen position.

**Data flow**:
1. Load screen positions for the inquiry (with place grouping)
2. Load all staff (filtered to LED or BOTH department)
3. For each position, show operator dropdown (grouped: In-house / External)
4. On selection: auto-display source badge (In-house / External) and rate/day

**Live metrics on every assignment change**:
```
assigned_count = positions where operator_staff_id is not null
in_house_count = assigned where source = "IN_HOUSE"
external_count = assigned where source = "EXTERNAL"
remaining      = total_positions - assigned_count
```

**Staff payment preview** (bottom section):
```
for each staff member assigned to ≥1 position:
  staff_payment = staff.rate_per_day × event_days
total_staff_cost = Σ all staff payments
```
Note: If one staff covers multiple positions, they are paid once — not multiplied by position count.

---

### Screen: LED Dispatch Planning
**Route**: `/inquiries/[id]/led-dispatch`
**Purpose**: Assign staff and LED equipment to vehicles.

**Data flow**:
1. Load inquiry dispatch fields (date, time, venue, vehicles, drivers)
2. Load staff assigned to this inquiry (from StaffAssignment)
3. Load `LedDispatchBox` records (existing model, already built)
4. Load screen positions (to know what equipment total is needed)
5. Show vehicle cards with staff pool and equipment pool

**Completion condition**:
```
is_dispatch_ready = all_staff_assigned AND all_equipment_loaded
```

This screen primarily uses the existing `LedDispatchBox` model + `StaffAssignment` model. The main addition is UI to show a 4-vehicle assignment interface.

---

### Screen: LED Event Execution
**Route**: `/inquiries/[id]/led-execution`
**Purpose**: Track every screen's status for every day of the event.

**Day structure**:
```
days = [
  { index: 0, label: "Setup day", date: inquiry.start_date - 1 },
  { index: 1, label: "Day 1",     date: inquiry.start_date },
  { index: 2, label: "Day 2",     date: start_date + 1 },
  ...
  { index: N, label: "Day N",     date: inquiry.end_date }
]
total_days = event_days + 1  // +1 for setup day
```

**Status cycle** (each click advances):
```
OFF → SETUP → LIVE → ISSUE → OFF
```

**Bulk action**: "All live" sets every position on current day to LIVE status.

**Day-done toggle**: When a day is marked done, its tab shows a green checkmark. The mark cannot be undone without confirmation.

**Live summary** (recalculated on every status change):
```
live_count  = positions where statusMap[day_index][position_no] === "LIVE"
setup_count = positions where status === "SETUP"
issue_count = positions where status === "ISSUE"
off_count   = total_positions - live_count - setup_count - issue_count
days_done   = count of days with day_done === true
```

**Issues log**: Each entry has free-text + timestamp. Prepended to list (newest first).

**Operations log**: Each entry has HH:MM time + free-text. Append to list.

---

### Screen: LED Expense Report
**Route**: `/inquiries/[id]/led-expenses`
**Purpose**: Show full P&L for the event — internal, not shared with client.

**Data sources**:
- `client_billing`: from inquiry (sqft × rate × days)
- `staff_cost`: from `StaffPayment` records linked to this inquiry
- `vendor_cost`: from `LedVendorArrangement` records × event_days
- `transport/food/misc`: from `LedExpense` records (TRANSPORT, FOOD, MISC categories)
- `extra_expenses`: from `LedExpense` records (CUSTOM category)

**All P&L values recalculate on every expense input change**:
```
total_expenses = staff_cost + vendor_cost + transport + food + misc + extra_total
net_profit     = client_billing - total_expenses
profit_margin  = MAX(0, ROUND(net_profit / client_billing × 100))
```

**Expense breakdown percentages**:
```
vendor_pct = ROUND(vendor_cost / total_expenses × 100)
staff_pct  = ROUND(staff_cost  / total_expenses × 100)
other_pct  = 100 - vendor_pct - staff_pct
```

**Staff payment status**: shows each staff member with amount pending.

---

### Screen: LED Invoice
**Route**: `/inquiries/[id]/led-invoice`
**Purpose**: Final client-facing invoice. Generates from quotation data.

**Payment tracking**:
```
advance_amount   = total_with_gst × 0.50   // 50% advance
balance_amount   = total_with_gst × 0.50   // 50% balance
```

**State machine**:
```
ADVANCE_PENDING → ADVANCE_RECEIVED → BALANCE_RECEIVED → DEINSTALL_COMPLETE
```

De-installation button is **disabled** until `payment_status === "BALANCE_RECEIVED"`.

**Timeline** (event milestones displayed in order):
1. Quotation approved
2. Advance received
3. Setup complete
4. Event completed
5. Invoice sent
6. Balance payment (pending → received)
7. De-installation (pending → complete)

---

## 8. Data Flow Map — What Passes Between Screens

```
[Inquiry Creation]
  stores: department="LED", event dates, venue, rate_per_sqft
         ↓
[Screen Positions] (add positions → creates LedScreenPosition rows)
  computes: required_sqft = Σ(h × w × qty) for all positions
         ↓
[Quotation]
  reads: positions, rate_per_sqft, event_days
  computes: subtotal, cgst, sgst, grand_total
  stores: quotation with status (Draft/Sent/Approved)
         ↓
[Clear Size Doc]
  reads: positions + cabinet mm dimensions
  computes: clear mm/ft for every position
  outputs: PDF for client's structural team
         ↓
[Client Requirements PDF]
  reads: positions, assigned staff (from operator assignment), power = 60KVA standard
  outputs: PDF for client
         ↓
[Warehouse Check]
  reads: required_sqft (from positions sum), rate_per_sqft, event_days
  user inputs: company lot allocations + vendor arrangements
  computes: bk_total, vendor_total, shortfall, vendor_cost, net_margin
  stores: LedWarehouseAllocation rows + LedVendorArrangement rows
  gate: cannot proceed if shortfall > 0
         ↓
[Operator Assignment]
  reads: positions, all LED staff
  user inputs: operator selection per position
  stores: LedScreenPosition.operator_staff_id + operator_source
  computes: staff payment preview (rate × event_days per unique staff)
         ↓
[Dispatch]
  reads: inquiry dispatch fields, StaffAssignments, LedDispatchBoxes, positions
  user inputs: staff → vehicle, equipment → vehicle
  stores: vehicle assignments in inquiry fields + dispatch box records
         ↓
[Execution]
  reads: positions (for screen list), inquiry dates (for day structure)
  user inputs: status per screen per day, issues, ops logs
  stores: LedDayStatus rows, LedIssueLog rows, LedOperationsLog rows
         ↓
[Expense Report]
  reads: client_billing (from inquiry), StaffPayments, LedVendorArrangements, LedExpenses
  user inputs: transport, food, misc amounts; custom expense lines
  stores: LedExpense rows
  computes: P&L in real time
         ↓
[Invoice]
  reads: quotation (for amounts + GST), inquiry (for event details), expense report data
  user inputs: mark advance received, mark balance received, mark deinstall complete
  stores: payment status on quotation/inquiry
```

---

## 9. LED-Specific Equipment (What Goes in Dispatch)

LED events use a standard set of equipment that is distinct from video equipment. These should be tagged `department = "LED"` in the existing Equipment model.

| Category | Equipment |
|---|---|
| LED_PANEL | P4 LED panels (by company lot / sqft) |
| LED_PANEL | P3 LED panels |
| LED_PANEL | P2 LED panels |
| LED_PANEL | Floor LED panels |
| LED_PANEL | P4 Curved LED panels |
| LED_PROCESSOR | LED controller / processor |
| LED_PROCESSOR | Video processor |
| LED_CABLE | Signal cable (fiber, per 100m) |
| LED_CABLE | Power cable + conduit |
| LED_ACCESSORY | Power distribution box (per KVA capacity) |
| LED_ACCESSORY | Truss + rigging hardware |
| LED_ACCESSORY | Tools + spare parts kit |
| LED_ACCESSORY | Control desk + laptops |

The dispatch screen pools these items from `Equipment` records where `department = "LED"`.

---

## 10. Staff for LED Department

Staff records with `department = "LED"` or `department = "BOTH"` appear in the LED operator assignment dropdown.

Standard LED roles:
- LED Operator (operates a screen position)
- LED Technician (technical support, troubleshooting)
- LED Controller (master controller at control desk)

Staff rates are per-day. The expense report uses `StaffPayment` records linked to the inquiry.

---

## 11. Phases — What to Build in What Order

### Phase 1 — Data Foundation
1. Add all new Prisma models (§4) to `schema.prisma`
2. Add relation fields to existing `Inquiry` model
3. Run migration
4. Add TypeScript interfaces to `src/lib/types.ts`
5. Add all LED API functions to `src/lib/api.ts`

### Phase 2 — LED Warehouse Stock Screen
1. API: `/api/led/lots` (CRUD)
2. Screen: LED stock management (add/edit/delete company lots, live sq.ft preview)

### Phase 3 — LED Screen Positions
1. API: `/api/led/inquiries/[id]/positions` (CRUD + derived clear sizes)
2. Integrate into the LED inquiry creation / edit flow
3. Live sq.ft total shown as positions are added

### Phase 4 — LED Quotation
1. Extend quotation form / quotation PDF for LED department
2. Auto-populate rows from screen positions
3. Place-wise subtotals, GST, grand total
4. Clear size document PDF

### Phase 5 — LED Warehouse Availability Check
1. API: `/api/led/inquiries/[id]/warehouse` (GET + POST/PATCH/DELETE for allocations and vendors)
2. Screen: company lot allocation inputs, vendor add/remove, live shortfall + P&L
3. Proceed gate enforced (disabled button when shortfall > 0)

### Phase 6 — Operator Assignment
1. API: PATCH operator on screen position
2. Screen: place-wise position table with staff dropdowns, payment summary

### Phase 7 — Execution Tracking
1. APIs: status, bulk-live, day-done, issues, logs
2. Screen: day tabs, place-wise screen status table, issues log, ops log

### Phase 8 — Expense Report + Invoice
1. API: `/api/led/inquiries/[id]/expenses` (CRUD + P&L GET)
2. Screen: expense report with live P&L
3. LED invoice screen with payment state machine and timeline

---

## 12. What Already Exists (Do NOT Rebuild)

| What | Where | Notes |
|---|---|---|
| `department = "LED"` on Inquiry | `prisma/schema.prisma:47` | Already there |
| LED-specific fields on Inquiry | `schema.prisma:52-68` | screen_width, screen_height, screen_area_sqft, total_cabinets, led_type, rate_per_sqft, dispatch fields |
| `LedDispatchBox` model | `schema.prisma:366-377` | box_number, contents, cabinets, vehicle, source |
| Dispatch box API routes | `src/app/api/inquiries/[id]/dispatch-boxes/` | GET, POST, PATCH, DELETE |
| `fetchDispatchBoxes`, `createDispatchBox`, etc. | `src/lib/api.ts:650-668` | Already wired up |
| LED equipment category types | Equipment.category: LED_PANEL, LED_PROCESSOR, etc. | department filter already works |
| Staff department = "LED" / "BOTH" | Staff model | already filterable |
| DeptInquiries component | `src/components/screens/dept/DeptInquiries.tsx` | already shows LED inquiries for LED dept head |

---

## 13. Key Business Rules (Validation)

1. **Proceed to warehouse** only when quotation status = "Approved"
2. **Proceed to dispatch** only when shortfall = 0 (all sq.ft covered)
3. **Operator assignment** requires all positions filled before generating client requirements PDF
4. **Invoice de-install button** disabled until balance payment received
5. **Allocation constraint**: cannot allocate more sq.ft from a lot than `total_cabinets × 4`
6. **Vendor cost visibility**: vendor rates are INTERNAL only — never shown on client-facing PDFs (quotation, invoice, requirements)
7. **LED type assignment per position is immutable** after quotation is approved (changing type changes the price)
8. **Staff payment**: one staff covering multiple positions counts once in expense report — rate × days, not × positions
9. **Day-done is a soft lock**: a done day can still have status edits (screens can have issues during "done" days)
10. **Setup day (index 0)** is always one day before `start_date`. It does not count toward `event_days` for billing.

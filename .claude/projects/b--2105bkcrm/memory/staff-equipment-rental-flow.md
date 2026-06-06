---
name: staff-equipment-rental-flow
description: How staff-owned equipment rental income works — credited to owner, not the user
metadata:
  type: project
---

BK Media staff can own equipment they bring to the company. They get (1) salary as an employee AND (2) separate RENTAL income for their gear. The rental is ALWAYS credited to the equipment OWNER, regardless of which staff member actually uses the gear at an event. Equipment can also be company-owned (INHOUSE) or VENDOR — those generate no owner rental.

**How it's modeled (implemented 2026-06-06):** Rental lives on the `EquipmentBooking` row (NOT on `staff_assignment` — the old, wrong approach paid rental to whoever was assigned to the position). New booking fields: `rental_owner_staff_id`, `rental_rate_per_day`, `total_rental`. Set via `PUT /api/equipment-bookings/[id]/rental` (derives owner from `equipment.owner_staff_id`, rejects non-STAFF-owned gear, computes total = rate × inclusive days). Default rate comes from `equipment.default_rate`, editable per event in Screen17 Warehouse → Staff-Owned Equipment section. Equipment must be booked (serial assigned) to the event before rental can be recorded.

**Owner payout:** rental aggregated per owner in `getStaffYtdSummary` (rentalEarned/rentalPaid/rentalPending) and `getStaffEquipmentRentals` (per-event list via `GET /api/staff/[id]/rentals`). Shown in Screen22StaffProfile with a "Pay" button that records an `EQUIPMENT_RENTAL` StaffPayment (new payment type in validate.ts STAFF_PAYMENT_TYPES). Reports (`getExpenseReport`/`getPLReport`) break rental out as `totalRentalCost`, a distinct cost line in Screen27/Screen28.

**Why:** The owner is owed rental even when not on the crew. Tying rental to the assignee double-counted/mis-paid.
**How to apply:** Never attach equipment rental to staff_assignment.with_equipment for new work (legacy columns kept but unused). Rental = booking-level, owner-credited.

---
name: equipment-availability-date-based
description: Equipment availability is date-based (bookings), not a permanent IN_USE status flag
metadata:
  type: project
---

Equipment availability in BK Media CRM is DATE-BASED, derived from bookings — NOT from a permanent `equipment.status = IN_USE` flag. (Fixed 2026-06-06; previously confirm/handover permanently set status=IN_USE which only cleared on explicit Return, so items got stuck "in use" everywhere — including staff-owned gear the company doesn't even own.)

**How it works now:**
- `equipment.status` only holds genuine states: AVAILABLE / MAINTENANCE / SOLD / RETIRED. It is NOT mutated by booking confirm/return.
- Booking lifecycle (`equipment_bookings.status`: BOOKED → OUT → RETURNED) tracks usage.
- `confirm`/`bulk-confirm` routes only set booking → OUT. `return` route only sets booking → RETURNED. Neither touches `equipment.status` (would wrongly clear MAINTENANCE etc.).
- Warehouse availability (`warehouse/check/route.ts`) = date-overlap of non-RETURNED bookings (`isBookedForRange`) + `status === "AVAILABLE"` gate.
- `getEquipment`/`getEquipmentById` (equipment.ts) compute a derived `inUseToday` flag = active (non-RETURNED) booking covering today. Equipment list (Screen13) + detail (Screen15) show a blue "IN_USE" badge when `status==="AVAILABLE" && inUseToday`, else the stored status.
- Removed the "In Use" option from the equipment list status filter (no longer a stored value).

**Why:** Permanent IN_USE was a global flag with no date scope and no return guarantee. **How to apply:** Never write status=IN_USE on booking actions. Use bookings + dates for availability; `inUseToday` for badges. Related: [[staff-equipment-rental-flow]] (staff-owned gear was a key symptom).

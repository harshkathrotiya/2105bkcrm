# BK Media CRM — Frontend Audit & Refactor Roadmap

> **Date:** 2026-06-03 · **Scope:** entire `src/` frontend (36 screens, design-system, state, flows)
> **Stack:** Next.js 16.2 (App Router) · React 19.2 · Tailwind v4 · Prisma 7 / Postgres · Context+useReducer state
> **Method:** every finding below is grounded in the actual code with `file:line` citations. Nothing here is generic.

---

## 0. Executive summary

This is a **mature, desktop-first internal ERP** for a media-production business. The pipeline is
`Client → Inquiry → Quotation → Approval → Invoice → Payment`, plus Equipment/Kits/Warehouse, Staff
assignment & payments, Calendar, and Reports.

**The good news:** there's already a real design system — a token layer in [globals.css](../src/app/globals.css)
(dark + light themes via CSS custom properties), a `provider-per-domain` state architecture, a typed API
wrapper ([api.ts](../src/lib/api.ts)), permission-gated routing ([middleware.ts](../src/middleware.ts)),
and a recently-consolidated "Inquiry Hub" that removed a standalone approval screen. This is *not* a
greenfield rewrite — it's a polish-and-standardize job.

**The four highest-leverage problem areas (in priority order):**

| # | Area | Severity | Headline evidence |
|---|------|----------|-------------------|
| 1 | **Design-system consistency** | High | ~1,364 inline-`style` instances; [globals.css](../src/app/globals.css) lines **488–700 are duplicated verbatim**; no `Button`/`Input`/`Field`/`Modal`/`Toast`/`Table` primitives; `SearchableSelect` reimplemented inline in [Screen05QuotationForm.tsx:46-166](../src/components/screens/Screen05QuotationForm.tsx) |
| 2 | **Accessibility** | High | **0** `aria-*` attributes in screens; ~1 real `htmlFor` binding; **15 `confirm()` + 29 `alert()`** native dialogs; clickable `<div>`s; color-only status |
| 3 | **UX friction** | Medium | edit-quote detours through PDF then breadcrumb back to hub; dual crew/warehouse entry points; `alert()` validation in the most complex form; no success toasts; no inline field errors |
| 4 | **Responsiveness** | Medium | **0** Tailwind `sm:/md:/lg:` usages; a single `@media(max-width:768px)` block; fixed-px modals (`380px`) overflow phones; no tablet range; no ultra-wide `max-width` |

---

## 1. Phase 1 — UX & UI Audit (per screen)

### Navigation & IA
- **11 top-level routes**, permission-filtered in [AppSidebar.tsx:37-75](../src/components/layout/AppSidebar.tsx): `/clients, /inquiries, /quotations, /invoices, /calendar, /warehouse/check, /equipment, /kits, /vendors, /staff, /settings/users`.
- Sidebar collapses to a 52px icon rail under 768px ([globals.css:758](../src/app/globals.css)) but **icons lose their labels with no tooltip** — unlabelled icon nav is an a11y + discoverability problem.
- Active route detection via `usePathname()` ([AppSidebar.tsx:41-47](../src/components/layout/AppSidebar.tsx)) — fine.

### Dashboard — [Screen00Dashboard.tsx](../src/components/screens/Screen00Dashboard.tsx)
- **Purpose:** KPI cards, alert banner, recent inquiries, today's schedule, quick actions.
- **Problems:** alert banner hard-slices to 5 items ([:88](../src/components/screens/Screen00Dashboard.tsx)) so overdue invoices beyond #5 are invisible; KPI grid uses inline `repeat(auto-fit,minmax(200px,1fr))` duplicated across screens; no manual refresh; sorts via `localeCompare` on date strings (fragile if data not ISO).
- **Good:** uses `Badge`, `LoadingSkeleton`, `SectionHeader`, `ScreenFrame`; combined loading gate across 5 contexts.

### List screens — Client / Inquiry / Equipment / Staff
[Screen01ClientList](../src/components/screens/Screen01ClientList.tsx), [Screen10InquiryList](../src/components/screens/Screen10InquiryList.tsx), [Screen13EquipmentList](../src/components/screens/Screen13EquipmentList.tsx), [Screen20StaffList](../src/components/screens/Screen20StaffList.tsx)
- **Every list re-implements its own toolbar** (search input + status `<select>` + dept tabs + reset). No shared `Toolbar`/`Filters` component. 38 raw `<select class="fsel">` across screens.
- **Revenue / last-activity computed inline on every render** ([Screen01:167-169](../src/components/screens/Screen01ClientList.tsx)) — should be `useMemo`. Expensive at scale.
- **Equipment & Staff lists hand-roll pagination** ([Screen13:449-484](../src/components/screens/Screen13EquipmentList.tsx), [Screen20](../src/components/screens/Screen20StaffList.tsx)) instead of the existing `Pagination` component used by Client/Inquiry — divergent implementations.
- **Potential null-ref bug:** [Screen10:64](../src/components/screens/Screen10InquiryList.tsx) `quote?.quoteNo.toLowerCase()` — optional-chains `quote` but then unconditionally calls `.toLowerCase()`; throws if `quoteNo` is null.
- **CSV export logic duplicated** between Screen13 and Screen20 with drift.
- **Status/category→Badge-variant maps duplicated** in Screen13, Screen05, Screen20.
- **Avatar color palettes (5–8 colors, modulo-hashed) defined separately** in Screen01/02/04/20 — not unique past N, not shared.

### Forms — Add Client / New Inquiry / Quotation
- [Screen02AddClient](../src/components/screens/Screen02AddClient.tsx): validation feedback lives in a **right-side panel**, not inline at the field; invalid inputs don't get an error border; no `onSubmit` on `<form>` (button `onClick`, so Enter won't submit); Indian state list hardcoded inline.
- [Screen04NewInquiry](../src/components/screens/Screen04NewInquiry.tsx): department switch (VIDEO/LED/MERGED) **doesn't clear LED-only fields**; time pickers limited to hourly `<select>` options; hand-coded inline SVGs with no `aria-label`.
- [Screen05QuotationForm](../src/components/screens/Screen05QuotationForm.tsx) (**~43 KB, the heaviest screen**): **re-defines `SearchableSelect` inline ([:46-166](../src/components/screens/Screen05QuotationForm.tsx))** instead of importing the shared one; **row validation via `alert()` ×4 ([:581-595](../src/components/screens/Screen05QuotationForm.tsx))**; editable rate/days cells with no per-cell validation; GST/SGST hardcoded 9%/9%; changing inquiry **regenerates rows and discards prior edits**.

### Login — [Screen31Login.tsx](../src/components/screens/Screen31Login.tsx)
- Default creds shown in plaintext in the UI; redirect param not validated (**open-redirect risk**, [:9,:42](../src/components/screens/Screen31Login.tsx)); success uses `window.location.href` (full reload) instead of `router.push`.

### State coverage across 36 screens
| State | Screens covered | Missing |
|-------|----------------|---------|
| Loading skeleton | 15 | ~21 |
| Empty state | 18 | ~18 |
| Error state (try/catch + UI) | **8** | **~28** |
Only ~6 screens handle **all three**. Error handling is the biggest gap — 78% of screens have no user-facing error path; failures surface as `alert()` or silent no-ops.

---

## 2. Phase 2 — User-flow optimization

### Money flow today: 7 stops
`Screen04NewInquiry → Screen10InquiryList → Screen34InquiryHub → Screen05QuotationForm → Screen06QuotationPDF → (breadcrumb back to Hub) → Screen08Invoice → Screen09PaymentTracking`

**Wins already shipped** (git history): unified Inquiry Hub (6 tabs: Overview/Quotation/Invoice/Crew/Equipment/Staff-Pay), standalone approval screen removed, approval is now inline in the Hub's Quotation tab.

**Remaining friction:**
1. **Edit-quote detour:** saving a quote routes to the PDF view ([Screen05:631,670](../src/components/screens/Screen05QuotationForm.tsx)); to get back to the Hub the user uses a breadcrumb — there's no "Done / back to inquiry" button. → *Add a primary "Back to inquiry" action on the PDF screen; after save, return to the Hub Quotation tab with a toast, not the PDF.*
2. **Dual entry points:** Crew and Warehouse are reachable from **both** the list row ([Screen10:346,352](../src/components/screens/Screen10InquiryList.tsx)) **and** the Hub tabs. Two discovery paths for one action → keep the Hub as the canonical home; demote list-row buttons to a single "Open" affordance.
3. **Post-approval dead-end:** approval auto-switches to the Invoice tab but the user must manually find "Record payment." → *Surface the next action as a primary CTA in the tab.*

### Staff assignment flow — [Screen23AssignPosition](../src/components/screens/Screen23AssignPosition.tsx)
Robust: loads positions from the quotation, checks DB availability, warns on overlap + duplicate before saving, then routes to warehouse check. Keep. The warnings currently use native `confirm()` — migrate to the new `<ConfirmDialog>`.

---

## 3. Phase 3 — Design system (current state + target)

**Tokens already exist** and are good — keep them. [globals.css:22-153](../src/app/globals.css):
- Color: `--bg/--s1/--s2`, semantic `--gr/--am/--bl/--rd/--yl`, accent `--acc`, text ramp `--tx/--tx2/--tx3`.
- Type: IBM Plex Sans / Mono; body 13px / 1.6.
- Radius, shadow, focus-ring (`--focus-shadow`) tokens present.
- Component classes: `.btn(+variants)`, `.badge`, `.met`, `.card`, `.finp/.fsel/.ftxt`, `.tbl`, `.flow`, `.tl-*`, `.pbar`, `.pdf-*`.

**Defects to fix:**
- **Duplication:** [globals.css](../src/app/globals.css) `.tbl/.row-item/.flow/.tl-*/.pbar/.pdf-*/.badge/.two-col` are defined **twice** (≈488–518 then ≈597–723). `.badge` is defined twice with **different** rules (10px pill vs 4px-padding inline-flex) — the second wins; the first is dead. → *De-dupe; single source of truth.*
- **No component wrappers** for the most-used patterns → 1,364 inline styles. Target primitives: `Button, Field (label+input+error), Select, Table, Modal/Dialog, ConfirmDialog, Toast, Toolbar, EmptyState (exists), Tabs, Tooltip`.

**4px spacing grid:** the codebase already clusters on 4/6/8/12/16/20/24/28 — formalize as `--space-*` tokens.

---

## 4. Phase 4 — Dashboard redesign (proposal)

```
┌ Header: greeting · date · global search · refresh ─────────────┐
├ KPI row (responsive 1→2→4): Inquiries · Quotes pending ·       │
│           Unpaid invoices (₹) · This-month revenue (₹)         │
├ Alerts strip (overdue invoices, expiring quotes) — scrollable, │
│           NOT hard-capped at 5; show "+N more"                 │
├ 2-col (stacks <1024px):                                        │
│   ▸ Recent inquiries (pipeline status badges, click→Hub)       │
│   ▸ Today's schedule (calendar events) + quick actions         │
└─────────────────────────────────────────────────────────────────┘
```
Rationale: KPIs answer "what needs money/attention today"; alerts must not silently truncate; quick actions reduce nav depth from the most-visited screen.

---

## 5. Phase 6 — Architecture findings

- **State:** provider-per-domain (9 domains) composed in [store.tsx:45-67](../src/lib/store.tsx), mounted globally via [AppLayout.tsx:14-30](../src/components/layout/AppLayout.tsx) (correctly skipped on `/login`).
  - **Context values are NOT memoized** (e.g. [clients-context.tsx:94-98](../src/lib/clients-context.tsx), [staff-context.tsx:109-116](../src/lib/staff-context.tsx)) → every consumer re-renders on any provider render.
  - **Full refetch on every mutation** ([clients-context.tsx:84-85](../src/lib/clients-context.tsx), [staff-context.tsx:68-70](../src/lib/staff-context.tsx)) → ~18 fetches on init + cascade on each CRUD; no optimistic update.
  - **9 nearly-identical context files** → extract a `createDomainStore()` factory.
  - **Calendar update = delete-then-recreate** ([calendar-context.tsx:81-83](../src/lib/calendar-context.tsx)) → non-atomic.
- **API layer good:** single typed `request<T>()` ([api.ts:20-35](../src/lib/api.ts)), 204 handled, error messages surfaced. But warehouse-check bypasses the context pattern.
- **Constants scattered:** `ROLE_COLORS` ([SiteHeader.tsx:7-11](../src/components/layout/SiteHeader.tsx)), `ICON_MAP` ([AppSidebar.tsx:22-35](../src/components/layout/AppSidebar.tsx)), enums in [validate.ts](../src/lib/validate.ts), avatar palettes in screens → centralize in `lib/constants.ts`.

---

## 6. Phase 7 — Responsive strategy

**Breakpoints (target):** `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.
- Add a `max-width` content container (~1440px) centered on ultra-wide.
- **Tablet (768–1024) currently unhandled** — tables overflow, modals fixed-width.
- Replace fixed-px modals (`width:380px` [Screen32](../src/components/screens/Screen32UsersSettings.tsx), `320px` [Screen33](../src/components/screens/Screen33PermissionsMatrix.tsx)) with `width:min(92vw, 420px)`.
- Wrap data tables in a horizontal-scroll container with a sticky first column on small screens.

---

## 7. Phase 8 — Accessibility report

| Check | Status | Fix |
|-------|--------|-----|
| Form labels (`htmlFor`/`id`) | ~1 real binding | `Field` primitive auto-wires `label htmlFor` ↔ `input id` |
| `aria-*` / `role` | **0 in screens** | combobox roles on `SearchableSelect`, `aria-modal` on dialogs, `aria-current` on nav/pagination |
| Native dialogs | 15 `confirm()` + 29 `alert()` | `ConfirmDialog` + `Toast` |
| Keyboard | `SearchableSelect` has no arrow/Enter/Esc; clickable `<div>`s | add keydown handling; convert to `<button>` |
| Color-only status | badges/checkmarks | add text/icon + `aria-label` |
| Loading | no `role="status"`/`aria-busy` | add to `LoadingSkeleton` |
| Focus | `.btn:focus-visible` exists; custom controls don't | extend ring to all interactive controls; focus-trap modals |

---

## 8. Phase 9 — Priority matrix & roadmap

### Impact / Effort
- **High impact / Low effort (do first):** de-dupe `globals.css`; `Button`/`Field`/`Select` primitives; `Toast` + `ConfirmDialog` to kill `alert/confirm`; add `aria` to `LoadingSkeleton`; memoize context values; fix `Screen10:64` null-ref.
- **High impact / High effort:** migrate all forms to `Field` (a11y labels + inline errors); shared `Toolbar`/`Table`; responsive breakpoints + tablet pass; `createDomainStore()` factory.
- **Low impact / Low effort:** centralize constants; sticky tooltips on collapsed sidebar; dashboard alert "+N more".
- **Low impact / High effort:** optimistic updates; type-gen from Prisma.

### Sprints
- **Sprint 1 — Foundation:** de-dupe CSS · `Button/Field/Select/Modal/ConfirmDialog/Toast/Table` primitives · `ToastProvider` mounted in layout · memoize contexts · constants file.
- **Sprint 2 — Forms & a11y:** migrate Add-Client, New-Inquiry, Quotation, Login, Users/Permissions to `Field`; replace all `alert/confirm`; combobox a11y on `SearchableSelect`.
- **Sprint 3 — Lists & UX:** shared `Toolbar`+`Table`; unify pagination; fix money-flow detour & dual entry points; dashboard polish; error states on the ~28 screens missing them.
- **Sprint 4 — Responsive:** breakpoints, tablet pass, modal `min(92vw,…)`, table scroll containers, ultra-wide container, sidebar tooltips.

---

## 8b. Sprint 1 — implemented in this pass

Done and verified (`tsc` + `eslint` + `next build` all green):
- **De-duped [globals.css](../src/app/globals.css):** removed ~110 lines of verbatim-duplicate rules (`.tbl/.row-item/.flow/.tl-*/.pbar/.pdf-*/.two-col`) and the dead first `.badge`/`.bdg-*` block. Single source of truth now.
- **New primitives in [src/components/ui/](../src/components/ui/):**
  - [`Button.tsx`](../src/components/ui/Button.tsx) — variants + `loading` spinner, wraps existing `.btn` tokens, focus-visible ring.
  - [`Field.tsx`](../src/components/ui/Field.tsx) — `TextField/TextAreaField/SelectField`; **auto-wires `<label htmlFor>` ↔ `id` via `useId()`**, `aria-invalid`/`aria-describedby`/`role="alert"` inline errors. This is the a11y backbone for all forms.
  - [`Toast.tsx`](../src/components/ui/Toast.tsx) — `ToastProvider` + `useToast()`; non-blocking, `aria-live`, auto-dismiss. Replaces `alert()`.
  - [`Modal.tsx`](../src/components/ui/Modal.tsx) — focus-trap, Esc-close, backdrop click, `aria-modal`, responsive `min(92vw, width)`.
  - [`ConfirmDialog.tsx`](../src/components/ui/ConfirmDialog.tsx) — `ConfirmProvider` + promise-based `useConfirm()`; drop-in for `if (await confirm({...}))`. Replaces `confirm()`.
- **Providers mounted** in [layout.tsx](../src/app/layout.tsx) (above `AppLayout`, so login can toast too).
- **`toast-in` keyframe** added to globals.css.
- **Fixed null-ref** at [Screen10InquiryList.tsx:70](../src/components/screens/Screen10InquiryList.tsx) (`quote?.quoteNo?.toLowerCase()`).
- **Reference migration:** [Screen15EquipmentDetail.tsx](../src/components/screens/Screen15EquipmentDetail.tsx) now uses `useToast`/`useConfirm`; deleted its bespoke inline-toast state. Template for migrating the remaining ~14 `confirm()` + ~28 `alert()` sites.

### Sprint 1 — now COMPLETE

All of the above plus:
- **All 67 native dialog calls removed** across 20 screens → `useToast`/`useConfirm`. Verified `grep` shows zero remaining `alert(`/`confirm("`/`prompt(`. Bespoke per-screen success-toast UIs and existing local state left intact where present; compound boolean guards (`if (saving || !confirm(...))`) split correctly; name collisions with local `toast` state handled (`toastApi`/`appToast` aliases).
- **All 9 domain context values memoized** ([clients/inquiries/quotations/invoices/calendar/equipment/kits/vendors/staff]-context.tsx) with precise dependency arrays → consumers no longer re-render on unrelated provider renders.
- **`LoadingSkeleton`** now exposes `role="status"` + `aria-busy` + `aria-live="polite"` + `aria-label={message}`; decorative skeleton bars marked `aria-hidden`.
- **[lib/constants.ts](../src/lib/constants.ts)** created: `ROLE_COLORS`, `AVATAR_PALETTE` (8-pair superset) + `getAvatarStyle(index)`. Wired into `SiteHeader` and `Screen20StaffList`; the two client screens use `AVATAR_PALETTE.slice(0,5)` to preserve their exact prior colors (5-pair, name-length-indexed) — no visual change.

**Verification:** `tsc --noEmit` exit 0 · `next build` exit 0 · `eslint` net-new issues = **0** (baseline 44 in touched dirs == current 44; all remaining warnings are pre-existing in untouched code paths).

### Sprint 2 — COMPLETE

- **`SearchableSelect` is now an accessible combobox** ([SearchableSelect.tsx](../src/components/ui/SearchableSelect.tsx)): `role="combobox"` trigger is keyboard-focusable (`tabIndex`), opens on Enter/Space/↓; the search input drives `role="listbox"`/`option` with `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`; full ↑/↓ arrow navigation with a highlighted active option (scrolled into view), Enter to select, Escape to close + return focus to trigger, Tab closes. Optional `aria-label`/`aria-labelledby` props added. Visual output + `onChange` API unchanged.
- **Removed the duplicate inline `SearchableSelect`** (~121 lines) from [Screen05QuotationForm.tsx](../src/components/screens/Screen05QuotationForm.tsx); it now imports the shared, accessible one. The inline props were a strict subset, so no call-site changes.
- **Login migrated** ([Screen31Login.tsx](../src/components/screens/Screen31Login.tsx)): inputs → `TextField`, submit → `Button` with `loading`, error banner gets `role="alert"`, decorative `⚠` marked `aria-hidden`.
- **Add/Edit Client forms migrated** ([Screen02AddClient](../src/components/screens/Screen02AddClient.tsx), [Screen02EditClient](../src/components/screens/Screen02EditClient.tsx)): all text/select/textarea fields → `TextField`/`SelectField`/`TextAreaField` (real `<label htmlFor>` wiring), **inline per-field errors** gated to show only after the user types something invalid (name/mobile/contact/email/city/district). GST/PAN kept as raw mono inputs but with proper `<label htmlFor>` + `aria-invalid`/`aria-describedby`. Right-side validation checklist retained. All input transforms (digit-strip, uppercase, maxLength) preserved verbatim.

**Verification:** `tsc --noEmit` exit 0 · `next build` exit 0 · `eslint` touched-dirs count **44 == 44 baseline** (zero net-new issues; remaining warnings are pre-existing in untouched logic — Screen05 `setRows`/`nextRows`, Login unused `router`).

### Sprint 3 — COMPLETE (Lists & UX)

- **Pagination unified:** [Screen13EquipmentList](../src/components/screens/Screen13EquipmentList.tsx) (server-side) and [Screen20StaffList](../src/components/screens/Screen20StaffList.tsx) (client-side slice) now use the shared [`Pagination`](../src/components/ui/Pagination.tsx) instead of two hand-rolled copies that rendered *every* page number (broke past ~10 pages). The shared one ellipsizes >7 pages and computes the "X–Y of Z" range. Added `aria-current="page"` + `aria-label` on page buttons; wrapped in `<nav aria-label="Pagination">`.
- **Money-flow detour fixed:** after saving a quotation, [Screen05QuotationForm](../src/components/screens/Screen05QuotationForm.tsx) routes to the **Inquiry Hub** (`/inquiries/{id}`) with a success toast — not the PDF. The Hub's Quotation tab already has a "View / Edit PDF" link ([Screen34InquiryHub.tsx:219](../src/components/screens/Screen34InquiryHub.tsx)), so the "PDF → breadcrumb-back" round-trip is gone (both create and update branches).
- **Load failures now visible:** all 9 domain contexts previously swallowed fetch errors (`catch → set []`). Each `load`/`refresh` catch now also fires `toast.error("Couldn't load <entities>…")` (equipment for both list + asset-summary loaders). No consumer/state changes — `ToastProvider` is an ancestor of `StoreProvider`; domain providers never mount on `/login`.

**Verification:** `tsc --noEmit` exit 0 · `next build` exit 0 · `eslint` touched-dirs **44 == 44 baseline** (zero net-new).

### Sprint 4 — COMPLETE (Responsive & nav a11y)

- **Breakpoint system** added to [globals.css](../src/app/globals.css) (was: a single 768px block):
  - **Ultra-wide ≥1681px** → `.app-content` capped at `max-width:1600px`, centered — no more stretched cards/lines on big monitors.
  - **Tablet/small-desktop ≤1024px** → `.two-col` stacks, `.metrics` → 2-col, padding eased. (This range was previously unhandled.)
  - **Phone ≤768px** → existing icon-rail sidebar + single-column forms (kept).
  - **Small phone ≤520px** → `.metrics` → 1-col so KPI numbers stay legible; tighter padding.
- **Table horizontal-scroll:** new `.tbl-scroll` helper (`overflow-x:auto`, forces child `.tbl` to `min-width:640px`). Applied to the 7 browse-heavy list tables (Client, Inquiry, Quotation, Invoice, Vendor, Kit, Equipment, Staff) so they scroll instead of breaking layout on narrow screens. PDF/print/summary tables intentionally untouched.
- **Sidebar / nav a11y** ([AppSidebar.tsx](../src/components/layout/AppSidebar.tsx)): nav items already had `title` (collapsed-rail tooltip); added `aria-label` (accessible name survives the label being `display:none` when collapsed), `aria-current="page"` on the active item, and `aria-hidden` on the decorative icon.
- Modals: the Sprint-1 `Modal` primitive already clamps to `min(92vw, …)`. The two ad-hoc fixed-px modals in Settings (Screen32/33) remain as a follow-up to migrate onto it.

**Verification:** `tsc --noEmit` exit 0 · `next build` exit 0 · `eslint` touched-dirs **44 == 44 baseline** (zero net-new).

---

## 10b. Cumulative status (Sprints 1–4 done)

| Sprint | Theme | Verified |
|--------|-------|----------|
| 1 | Foundation: 5 primitives (Button/Field/Toast/Modal/ConfirmDialog), killed 67 native dialogs, memoized 9 contexts, CSS de-dup, constants | ✅ |
| 2 | Forms onto `Field` (labels + inline errors), Login, accessible combobox `SearchableSelect`, removed inline dup | ✅ |
| 3 | Pagination unified, money-flow detour fixed, load-failure toasts in all contexts | ✅ |
| 4 | Responsive breakpoints + ultra-wide cap + tablet + table scroll, nav a11y | ✅ |

Every sprint gate: `tsc` 0 · `next build` 0 · `eslint` net-new 0. Nothing committed yet — all in the working tree.

**Remaining (future sprints):** shared `Toolbar`/`Table` primitives to collapse per-list filter duplication; migrate Settings ad-hoc modals onto `Modal`; add per-field `error` wiring to the New-Inquiry & Quotation forms; surface context load-failures as inline retry banners (not just toasts) on first paint; demote the dual crew/warehouse list-row entry points now that the Hub is canonical.

## 9. Deliverable index
1. UX audit — §1  2. UI audit — §1,§3  3. Flow diagrams — §2  4. Design-system spec — §3
5. Dashboard redesign — §4  6. Component inventory — §3 (primitives list)  7. Refactor recs — §5
8. Accessibility report — §7  9. Responsive report — §6  10. Roadmap — §8

# PureCart Subscriptions — Frontend Dev Plan — 03. Subscriptions List Page (Phase 1)

**Depends on:** `01-data-model.md` (types + sample data), `02-shared-components.md` (badges, `StatCard`).
**Goal:** rebuild today's single 699-line `SubscriptionsPage.tsx` into a page that renders the full
`SubscriptionRecord` shape correctly for all 6 delivery types, with the known bugs fixed. The 3
existing inline modals (Change Plan, Apply Discount, Payment History) **stay inline for now** —
extracting them into standalone files and adding the new modals (Cancellation Flow, Early Renewal,
etc.) is Phase 2 (`04-action-modals.md`), so this file doesn't touch their internals beyond updating
the data shape they read.

---

## 0. User Journey — what the admin actually experiences

Read this before § 1. Everything below is the same page described from the other direction: not
"here are the components," but "here's what the admin sees, clicks, and gets back." Every popup
mentioned here is one of exactly two kinds — keep this distinction in mind, it's the single most
important architectural fact about this page:

- **Kind A — the shared `ConfirmDialog`.** One instance, mounted once at the bottom of `SubscriptionsPage`.
  Every "are you sure?" action just changes *what it's showing* by writing a new `{title, body, icon,
  confirmLabel, onConfirm}` object into one piece of state. No new component, ever, for this kind.
- **Kind B — a dedicated modal component.** Has its own internal state (a selected radio option, a
  typed number, a scroll position). Gets its own file. Only built when the interaction needs more than
  "read this, click yes or no."

### Page load

Admin clicks "Subscriptions" in the sidebar. `SubscriptionsPage` reads the 13 rows from
`subscriptionsData` (file 01) into local state and renders 4 pieces top to bottom:

- **KPI strip** — 6 numbers, all *computed on the spot* from the full 13-row set (not stored anywhere):
  "Active" is a count of `status === 'active'`, "MRR" is a sum of `amountRaw` across active rows,
  normalized to monthly. Nothing here is clickable.
- **Filter bar** — search box + 6 chips, all showing "All." No data behind them yet — pure UI state.
- **Table** — all 13 rows. Take Sarah Johnson's row as the concrete example: her `SubscriptionRecord`
  supplies every cell directly — `customer`+`email` → column 3, `product`+`billing.displayLabel` →
  column 4, `deliveryType: 'software'` → a purple "Software" pill in column 5 (via
  `SubscriptionTypeBadge`), her `linkedEntity` → `🔑 WDD-A1B2…·1/1` in column 6, `churnRiskScore: 12`
  → a green `(12)` pill in column 9 (via `ChurnScoreBadge`), `status: 'active'` → a green badge in
  column 10.
- **Bulk bar** — not rendered at all. It only mounts once `selected.length > 0`.

### Filtering — no popup, just a redraw

Admin clicks the "Type" chip → a dropdown opens (its 6 options are a hardcoded list, not derived from
the data) → admin picks "Membership" → `FilterChip` calls `onChange('Membership')` → the page's
`filterType` state updates → the table's `rows` prop becomes the subset where
`row.deliveryType === 'membership'` → the table redraws to show only Tom Baker (SUB-011). The KPI
strip does **not** change — it always reflects all 13 rows, so filtering the table can never make the
"how's the whole book doing" numbers lie.

### Selecting rows — the bulk bar appears

Admin ticks 3 checkboxes → `selected` state grows to 3 IDs → `SubscriptionsBulkBar` mounts (it wasn't
rendered at all before this), floating at the bottom of the screen:
```
┌──────────────────────────────────────────────────────────────────┐
│ 3 selected │ Cancel │ Pause All │ Send Receipts │ Cancel 3 (red) │
└──────────────────────────────────────────────────────────────────┘
```
Clicking "Pause All" is a **Kind A** popup — the shared `ConfirmDialog` swaps to "Pause 3
Subscriptions? … Customers will keep access until their current period ends," and on confirm, every
selected row with `status === 'active'` flips to `paused` in one state update, one toast fires
("3 subscriptions paused"), the selection clears.

### Row action, Kind A — a plain confirm

Admin opens the ⋮ menu on Sarah Johnson's row (built by `rowActions(row)` — a function that already
knows it's Sarah's row, which is why "Cancel Immediately" is grayed out for her since she's `active`,
not `pending_cancel`). Admin clicks **"Early Renewal"**:
```
┌──────────────────────────────────┐
│              (⏩)                 │
│      Process Early Renewal?       │
│  Charge $99/yr to Sarah Johnson's │
│  payment method now? Their        │
│  billing cycle restarts today.    │
│         [Cancel]  [Renew Now]     │
└──────────────────────────────────┘
```
Admin clicks "Renew Now" → the `onConfirm` function stashed in the dialog's state object runs → it
updates Sarah's `nextPayment` in the table's data, fires a success toast, closes the dialog. This
exact same popup (same component instance, different content) is what "Skip Next Cycle," "Retry
Payment," "Extend Trial," "Reinstate," "Mark Split Payments Complete," and the current simple
Pause/Cancel confirmations all use.

### Row action, Kind B — a modal with its own state

Admin opens ⋮ on Sarah Johnson again → clicks **"Change Plan"**. This is a dedicated component
(`ChangePlanModal`) with state of its own:
```
┌────────────────────────────────────┐
│              (🔁)                   │
│           Change Plan                │
│      Sarah Johnson · Plugin Pro      │
│                                       │
│  ○ Monthly   $9/mo    Billed monthly │
│  ● Annual    $99/yr   Save 8%  [Current]│
│  ○ Lifetime  $249     One-time       │
│                                       │
│  ℹ Price difference prorated at      │
│    next billing cycle.               │
│         [Cancel] [Confirm Plan Change]│
└────────────────────────────────────┘
```
The 3 radio options come from a static `PLAN_OPTIONS` list — not from Sarah's record — but which one
shows "[Current]" and whether "Confirm" is enabled come from comparing against *her* record
(`planRow`, captured when the modal opened). Admin clicks the "Lifetime" card → only the **modal's
own** `selectedPlan` state changes — nothing in the table behind it has moved yet. Admin clicks
"Confirm Plan Change" → *now* it writes back: `updateRow(planRow.id, { cycle: 'Lifetime', amount:
'$249', nextPayment: '—' })`, a toast fires, the modal closes, and the table immediately shows
Sarah on the Lifetime plan.

### Row action, Kind B — a modal with a live-computed preview

Admin clicks **"Apply Discount"** on Emily Davis's row (SUB-003, `$49/mo`, `past_due`):
```
┌──────────────────────────────────────┐
│                (🏷)                   │
│          Apply Discount                │
│      Emily Davis · SaaS Starter        │
│                                         │
│  Discount Percentage                   │
│      [   20   ] %                      │
│      (10%)(15%)(20%)(25%)(50%) ← quick pills │
│                                         │
│  Apply For                             │
│   (Once) (3 months) (6 months) (Forever) │
│                                         │
│  Preview                                │
│   Current price        $49.00          │
│   After discount       $39.20  ← recomputed live as % changes │
│   Duration              3 months        │
│         [Cancel]  [Apply Discount]     │
└──────────────────────────────────────┘
```
Every keystroke in the `%` field re-runs the price math (`base × (1 - pct/100)`) and updates the
"After discount" line instantly — this is a Kind B modal specifically *because* it needs that kind of
live, multi-field internal state; a `ConfirmDialog` has no room for it.

### Row action, Kind B — a modal that's read-only

Admin clicks **"View Payment History"** on Emily's row:
```
┌──────────────────────────────────────┐
│  Payment History               [X]    │
│  Emily Davis · SaaS Starter · SUB-003 │
│                                         │
│  2025-01-08   $49.00   PayPal  [Failed]│
│  2024-12-08   $49.00   PayPal  [Paid] Receipt │
│                                         │
│  2 payments on record      [Export]    │
└──────────────────────────────────────┘
```
No confirm/cancel footer — this one's purely informational, sourced from the `paymentHistory[row.id]`
lookup (file 01). The only interactive bit inside it is a per-row "Receipt" link that fires a toast;
closing it changes nothing about Emily's subscription.

### Row action, delivery-type-specific — same menu, different bottom group

Admin opens ⋮ on Tom Baker's row (`deliveryType: 'membership'`) instead of Sarah's. The universal
groups (Navigation/Billing/Plan/Status/Destructive) look identical to Sarah's menu, but below the
`══` divider it shows *Membership's* 3 actions instead of *Software's*:
```
══════════════════════════
 Change Tier
 View Restricted Content
 Extend Grace Period (+7 days)
```
Admin clicks "Extend Grace Period" → **Kind A** popup again (plain confirm) → on confirm, it writes
into Tom's `linkedEntity.graceEndsAt`, not into any top-level `SubscriptionRecord` field — this is
the discriminated-union payoff from file 01 showing up in an actual click: the action only exists,
and only touches this field, because `row.linkedEntity.type === 'membership'` matched.

### The card-expiry indicator — a click target hiding inside a table cell

Emily's "Next Payment" cell shows a small amber card icon next to the date because
`row.cardExpiring === true`. Admin clicks *the icon itself* (not the row, not a menu item) → opens
the same **Kind A** confirm as the bulk bar's "Send Card Update Email" action, just scoped to Emily
alone. This is the one interactive element in this plan that lives inside a table cell rather than
behind the ⋮ menu — worth remembering when you're wiring click handlers, since it needs its own
`onClick` and `stopPropagation` so it doesn't also trigger a row-select.

### What never happens (yet)

At no point in any of the above does a network request fire. Every "result" is a `setState` call
against the in-memory `tableData` array. That's intentional and matches `00-overview.md` § 2 — the
day the backend is ready, `updateRow(...)` calls get replaced by `await fetch(...).then(updateRow)`,
but the popups, the components, and the user-visible flow described above don't change shape at all.

---

## 1. Split the monolith into 5 files

Today everything — state, filtering, KPI math, table markup, bulk bar, 3 modals — lives in one
component. At the new column count (11 vs. today's 8) and action count (6 delivery types' worth of
row actions vs. today's 1 generic set), keeping it monolithic would push the file past 1,200 lines.
Split by responsibility, state owned by the parent:

| File | Owns | Receives as props |
|---|---|---|
| `SubscriptionsPage.tsx` | All state (`tableData`, `selected`, filters, `toast`, `dialog`, the 3 existing modal row states), all handlers, orchestrates the 4 children below + renders the 3 existing modals + `ConfirmDialog` + `Toast` | — (top of the tree) |
| `SubscriptionsKpiStrip.tsx` | Nothing — pure display | `data: SubscriptionRecord[]` (computes its own counts internally from the full/unfiltered set) |
| `SubscriptionsFilterBar.tsx` | Nothing — controlled | `search`, `onSearchChange`, all 6 filter values + setters, `onClearAll`, `onExportCsv` |
| `SubscriptionsTable.tsx` | Nothing — controlled | `rows: SubscriptionRecord[]` (already filtered by the parent), `selected`, `onToggleSelect`, `onToggleSelectAll`, `rowActions: (row) => ActionItem[]` (built by the parent so it can close over `openDialog`/`showToast`/modal-row setters) |
| `SubscriptionsBulkBar.tsx` | Nothing — controlled | `selectedCount`, `onClear`, and one callback per bulk action |

This mirrors the ownership pattern the codebase already uses (`ActionDropdown` takes an `actions`
array built by the parent, not built internally) — nothing new to learn, just applied consistently
across more pieces.

### What the assembled page looks like

This is the full picture the 5 files above render together — every piece labeled with the file
that owns it:

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Active 42 │ Paused 5 │ Past Due 3 │ Pending Cancel 2 │ Cancelled 1 │ MRR $12,480       │ ← SubscriptionsKpiStrip
├──────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search…   [Status▾][Product▾][Cycle▾][Type▾][Payment Type▾][Churn Risk▾]  Export CSV │ ← SubscriptionsFilterBar
├───┬──────┬───────────────┬─────────┬──────┬────────┬────────┬─────────┬───────┬────────┬──────┬─────┬───┤
│ ☑ │ ID   │ Customer      │ Product │ Type │ Linked │ Amount │ Payment │ Churn │ Status │ Next │ LTV │ ⋮ │ ← SubscriptionsTable
├───┼──────┼───────────────┼─────────┼──────┼────────┼────────┼─────────┼───────┼────────┼──────┼─────┼───┤
│ ☐ │SUB-1 │ Sarah Johnson │ Plugin  │ 🔑Sw │ 🔑key… │ $99/yr │Recurring│ (12)  │ Active │ 6/15 │$297 │ ⋮ │
│   │      │ sarah@ex.com  │ Pro     │      │ 1/1    │        │         │       │        │      │     │   │
├───┼──────┼───────────────┼─────────┼──────┼────────┼────────┼─────────┼───────┼────────┼──────┼─────┼───┤
│ ☐ │SUB-3 │ Emily Davis   │ SaaS    │ 🔑Sw │ 🔑key… │ $49/mo │Recurring│ (88)  │⚠Past  │01/08 │$147 │ ⋮ │
│   │      │ emily@ex.com  │ Starter │      │ 1/1    │        │         │ red   │  Due   │ 💳   │     │   │
├───┴──────┴───────────────┴─────────┴──────┴────────┴────────┴─────────┴───────┴────────┴──────┴─────┴───┤
│  Showing 13 of 13 subscriptions · 1 past due                                                             │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────────────────────────────────────────┐
                         │ 3 selected │ Cancel │ Pause All │ Send Receipts │ Cancel 3 │ ← SubscriptionsBulkBar
                         └──────────────────────────────────────────────────────┘         (floats bottom-center,
                                                                                             only when rows selected)
```

---

## 2. Bug fixes (do these first, before adding anything)

Both confirmed by reading the real file (`00-overview.md` § 1):

1. **Duplicate Product column** (`SubscriptionsPage.tsx:746-777`): the "Customer" cell already shows
   `row.product` as subtext under the customer name; the next cell repeats `row.product` alone. Delete
   that second cell entirely — the new column list in § 4 below replaces it with "Type".
2. **Row hover highlight** (`SubscriptionsPage.tsx:708-725`): today's `onMouseEnter`/`onMouseLeave`
   inline handlers recompute background color by re-reading `isSelected`/`isPastDue` from the closure,
   which is correct today but fragile (any new highlight condition has to be added to 3 places: the
   base `style`, `onMouseEnter`, and `onMouseLeave`). Replace with a single `getRowBg(row, idx,
   isSelected)` helper function called from all three places, so a new condition is a one-line change
   in one function, not three.

---

## 3. `StatusBadge` — add 4 missing statuses, fix 1 renamed one

Real current file: `src/app/components/ui/StatusBadge.tsx`. It's a shared component (not
subscription-only) with a hardcoded `Record<string, {...}>` map and an untyped `status: string` prop
— leave the prop untyped (other, non-subscription consumers may exist later) but add these entries:

```ts
const styles: Record<string, { bg: string; text: string; label: string }> = {
	active:    { bg: '#C2E7A0', text: M3.success, label: 'Active' },          // unchanged
	trialing:  { bg: M3.primaryContainer, text: M3.onPrimaryContainer, label: 'Trialing' }, // unchanged
	paused:    { bg: '#C8E6FF', text: M3.info, label: 'Paused' },             // unchanged
	past_due:  { bg: '#FFDEA5', text: '#5C4200', label: 'Past Due' },         // RENAMED from 'past-due'
	pending_reauth: { bg: M3.infoContainer, text: M3.info, label: 'Reauth Needed' },     // NEW
	suspended: { bg: '#FFDEA5', text: '#5C4200', label: 'Suspended' },        // unchanged
	pending_cancel: { bg: '#FFDEA5', text: '#5C4200', label: 'Cancels Soon' }, // NEW
	cancelled: { bg: '#FFDAD6', text: M3.error, label: 'Cancelled' },         // unchanged
	expired:   { bg: M3.surfaceContainerHigh, text: M3.onSurfaceVariant, label: 'Expired' }, // CHANGED — was error-red, shared with license "expired" meaning; subscriptions use neutral gray per RND-FE §6.2 since it's a terminal non-error state, not a failure
	completed: { bg: M3.infoContainer, text: M3.info, label: 'Completed' },   // NEW
	revoked:   { bg: M3.surfaceContainerHigh, text: M3.onSurfaceVariant, label: 'Revoked' }, // unchanged, non-subscription use
	pending:   { bg: M3.surfaceContainer, text: M3.onSurfaceVariant, label: 'Pending' },     // unchanged, fallback-ish
};
```

**What all 10 subscription statuses look like side by side:**
```
(Active)  (Trialing)  (Paused)  (Past Due)  (Reauth Needed)  (Suspended)
 green      purple      blue      amber          blue           amber

(Cancels Soon)  (Cancelled)  (Expired)  (Completed)
    amber           red         gray         blue
```

The `expired` color change is a real behavior change (was `'#FFDAD6'`/error-red, matching how a
license-expired badge should look). If anything else in the repo currently renders `status="expired"`
expecting the red styling, check for it before merging this — none exists in the current audit, but
this component is shared, not subscription-owned.

---

## 4. Table columns (final list, replaces today's 8)

| # | Column | Content | Source |
|---|---|---|---|
| 1 | ☑ | Row checkbox | unchanged |
| 2 | ID | `row.id`, `Roboto Mono` | unchanged |
| 3 | Customer | `row.customer` (name) + `row.email` stacked as subtext — **not** product (that moves to col 4) | changed |
| 4 | Product | `row.product` + `row.billing.displayLabel` as a small pill subtext | replaces the duplicate-bug column |
| 5 | Type | `<SubscriptionTypeBadge type={row.deliveryType} size="small" />` | new, from `02-shared-components.md` § B.1 |
| 6 | Linked | Type-specific summary — see § 4.1 below | new |
| 7 | Amount | `row.amount`, `Roboto Mono` | unchanged |
| 8 | Payment | `Recurring` text, or `<InstallmentProgress completed={row.paymentsCompleted} total={row.maxPayments} />` when `row.paymentType === 'split'` | new, from § B.4 |
| 9 | Churn | `<ChurnScoreBadge score={row.churnRiskScore} />` | new, from § B.2 |
| 10 | Status | `<StatusBadge status={row.status} />` | extended, § 3 above |
| 11 | Next Payment | `row.nextPayment`, red text + `⚠` if `status === 'past_due'`; `"Cancels {cancellationDate}"` if `status === 'pending_cancel'` (ignore `nextPayment` in that case — it's `null` per the data model); small amber `CreditCard` icon before the date if `row.cardExpiring`, `title="Card expires {cardExpiryDate}"`, `onClick` opens the same confirm as the "Send Card Update Email" row action | extended |
| 12 | LTV | `row.customerLtv` formatted as currency, `Roboto Mono`, `M3.onSurfaceVariant` (subdued — informational, not actionable) | new |
| 13 | ⋮ | `ActionDropdown` | unchanged |

That's 13 columns including the checkbox and action column — wide. Table already scrolls
horizontally (`overflow-x-auto` on the wrapper, confirmed in the existing file) so this is acceptable;
don't try to compress columns to avoid scrolling, that's a design non-issue given the existing pattern.

**One row, full detail (a `past_due` row, to show every conditional at once):**
```
┌───┬───────┬────────────────┬──────────┬──────┬─────────┬────────┬──────────┬───────┬─────────┬────────────┬──────┬───┐
│ ☐ │ SUB-3 │ Emily Davis    │ SaaS     │ 🔑   │ 🔑 WDD… │ $49/mo │Recurring │ (88)  │⚠ Past   │ ⚠ 💳       │ $147 │ ⋮ │
│   │       │ emily@ex.com   │ Starter  │Softw.│ ·1/1    │        │          │ red   │  Due     │ 2025-01-08 │      │   │
│   │       │                │ Monthly  │      │         │        │          │       │          │            │      │   │
└───┴───────┴────────────────┴──────────┴──────┴─────────┴────────┴──────────┴───────┴─────────┴────────────┴──────┴───┘
                                                                                          ↑ card-expiry icon, clickable,
                                                                                            title="Card expires 02/2025"
```

### 4.1 "Linked" column content by delivery type

Small local component inside `SubscriptionsTable.tsx` (not a shared file — nothing else in this plan
needs exactly this compact table-cell rendering; the Detail page's type-specific tab in
`05-subscription-detail-page.md` shows the same data at full size, not via this component):

```tsx
function LinkedEntityCell({ entity }: { entity: SubscriptionLinkedEntity }) {
	switch (entity.type) {
		case 'software':
			return <>🔑 {entity.licenseKey.slice(0, 9)}… · {entity.domainCount}</>;
		case 'saas':
			return <>☁ {entity.saasAccountName} · {entity.seatUsage}</>;
		case 'membership':
			return <>🛡 {entity.membershipTier} · {entity.assignedRole}</>;
		case 'download':
			return <>⬇ {entity.downloadsThisCycle}/{entity.downloadLimit ?? '∞'} downloads</>;
		case 'course':
			return <>🎓 {entity.enrolledCourses.length} course{entity.enrolledCourses.length !== 1 ? 's' : ''}</>;
		case 'service':
			return <>💼 Next due {entity.nextDeliverableDue ?? '—'}</>;
	}
}
```

**What each type's "Linked" cell looks like:**
```
Software:    🔑 WDD-A1B2-C3…  · 1/1
SaaS:        ☁ Acme Corp      · 18/25
Membership:  🛡 Gold          · premium_member
Download:    ⬇ 3/10 downloads
Course:      🎓 2 courses
Service:     💼 Next due 2025-02-28
```

(Use actual `lucide-react` icon components — `Key`, `Cloud`, `Shield`, `Download`, `GraduationCap`,
`Briefcase` — sized 12px, not emoji; emoji shown above only to keep this spec block readable. Same
icon set as `SubscriptionTypeBadge`'s `TYPE_CONFIG`, so import that constant rather than redefining
the icon choices in two places.)

The `switch` over `entity.type` is exactly why § 1.1 of the data model file chose a discriminated
union — every `case` branch above accesses fields TypeScript already knows exist, no `entity.licenseKey!`
or `as SoftwareLinkedEntity` needed anywhere.

---

## 5. KPI strip — 4 cards → 6

Replace the hand-rolled inline cards with `StatCard` (`02-shared-components.md` § A.2), computed from
the **full** `tableData`, not the filtered view (a KPI strip that changes when you filter the table
is confusing — it should always answer "how's the whole book doing").

```
┌───────────────┬───────────────┬───────────────┬────────────────────┬───────────────────────┬───────────────┐
│ ▐▐ 42         │ ▐▐ 5          │ ▐▐ 3          │ ▐▐ 2               │ ▐▐ 1                  │ ▐▐ $12,480    │
│ ▐▐ Active     │ ▐▐ Paused     │ ▐▐ Past Due   │ ▐▐ Pending Cancel  │ ▐▐ Cancelled This Mo. │ ▐▐ MRR        │
│  (green bar)  │  (blue bar)   │  (amber bar)  │  (amber bar)       │  (red bar)             │  (purple bar) │
└───────────────┴───────────────┴───────────────┴────────────────────┴───────────────────────┴───────────────┘
```

- First 5: `tableData.filter(r => r.status === '<value>').length` (for "Cancelled This Month",
  additionally filter `cancellationDate`/`startDate` — whichever field marks the cancel event — falls
  within the current calendar month; note the sample data in file 01 doesn't currently carry a
  distinct "cancelled_at" timestamp separate from `cancellationDate`'s pending-cancel meaning — add
  one if this filter needs to distinguish "cancelled this month" from "scheduled to cancel this
  month"; flagging this as a data-model gap discovered while building the KPI, not something to
  silently paper over)
- MRR: sum `amountRaw` for every `active` row, normalizing non-monthly cycles to a monthly-equivalent
  (`year` → `/12`, `week` → `×4.33`, `day` → `×30.44`) using `billing.interval`/`billing.period` —
  same normalization the backend's MRR formula uses (`subscription-final-feature-rnd.md` § 8), so the
  frontend's static-data MRR and the backend's real MRR will agree once wired

---

## 6. Filter bar — 3 chips → 6

Existing: Status, Product, Cycle (all working, `FilterChip` component unchanged — it just takes
`string[]` options and calls `onChange(v: string)`, no changes needed there).

```
🔍 Search subscriptions…    [Status ▾]  [Product ▾]  [Cycle ▾]  [Type ▾]  [Payment Type ▾]  [Churn Risk ▾]     Export CSV ⬇
                                  ↑ existing            ↑ existing  ↑ existing  └──────────── new (3 chips) ──────────────┘

An active chip looks like (using "Type" as the example, filtered to Software):
[ Software × ]   ← purple fill (M3.primaryContainer), × clears back to "All"
```

Add 3 new `FilterChip`s:

```tsx
<FilterChip label="Type" value={filterType} onChange={setFilterType}
	options={['Software', 'SaaS', 'Membership', 'Download', 'Course', 'Service']} />

<FilterChip label="Payment Type" value={filterPaymentType} onChange={setFilterPaymentType}
	options={['Recurring', 'Split']} />

<FilterChip label="Churn Risk" value={filterChurnRisk} onChange={setFilterChurnRisk}
	options={['Low', 'Medium', 'High', 'Critical']} />
```

Filtering logic additions inside the existing `filtered = tableData.filter(...)` predicate:

```ts
const matchType = filterType === 'All' ||
	row.deliveryType.toLowerCase() === filterType.toLowerCase();
const matchPaymentType = filterPaymentType === 'All' ||
	row.paymentType === filterPaymentType.toLowerCase();
const matchChurnRisk = filterChurnRisk === 'All' || (
	filterChurnRisk === 'Low'      ? row.churnRiskScore <= 25 :
	filterChurnRisk === 'Medium'   ? row.churnRiskScore > 25 && row.churnRiskScore <= 50 :
	filterChurnRisk === 'High'     ? row.churnRiskScore > 50 && row.churnRiskScore <= 75 :
	/* Critical */                   row.churnRiskScore > 75
);
```

Same band boundaries as `ChurnScoreBadge` — import the zone-classification helper from there (§ B.2's
`zone` expression) rather than re-deriving the boundaries here, so a future band change is a one-file
edit.

The existing "Clear all" button (shown when any filter is non-`'All'`) needs its condition extended
to check all 6 filters, and its handler to reset all 6 — mechanical change, same pattern already
there.

---

## 7. Row actions — universal groups (updated) + 6 delivery-type-specific groups (new)

### 7.1 Universal groups — carry over from today, with status-value fixes

Every `row.status === 'past-due'` check in the existing file becomes `row.status === 'past_due'`
(§ 1.2 of the data model file). Same for every other status string literal in the action-visibility
conditions. No behavioral change beyond the rename — Retry Payment, Update Payment Method, Change
Plan, Apply Discount, Extend Trial, Pause, Resume, Cancel, Refund Last Payment, Delete Record all
keep their exact current logic.

**What the ⋮ menu looks like for an active, recurring, software subscription** (universal groups
only — § 7.2 below adds a 6th group beneath "Destructive" for the matching delivery type):
```
┌────────────────────────────────────┐
│  View Customer                     │
│  View Payment History              │
│  Send Payment Receipt              │
│ ──────────────────────────────     │
│  Update Payment Method             │
│ ──────────────────────────────     │
│  Change Plan                       │
│  Apply Discount                    │
│  Early Renewal                     │   ← new
│  Skip Next Cycle                   │   ← new
│ ──────────────────────────────     │
│  Pause Subscription                │
│ ──────────────────────────────     │
│  Cancel Subscription        (red)  │
│  Refund Last Payment        (red)  │
│  Delete Record              (red)  │
│ ══════════════════════════════     │
│  View License                      │   ← § 7.2, software-only
│  Revoke License              (red) │
│  Reset Activations                 │
└────────────────────────────────────┘
```

**New universal actions, added to existing groups:**

*Billing group:*
```ts
{ label: 'Early Renewal', icon: FastForward,
  disabled: row.cycle === 'Lifetime' || row.status !== 'active',
  onClick: () => openDialog({
    open: true, danger: false, icon: FastForward,
    title: 'Process Early Renewal?',
    body: <span>Charge <strong>{row.amount}</strong> to {row.customer}'s payment method now?
          Their billing cycle restarts from today.</span>,
    confirmLabel: 'Renew Now',
    onConfirm: () => { /* advance nextPayment by one billing interval, showToast, closeDialog */ },
  }) }

{ label: 'Skip Next Cycle', icon: SkipForward,
  disabled: row.paymentType !== 'recurring' || row.status !== 'active',
  onClick: () => openDialog({
    open: true, danger: false, icon: SkipForward,
    title: 'Skip Next Renewal?',
    body: <span>Skip {row.customer}'s payment on <strong>{row.nextPayment}</strong>?
          Access continues; the next charge moves one cycle out.</span>,
    confirmLabel: 'Skip Cycle',
    onConfirm: () => { /* advance nextPayment by one interval, increment skipCount, showToast, closeDialog */ },
  }) }
```

Both reuse the existing `ConfirmDialog` exactly like today's "Retry Payment" action does — **no new
modal component needed for these two**, despite `RND-subscriptions-frontend.md` §§ 8.3–8.4 describing
them as separate named modals. Their entire spec is "icon + title + body + one confirm button", which
is precisely what `ConfirmDialog` already renders:
```
┌──────────────────────────────────┐
│              (⏩)                 │   ← icon in colored circle
│      Process Early Renewal?       │
│                                    │
│  Charge $49/mo to Emily Davis's   │
│  payment method now? Their        │
│  billing cycle restarts today.    │
│                                    │
│         [Cancel]  [Renew Now]     │
└──────────────────────────────────┘
```
Building a dedicated component for content `ConfirmDialog` already handles would be duplicating, not
extracting — skip it.

*Status group — pending_cancel handling:*
```ts
{ label: 'Cancel Immediately', icon: XCircle, danger: true,
  disabled: row.status !== 'pending_cancel',
  onClick: () => openDialog({ /* same shape as today's Cancel action, forces immediate */ }) }

{ label: 'Reinstate (undo pending cancel)', icon: CheckCircle,
  disabled: row.status !== 'pending_cancel',
  onClick: () => openDialog({
    open: true, danger: false, icon: CheckCircle,
    title: 'Reinstate Subscription?',
    body: <span>Cancel the scheduled cancellation for {row.customer}? Billing resumes normally.</span>,
    confirmLabel: 'Reinstate',
    onConfirm: () => { updateRow(row.id, { status: 'active', cancellationDate: null }); showToast(...); closeDialog(); },
  }) }
```

*Plan group — pending switch visibility:*
```ts
...(row.pendingSwitchProduct ? [{
  label: `Cancel Scheduled ${row.pendingSwitchType} → ${row.pendingSwitchProduct}`,
  icon: XCircle,
  onClick: () => openDialog({ /* clears pendingSwitchProduct/pendingSwitchType, showToast, closeDialog */ }),
}] : [])
```

*Destructive group — split payment:*
```ts
{ label: 'Mark Split Payments Complete', icon: CheckSquare,
  disabled: row.paymentType !== 'split',
  onClick: () => openDialog({
    open: true, danger: false, icon: CheckSquare,
    title: 'Mark Installments Complete?',
    body: <span>Force {row.customer}'s split payment plan to <strong>completed</strong>
          even though {row.paymentsCompleted}/{row.maxPayments} installments are recorded?</span>,
    confirmLabel: 'Mark Complete',
    onConfirm: () => { updateRow(row.id, { status: 'completed', paymentsCompleted: row.maxPayments ?? row.paymentsCompleted }); showToast(...); closeDialog(); },
  }) }
```

**Deferred to Phase 2** (these two get upgraded from a plain `ConfirmDialog` to a purpose-built modal
because they need more than "confirm yes/no"): **Cancel Subscription** → `CancellationFlowModal`
(3-step reason/offer/timing flow), **Pause Subscription** → `PauseDurationModal` (duration picker).
Keep them wired to today's simple `ConfirmDialog` in this phase — swapping the `onClick` target to the
new modals is a one-line change per action in `04-action-modals.md`, not a re-plan of the row actions
list.

**Also deferred to Phase 2:** SCA Reauth ("Request Reauthorization") and "Send Card Update Email" as
dedicated row actions — both are simple enough to be `ConfirmDialog` content like Early
Renewal/Skip Cycle above, but are grouped into Phase 2 because they're most naturally added at the
same time as the `pending_reauth` status becomes reachable (Phase 2 is also where a sample row gets
that status, per the open question at the end of file 01).

### 7.2 Delivery-type-specific action groups

Appended after the universal groups, only the block matching `row.deliveryType` renders (shown as the
`══` divider + 3-item group at the bottom of the § 7.1 menu wireframe above). All of these that
reference a page/module that doesn't exist in this repo (License detail, SaaS account detail, LMS
progress) are **toast stubs**, matching the existing "View Customer" pattern — not disabled, not
broken links, just an honest placeholder until those modules exist.

**Software:**
```ts
{ label: 'View License', icon: Key, onClick: () => showToast(`License ${entity.licenseKey} — detail view coming with the Licensing module`, 'info') }
{ label: 'Revoke License', icon: XCircle, danger: true, onClick: () => openDialog({ /* confirm, then updateRow status if it should also affect subscription state — confirm with product owner whether revoking license cancels the subscription or is independent */ }) }
{ label: 'Reset Activations', icon: RotateCcw, onClick: () => openDialog({ /* confirm, resets domainsUsed to 0 in linkedEntity */ }) }
```

**SaaS:**
```ts
{ label: 'View Account', icon: Cloud, onClick: () => showToast(`Account ${entity.saasAccountName} — detail view coming with the SaaS module`, 'info') }
{ label: 'Adjust Seat Count', icon: Users, onClick: () => showToast('Seat adjustment — needs a small number-input modal, see note below', 'info') }
{ label: 'Suspend Account', icon: PauseCircle, onClick: () => openDialog({ /* confirm */ }) }
```

**Membership:**
```ts
{ label: 'Change Tier', icon: ArrowUpRight, onClick: () => showToast('Tier picker — reuse the Change Plan modal pattern once membership tiers are product-configurable', 'info') }
{ label: 'View Restricted Content', icon: Lock, onClick: () => showToast('Content restriction detail — no dedicated page in this repo yet', 'info') }
{ label: 'Extend Grace Period (+7 days)', icon: Calendar, onClick: () => openDialog({ /* confirm, updates linkedEntity.graceEndsAt */ }) }
```

**Download:**
```ts
{ label: 'Reset Download Count', icon: RotateCcw, onClick: () => openDialog({ /* confirm, resets linkedEntity.downloadsThisCycle to 0 */ }) }
{ label: 'Send New Content Email', icon: Mail, onClick: () => showToast(`Content notification sent to ${row.customer}`, 'success') }
{ label: 'Manage Drip Schedule', icon: Clock, onClick: () => showToast('Drip schedule editor — deferred, no spec exists yet for this UI', 'info') }
```

**Course:**
```ts
{ label: 'View Course Progress', icon: BarChart2, onClick: () => showToast('Progress chart — deferred, needs LMS API integration to have real data', 'info') }
{ label: 'Extend Course Access (+30 days)', icon: Calendar, onClick: () => openDialog({ /* confirm, updates linkedEntity.courseAccessUntil */ }) }
{ label: 'Resend Enrollment Email', icon: Mail, onClick: () => showToast(`Enrollment email resent to ${row.customer}`, 'success') }
```

**Service:**
```ts
{ label: 'Mark Deliverable Complete', icon: CheckCircle, onClick: () => openDialog({ /* confirm, updates linkedEntity.lastDeliverableAt to today, advances nextDeliverableDue by one billing interval */ }) }
{ label: 'Send Invoice', icon: FileText, onClick: () => showToast(`Invoice sent to ${row.customer}`, 'success') }
{ label: 'Add Deliverable Note', icon: Edit, onClick: () => showToast('Note editor — deferred, needs a small textarea modal; low priority until the Service delivery type has real customers', 'info') }
```

**Explicitly deferred (toast-only, no dedicated UI built in this plan):** Adjust Seat Count, Manage
Drip Schedule, View Course Progress, Add Deliverable Note. Each needs either a small custom modal with
no equivalent elsewhere in this plan, or a real data source (LMS API) that doesn't exist yet — building
speculative UI for them now would be guessing. Revisit each if/when its delivery type gets real usage.

---

## 8. Bulk action bar — 2 new actions

Add to the existing bar (currently: Cancel selection, Pause All, Send Receipts, Cancel N):

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 3 selected │ Cancel │ Pause All │ Send Receipts │ Send Card Update Email (1) │ Apply     │
│            │        │           │               │                             │ Discount  │
│            │        │           │               │                             │ to All    │
│                                                                        Cancel 3 (red)      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                    └──────────── new (2 actions) ───────────┘
```

```ts
// Only enabled when the selection includes at least one past-due row with cardExpiring
{ label: `Send Card Update Email (${eligibleCount})`, icon: CreditCard,
  disabled: eligibleCount === 0,
  onClick: () => { /* confirm, showToast, no state change needed (card update happens on customer's end) */ } }

// Opens the existing Apply Discount modal pre-filled, applied to every selected row on confirm
{ label: 'Apply Discount to All', icon: Tag,
  onClick: () => { /* opens ApplyDiscountModal in a 'bulk' mode — needs a small prop addition, see 04-action-modals.md */ } }
```

`eligibleCount = selected.filter(id => { const r = tableData.find(x => x.id === id); return r?.status === 'past_due' && r?.cardExpiring; }).length`

---

## 9. Manual test checklist

- [ ] Duplicate Product column is gone; Type column shows the correct badge for all 6 sample rows from file 01
- [ ] Linked column renders correct content for all 6 delivery types with no TS narrowing errors
- [ ] All 10 status values render correctly via the updated `StatusBadge` (add the two missing sample rows flagged at the end of file 01 before checking `pending_reauth`/`expired` specifically)
- [ ] KPI strip counts match a manual count of the sample data; MRR figure matches a hand-calculated normalization for the sample set
- [ ] All 6 filter chips work individually and in combination; "Clear all" resets all 6
- [ ] Churn Risk filter boundaries match `ChurnScoreBadge` exactly at 25/26/50/51/75/76
- [ ] Row actions render the correct delivery-type-specific group for each of the 6 types, with no crash on `linkedEntity` field access
- [ ] Bulk bar's "Send Card Update Email" count matches a manual count of past-due + card-expiring rows in the current selection
- [ ] No regression: existing Change Plan / Apply Discount / Payment History modals still open and function against the new data shape (their internals didn't change, only the data flowing into them did — confirm `PLAN_OPTIONS`/`paymentHistory` lookups still resolve by `row.id`)

---

Two things worth your call before Phase 2:
1. § 7.1 flags a **data-model gap**: there's no separate "cancelled at" timestamp distinct from
   `cancellationDate`'s pending-cancel meaning, which the "Cancelled This Month" KPI needs. Add a
   `cancelledAt: string | null` field to `SubscriptionRecord` now (small edit to file 01), or compute
   the KPI a cruder way (e.g. just count current `status === 'cancelled'` regardless of when)?
2. § 7.2 lists 4 row actions as toast-only stubs with no built UI (Adjust Seat Count, Manage Drip
   Schedule, View Course Progress, Add Deliverable Note). Agree with deferring these, or is one of
   them actually a priority you want a real modal for now?

Next file: `04-action-modals.md` (Phase 2 — `CancellationFlowModal`, `PauseDurationModal`, the SCA/Early-Renewal/Skip-Cycle dialog content, and extracting the 3 existing inline modals into their own files).

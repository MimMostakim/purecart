# PureCart Subscriptions — Frontend Dev Plan — 06. Subscription Analytics Page (Phase 4)

**Depends on:** `01-data-model.md` (chart datasets), `02-shared-components.md` (`RevenueGoalCard`,
`ChurnScoreBadge`), `04-action-modals.md` (`subscriptionDialogs.ts` builders reused for churn-table
row actions).
**Goal:** build `SubscriptionAnalyticsPage` from scratch — it doesn't exist in this repo yet, despite
`App.tsx` already trying to import it (`00-overview.md` § 1's "currently broken" finding). This phase
fixes that broken build.

**Note on scope vs. `RND-subscriptions-frontend.md` § 10:** that doc describes this page as an
*extension* of an already-existing analytics page (4 KPIs, a few charts already there). None of that
exists here — this file specs the whole page as new, folding that doc's "current" and "new" KPIs/charts
into one page description rather than a diff.

---

## 0. User Journey

Admin clicks "Subscription Analytics" in the sidebar (nav entry added in Phase 6, file 08). The page
loads showing 8 KPI cards across the top, a date-range toggle, 5 charts below, and an extended churn
risk table at the bottom.

Admin clicks the **3m** date-range toggle (was on **6m**) → the MRR/ARR trend chart re-slices
`subMrrArrData` to just the last 3 months; nothing else on the page changes — the toggle only affects
that one chart, not the KPI cards above it (those are always "right now" snapshots, not
range-dependent).

Admin scrolls to the **Churn Risk table** and sees Emily Davis's row (churn score 88, card expiring).
Admin clicks **"Retry Payment"** in that row's action group → opens the same `ConfirmDialog` builder
(`buildEarlyRenewalDialog`-style pattern from `subscriptionDialogs.ts`, file 04 § 8) the list page's
row actions use — same popup, same effect, just triggered from a different table. Admin confirms →
Emily's row updates and a toast fires, exactly like it would from the list page.

Admin clicks **"Apply Discount"** on a different at-risk row → the same `ApplyDiscountModal` from
file 04 opens (this table passes a single `row`, not `bulkRows` — bulk mode is list-page-only). This
is the theme of this whole page: **almost nothing here is a new interactive component** — it's
mostly new *charts* (which are read-only) plus one table whose row actions all reuse Phase 2's work.

---

## 1. New data needed (amendments to file 01)

Two datasets this page needs weren't defined in file 01 — add them alongside the existing analytics
datasets:

```ts
// Dunning funnel — recovered-count per retry attempt (Analytics BarChart)
export const dunningFunnelData = [
	{ attempt: '1st retry', recovered: 14 },
	{ attempt: '2nd retry', recovered: 6 },
	{ attempt: '3rd retry', recovered: 2 },
];

// Churn by cancellation reason — segment counts (Analytics PieChart)
// Reason IDs match CANCELLATION_REASONS so a click can map back to a real reason
export const churnByReasonData = [
	{ reasonId: 'too_expensive', label: 'Too expensive', count: 14 },
	{ reasonId: 'not_using', label: 'Not using it enough', count: 8 },
	{ reasonId: 'missing_features', label: 'Missing features', count: 5 },
	{ reasonId: 'switching', label: 'Switching products', count: 3 },
	{ reasonId: 'other', label: 'Other', count: 2 },
];
```

Also extend `subMrrArrData` (file 01 § 2.3) from 6 months to 12, so the "12m" range toggle (§ 3)
isn't silently showing the same data as "6m." Same shape, 6 more entries continuing the trend.
**Gap that's fine to leave as-is:** there's no daily-granularity dataset, so a literal "30d" range
has nothing meaningful to slice — § 3 handles this by treating "30d" as "the most recent month" (a
single point), not a real 30-day trend. Flagging so it's a documented simplification, not a silent
inaccuracy.

---

## 2. Files this phase creates

| File | Contents |
|---|---|
| `Analytics/SubscriptionAnalyticsPage.tsx` | Page shell: date toggle, KPI grid, 5 charts, mounts the two components below |
| `Analytics/ChurnRiskTable.tsx` | Extended churn risk table + row actions |
| `Analytics/RevenueGoalsWidget.tsx` | Read-only grid of `RevenueGoalCard`s |
| `Analytics/index.ts` | Barrel export |

Placement under `Analytics/`, not `Subscriptions/`, matches the sibling-module convention
`subscription-final-dev-plan.md` § 7 already established (`AbandonedCartAnalyticsPage.tsx` sits next
to `AbandonedCart/AbandonedCartPage.tsx` — analytics pages live in their own top-level folder).

---

## 3. KPI grid — 8 cards

```
┌───────────┬───────────┬───────────┬───────────┐
│ Active    │ New This  │ Churn     │ Sub MRR   │
│ Subs      │ Month     │ Rate      │           │
│  86       │  7        │  3.3%     │ $2,310    │
├───────────┼───────────┼───────────┼───────────┤
│ ARR       │ Net Rev.  │ Avg LTV   │ At-Risk   │
│           │ Retention │           │ Subs      │
│  $27,720  │  104%     │  $312     │  14       │
└───────────┴───────────┴───────────┴───────────┘
```
Uses `KpiCard` (existing component, has icon+trend — appropriate here, unlike the list page's denser
6-card strip which used the lighter `StatCard`). Formulas, all computed from the full
`subscriptionsData` set except where noted:

| KPI | Formula |
|---|---|
| Active Subs | count where `status === 'active'` |
| New This Month | count where `startDate` falls in the current calendar month |
| Churn Rate | `(cancelled this month / active at month start) × 100` — feature doc § 8's formula; approximate "active at month start" as `active + cancelled-this-month` count for static data purposes |
| Sub MRR | **same** normalization helper as the list page's KPI strip (`03-subscriptions-list-page.md` § 5) — extract it into one shared `computeMRR(rows)` function both pages import, don't reimplement |
| ARR | `MRR × 12` |
| Net Revenue Retention | read directly from `subMrrArrData`'s last entry's `nrr` field — not derived from `subscriptionsData`, this one's a pre-aggregated dataset value |
| Avg LTV | average of `customerLtv` across all rows |
| At-Risk Subs | count where `churnRiskScore > 50` (High + Critical bands) |

---

## 4. Date range toggle

```
[ 30d ] [ 3m ] [ 6m ] ( 12m ● )     ← segmented control, one active at a time
```
Only affects the MRR/ARR trend chart (§ 5.1). `3m`/`6m`/`12m` slice `subMrrArrData`'s last N entries;
`30d` shows just the single most recent entry (see § 1's noted limitation).

---

## 5. Charts (5 total)

### 5.1 MRR/ARR/NRR trend — LineChart
```
$ ┤                                        ╭──●  MRR
  │                              ╭────●────╯      ARR (secondary line, larger scale)
  │                    ╭────●────╯                NRR % (dashed, right-hand axis)
  └────┬────┬────┬────┬────┬────┬──────────────
      Jan  Feb  Mar  Apr  May  Jun …
```
`Recharts` `<LineChart>` with 2 solid lines (MRR primary color, ARR secondary color) + 1 dashed line
for NRR on a right-hand secondary Y-axis (`yAxisId="right"`). Dataset: `subMrrArrData`, sliced per
§ 4's toggle.

### 5.2 Subscription mix by type — PieChart
```
        ╭─────╮
      ╱ Software ╲     58% Software · 12% SaaS · 17% Membership
     │  58%  ╲17%│     8% Download · 4% Course · 1% Service
      ╲  12%╱ 8%4%1%
        ╰─────╯
```
Dataset: `subTypeMix` (file 01). Clicking a segment: intended to filter the list page to that type,
but that needs a cross-page filter-passing mechanism this plan doesn't otherwise build (see § 8's
open question) — **deferred to a toast** ("Filtering by {type} — full cross-page linking not built
yet") rather than half-wiring it.

### 5.3 Revenue by type — horizontal BarChart
```
Software    ████████████████████████  $24,800
SaaS        ███████████               $11,200
Membership  ██████                    $6,400
Download    ███                       $2,800
Course      ██                        $1,900
Service     █                         $1,100
```
Dataset: `subRevenueByType` (file 01).

### 5.4 Dunning funnel — BarChart
```
1st retry  ██████████████  14 recovered
2nd retry  ██████           6 recovered
3rd retry  ██               2 recovered
```
Dataset: `dunningFunnelData` (§ 1, new). Color gradient primary → warning → error across the 3 bars
(first attempt = most likely to recover = least alarming color).

### 5.5 Churn by reason — PieChart
```
Too expensive 14 · Not using 8 · Missing features 5 · Switching 3 · Other 2
```
Dataset: `churnByReasonData` (§ 1, new). Same deferred-click behavior as § 5.2 — clicking a segment
would ideally filter the Churn Risk table (§ 6) below to that reason, but the sample data doesn't
carry a reason-per-row linkage for every row (only `SUB-009` has `cancellationReasonId` set, per file
05 § 2). Toast stub for now: `"Filtering churn table by '{label}' — needs per-row reason data this plan hasn't built for every row."`

---

## 6. `ChurnRiskTable`

```ts
// Analytics/ChurnRiskTable.tsx
interface ChurnRiskTableProps {
	entries: ChurnRiskEntry[];   // churnRiskData from file 01
	onSendReminder: (subscriptionId: string) => void;
	onApplyDiscount: (subscriptionId: string) => void;
	onRetryPayment: (subscriptionId: string) => void;
}
```

**What it looks like:**
```
┌───────────────┬──────────────┬────────┬───────────┬──────────────┬───────┬──────┬──────┬────────────────────┐
│ Customer      │ Product      │ Plan   │ Status    │ Days         │ Churn │ Card │ LTV  │ Actions            │
├───────────────┼──────────────┼────────┼───────────┼──────────────┼───────┼──────┼──────┼────────────────────┤
│ Emily Davis   │ SaaS Starter │Monthly │⚠Past Due │ 8 overdue    │ (88)  │ 💳   │ $147 │ Send Reminder      │
│               │              │        │           │              │ red   │      │      │ Apply Discount     │
│               │              │        │           │              │       │      │      │ Retry Payment      │
├───────────────┼──────────────┼────────┼───────────┼──────────────┼───────┼──────┼──────┼────────────────────┤
│ James Wilson  │ Plugin Pro   │Annual  │Suspended  │ 21 overdue   │ (95)  │ 💳   │ $99  │ Send Reminder      │
├───────────────┼──────────────┼────────┼───────────┼──────────────┼───────┼──────┼──────┼────────────────────┤
│ Ava Garcia    │ SaaS Pro     │Annual  │Cancels Soon│ 18 left     │ (72)  │      │ $199 │ Send Reminder      │
└───────────────┴──────────────┴────────┴───────────┴──────────────┴───────┴──────┴──────┴────────────────────┘
```
Data source: `churnRiskData` (file 01). "Churn" column uses `ChurnScoreBadge`; "Card" column shows a
`CreditCard` icon only when `entry.cardExpiring`. **Actions column is contextual** — "Retry Payment"
only shown for `past_due`/`suspended` rows, "Apply Discount" for any row, "Send Reminder" always.
Each action opens the exact same modal/dialog the list page's row actions use (`ApplyDiscountModal`
from file 04, `buildEarlyRenewalDialog`-pattern builders from `subscriptionDialogs.ts`) — this table
holds no modal logic of its own, it just calls the callbacks its parent page supplies.

---

## 7. `RevenueGoalsWidget`

```ts
// Analytics/RevenueGoalsWidget.tsx
interface RevenueGoalsWidgetProps {
	goals: RevenueGoal[];   // revenueGoalsData from file 01
}
```

**What it looks like:**
```
Revenue Goals
┌────────────────────────────┐  ┌────────────────────────────┐
│ MRR Target Q3   [On Track] │  │ ARR Target 2026 [On Track] │
│ ████████████░░░  77%       │  │ █████████████░░  92%       │
│ $2,310 of $3,000           │  │ $27,720 of $30,000          │
└────────────────────────────┘  └────────────────────────────┘
```
**Decision:** this widget is **read-only** — no "Add Goal" button, no delete affordance (renders
`RevenueGoalCard` without `onDelete`, per file 02 § B.10's distinction). `RND-subscriptions-frontend.md`
§ 10.2 placed goal *management* here; this plan moves that to Settings' Revenue Goals section
(`07-settings-page.md`) instead, so there's exactly one place goals get created/edited/deleted rather
than two UIs that both mutate the same list.

---

## 8. Manual test checklist

- [ ] `App.tsx`'s previously-broken import now resolves — the app actually builds
- [ ] All 8 KPI cards show plausible numbers computed from the file 01 sample data (hand-verify at least 2)
- [ ] `computeMRR` is genuinely shared code, not two copies — grep for a second implementation before merging
- [ ] Date range toggle changes only the MRR/ARR chart, nothing else on the page
- [ ] All 5 charts render without runtime errors against the (small) sample datasets
- [ ] Churn Risk table's action buttons open the correct real modal/dialog and produce the correct toast, matching what the same action does from the list page
- [ ] Revenue Goals widget has no add/delete controls anywhere on this page

---

One open question: §§ 5.2 and 5.5 both defer "click a chart segment to filter elsewhere" to a toast,
because doing it for real means threading a filter-intent value through `App.tsx` to the list page
(similar to how `subscriptionId` gets threaded to the Detail page in file 05 § 1). Want that built
for real in this phase, or is the toast-stub fine for now, matching how file 03 handled similarly
deferred cross-component actions?

Next file: `07-settings-page.md` (Phase 5 — the `SettingsPage` container, which doesn't exist yet
either, plus its `Subscriptions` tab's 14 sections).

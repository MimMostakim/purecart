# PureCart Subscriptions — Frontend Dev Plan — 08. Navigation, Polish & Testing (Phase 6)

**Depends on:** everything — this is the phase that wires files 03–07's pages into an app that
actually runs. Read `01-data-model.md` § 2.1 first (it already reserved the `Page` union values this
file switches on).

**Goal:** rewrite `App.tsx` so all 4 pages are reachable, fix the sidebar/top bar for the new pages,
sweep every deferred empty-state, and give you one master checklist covering the whole plan.

---

## 0. User Journey

Admin opens the plugin. The sidebar now shows 3 items (was 1): **Subscriptions**, **Subscription
Analytics**, **Settings**. Clicking each swaps the main content area; the top bar's breadcrumb and
title update to match. Clicking a subscription's ID from the list drills into the Detail page — not
in the sidebar at all, since it's not a top-level destination, only reachable by drilling in — and
the top bar breadcrumb grows a level: `PureCart – Digital Downloads › Subscriptions › SUB-003`.
Clicking "← Subscriptions" in the Detail page's own header, or the breadcrumb's "Subscriptions" link
in the top bar (both do the same thing), returns to the list — and because of the state-lifting done
in `05-subscription-detail-page.md` § 1, any edit made while drilled in (a pause, a plan change) is
already reflected in the list the moment the admin lands back on it.

---

## 1. Real gaps this phase closes (confirmed against the actual source)

Reading `Sidebar.tsx` and `TopBar.tsx` directly (not assuming from prior docs) surfaced the exact
edits needed:

| File | What's there today | What needs to change |
|---|---|---|
| `Sidebar.tsx` | Reads `NAV_SCHEMA` directly from `static-data.tsx` (not passed as a prop) and renders every entry unconditionally | No code change needed here at all — just add entries to `NAV_SCHEMA` (§ 2) and this component picks them up automatically |
| `TopBar.tsx` | Builds breadcrumbs from a hardcoded `if (page === 'subscription-analytics')` check; title is always `PAGE_TITLES[page]`, a static string | Needs a new `if (page === 'subscription-detail')` breadcrumb branch (§ 3), **and** a new optional prop so the Detail page's title can show the actual subscription (`"SUB-003 · SaaS Starter"`) instead of a generic static string |
| `App.tsx` | `useState<Page>('subscriptions')`, only knows 2 pages, imports a component (`SubscriptionAnalyticsPage`) that doesn't exist yet | Full rewrite — 4 pages, lifted `subscriptions` state, `detailId` state (§ 4) |

**Aside, not in scope to fix:** `Sidebar.tsx`'s JSDoc comment documents an `enabledModules` prop that
the actual function signature doesn't accept — a stale doc comment, not a bug affecting behavior.
Not touching it as part of this plan; flagging only so it isn't mistaken for something this phase
was supposed to address.

---

## 2. `NAV_SCHEMA` and `PAGE_TITLES` — add 2 entries each

```ts
// static-data.tsx
import { Repeat, TrendingUp, Settings as SettingsIcon } from 'lucide-react';

export const NAV_SCHEMA: Array<{ id: Page; icon: React.ElementType; label: string }> = [
	{ id: 'subscriptions', icon: Repeat, label: 'Subscriptions' },
	{ id: 'subscription-analytics', icon: TrendingUp, label: 'Subscription Analytics' },
	{ id: 'settings', icon: SettingsIcon, label: 'Settings' },
];
// 'subscription-detail' is deliberately absent — it's a drill-down destination, not a nav item.

export const PAGE_TITLES: Record<Page, string> = {
	subscriptions: 'Subscriptions',
	'subscription-analytics': 'Subscription Analytics',
	'subscription-detail': 'Subscription Detail',   // fallback only — see § 3 for the real per-subscription title
	settings: 'Settings',
};
```

```
Sidebar, after this change:
┌──────────────────┐
│  📦 PureCart       │
│     Digital Down.  │
├──────────────────┤
│  ⟳  Subscriptions  │  ← active (highlighted)
│  📈 Sub. Analytics │
│  ⚙  Settings       │
└──────────────────┘
```

---

## 3. `TopBar.tsx` — one new breadcrumb branch + one new prop

```ts
export function TopBar({
	page,
	onNav,
	detailLabel,       // NEW — optional, only meaningful when page === 'subscription-detail'
}: {
	page: Page;
	onNav: (p: Page) => void;
	detailLabel?: string;
}) {
	const crumbs: Array<{ label: string; page?: Page }> = [
		{ label: 'PureCart -  Digital Downloads' },
	];
	if (page === 'subscription-analytics') {
		crumbs.push({ label: 'Subscriptions', page: 'subscriptions' });
		crumbs.push({ label: PAGE_TITLES[page] });
	}
	if (page === 'subscription-detail') {           // NEW
		crumbs.push({ label: 'Subscriptions', page: 'subscriptions' });
		crumbs.push({ label: detailLabel ?? PAGE_TITLES[page] });
	}
	// ...
	<h1 ...>{ page === 'subscription-detail' ? (detailLabel ?? PAGE_TITLES[page]) : PAGE_TITLES[page] }</h1>
```

**What it looks like, on the Detail page:**
```
PureCart – Digital Downloads › Subscriptions › SUB-003
SUB-003 · SaaS Starter                                          🛈  🔔  (AD)
```
`App.tsx` computes `detailLabel` from the looked-up row (`${row.id} · ${row.product}`) and passes it
down — see § 4.

---

## 4. `App.tsx` — full rewrite

```tsx
import { useState } from 'react';
import { M3, subscriptionsData } from './utils/static-data';
import type { Page } from './utils/static-data';
import type { SubscriptionRecord } from './utils/subscription-types';
import { Sidebar, TopBar } from './components/ui';
import { SubscriptionsPage, SubscriptionDetailPage } from './components/Subscriptions';
import { SubscriptionAnalyticsPage } from './components/Analytics';
import { SettingsPage } from './Settings';

export default function App() {
	const [page, setPage] = useState<Page>('subscriptions');
	const [collapsed, setCollapsed] = useState(false);
	const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(subscriptionsData);
	const [detailId, setDetailId] = useState<string>('');

	function updateSubscription(id: string, patch: Partial<SubscriptionRecord>) {
		setSubscriptions(rows => rows.map(r => (r.id === id ? { ...r, ...patch } : r)));
	}

	const detailRow = subscriptions.find(r => r.id === detailId);

	return (
		<div className="flex h-screen overflow-hidden" style={{ backgroundColor: M3.surfaceContainerLow, fontFamily: 'Roboto, sans-serif' }}>
			<Sidebar activePage={page} onNav={setPage} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
			<div className="flex flex-col flex-1 min-w-0 overflow-hidden">
				<TopBar
					page={page}
					onNav={setPage}
					detailLabel={detailRow ? `${detailRow.id} · ${detailRow.product}` : undefined}
				/>
				<main className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
					{page === 'subscriptions' && (
						<SubscriptionsPage
							data={subscriptions}
							onUpdate={updateSubscription}
							onViewDetail={(id) => { setDetailId(id); setPage('subscription-detail'); }}
						/>
					)}
					{page === 'subscription-detail' && (
						<SubscriptionDetailPage
							subscriptionId={detailId}
							data={subscriptions}
							onUpdate={updateSubscription}
							onBack={() => setPage('subscriptions')}
						/>
					)}
					{page === 'subscription-analytics' && (
						<SubscriptionAnalyticsPage data={subscriptions} />
					)}
					{page === 'settings' && <SettingsPage />}
				</main>
			</div>
		</div>
	);
}
```

This is the point where `03-subscriptions-list-page.md`'s `SubscriptionsPage` actually changes its
prop signature from owning `tableData` locally to receiving `data`/`onUpdate` — do this edit to that
file's component now, per the plan file 05 § 1 already laid out.

---

## 5. Empty-state sweep

Every deferred/conditional empty state across files 03–07, gathered in one place so none get missed:

| Where | Empty state | Spec'd in |
|---|---|---|
| Subscriptions table | No rows match the current filters | New — not explicitly spec'd earlier; add a simple centered "No subscriptions match your filters" row spanning the table, with a "Clear filters" link |
| Detail page | `subscriptionId` doesn't match any row | `05-subscription-detail-page.md` § 3 |
| Status History tab | No log entries for this subscription | `05-subscription-detail-page.md` § 7 |
| Emails Sent tab | No email log for this subscription | `05-subscription-detail-page.md` § 8 |
| Retention tab | Subscription was never cancelled/pending_cancel | `05-subscription-detail-page.md` § 9 |
| Settings conditional sections | No product of that delivery type exists | `07-settings-page.md` § 1 (section doesn't render at all, not an empty state inside it) |
| Analytics charts | Sparse data (e.g. `churnByReasonData` has only 5 tiny segments) | Not a true empty state, just visually sparse — no action needed, Recharts renders small segments fine |

The one new item is the filtered-table empty state — add it to `SubscriptionsTable.tsx` now:
```
┌─────────────────────────────────────────────────────────┐
│         No subscriptions match your filters.              │
│                    [ Clear filters ]                       │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Design-consistency master checklist

Consolidated from `00-overview.md` § 2 and the recurring rules restated across files 02–07 — check
the whole plan against this once, at the end, rather than trusting each file's local reminder:

- [ ] No new external dependency anywhere (`package.json` diff should show zero new entries)
- [ ] No `react-router-dom` usage introduced (still installed, still unused)
- [ ] Every modal: `rounded-3xl`, `M3.surfaceContainer` background, `0 8px 32px rgba(0,0,0,0.24)` shadow
- [ ] Every modal header: centered icon in a 48×48 colored circle
- [ ] Every table header: `text-xs font-medium uppercase`, `0.5px` letter-spacing, `M3.onSurfaceVariant`
- [ ] Every mono value (IDs, amounts, dates, keys): `Roboto Mono`
- [ ] Every danger action routes through `ConfirmDialog` or a multi-step modal — never fires directly
- [ ] Every mutation calls `showToast(...)` — success/warning/error/info, matching the actual outcome
- [ ] Every settings field uses one of the 4 `Settings*Field` components — zero raw `<input>`/`<select>`/`<textarea>` in `07-settings-page.md`'s output
- [ ] Every cross-module reference (customer, license, SaaS account, order, WooCommerce) is a toast or disabled affordance — zero broken navigations
- [ ] Every "Kind A" popup reuses the single shared `ConfirmDialog` instance — grep for a second `<ConfirmDialog>` mount before merging, there should only ever be one per page
- [ ] All 10 `SubscriptionStatus` values render correctly everywhere `StatusBadge` is used (table, Detail header, Analytics churn table)
- [ ] All 6 `SubscriptionDeliveryType` values render correctly everywhere `SubscriptionTypeBadge`/`DeliveryTypeTab`/type-specific row actions appear

---

## 7. Master progress tracker

| # | Phase | File | Status |
|---|---|---|---|
| 0 | Data Model & Shared Components | `01`, `02` | ✅ Complete — built into real code, `tsc --noEmit` + `npm run build` both pass. `Settings*` fields relocated from `ui/` to `Subscriptions/shared/` (see `02` correction note). Data/filters wired into the pre-existing Redux `subscriptionsSlice` (not local `useState` — a real architecture decision made outside this doc set, see `00` §2's pending correction) |
| 1 | Subscriptions List Page | `03` | ✅ Complete — `SubscriptionsPage` + 4 extracted children, wired to Redux + `utils/api.ts` |
| 2 | Action Modals | `04` | ✅ Complete — `CancellationFlowModal`, `PauseDurationModal` built; `ChangePlanModal`/`ApplyDiscountModal`/`PaymentHistoryModal` extracted; `subscriptionDialogs.ts` builders for Early Renewal/Skip Cycle/SCA Reauth/Send Card Update; `SUB-018` (`pending_reauth`) sample row added |
| 3 | Subscription Detail Page | `05` | ✅ Complete — `SubscriptionDetailPage` at `/subscriptions/:id` (real route, not the useState nav this doc originally assumed), all 6 tabs built. Row actions/modals extracted into a shared `useSubscriptionActions` hook so this page and the list page use the identical ⋮ menu instead of two copies |
| 4 | Subscription Analytics Page | `06` | ✅ Complete — `SubscriptionAnalyticsPage` at `/subscriptions/analytics`, 8 KPIs, 5 Recharts charts, `ChurnRiskTable`, read-only `RevenueGoalsWidget`. Chart-segment-click cross-filtering (file 06's open question) was **not** built — deferred, no cross-page filter-intent plumbing added |
| 5 | Settings Page | `07` | ✅ Complete — `SettingsPage` at `/settings`, single `Subscriptions` tab, all 14 sections (10 always-visible + 4 conditional on delivery type present), `AddRevenueGoalModal`. Settings state is local `useState`, not Redux (no other page reads it yet) |
| 6 | Navigation & Polish | `08` (this file) | ✅ Complete — `Sidebar`/`TopBar` wired for all 4 pages, `App.tsx` derives the Detail page's dynamic title/breadcrumb from the route + store, "no rows match filters" empty state added to the table |

**Known follow-up, not a defect:** `npm run build` now emits a bundle-size performance warning (~616 KiB JS, driven mostly by Recharts) — not an error, doesn't block anything, but worth a code-splitting pass (lazy-load the Analytics page) before this ships for real.

**Icons:** ⬜ Not Started · 🔄 In Progress · ✅ Complete · ❌ Blocked — same convention as the backend
dev plan's tracker, so the two can sit side by side.

---

## 8. Final smoke test — the whole app, one pass

Run this only after all 7 phases are built, as the last check before calling the frontend "done for
now, ready to wire to the real backend":

- [ ] App builds and loads with zero console errors (this alone proves the originally-broken `SubscriptionAnalyticsPage` import is fixed)
- [ ] Sidebar shows exactly 3 items; each navigates correctly; the active item highlights
- [ ] Top bar breadcrumb and title are correct on all 4 reachable page states (list, detail, analytics, settings)
- [ ] Full round trip: list → click a row's ID → Detail page loads correct data → Pause via header button → back to list → row shows `paused`
- [ ] Full round trip: list → Cancel Subscription on an `active` row with an offer-bearing reason → accept the offer → row stays `active` with the offer's effect applied, confirmed both on the list and by opening that row's Detail → Retention tab
- [ ] Full round trip: list → Apply Discount to All (bulk, 2+ rows selected) → both rows reflect the discount
- [ ] Analytics page: change the date-range toggle, confirm only the trend chart reacts; click a Churn Risk table action, confirm it behaves identically to the same action from the list page
- [ ] Settings: expand every section at least once, change one field per section, confirm "Save Changes" enables, click it, confirm the toast fires
- [ ] Every stub/toast action (View Customer, View License, Manage Drip Schedule, etc.) fires a clearly-worded toast — none silently no-op, none throw

---

That's the complete frontend dev plan, files 00 through 08. When you're ready to start building,
Phase 0 (files 01–02) has no dependencies and is the right place to begin.

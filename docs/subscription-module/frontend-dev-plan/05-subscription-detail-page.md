# PureCart Subscriptions — Frontend Dev Plan — 05. Subscription Detail Page (Phase 3)

**Depends on:** `01-data-model.md`, `02-shared-components.md` (`ChurnGauge`, `SubscriptionTimeline`,
`InstallmentProgress`, `CardExpiryWarning`, `SubscriptionTypeBadge`), `03-subscriptions-list-page.md`
(this page is what clicking a table row's ID navigates to), `04-action-modals.md`
(`CancellationFlowModal`/`PauseDurationModal` are reused here unmodified).
**Goal:** a new page — `SubscriptionDetailPage` — showing everything about one subscription: header,
5 always-present tabs, and a 6th tab whose content depends on `deliveryType`.

---

## 0. User Journey

Admin is on the list page, looking at Emily Davis's `past_due` row (SUB-003). She clicks the **ID**
(`SUB-003`, now a link, not plain text — a small but real change to `SubscriptionsTable` from file
03, noted in § 1 below) → the page switches to the Detail view:

```
← Subscriptions                                    (Past Due)   [Pause] [Cancel] [⋮]
SUB-003 · SaaS Starter · Monthly
Emily Davis · emily@example.com

[Overview] [License] [Payment Log] [Status History] [Emails Sent] [Retention]
```

She's on **Overview** by default. It shows her billing summary, a churn-risk gauge reading
"88 · Critical," her projected LTV, and — because `cardExpiring: true` on her record — an amber
`CardExpiryWarning` banner near the top. To the right, a sidebar shows her name/email/LTV, the
product, and quick actions (Send Receipt, Send Card Update Link, etc.).

She clicks the **"License"** tab (this row is `deliveryType: 'software'`, so the 6th tab is titled
"License," not "Account" or "Access" — the tab **label and content both change per type**, same
`linkedEntity` discriminated-union payoff as everywhere else in this plan) → sees her license key,
copy button, and how many of her domain-activation slots are used.

She clicks **"Payment Log"** → sees the same payment history the list page's `PaymentHistoryModal`
shows, but full-page instead of in a small overlay, plus a "3/3 retries exhausted" badge since she's
`past_due`.

Now the interesting part: she clicks the **"Pause"** button in the header. This opens
**the exact same `PauseDurationModal` component built in Phase 2** — nothing new gets built for this,
it's just mounted from a different page. She picks "1 month," confirms, and her record updates. She
clicks **"← Subscriptions"** to go back — and her row on the list page now shows `paused`, not
`past_due`, because (see § 1) the two pages share one piece of state instead of each holding its own
private copy.

---

## 1. Architecture correction: `tableData` moves up to `App.tsx`

This is the one real architectural change this phase forces, and it's worth understanding *why*
before touching any tab code.

**The problem:** `03-subscriptions-list-page.md` has `SubscriptionsPage` owning `tableData` as its
own local `useState`, seeded once from the static `subscriptionsData` import. That's fine as long as
`SubscriptionsPage` is the only place that ever reads or writes it. The moment a second page (this
Detail page) needs to read *and write* the same records — Pause/Cancel/etc. all need to work from
both places — two independent `useState` copies would drift apart the instant either page edits a
row. Emily's pause on the Detail page would vanish the moment she navigated back to a list page that
never heard about it.

**The fix (still "no global store," per `00-overview.md` § 2 — this is plain React state lifting,
not Redux/Zustand):** `App.tsx` becomes the one owner of `tableData`/`setTableData`, passed down as
props to both `SubscriptionsPage` and `SubscriptionDetailPage`. Concretely:

```tsx
// App.tsx
const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(subscriptionsData);

function updateSubscription(id: string, patch: Partial<SubscriptionRecord>) {
	setSubscriptions(rows => rows.map(r => r.id === id ? { ...r, ...patch } : r));
}

// ...
{ page === 'subscriptions' && (
	<SubscriptionsPage data={subscriptions} onUpdate={updateSubscription}
		onViewDetail={(id) => { setDetailId(id); navigate('subscription-detail'); }} />
) }
{ page === 'subscription-detail' && (
	<SubscriptionDetailPage subscriptionId={detailId} data={subscriptions}
		onUpdate={updateSubscription} onBack={() => navigate('subscriptions')} />
) }
```

`SubscriptionsPage` changes from owning `tableData` via its own `useState` to receiving `data`/
`onUpdate` as props and calling `onUpdate(id, patch)` everywhere it currently calls the local
`updateRow(id, patch)` — same call shape, different owner. This is a small, mechanical edit to file
03's page, not a rewrite; flagging it here because this file is where the *need* for it becomes
visible, and file 08 (Navigation phase) is where the actual `App.tsx` rewrite happens. Don't do the
`App.tsx` rewrite yet if you're building phase-by-phase — just know it's coming and don't be surprised
when file 08 changes `SubscriptionsPage`'s prop signature.

**`SubscriptionsTable` also needs one new prop**, added to file 03's contract: `onViewDetail: (id:
string) => void`, wired to the ID cell (`<button onClick={() => onViewDetail(row.id)}>{row.id}</button>`
styled as a link, not a real `<a>` — there's no URL to navigate to, this is in-app state routing).

---

## 2. Data model amendments

Two gaps surfaced while speccing the Retention tab (§ 6) — small additions to `SubscriptionRecord`
in file 01:

```ts
// Add to SubscriptionRecord:
cancellationReasonId: string | null;   // which CANCELLATION_REASONS entry was picked, set by
                                        // CancellationFlowModal's onCancelled patch (file 04 § 3.1
                                        // should also set this field, not just status/cancellationDate)
```

Backfill the sample rows: `SUB-009` (Ava Garcia, `pending_cancel`) should get
`cancellationReasonId: 'too_expensive'` so the Retention tab has something real to show for at least
one sample row.

---

## 3. `SubscriptionDetailPage` — shell

```ts
// src/app/components/Subscriptions/SubscriptionDetailPage.tsx
interface SubscriptionDetailPageProps {
	subscriptionId: string;
	data: SubscriptionRecord[];
	onUpdate: (id: string, patch: Partial<SubscriptionRecord>) => void;
	onBack: () => void;
	initialTab?: DetailTabId;   // optional — lets a future caller deep-link straight to a tab, see § 8
}

type DetailTabId = 'overview' | 'type' | 'payments' | 'history' | 'emails' | 'retention';
```

Looks up `const row = data.find(r => r.id === subscriptionId)` — if not found (shouldn't happen in
practice, but the static data can be edited by hand), render a simple "Subscription not found" empty
state with a back link, not a crash.

**Header:**
```
← Subscriptions                                    (Past Due)   [Pause] [Cancel] [⋮]
SUB-003 · SaaS Starter · Monthly
Emily Davis · emily@example.com
```
- Back arrow + "Subscriptions" text → `onBack()`
- `<StatusBadge status={row.status} />`
- `[Pause]`/`[Cancel]` buttons open the **same** `PauseDurationModal`/`CancellationFlowModal` from
  file 04 — pass `row` and the page's own `onUpdate` wrapped the same way `SubscriptionsPage` wraps
  it (patch → `onUpdate(row.id, patch)` → toast). Buttons disabled per the same status rules as the
  row actions (`Pause` only if `active`, `Cancel` disabled if already `cancelled`).
- `[⋮]` — the same `ActionDropdown` + `rowActions(row)` function from `SubscriptionsPage`, reused
  as-is (extract `rowActions` into a shared function both pages import, rather than duplicating the
  6-delivery-type action lists a second time)
- Title line: `{row.id} · {row.product} · {row.billing.displayLabel}`
- Subtitle: `{row.customer} · {row.email}`

**Tab bar** — the 6th tab's label is computed from `deliveryType`:
```ts
const TYPE_TAB_LABEL: Record<SubscriptionDeliveryType, string> = {
	software: 'License', saas: 'Account', membership: 'Access',
	download: 'Downloads', course: 'Courses', service: 'Deliverables',
};
```

**Layout:** single column (tab bar + active tab content) for Payment Log/Status History/Emails
Sent/Retention/type-tab; Overview specifically uses a 2-column split (main content + sidebar) since
it's the only tab with a natural "sidebar-worthy" set of always-visible facts.

---

## 4. `OverviewTab`

```ts
// detail-tabs/OverviewTab.tsx
interface OverviewTabProps {
	row: SubscriptionRecord;
	onSendCardUpdate: () => void;
}
```

**What it looks like:**
```
┌──────────────────────────────────────────────┬───────────────────────┐
│ Billing Summary                                │ 👤 Emily Davis          │
│  Amount         $49/mo                          │    emily@example.com   │
│  Cycle          Monthly                          │    LTV: $147            │
│  Next payment   2025-01-08  ⚠ overdue            │    View Full Profile → │ (stub)
│  Started        2024-06-08                        ├───────────────────────┤
│  Payment method Visa ····7777 (exp 02/2025)        │ 📦 SaaS Starter         │
│                                                    │    Product #44          │
│ ⚠ Payment card expires 02/2025 — send update link  ├───────────────────────┤
│                                                    │ Quick actions           │
│ Churn Risk                                         │  Send Receipt          │
│  Score: 88 · Critical                              │  Send Card Update Link│
│  [Low|Medium|High|CRITICAL — CRITICAL lit up]       │  Send Renewal Reminder │
│                                                    │  View in WooCommerce →│ (stub)
│ Customer LTV                                       │                       │
│  $147 projected over 24 months                     │                       │
└──────────────────────────────────────────────┴───────────────────────┘

Conditional blocks (not shown above, appear only when relevant):

If paymentType === 'split':
│ Split Payment Progress                          │
│  ●●○  2 of 3 installments                       │
│  Access: Immediately                             │
│  Next installment: $83 on 2025-02-15             │

If pendingSwitchProduct is set:
│ 🔄 Scheduled downgrade to Theme Bundle on renewal │

If maxLengthAt is set (fixed-length subscription):
│ Ends: Jun 15 2027 (fixed-length subscription)     │
```

- Billing Summary card: plain label/value rows, same visual language as `SettingsField` but read-only (no input)
- `CardExpiryWarning` (§ B.5 in file 02) rendered only when `row.cardExpiring`, wired to `onSendCardUpdate`
- `ChurnGauge` (§ B.3) fed `row.churnRiskScore`
- LTV card: plain text, `row.customerLtv` formatted as currency
- Split payment block: `InstallmentProgress` (§ B.4) + 2 extra text lines for access timing/next installment
- Sidebar cards use the existing `Card` primitive; "View Full Profile" / "View in WooCommerce" are
  toast stubs per `00-overview.md` § 1's cross-module rule

---

## 5. `DeliveryTypeTab` — 6 variants in one file

```ts
// detail-tabs/DeliveryTypeTab.tsx
interface DeliveryTypeTabProps {
	row: SubscriptionRecord;   // narrow row.linkedEntity by row.deliveryType internally
}
```

One file, one `switch (row.linkedEntity.type)`, six render branches. Each branch shows what's
genuinely in the data model today, and is explicit about what isn't (rather than inventing a fake
log that doesn't connect to anything real):

**Software → "License":**
```
┌───────────────────────────────────────────┐
│ License Key    WDD-C3D4-E5F6-A1B2   [Copy] │
│ Activations    1 / 1 domains                │
│                                             │
│  [Revoke License]      [Reset Activations] │
└───────────────────────────────────────────┘
```
Both buttons open the same `ConfirmDialog` builders as the list page's software row actions — extend
`subscriptionDialogs.ts` (file 04 § 8) with `buildRevokeLicenseDialog`/`buildResetActivationsDialog`
rather than writing new inline dialog JSX here.

**SaaS → "Account":**
```
┌───────────────────────────────────────────┐
│ Account        Acme Corp                    │
│ Seats          18 / 25 used                  │
│ [████████████████░░░░]                       │
│                                             │
│ User list & provisioning log aren't built in │
│ this plan — they need real data from the     │
│ SaaS module, which doesn't exist in this repo │
│ yet. Showing the seat summary only.          │
│                                             │
│  [Suspend Account]        View Full Account →│ (stub)
└───────────────────────────────────────────┘
```

**Membership → "Access":**
```
┌───────────────────────────────────────────┐
│ Tier            Gold                        │
│ Assigned role   premium_member              │
│ Content access  All Content + Community      │
│ Grace period    — (not currently in grace)   │
│                                             │
│ Tier change history isn't tracked in this    │
│ plan yet — would need a new log data type.   │
│                                             │
│  [Change Tier]    [Extend Grace Period +7d]  │
└───────────────────────────────────────────┘
```

**Download → "Downloads":**
```
┌───────────────────────────────────────────┐
│ This cycle     3 / 10 downloads              │
│ [██████░░░░░░░░░░░░░░]                        │
│ Next drip      2025-02-01                     │
│                                             │
│ Per-download log (file, date, IP) isn't      │
│ built — would need a new data type this plan │
│ didn't define.                              │
│                                             │
│  [Reset Download Count]  [Manage Drip Schedule]│ (2nd button: toast stub, per file 03 §7.2)
└───────────────────────────────────────────┘
```

**Course → "Courses":**
```
┌───────────────────────────────────────────┐
│ Enrolled       PHP Mastery                   │
│                React Fundamentals            │
│ LMS enrollment LMS-4421                       │
│ Access until   2025-12-31                      │
│ Progress       64%  [██████████████░░░░░░]    │
│                                             │
│  [Extend Access +30d]  [Resend Enrollment Email]│
└───────────────────────────────────────────┘
```
This is the one type-specific tab with **no** stubbed-out sub-section — `enrolledCourses`,
`lmsEnrollmentId`, `courseAccessUntil`, and `progressPct` (file 01 § 1.1) cover everything the RND-FE
spec asked for.

**Service → "Deliverables":**
```
┌───────────────────────────────────────────┐
│ Notes           5 support tickets/month       │
│ Next due        2025-02-28                     │
│ Last completed  2025-01-28                      │
│                                             │
│ Past-deliverables log isn't built — would    │
│ need a new per-deliverable data type.        │
│                                             │
│  [Mark Complete]    [Send Invoice]           │
└───────────────────────────────────────────┘
```

---

## 6. `PaymentLogTab`

```ts
// detail-tabs/PaymentLogTab.tsx
interface PaymentLogTabProps {
	row: SubscriptionRecord;
	payments: PaymentRecord[];   // paymentHistory[row.id] ?? []
}
```

**What it looks like:**
```
Payment Log                                                          [Export CSV]
3/3 retries exhausted                              ← only rendered when row.status === 'past_due'

┌────────────┬────────┬─────────┬───────┬────────────────────┬────────┬─────────┐
│ Date       │ Amount │ Method  │ Retry │ Gateway Response    │ Status │ Receipt │
├────────────┼────────┼─────────┼───────┼────────────────────┼────────┼─────────┤
│ 2025-01-08 │ $49.00 │ PayPal  │  0    │ insufficient_funds  │ Failed │    —    │
│ 2024-12-08 │ $49.00 │ PayPal  │  0    │ —                   │ Paid   │ Receipt │
└────────────┴────────┴─────────┴───────┴────────────────────┴────────┴─────────┘
```
Same table this plan already built once for `PaymentHistoryModal` (file 04 § 7) — this tab is the
full-page version. Reasonable to extract the `<table>` markup into one shared presentational piece
both the modal and this tab import, rather than maintaining two copies of the same column layout.

---

## 7. `StatusHistoryTab`

```ts
// detail-tabs/StatusHistoryTab.tsx
interface StatusHistoryTabProps {
	events: SubscriptionLogEntry[];   // subscriptionLogsData[row.id] ?? []
}
```

Thin wrapper: sorts `events` newest-first, renders `<SubscriptionTimeline events={sorted} />` (file
02 § B.9). Empty state (`events.length === 0`) shows a plain "No status changes recorded yet" message
— most sample rows in file 01 don't have a `subscriptionLogsData` entry, so this empty state will be
the common case in the demo data; make sure it looks intentional, not broken.

---

## 8. `EmailsSentTab`

```ts
// detail-tabs/EmailsSentTab.tsx
interface EmailsSentTabProps {
	emails: SubscriptionEmailLogEntry[];   // subscriptionEmailsData[row.id] ?? []
}
```

**What it looks like:**
```
Emails Sent
┌──────────────────────┬─────────────────┬───────────────────┬────────┐
│ Email Type            │ Sent At          │ To                 │ Opened │
├──────────────────────┼─────────────────┼───────────────────┼────────┤
│ Payment Failed         │ Jan 8, 9:16 AM   │ emily@example.com  │   ✓   │
│ Card Expiring Soon     │ Jan 5, 8:00 AM   │ emily@example.com  │   ✗   │
└──────────────────────┴─────────────────┴───────────────────┴────────┘
```
`opened: null` renders as `—` (tracking unavailable), not as a false "not opened." Same empty-state
consideration as Status History — only `SUB-003` has sample data for this tab right now.

---

## 9. `RetentionTab`

```ts
// detail-tabs/RetentionTab.tsx
interface RetentionTabProps {
	row: SubscriptionRecord;
	events: SubscriptionLogEntry[];   // reuse the same subscriptionLogsData[row.id] as Status History
}
```

**What it looks like** (for `SUB-009`, Ava Garcia, `pending_cancel`, per § 2's backfilled sample data):
```
Retention

Cancellation reason:  Too expensive
  (CANCELLATION_REASONS.find(r => r.id === row.cancellationReasonId)?.label)

Retention discount remaining:  0 cycles

Offer history:
  🔴 customer   Cancellation requested: active → pending_cancel     Feb 4, 2:02 PM
                Reason: too_expensive — retention offer declined
```
No new component needed — "Offer history" is `<SubscriptionTimeline events={events.filter(e =>
e.event.startsWith('retention_') || e.event === 'cancellation_requested')} />`, a filtered view of
the same log data `StatusHistoryTab` shows in full. When `row.status` is neither `cancelled` nor
`pending_cancel`, show `"No cancellation on record."` instead of the reason/offer sections.

---

## 10. Manual test checklist

- [ ] Clicking a table row's ID navigates to the Detail page showing the correct subscription
- [ ] Pausing/cancelling from the Detail page's header updates the row, and navigating back to the list page shows that same update (proves the `App.tsx` state-lifting in § 1 actually works — this is the one check that would silently pass with stale data if the lift wasn't done correctly)
- [ ] The 6th tab's label and content correctly match all 6 delivery types when tested against one sample row of each
- [ ] `StatusHistoryTab`/`EmailsSentTab`/`RetentionTab` all render a sane empty state for rows with no log data (i.e. every row except `SUB-003`/`SUB-009`)
- [ ] `RetentionTab` correctly shows "No cancellation on record" for an `active` row and the real reason/offer for `SUB-009`
- [ ] Software/SaaS/Membership/Download/Service tabs each render their documented "not built yet" notices without those notices looking like errors
- [ ] "Subscription not found" empty state renders (doesn't crash) if given a bogus `subscriptionId`

---

One thing worth deciding now rather than later: § 3's header reuses `rowActions(row)` from
`SubscriptionsPage` — meaning that function needs to be extracted out of that file into something
both pages import (e.g. a `buildRowActions.ts` alongside `subscriptionDialogs.ts`). Want me to fold
that extraction into this phase, or leave `SubscriptionsPage` untouched and have this page duplicate
a trimmed-down copy of just the always-visible actions (skip the ⋮ menu here, keep only the header's
Pause/Cancel buttons)? The second option is less code to share correctly but means "View License,"
"Revoke License," etc. wouldn't be reachable from the Detail page at all, only from the list.

Next file: `06-analytics-page.md` (Phase 4 — the new `SubscriptionAnalyticsPage`, fixing `App.tsx`'s
currently-broken import).

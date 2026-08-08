# PureCart Subscriptions — Frontend Dev Plan — 00. Overview & Architecture

**Scope:** wp-admin React panel (`src/app/`) for the Subscriptions module only. The customer-facing
My Account portal is server-rendered PHP (not React) and is explicitly **out of scope** for this
plan — see `subscription-final-dev-plan.md` § 10 Phase 6 for that piece when it's scheduled.

**Source docs this plan reconciles:**
- `subscription-final-feature-rnd.md` — what the product does (feature truth)
- `subscription-final-dev-plan.md` §§ 7, 10, 11 — backend-confirmed architecture + high-level frontend phases
- `RND-subscriptions-frontend.md` — most detailed prior frontend spec, used as the raw material for component specs

**What this plan adds that those don't:** every prior doc (including `RND-subscriptions-frontend.md`
itself) was written assuming a fuller app already existed (Settings page, Analytics page, other
modules). I re-audited the actual repo before writing this — the real starting point is much
smaller. This plan is sequenced against **what's actually in the repo today**, not against the
aspirational inventory in those docs.

---

## 1. Current codebase audit (as of this plan)

Verified by reading the real files, not assumed from the docs:

| File/folder | Real state |
|---|---|
| `src/app/App.tsx` | `useState<Page>` routing (no React Router in use, despite `react-router-dom` being an installed dependency — unused so far). **Currently broken**: imports `SubscriptionAnalyticsPage` from `./components/Subscriptions`, which does not exist — this import will fail to build. |
| `src/app/utils/static-data.tsx` | 243 lines. Has `M3` tokens, `Page` type (only 2 values: `'subscriptions'`, `'subscription-analytics'`), `NAV_SCHEMA` (1 item), `subscriptionsData` (flat shape — no `deliveryType`, `churnRiskScore`, etc.), `PLAN_OPTIONS`, `DISCOUNT_DURATIONS`, `paymentHistory`. No `SETTINGS_TABS` — the Settings page concept doesn't exist in this repo at all yet. |
| `src/app/components/ui/` | 16 primitives exist (`Card`, `StatusBadge`, `FilterChip`, `ActionDropdown`, `ConfirmDialog`, `Toast`, `FilledButton`, `OutlinedButton`, `TonalButton`, `TextButton`, `IconButton`, `KpiCard`, `SectionTitle`, `TrendChip`, `Sidebar`, `TopBar`). **Missing** vs. what the plan below needs: `Toggle`, `StatCard`, `SettingsField`, `SettingsSelectField`, `SettingsToggleField`, `SettingsTextareaField`, `SettingsSectionHeader`. |
| `src/app/components/Subscriptions/` | Only `SubscriptionsPage.tsx` (699 lines) + `index.ts`. One monolithic component: KPI strip, filter bar, table, bulk action bar, and 3 modals (Change Plan, Apply Discount, Payment History) all inline in one file, using raw `<div>` overlays rather than extracted modal components. |
| `SubscriptionAnalyticsPage` | **Does not exist.** Referenced by `App.tsx` but never built. |
| `SubscriptionDetailPage` | Does not exist. |
| `SettingsPage` / `SETTINGS_TABS` | Does not exist. No settings UI anywhere in the panel today. |
| Other modules (Licensing, SaaS, Affiliates, Customer profile, etc.) | **Do not exist in this repo.** This is a subscriptions-only scaffold (branch: `dashboard-with-subscription-module-only`). Any cross-module link (View Customer, View License, View SaaS Account, View Order) has no real destination yet. |

### Confirmed real bugs (carried over from `RND-subscriptions-frontend.md` § 17, verified in the actual file)
- `SubscriptionsPage.tsx` table: column "Customer" (line ~746) already shows product as subtext, and column "Product" (line ~768) repeats the product name again — genuine duplicate, confirmed at `src/app/components/Subscriptions/SubscriptionsPage.tsx:746-777`.
- Row hover (`onMouseEnter`/`onMouseLeave`, lines ~708-725) recomputes the background inline instead of via a class — functionally correct today but fragile; flagged for cleanup when the table is rebuilt in Phase 1.

### Decision: cross-module links are stubs, not dead ends
The existing code already establishes the pattern to follow — "View Customer" just calls
`showToast(...)`, it doesn't navigate anywhere, because there's no customer page in this repo.
**Every new cross-module action in this plan (View License, View SaaS Account, View Order, View
Full Customer Profile) follows the same pattern**: a toast or a disabled/`title="Coming soon"`
affordance, never a broken navigation. When Licensing/SaaS/Customer modules land in this codebase,
those get wired for real — not part of this plan.

---

## 2. Tech stack (confirmed, not to be changed)

| Concern | Choice | Confirmed by |
|---|---|---|
| Framework | React 18 + TypeScript | `package.json` |
| Styling | Tailwind utility classes + inline `style={}` for M3 tokens | existing `SubscriptionsPage.tsx` |
| Design tokens | `M3` object in `static-data.tsx` | existing |
| Charts | Recharts | `package.json` dependency, not yet used in Subscriptions |
| Routing | `useState<Page>` in `App.tsx` | existing — **do not introduce `react-router-dom`** even though it's installed; it's unused elsewhere and switching routing strategy mid-module is out of scope |
| Icons | `lucide-react` | existing |
| State | Local `useState` per page, no global store | existing |
| API | None yet — 100% static data from `static-data.tsx`. This plan is written so every page/component takes data as props or reads static-data, making the later REST wiring a swap of the data source, not a rewrite. |

No new external libraries. No CSS-in-JS library, no state management library, no date library —
match what's already there.

---

## 3. Build phases (sequencing)

Each phase produces a working, demoable UI — you can stop after any phase and nothing is half-broken.
Phases are ordered by dependency, not by the numbering in the other docs (which assumed things that
don't exist here).

| Phase | Name | Depends on | Produces |
|---|---|---|---|
| 0 | Data Model & Shared Component Foundation | — | Extended TS types, expanded static data (all 6 delivery types), missing UI primitives, subscription-domain shared components. Nothing user-visible changes yet. |
| 1 | Subscriptions List Page | Phase 0 | Rebuilt table (bug fixes + type/churn/LTV columns), 6-card KPI strip, expanded filters, all row actions for all 6 delivery types |
| 2 | Action Modals | Phase 0, 1 | 3-step Cancellation Flow (replaces today's single confirm), Early Renewal, Skip Cycle, Pause-with-Duration, SCA Reauth, Send Card Update — plus the 3 existing inline modals extracted into their own files |
| 3 | Subscription Detail Page | Phase 0, 1, 2 | New page: header, 5 tabs (Overview/Payment Log/Status History/Emails Sent/Retention) + 1 delivery-type-specific tab |
| 4 | Subscription Analytics Page | Phase 0 | New page (fixes the broken `App.tsx` import): KPIs, 5 charts, extended churn risk table, revenue goals widget |
| 5 | Settings Page | Phase 0 | New page + container (doesn't exist yet) with a `Subscriptions` tab holding 14 sections |
| 6 | Navigation & Polish | Phases 1–5 | `App.tsx` wiring for all new pages, `Sidebar`/`TopBar`/`NAV_SCHEMA` updates, empty states, final design-consistency pass |

Each phase gets its own file in this folder (see § 5 below) with: exact component list, file paths,
props/state shape, and a manual test checklist — same format as the backend dev plan you already have.

---

## 4. Target file/folder layout (end state after all phases)

```
src/app/
├── App.tsx                                  [Phase 6 — rewritten]
├── utils/
│   ├── static-data.tsx                      [Phase 0 — extended in place]
│   └── subscription-types.ts                [Phase 0 — NEW: all subscription TS interfaces]
├── components/
│   ├── ui/
│   │   ├── Toggle.tsx                       [Phase 0 — NEW]
│   │   ├── StatCard.tsx                     [Phase 0 — NEW]
│   │   ├── SettingsField.tsx                [Phase 0 — NEW]
│   │   ├── SettingsSelectField.tsx          [Phase 0 — NEW]
│   │   ├── SettingsToggleField.tsx          [Phase 0 — NEW]
│   │   ├── SettingsTextareaField.tsx        [Phase 0 — NEW]
│   │   ├── SettingsSectionHeader.tsx        [Phase 0 — NEW]
│   │   └── index.ts                         [updated exports]
│   ├── Subscriptions/
│   │   ├── shared/
│   │   │   ├── SubscriptionTypeBadge.tsx    [Phase 0 — NEW]
│   │   │   ├── ChurnScoreBadge.tsx          [Phase 0 — NEW]
│   │   │   ├── ChurnGauge.tsx               [Phase 0 — NEW]
│   │   │   ├── InstallmentProgress.tsx      [Phase 0 — NEW]
│   │   │   ├── CardExpiryWarning.tsx        [Phase 0 — NEW]
│   │   │   ├── StepIndicator.tsx            [Phase 0 — NEW]
│   │   │   ├── CancellationReasonList.tsx   [Phase 0 — NEW]
│   │   │   ├── RetentionOfferCard.tsx       [Phase 0 — NEW]
│   │   │   ├── SubscriptionTimeline.tsx     [Phase 0 — NEW]
│   │   │   └── RevenueGoalCard.tsx          [Phase 0 — NEW]
│   │   ├── SubscriptionsPage.tsx            [Phase 1 — rebuilt]
│   │   ├── SubscriptionsTable.tsx           [Phase 1 — NEW, extracted]
│   │   ├── SubscriptionsKpiStrip.tsx        [Phase 1 — NEW, extracted]
│   │   ├── SubscriptionsFilterBar.tsx       [Phase 1 — NEW, extracted]
│   │   ├── SubscriptionsBulkBar.tsx         [Phase 1 — NEW, extracted]
│   │   ├── modals/
│   │   │   ├── ChangePlanModal.tsx          [Phase 2 — extracted from existing inline]
│   │   │   ├── ApplyDiscountModal.tsx       [Phase 2 — extracted from existing inline]
│   │   │   ├── PaymentHistoryModal.tsx      [Phase 2 — extracted from existing inline]
│   │   │   ├── CancellationFlowModal.tsx    [Phase 2 — NEW]
│   │   │   ├── EarlyRenewalModal.tsx        [Phase 2 — NEW]
│   │   │   ├── SkipCycleModal.tsx           [Phase 2 — NEW]
│   │   │   ├── PauseDurationModal.tsx       [Phase 2 — NEW]
│   │   │   └── ScaReauthModal.tsx           [Phase 2 — NEW]
│   │   ├── SubscriptionDetailPage.tsx       [Phase 3 — NEW]
│   │   ├── detail-tabs/
│   │   │   ├── OverviewTab.tsx              [Phase 3 — NEW]
│   │   │   ├── PaymentLogTab.tsx            [Phase 3 — NEW]
│   │   │   ├── StatusHistoryTab.tsx         [Phase 3 — NEW]
│   │   │   ├── EmailsSentTab.tsx            [Phase 3 — NEW]
│   │   │   ├── RetentionTab.tsx             [Phase 3 — NEW]
│   │   │   └── DeliveryTypeTab.tsx          [Phase 3 — NEW, switches on deliveryType internally]
│   │   └── index.ts                         [updated exports]
│   └── Analytics/
│       ├── SubscriptionAnalyticsPage.tsx    [Phase 4 — NEW, follows sibling-module convention]
│       ├── ChurnRiskTable.tsx               [Phase 4 — NEW, extracted]
│       ├── RevenueGoalsWidget.tsx           [Phase 4 — NEW, extracted]
│       └── index.ts                         [NEW]
├── Settings/
│   ├── SettingsPage.tsx                     [Phase 5 — NEW]
│   ├── SettingsSubscriptions.tsx            [Phase 5 — NEW, tab container]
│   ├── sections/
│   │   ├── SubGeneralSection.tsx            [Phase 5 — NEW]
│   │   ├── SubBillingDunningSection.tsx     [Phase 5 — NEW]
│   │   ├── SubRenewalsSection.tsx           [Phase 5 — NEW]
│   │   ├── SubUpgradeDowngradeSection.tsx   [Phase 5 — NEW]
│   │   ├── SubRetentionSection.tsx          [Phase 5 — NEW]
│   │   ├── SubCustomerPortalSection.tsx     [Phase 5 — NEW]
│   │   ├── SubRoleMappingSection.tsx        [Phase 5 — NEW]
│   │   ├── SubSubscribeSaveSection.tsx      [Phase 5 — NEW]
│   │   ├── SubAdvancedSection.tsx           [Phase 5 — NEW]
│   │   ├── SubRevenueGoalsSection.tsx       [Phase 5 — NEW]
│   │   ├── SubMembershipSection.tsx         [Phase 5 — NEW, conditional]
│   │   ├── SubDownloadsSection.tsx          [Phase 5 — NEW, conditional]
│   │   ├── SubCoursesSection.tsx            [Phase 5 — NEW, conditional]
│   │   └── SubServiceSection.tsx            [Phase 5 — NEW, conditional]
│   └── index.ts                             [NEW]
```

**Component count:** ~53 new/extracted component files total (Phase 0: 17, Phase 1: 4, Phase 2: 8,
Phase 3: 7, Phase 4: 3, Phase 5: 16 — the exact per-phase files are listed above; Phase 6 touches
existing files only, no new components).

---

## 5. Planned file breakdown for this dev plan

This overview is file 1 of the set. Once you've reviewed this, I'll generate the rest in this order:

| # | File | Covers |
|---|---|---|
| 01 | `01-data-model.md` | Full TypeScript types (`subscription-types.ts`), extended `static-data.tsx` shape, sample data for all 6 delivery types, mapping notes for the future REST wiring |
| 02 | `02-shared-components.md` | Every Phase 0 component: props, visual spec, states — the 7 UI primitives + 10 subscription-domain components |
| 03 | `03-subscriptions-list-page.md` | Phase 1: table rebuild, KPI strip, filter bar, row actions per delivery type, bulk bar |
| 04 | `04-action-modals.md` | Phase 2: all 8 modal components, step-by-step content for the Cancellation Flow |
| 05 | `05-subscription-detail-page.md` | Phase 3: page shell + all 6 tabs incl. the 6 delivery-type variants of the type-specific tab |
| 06 | `06-analytics-page.md` | Phase 4: KPI cards, all 5 charts with dataset shapes, churn table, revenue goals widget |
| 07 | `07-settings-page.md` | Phase 5: `SettingsPage` container + all 14 Subscriptions settings sections |
| 08 | `08-navigation-and-testing.md` | Phase 6: `App.tsx`/`Sidebar`/`TopBar` wiring, design-consistency checklist, manual test checklist per phase, progress tracker |

Let me know if you want to reorder/merge/drop anything above (e.g. merge 03+04, or split settings
sections across two files) before I generate the rest — cheap to adjust now, not once 8 files exist.

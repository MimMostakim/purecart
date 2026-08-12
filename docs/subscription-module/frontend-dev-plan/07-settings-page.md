# PureCart Subscriptions — Frontend Dev Plan — 07. Settings Page (Phase 5)

**Depends on:** `01-data-model.md`, `02-shared-components.md` (`SettingsSectionHeader`,
`SettingsField`, `SettingsSelectField`, `SettingsToggleField`, `SettingsTextareaField`,
`RevenueGoalCard`).
**Goal:** build `SettingsPage` from scratch — like the Analytics page, this doesn't exist anywhere in
the repo today (`00-overview.md` § 1: "No settings UI anywhere in the panel"). This phase builds both
the generic container and its one real tab, `Subscriptions`, with 14 sections.

---

## 0. User Journey

Admin clicks the gear icon in the sidebar (added in Phase 6) → `SettingsPage` loads showing a single
tab, **"Subscriptions"** (§ 1 explains why there's only one tab in this plan). Below the tab bar,
14 collapsible sections are stacked; **General** starts expanded, the rest start collapsed.

Admin clicks **"Billing & Dunning"** to expand it → sees 5 fields: max retry attempts, retry
schedule, two grace-period day counts, a dunning-emails toggle. Admin changes "Max retry attempts"
from `3` to `5` → this is a local `setState` update to one field in a settings object held by
`SettingsSubscriptions`, nothing persists yet. Admin scrolls down and also flips "Allow customer
self-cancel" off in the **Customer Portal** section.

Admin clicks the sticky **"Save Changes"** button at the bottom → a toast fires: *"Settings saved"* —
but nothing was actually sent anywhere, matching this whole plan's architecture (`00-overview.md`
§ 2: no API wired yet). If the admin reloads the page right now, every change reverts to the
hardcoded defaults — that's expected and fine at this phase; § 7 flags exactly where the real
persistence hook goes in later.

Admin scrolls to **"Membership"** near the bottom and notices it's visible (not hidden) — that's
because at least one sample subscription in the demo data (`SUB-011`, Tom Baker) is a `membership`
type. If none of the sample data had a `download`-type row, the "Digital Downloads" section wouldn't
render at all — these 4 sections are conditional on "does a subscription of this type exist," per
§ 1's decision.

---

## 1. `SettingsPage` — the container

This repo has no other modules yet (Licensing, SaaS, etc. — `00-overview.md` § 1), so a multi-tab
shell with stub tabs for modules that don't exist would be inventing UI nobody asked for.
**Decision:** ship with exactly one real tab.

```ts
// src/app/Settings/SettingsPage.tsx
export const SETTINGS_TABS = ['Subscriptions'] as const;
// Add 'Licensing', 'Downloads', 'Emails', etc. here only when those modules actually land in
// this repo — each brings its own settings section the same way this file brings 'Subscriptions'.
```

```
┌───────────────────────────────────────────────────────────┐
│  [ Subscriptions ]                                          │  ← tab bar, 1 tab today
├───────────────────────────────────────────────────────────┤
│                                                               │
│   (SettingsSubscriptions renders here — § 2)                 │
│                                                               │
└───────────────────────────────────────────────────────────┘
```
`SettingsPage` itself owns only tab-switching state (`activeTab`, irrelevant with 1 tab but keeps the
shell ready for more) and renders `<SettingsSubscriptions />` when `activeTab === 'Subscriptions'`.

---

## 2. New data: `SubscriptionSettings` type + defaults

Nothing in file 01 modeled settings — add this now (`subscription-types.ts`):

```ts
export interface SubscriptionSettings {
	// General
	enableSubscriptions: boolean;
	enableAutoRenewal: boolean;
	allowMixedCart: boolean;
	oneTrialPerCustomer: boolean;
	avgLifetimeMonths: number;
	// Billing & Dunning
	maxRetryAttempts: number;
	retryIntervalDays: number[];        // e.g. [1, 3, 5]
	activeGraceDays: number;
	suspendedGraceDays: number;
	sendDunningEmails: boolean;
	// Renewals & Reminders
	renewalReminderDays: number[];      // e.g. [7, 3, 1]
	cardExpiryWarningDays: number;
	enableRenewalSync: boolean;
	renewalSyncDate: number;            // day of month, 1-28
	// Upgrade / Downgrade
	defaultProrationMode: 'apply_at_renewal' | 'prorate_immediately' | 'no_proration';
	allowCustomerUpgrade: boolean;
	// Retention
	retentionFlowEnabled: boolean;
	// Customer Portal
	allowSelfPause: boolean;
	allowSelfCancel: boolean;
	allowEarlyRenewal: boolean;
	allowSkipRenewal: boolean;
	skipLimitPerYear: number;           // 0 = unlimited
	// Role Mapping
	trialRole: string | null;
	activeRole: string | null;
	cancelledRole: string | null;
	// Subscribe & Save
	subscribeSaveEnabled: boolean;
	discountType: 'percentage' | 'fixed';
	discountValue: number;
	savingsBadgeLabel: string;
	// Advanced
	stagingDomains: string;             // raw textarea text, one domain per line
	gatewayMetaKeys: string;
	cancelSaasImmediately: boolean;
	debugMode: boolean;
	// Membership (conditional section)
	membershipGraceDays: number;
	contentRestrictionPlugin: string;
	availableTiers: string;             // raw textarea text
	allowSelfTierUpgrade: boolean;
	// Digital Downloads (conditional section)
	downloadLimitPerCycle: number;
	resetDownloadsOnRenewal: boolean;
	enableDripContent: boolean;
	dripIntervalDays: number;
	// Courses / LMS (conditional section)
	lmsIntegration: 'learndash' | 'lifterlms' | 'tutorlms' | 'none';
	lmsApiKey: string;
	defaultCourseAccessMonths: number;
	enrollOnTrialStart: boolean;
	revokeEnrollmentOnCancel: boolean;
	// Service / Retainer (conditional section)
	defaultInvoicingMode: 'manual' | 'auto';
	invoiceDueDays: number;
	enableDeliverableTracking: boolean;
	defaultDeliverableTemplate: string;
}
```

Default values (`utils/static-data.tsx`), matching the mockups' example numbers:

```ts
export const defaultSubscriptionSettings: SubscriptionSettings = {
	enableSubscriptions: true, enableAutoRenewal: true, allowMixedCart: true,
	oneTrialPerCustomer: true, avgLifetimeMonths: 24,
	maxRetryAttempts: 3, retryIntervalDays: [1, 3, 5], activeGraceDays: 7,
	suspendedGraceDays: 7, sendDunningEmails: true,
	renewalReminderDays: [7, 3, 1], cardExpiryWarningDays: 30,
	enableRenewalSync: false, renewalSyncDate: 1,
	defaultProrationMode: 'apply_at_renewal', allowCustomerUpgrade: true,
	retentionFlowEnabled: true,
	allowSelfPause: true, allowSelfCancel: true, allowEarlyRenewal: true,
	allowSkipRenewal: true, skipLimitPerYear: 1,
	trialRole: null, activeRole: null, cancelledRole: null,
	subscribeSaveEnabled: true, discountType: 'percentage', discountValue: 15,
	savingsBadgeLabel: 'Save 15% with a subscription',
	stagingDomains: '', gatewayMetaKeys: '', cancelSaasImmediately: false, debugMode: false,
	membershipGraceDays: 3, contentRestrictionPlugin: 'none', availableTiers: 'Gold, Silver, Bronze',
	allowSelfTierUpgrade: true,
	downloadLimitPerCycle: 10, resetDownloadsOnRenewal: true, enableDripContent: false, dripIntervalDays: 7,
	lmsIntegration: 'none', lmsApiKey: '', defaultCourseAccessMonths: 12,
	enrollOnTrialStart: true, revokeEnrollmentOnCancel: true,
	defaultInvoicingMode: 'manual', invoiceDueDays: 7, enableDeliverableTracking: true,
	defaultDeliverableTemplate: '',
};
```

---

## 3. `SettingsSubscriptions` — the tab container

```ts
// src/app/Settings/SettingsSubscriptions.tsx
export function SettingsSubscriptions() {
	const [settings, setSettings] = useState<SubscriptionSettings>(defaultSubscriptionSettings);
	const update = <K extends keyof SubscriptionSettings>(key: K, value: SubscriptionSettings[K]) =>
		setSettings(s => ({ ...s, [key]: value }));
	// ...
}
```

Each of the 14 sections below is its own component (`sections/Sub*.tsx`, per `00-overview.md`'s
target tree), receiving `settings` + `update` — or, cleaner, just the handful of fields each section
actually needs plus a per-field `onChange`, so no section can accidentally read/write a field outside
its own concern. Sections render inside a collapsible wrapper:

```tsx
<CollapsibleSection title="Billing & Dunning" description="..." defaultOpen={false}>
	<SubBillingDunningSection settings={settings} update={update} />
</CollapsibleSection>
```

`CollapsibleSection` is a small new local component (not worth a shared file — nothing outside this
page needs an accordion): header row (`▸`/`▾` chevron + `SettingsSectionHeader`) toggles a
`useState<boolean>` that shows/hides its children.

**Conditional sections** (Membership, Digital Downloads, Courses/LMS, Service/Retainer) wrap their
`<CollapsibleSection>` in a check:

```tsx
const hasType = (type: SubscriptionDeliveryType) => subscriptionsData.some(r => r.deliveryType === type);

{ hasType('membership') && <CollapsibleSection title="Membership">...</CollapsibleSection> }
```

This checks the **static sample data** for now — a real backend would instead ask "does a published
product with this delivery type exist," which is a `manage_woocommerce`-gated product query, not
something the frontend can determine on its own. Note this clearly as a placeholder check, not final
logic, so it isn't mistaken for the real rule later.

---

## 4. Section field lists

Each row below is `SettingsField` (plain value), `SettingsToggleField` (●/○), `SettingsSelectField`
(dropdown), or `SettingsTextareaField` (multi-line) — the bracket notation mirrors exactly what each
renders, i.e. this list doubles as the wireframe.

### 4.1 General (default expanded)
```
Enable subscriptions module                          [   ●]
Enable auto-renewal                                  [   ●]
Allow mixed cart                                     [   ●]
One trial per customer                               [   ●]
Average lifetime months (LTV)                        [ 24 ]
```

### 4.2 Billing & Dunning
```
Max retry attempts                                   [  3 ]
Retry schedule (days after fail)                     [ 1, 3, 5 ]
Active grace days (past_due → suspended)             [  7 ]
Suspended grace days (suspended → cancelled)         [  7 ]
Send dunning emails                                  [   ●]
```
**Full accordion detail for this one section**, to show what "expanded" actually looks like on
screen (every other section follows this exact visual pattern — header, fields, done):
```
▾ Billing & Dunning
   Configure retry attempts and grace periods before suspension
  ──────────────────────────────────────────────────────────────
   Max retry attempts                                  [  3 ]
   Retry schedule (days after fail)                    [ 1, 3, 5 ]
   Active grace days (past_due → suspended)            [  7 ]  days
   Suspended grace days (suspended → cancelled)        [  7 ]  days
   Send dunning emails                                 [   ●]
```

### 4.3 Renewals & Reminders
```
Renewal reminder days (before due)                   [ 7, 3, 1 ]
Card expiry warning days                             [ 30 ]
Enable renewal sync                                  [   ○]
Sync day of month                                    [  1 ]
```

### 4.4 Upgrade / Downgrade
```
Default proration mode          [● apply_at_renewal ○ prorate_immediately ○ no_proration]
Allow customer upgrade/downgrade                     [   ●]
```

### 4.5 Retention
```
Enable retention flow                                [   ●]
(Per-reason offer configuration is set on each product; this is the module-wide toggle.)
```

### 4.6 Customer Portal
```
Allow customer self-pause                            [   ●]
Allow customer self-cancel                           [   ●]
Allow customer early renewal                         [   ●]
Allow customer to skip renewal                       [   ●]
Max skips per billing year (0 = unlimited)           [  1 ]
```

### 4.7 Role Mapping
```
Trial role                          [ select WP role or none ▾ ]
Active role                         [ select WP role or none ▾ ]
Cancelled role                      [ select WP role or none ▾ ]
```
**Data gap, honestly noted:** there's no list of real WP roles anywhere in this frontend-only plan
(that's a `wp_roles` PHP lookup). Populate the `<SettingsSelectField>` options with a short hardcoded
placeholder list (`administrator`, `subscriber`, `premium_member`, `none`) for now — replace with a
real roles endpoint once the backend exists.

### 4.8 Subscribe & Save
```
Enable Subscribe & Save                              [   ●]
Discount type                        [● Percentage  ○ Fixed amount]
Discount value                                       [ 15 ]
Savings badge label                  [ Save 15% with a subscription ]
```

### 4.9 Advanced
```
Staging/blocked domains (one per line)
┌──────────────────────────────────────┐
│                                        │
└──────────────────────────────────────┘
Gateway meta keys (one per line)
┌──────────────────────────────────────┐
│                                        │
└──────────────────────────────────────┘
Cancel SaaS immediately                              [   ○]
Debug mode                                           [   ○]
```

### 4.10 Revenue Goals
```
[+ Add Goal]

┌──────────────────────────┐  ┌──────────────────────────┐
│ MRR Target Q3 [On Track] │  │ ARR Target 2026[On Track]│
│ ████████████░░  77%       │  │ █████████████░  92%      │
│ $2,310 of $3,000      🗑 │  │ $27,720 of $30,000    🗑 │
└──────────────────────────┘  └──────────────────────────┘
```
Reuses `RevenueGoalCard` **with** `onDelete` this time (unlike the read-only Analytics placement,
file 06 § 7 — this is the one place goals actually get managed, per that file's decision). "+ Add
Goal" opens a small new modal:
```ts
// sections/SubRevenueGoalsSection.tsx also needs, inline or extracted:
interface AddRevenueGoalModalProps {
	onClose: () => void;
	onAdd: (goal: Omit<RevenueGoal, 'id' | 'current' | 'status'>) => void;
}
```
4 fields: label (text), type (select: MRR/ARR/Total Revenue), target amount (number), period (text,
e.g. "Q4 2026"). New goals start `current: 0, status: 'on_track'`.

### 4.11 Membership *(conditional — visible because `SUB-011` exists)*
```
Grace period after cancellation (days)               [  3 ]
Content restriction plugin      [ MemberPress / Restrict Content Pro / custom ▾ ]
Available tiers (one per line)
┌──────────────────────────────────────┐
│ Gold, Silver, Bronze                  │
└──────────────────────────────────────┘
Allow self-tier-upgrade                              [   ●]
```

### 4.12 Digital Downloads *(conditional — visible because `SUB-012` exists)*
```
Download limit per billing cycle (0 = unlimited)     [ 10 ]
Reset downloads on renewal                           [   ●]
Enable drip content delivery                         [   ○]
Drip interval (days between releases)                [  7 ]
```

### 4.13 Courses / LMS *(conditional — visible because `SUB-013` exists)*
```
LMS integration                  [ LearnDash / LifterLMS / Tutor LMS / None ▾ ]
LMS API key                                          [ ••••••••••••• ]
Default course access duration (months)              [ 12 ]
Enroll on trial start                                [   ●]
Revoke enrollment on cancellation                    [   ●]
```

### 4.14 Service / Retainer *(conditional — visible because `SUB-014` exists)*
```
Default invoicing mode               [● Manual  ○ Auto]
Invoice due days (after renewal)                     [  7 ]
Enable deliverable tracking                          [   ●]
Default deliverable notes template
┌──────────────────────────────────────┐
│                                        │
└──────────────────────────────────────┘
```

---

## 5. Save flow

```
┌──────────────────────────────────────────────────────────────┐
│                                                [ Save Changes ]│  ← sticky footer, always visible
└──────────────────────────────────────────────────────────────┘
```
`onClick`: for now, just `showToast('Settings saved', 'success')` — no persistence, per this plan's
architecture. The one thing worth building correctly even now: **disable the button unless something
actually changed** (`JSON.stringify(settings) !== JSON.stringify(defaultSubscriptionSettings)`, or
simpler, an `isDirty` flag set by `update()`), so it doesn't look actionable when there's nothing to
save. When the backend lands, this button's handler becomes a `POST` to a settings endpoint and
`isDirty` resets to `false` on success — no other change needed here.

---

## 6. Manual test checklist

- [ ] `SettingsPage` renders with exactly one tab, "Subscriptions," selected by default
- [ ] All 10 always-visible sections render collapsed except General
- [ ] All 4 conditional sections are visible against the file 01 sample data (which has at least one row of each of the 4 conditional types) — temporarily removing all `download`-type rows should hide "Digital Downloads" only, nothing else
- [ ] Every field type (`SettingsField`/`SettingsSelectField`/`SettingsToggleField`/`SettingsTextareaField`) is exercised at least once and updates `settings` state correctly
- [ ] "Save Changes" is disabled until at least one field changes, then enables
- [ ] Revenue Goals section's "+ Add Goal" creates a new card with `current: 0`; the 🗑 on any card removes it
- [ ] No raw `<input>`/`<select>`/`<textarea>` anywhere in this page outside the 4 Settings* components (per the design-consistency rule in `00-overview.md`)

---

Two things worth deciding:
1. § 4.7's Role Mapping options are a hardcoded placeholder list (no real WP roles source exists in a
   frontend-only build). Fine as documented, or do you want it wired to something real even before the
   backend exists — e.g. is there a WP roles list already exposed somewhere in this WordPress install's
   admin that a static import could reference?
2. § 4.10's "+ Add Goal" modal is new and wasn't in `00-overview.md`'s original file tree. Should it
   get its own file (`modals/AddRevenueGoalModal.tsx`) for consistency with how file 04 treats every
   other modal, or is it small enough to stay inline inside `SubRevenueGoalsSection.tsx`?

Next file: `08-navigation-and-testing.md` (Phase 6 — the final `App.tsx`/`Sidebar`/`TopBar` wiring
that makes every page built in files 03–07 actually reachable, plus the full-plan test checklist).

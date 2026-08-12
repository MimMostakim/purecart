# PureCart Subscriptions — Frontend Dev Plan — 02. Shared Components (Phase 0, part 2)

**Build this after `01-data-model.md`, before touching any page.** Every component here is consumed
by at least two of the later pages (list, detail, analytics, settings) — building them once, now,
means Phases 1–5 are assembly, not invention. None of these have page-specific logic; they all take
data via props and render.

Two groups: **2 generic UI primitives** (missing from `src/app/components/ui/` today — confirmed by
reading `ui/index.ts`, see `00-overview.md` § 1) and **15 subscription-domain components** (new,
under `src/app/components/Subscriptions/shared/`).

**Correction from an earlier draft of this file:** the `Settings*` field components (§§ B.11–B.15
below) were originally placed in `ui/`. That was wrong — `ui/` is for components generic enough that
any future module could reuse them (the precedent already in this codebase: `KpiCard` composes
`Card` + `TrendChip`, both `ui/` siblings, and that's fine because a KPI card shape is genuinely
generic). The `Settings*` fields are not generic — they're named for and scoped to one feature (the
Subscriptions settings tab), exactly like `SubscriptionTypeBadge` is scoped to Subscriptions. So they
belong in `Subscriptions/shared/` alongside the other domain-scoped components, not in `ui/`. Only
`Toggle` (a true primitive, no dependency on anything domain-specific) and `StatCard` (generic,
follows the `KpiCard` precedent) stay in `ui/`.

Every component below now has three parts: **what it takes** (props), **what it looks like** (an
ASCII wireframe of the actual rendered output — icons shown as emoji for readability in plain text;
the real code uses `lucide-react` icon components, not emoji), and **where it's used**.

---

## Part A — Generic UI primitives (`src/app/components/ui/`)

These aren't subscription-specific — they belong in `ui/` alongside `Card`, `FilledButton`, etc.,
and follow those files' existing conventions (M3 tokens via inline `style`, Tailwind for layout,
no CSS modules).

### A.1 `Toggle`

On/off switch. `ConfirmDialog`-adjacent components already use similar visuals informally; this is
the first dedicated component.

```ts
// src/app/components/ui/Toggle.tsx
interface ToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	size?: 'default' | 'small';
}
```

**What it looks like:**
```
 Off (checked=false)        On (checked=true)         Disabled
 ┌──────────┐               ┌──────────┐              ┌──────────┐
 │●         │               │         ●│              │●         │
 └──────────┘               └──────────┘              └──────────┘
  gray track                 purple track (M3.primary)  40% opacity,
  (M3.outlineVariant)        white thumb slid right      cursor: not-allowed
```
- Track: 40×22px (default) or 32×18px (small), `rounded-full`
- Thumb: white circle, `transform: translateX(...)` transition (150ms ease)
- Used by: `SettingsToggleField` (wraps this + a label), and directly wherever a bare toggle is needed outside a settings row (e.g. table filter quick-toggles, if any later page wants one)

### A.2 `StatCard`

Smaller sibling of the existing `KpiCard` — no trend arrow, no icon slot, just label + value. Used
where `KpiCard` is too heavy (e.g. dense KPI strips with 6 cards, sidebar mini-stats).

```ts
// src/app/components/ui/StatCard.tsx
interface StatCardProps {
	label: string;
	value: string;
	color?: string;      // M3 token for the accent bar, defaults to M3.primary
	bg?: string;          // M3 token for the accent bar background, defaults to M3.primaryContainer
}
```

**What it looks like:**
```
┌──────────────────────────┐
│ ▐▐   42                  │   ← ▐▐ = 2.5×10px colored accent bar (color prop)
│ ▐▐   Active              │   ← value: text-2xl font-light · label: text-xs, M3.onSurfaceVariant
└──────────────────────────┘
```
Visually: identical pattern to the inline KPI cards already hand-rolled in `SubscriptionsPage.tsx`
(colored accent bar + value + label) — this component just extracts that pattern so Phase 1 doesn't
repeat it 6 times inline. Rendered inside the existing `Card` primitive by the consumer, not
internally (matches how `KpiCard` is used today — check its current implementation before assuming;
if `KpiCard` already wraps its own `Card`, mirror that exact structure for consistency).

### A.3 Update `src/app/components/ui/index.ts`

Add exports for `Toggle` and `StatCard` only. The 5 `Settings*` field components originally planned
here moved to `Subscriptions/shared/` — see §§ B.11–B.15 below and the correction note at the top of
this file.

---

## Part B — Subscription-domain components (`src/app/components/Subscriptions/shared/`)

New folder. These read from `subscription-types.ts` (file 01) directly and are specific to the
subscriptions module — they don't belong in the generic `ui/` folder. That includes the 5
`Settings*` field components (§§ B.11–B.15) — they're scoped to the Subscriptions settings tab
specifically, not generic enough for `ui/`.

### B.1 `SubscriptionTypeBadge`

Small colored icon-pill identifying delivery type. Used in the table's "Type" column (Phase 1) and
the Detail page header (Phase 3).

```ts
// src/app/components/Subscriptions/shared/SubscriptionTypeBadge.tsx
import type { SubscriptionDeliveryType } from '../../../utils/subscription-types';

interface SubscriptionTypeBadgeProps {
	type: SubscriptionDeliveryType;
	size?: 'default' | 'small';
}
```

**What it looks like:**
```
default:   ( 🔑 Software )   ( ☁ SaaS )   ( 🛡 Membership )   ( ⬇ Download )   ( 🎓 Course )   ( 💼 Service )
small:     ( 🔑 )  ← icon only, title="Software" tooltip on hover
```
Internal config table (module-level constant, not recreated per render):

```ts
const TYPE_CONFIG: Record<SubscriptionDeliveryType, { icon: LucideIcon; label: string; bg: string; fg: string }> = {
	software:   { icon: Key,           label: 'Software',   bg: M3.primaryContainer,     fg: M3.primary },
	saas:       { icon: Cloud,         label: 'SaaS',        bg: M3.secondaryContainer,   fg: M3.secondary },
	membership: { icon: Shield,        label: 'Membership',  bg: M3.infoContainer,        fg: M3.info },
	download:   { icon: Download,      label: 'Download',    bg: M3.successContainer,     fg: M3.success },
	course:     { icon: GraduationCap, label: 'Course',       bg: M3.warningContainer,     fg: M3.warning },
	service:    { icon: Briefcase,     label: 'Service',      bg: M3.surfaceContainerHigh, fg: M3.onSurfaceVariant },
};
```

Renders: icon (14px default / 12px small) + label text, `rounded-full` pill, `bg`/`fg` from the
config.

### B.2 `ChurnScoreBadge`

```ts
// src/app/components/Subscriptions/shared/ChurnScoreBadge.tsx
interface ChurnScoreBadgeProps {
	score: number;   // 0–100
}
```

**What it looks like:**
```
Low (0–25):      ( 12 )   green bg / green text
Medium (26–50):  ( 38 )   yellow bg / dark-yellow text
High (51–75):     ( 65 )   orange bg / dark-orange text  ← custom color, M3 has no orange token
Critical (76–100): ( 92 )  red bg / red text
```
4 bands, matching the backend `ChurnScorer` bands exactly (`subscription-final-feature-rnd.md` § 9):

```ts
const zone = score <= 25 ? 'low' : score <= 50 ? 'medium' : score <= 75 ? 'high' : 'critical';
const ZONE_COLORS = {
	low:      { bg: M3.successContainer, fg: M3.success },
	medium:   { bg: M3.warningContainer, fg: M3.warning },
	high:     { bg: '#FFE0CC',          fg: '#7D3200' },   // custom — M3 has no orange token
	critical: { bg: '#FFDAD6',          fg: M3.error },
};
```

Renders a small pill with just the number, `Roboto Mono`. Used in: table "Churn score" column
(Phase 1), Detail page Overview tab (Phase 3), Analytics churn risk table (Phase 4).

### B.3 `ChurnGauge`

Bigger visual sibling of `ChurnScoreBadge` for the Detail page Overview tab.

```ts
// src/app/components/Subscriptions/shared/ChurnGauge.tsx
interface ChurnGaugeProps {
	score: number;   // 0–100
}
```

**What it looks like:**
```
Score: 88 · Critical

  Low         Medium        High        Critical
 ┌────────┐  ┌────────┐   ┌────────┐   ┌────────┐
 │ dimmed │  │ dimmed │   │ dimmed │   │ FULL RED│  ← segment containing the score is full-opacity
 └────────┘  └────────┘   └────────┘   └────────┘
  0–25         26–50        51–75        76–100
```
Recommended build: 4 horizontal segments (Low/Medium/High/Critical) side by side, the segment
containing `score` highlighted full-opacity in its zone color, the others dimmed (`opacity: 0.25`);
score number + zone label (`"Critical"`, etc.) shown above the bar. Horizontal segmented bar chosen
over a semicircular arc — no SVG arc math needed, buildable with plain `<div>`s. Reuses the same
`ZONE_COLORS` mapping as `ChurnScoreBadge` — import it from there rather than redefining, or hoist
both into a shared `churn-zones.ts` helper if that's cleaner.

### B.4 `InstallmentProgress`

Split-payment progress indicator.

```ts
// src/app/components/Subscriptions/shared/InstallmentProgress.tsx
interface InstallmentProgressProps {
	completed: number;
	total: number;
	nextDate?: string | null;     // omit the "Next: ..." suffix if null/undefined
	nextAmount?: string | null;
}
```

**What it looks like:**
```
●●○  2 of 3 installments · Next: $83 on Feb 15
```
`completed` dots filled `M3.primary`, remaining (`total - completed`) dots as rings
(`border: 1px solid M3.outlineVariant`), then text `"{completed} of {total} installments"`, then —
if `nextDate` provided — `"· Next: {nextAmount} on {nextDate}"`. Used in: table "Payment type" column
(Phase 1, when `paymentType === 'split'`), Detail page Overview tab split-payment block (Phase 3).

### B.5 `CardExpiryWarning`

```ts
// src/app/components/Subscriptions/shared/CardExpiryWarning.tsx
interface CardExpiryWarningProps {
	expiryDate: string;          // 'MM/YYYY'
	onSendUpdateLink: () => void;
}
```

**What it looks like:**
```
┌──────────────────────────────────────────────────────────┐
│ ⚠ Payment card expires 02/2025 — send an update link     │  ← last phrase underlined, clickable
└──────────────────────────────────────────────────────────┘
  amber background (M3.warningContainer), amber text (M3.warning)
```
The caller wires `onSendUpdateLink` to whatever confirm-then-toast flow it wants (list-row context
menu reuses the existing "Send Card Update Email" action; Detail page wires directly to
`showToast`). This component contains **no** confirm-dialog logic itself — keep it dumb, let the
page decide the confirmation UX.

### B.6 `StepIndicator`

Multi-step modal progress dots — used by `CancellationFlowModal` (Phase 2, 3 steps) and reusable for
any future multi-step modal.

```ts
// src/app/components/Subscriptions/shared/StepIndicator.tsx
interface StepIndicatorProps {
	steps: number;
	current: number;    // 0-indexed
}
```

**What it looks like:**
```
        (✓)───────────(●)───────────( )
       done          current       upcoming
```
Indices `< current` show a filled checkmark (`backgroundColor: M3.primary`, white check icon), index
`=== current` is a filled solid dot (`backgroundColor: M3.primary`, no check), indices `> current`
are empty rings (`border: 1px solid M3.outlineVariant`). Centered at the top of the modal body, below
the header.

### B.7 `CancellationReasonList`

```ts
// src/app/components/Subscriptions/shared/CancellationReasonList.tsx
import type { CancellationReason } from '../../../utils/subscription-types';

interface CancellationReasonListProps {
	reasons: CancellationReason[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	textValue: string;                 // controlled value for the expanding text box
	onTextChange: (value: string) => void;
}
```

**What it looks like:**
```
○  Too expensive
○  Not using it enough
●  Missing features I need                    ← selected reason, hasTextBox: true
   ┌─────────────────────────────────────┐
   │ Tell us more (optional)              │    ← expands directly below the selected reason,
   └─────────────────────────────────────┘       not as a separate field at the bottom
○  Switching to another product
○  Temporary — taking a break
○  Other
```
Renders a radio list from `reasons` (pass `CANCELLATION_REASONS` from static data). Radio styling
matches the existing plan-picker pattern already in `SubscriptionsPage.tsx`'s Change Plan modal
(bordered card, `M3.primary` ring when selected) — reuse that visual language rather than inventing
a new radio style.

### B.8 `RetentionOfferCard`

```ts
// src/app/components/Subscriptions/shared/RetentionOfferCard.tsx
import type { RetentionOffer } from '../../../utils/subscription-types';

interface RetentionOfferCardProps {
	offer: RetentionOffer;
	currentAmount: string;             // e.g. '$49/mo' — for the discount before/after preview
	onAccept: () => void;
	onDecline: () => void;
}
```

**What it looks like:**
```
┌──────────────────────────────────────────────────────┐
│  🏷  Get 20% off for 3 months                          │
│      20% off your next 3 renewals.                     │
│                                                          │
│      $49/mo  →  $39.20/mo   for 3 months                │
│                                                          │
│      [ Accept Offer ]      Continue Cancelling →         │
└──────────────────────────────────────────────────────┘
  2px M3.primary border, M3.primaryContainer background

Contact-type variant (no Accept button):
┌──────────────────────────────────────────────────────┐
│  🎧  Talk to our team                                   │
│      We may already support this — let us check.        │
│      [ Open Support Chat ]                               │
│                             Continue Cancelling →         │
└──────────────────────────────────────────────────────┘
```
Icon by `offer.type` (`Tag` for discount, `PauseCircle` for pause, `SkipForward` for skip,
`ArrowDownRight` for downgrade, `Headphones` for contact — confirm exact `lucide-react` export name
when implementing). Footer buttons: `[Accept Offer]` (`FilledButton`, calls `onAccept`) and
`[Continue Cancelling →]` (`TextButton`, calls `onDecline`) — except for `contact` type, which shows
a support-chat button instead of Accept.

### B.9 `SubscriptionTimeline`

```ts
// src/app/components/Subscriptions/shared/SubscriptionTimeline.tsx
import type { SubscriptionLogEntry } from '../../../utils/subscription-types';

interface SubscriptionTimelineProps {
	events: SubscriptionLogEntry[];
}
```

**What it looks like:**
```
🔴 webhook   Payment failed: active → past_due            Jan 8, 9:15 AM    $49.00
             Stripe

⚪ system    Retry scheduled for 2025-01-11                Jan 8, 9:15 AM
             System
```
Vertical feed, most recent first (sort in the consumer, this component just renders in the order
given). Each row: an icon + colored chip keyed off `event.actorType` (`system` → gray, `customer` →
`M3.info`, `admin` → `M3.primary`, `webhook` → `M3.secondary`), then a one-line description built
from `event`/`oldStatus`/`newStatus` (e.g. `"Status changed: active → past_due"` when both are
present, else fall back to `event.note` or a humanized `event.event` string), then `createdAt`
formatted as a relative-or-absolute date on the right, then `event.amount` in `Roboto Mono` if
present. Used exclusively by the Status History tab (Phase 3).

### B.10 `RevenueGoalCard`

```ts
// src/app/components/Subscriptions/shared/RevenueGoalCard.tsx
import type { RevenueGoal } from '../../../utils/subscription-types';

interface RevenueGoalCardProps {
	goal: RevenueGoal;
	onDelete?: () => void;
}
```

**What it looks like:**
```
┌────────────────────────────────────────────┐
│ MRR Target Q3                 [ On Track ] │
│ ████████████████░░░░░░░░  77%               │
│ $2,310 of $3,000                       🗑   │  ← 🗑 (delete) only shown if onDelete passed
└────────────────────────────────────────────┘
```
`Card`-wrapped: `goal.label` + a type badge (`MRR`/`ARR`/`Total Revenue`), a progress bar
(`current / target`, capped visually at 100% even if `current > target`), a percentage readout, and a
status chip (`on_track` → success colors, `at_risk` → warning colors, `exceeded` → info colors).
Trailing `IconButton` (Trash2 icon) shown only when `onDelete` is passed — Settings' Revenue Goals
section (Phase 5) passes it, a read-only Analytics widget placement (Phase 4) does not.

### B.11 `SettingsSectionHeader`

```ts
// src/app/components/Subscriptions/shared/SettingsSectionHeader.tsx
interface SettingsSectionHeaderProps {
	title: string;
	description?: string;
}
```

**What it looks like:**
```
Billing & Dunning
Configure retry attempts and grace periods before suspension
──────────────────────────────────────────────────────────── ← border-b, M3.outlineVariant
```
Bold `text-sm font-semibold` title in `M3.onSurface`, optional `text-xs` description in
`M3.onSurfaceVariant` below it. Marks the start of each settings section (General, Billing &
Dunning, etc. — see `07-settings-page.md`).

### B.12 `SettingsField`

Label + a plain text/number input, one row. The general-purpose version other Settings* fields
specialize.

```ts
// src/app/components/Subscriptions/shared/SettingsField.tsx
interface SettingsFieldProps {
	label: string;
	value: string | number;
	onChange: (value: string) => void;
	type?: 'text' | 'number';
	suffix?: string;       // e.g. 'days', '%'
	helpText?: string;
	disabled?: boolean;
}
```

**What it looks like:**
```
Max retry attempts                                          [   3   ] attempts
Active grace days (past_due → suspended)                    [   7   ] days
```
Layout: `flex items-center justify-between` — label + optional `helpText` (small text under the
label) on the left, input (max-width ~160px, right-aligned text) + optional `suffix` label on the
right. Matches the settings mockups in `RND-subscriptions-frontend.md` § 11.

### B.13 `SettingsSelectField`

```ts
// src/app/components/Subscriptions/shared/SettingsSelectField.tsx
interface SettingsSelectFieldProps {
	label: string;
	value: string;
	options: { label: string; value: string }[];
	onChange: (value: string) => void;
	helpText?: string;
	disabled?: boolean;
}
```

**What it looks like:**
```
LMS integration                                    [ LearnDash            ▾ ]
```
Same row layout as `SettingsField`, native `<select>` styled to match (`border: 1px solid
M3.outlineVariant`, `rounded-lg`, no browser default chrome beyond that). Used for e.g. "LMS
integration", "Content restriction plugin", role pickers.

### B.14 `SettingsToggleField`

```ts
// src/app/components/Subscriptions/shared/SettingsToggleField.tsx
import { Toggle } from '../../ui/Toggle';

interface SettingsToggleFieldProps {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	helpText?: string;
	disabled?: boolean;
}
```

**What it looks like:**
```
Enable auto-renewal                                              [        ●]
Allow customer self-cancel                                       [●        ]
```
Same row layout, renders the real `ui/Toggle` (§ A.1) on the right instead of an input — composed,
not reimplemented. This is the field type used most across `07-settings-page.md` — most subscription
settings are booleans.

### B.15 `SettingsTextareaField`

Not in the prior docs' primitive list, but needed: `RND-subscriptions-frontend.md` § 11.9 and § 12
both show multi-line settings ("Staging/blocked domains [textarea, one per line]", "Default
deliverable notes template [textarea]", "Available tiers [textarea: Gold, Silver, Bronze]") with no
component defined to render them. Without this, Phase 5 would fall back to a raw `<textarea>`, which
`RND-FE` § 18's design rules explicitly forbid ("never a raw `<input>` in settings panel" — extending
that rule to textareas for consistency).

```ts
// src/app/components/Subscriptions/shared/SettingsTextareaField.tsx
interface SettingsTextareaFieldProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	rows?: number;         // default 3
	placeholder?: string;
	helpText?: string;
	disabled?: boolean;
}
```

**What it looks like:**
```
Staging / blocked domains
Domains that should never trigger a live renewal charge
┌────────────────────────────────────────────────────────┐
│ staging.example.com                                     │
│ dev.example.com                                         │
│                                                          │
└────────────────────────────────────────────────────────┘
```
Layout: label + `helpText` stacked above (not side-by-side like the other Settings* fields — a
textarea needs the full row width), then the `<textarea>` below, full width, same border/radius
treatment as `SettingsSelectField`.

---

## Part C — What each later file consumes

Quick lookup so nothing gets built twice:

| Component | Used by |
|---|---|
| `Toggle` | `SettingsToggleField` (internally), anywhere else a bare toggle is needed |
| `StatCard` | `03-subscriptions-list-page.md` (KPI strip), `06-analytics-page.md` (KPI cards) |
| `SettingsSectionHeader`, `SettingsField`, `SettingsSelectField`, `SettingsToggleField`, `SettingsTextareaField` | `07-settings-page.md` exclusively |
| `SubscriptionTypeBadge` | `03-subscriptions-list-page.md` (Type column), `05-subscription-detail-page.md` (header) |
| `ChurnScoreBadge` | `03-subscriptions-list-page.md`, `05-subscription-detail-page.md`, `06-analytics-page.md` |
| `ChurnGauge` | `05-subscription-detail-page.md` (Overview tab) only |
| `InstallmentProgress` | `03-subscriptions-list-page.md`, `05-subscription-detail-page.md` |
| `CardExpiryWarning` | `03-subscriptions-list-page.md` (row indicator wraps a smaller inline use), `05-subscription-detail-page.md` (Overview tab banner) |
| `StepIndicator`, `CancellationReasonList`, `RetentionOfferCard` | `04-action-modals.md` (`CancellationFlowModal`) exclusively |
| `SubscriptionTimeline` | `05-subscription-detail-page.md` (Status History tab) only |
| `RevenueGoalCard` | `06-analytics-page.md`, `07-settings-page.md` |

---

## Manual test checklist for this file

- [ ] All 7 `ui/` primitives render standalone in isolation (e.g. a throwaway page or Storybook-less manual check in `App.tsx` temporarily) with both `checked`/`unchecked` and `disabled` states
- [ ] `SubscriptionTypeBadge` renders correctly for all 6 `SubscriptionDeliveryType` values using the sample data from file 01
- [ ] `ChurnScoreBadge`/`ChurnGauge` band boundaries verified at the edges: 25, 26, 50, 51, 75, 76 (off-by-one errors here would silently miscolor real customer risk — worth being exact)
- [ ] `RetentionOfferCard` renders all 5 `RetentionOffer['type']` variants using `CANCELLATION_REASONS` from file 01, including the `contact`-type special case (no Accept button)
- [ ] `SubscriptionTimeline` renders both sample `subscriptionLogsData` entries (`SUB-003`, `SUB-009`) without crashing on the entries that have `null` `oldStatus`/`newStatus`
- [ ] No new external dependency was added — everything above uses only `lucide-react` icons + inline M3-token styles, per the design-consistency rule in `00-overview.md`

---

Next file: `03-subscriptions-list-page.md` (Phase 1 — the table rebuild, KPI strip, filters, and
per-delivery-type row actions, built on top of files 01 and 02).

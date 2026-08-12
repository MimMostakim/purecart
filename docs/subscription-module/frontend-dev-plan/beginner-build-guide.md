# PureCart Subscriptions — Beginner Build Guide (Frontend)

**What this file is:** a plain-language, point-by-point build log for the Subscriptions admin
screen — written for someone with no development background. Each step says: what gets built, what
it does, and what happens when a user interacts with it (events). Work happens **one step at a time**
— nothing gets coded until the step below it is approved.

**Companion docs (technical detail, written for developers):**
- `00-overview.md` — architecture & phase list
- `01-data-model.md` — full TypeScript data shapes
- `02-shared-components.md` — full component specs

---

## ⚠️ Architecture amendment — supersedes `00-overview.md` § 2

`00-overview.md`'s tech stack table says *"do not introduce `react-router-dom`"* and *"no state
management library — local `useState` per page."* That's now out of date: the branch already added
**`react-router-dom`** (hash routing) and **Redux Toolkit** (`src/app/store/`) ahead of this plan.

**Decision (confirmed with the team, 2026-08-09):** build subscriptions data into Redux, not local
`useState`. Every step below is written against that decision. `00-overview.md` § 2 should eventually
be edited to match — not done yet, flagging it here so it isn't lost.

---

## Vocabulary (plain terms used throughout this guide)

| Word | Means |
|---|---|
| **Component** | One reusable screen-piece — a button, a table row, a whole page. Like a Lego brick snapped together with other bricks. |
| **Props** | Settings handed to a component from outside (e.g. "show this customer's name"). The component doesn't decide these itself. |
| **State** | A piece of memory — "is this toggle currently on?" |
| **Redux store** | One shared memory bank for the whole app, instead of every screen keeping its own private memory. Lets the Subscriptions List page and the Detail page both see "which subscription is selected" without passing it hand-to-hand. |
| **Event** | Something the user *does* — a click, a typed character — that a component reports outward so something else can react to it. |
| **Action** (Redux term for an event) | A reported event that updates the shared memory bank, e.g. "user clicked this row." |

---

## How this guide works

1. I write one step (or a small handful) below, in the format: **what it is → features → events.**
2. You review, ask questions, or say "okay."
3. I add the next step(s) to this file and we keep going, in order.
4. Nothing gets built in actual code until you say to start writing it.

---

## Step 1 — Build the Data Blueprint (`subscription-types.ts`)

**1. What it is:** a new file that is pure description, no visuals. It defines exactly what fields
exist on "one subscription" — customer name, price, status, next payment date, etc. — plus the 6
"delivery types" (software / SaaS / membership / download / course / service), each with its own
extra fields.

**2. Features:** none — it's a blueprint, not a working piece. It's the single source of truth every
other file points back to, so a table column, a detail-page field, and a filter dropdown all agree on
spelling, capitalization, and possible values (e.g. `'past_due'`, not `'past-due'`).

**3. Events:** none. No buttons here — this file only defines shapes.

*Why first:* every component built afterward reads from this blueprint. Skipping it means guessing
field names as you go, then re-typing components later when the guess turns out wrong.

**Status:** ⬜ Not started

---

## Step 2 — Build the Redux Memory Bank (`subscriptionsSlice.ts`)

This file already exists in the repo but is intentionally empty (a placeholder). This step fills it in.

**1. What it is:** the shared memory for everything subscription-related — the full list of
subscriptions (starting from fake sample data, later real data), which one row is currently
selected, and which filters are active (status, search text).

**2. Features:**
- Holds the list of every subscription record (using Step 1's blueprint)
- Remembers which single subscription is "selected" (so the Detail page, built later, knows who to show)
- Remembers active filters (e.g. "only show `past_due`")
- Starts out pre-loaded with fake sample data — no real backend yet

**3. Events it responds to** (Redux calls these "actions"):
- **Page loads** → fills the memory bank with the sample subscription list
- **User clicks a row** → stores "this is the selected subscription" — read later by the Detail page
- **User types in the search box / clicks a filter chip** → updates the active filter; the table re-shows only matching rows

*Why this goes right after Step 1, before any visible component:* every table, badge, and page built
afterward just *reads* from this memory bank and *reports events* into it, instead of inventing its
own private copy of subscription data.

**Status:** ⬜ Not started

---

## Roadmap — steps still to be detailed here, in order

Detail for each of these gets added to this file one at a time, same format as Steps 1–2 above, as we
reach it. Names only for now — this is just the map, not the instructions yet.

### Phase 0 — Foundation (Steps 1–2 above, plus the first visible pieces)
- [ ] 7 small reusable controls: `Toggle`, `StatCard`, `SettingsSectionHeader`, `SettingsField`, `SettingsSelectField`, `SettingsToggleField`, `SettingsTextareaField`
- [ ] 10 subscription-specific pieces: `SubscriptionTypeBadge`, `ChurnScoreBadge`, `ChurnGauge`, `InstallmentProgress`, `CardExpiryWarning`, `StepIndicator`, `CancellationReasonList`, `RetentionOfferCard`, `SubscriptionTimeline`, `RevenueGoalCard`

### Phase 1 — Subscriptions List Page
- [ ] Rebuilt table (fixes the duplicate "Product" column bug), 6-card KPI strip, expanded filters, row actions for all 6 delivery types

### Phase 2 — Action Popups (modals)
- [ ] 3-step Cancel flow, Early Renewal, Skip Cycle, Pause-with-Duration, SCA Reauth, Send Card Update, plus 3 existing popups pulled out into their own files

### Phase 3 — Subscription Detail Page
- [ ] New page: header + 5 tabs (Overview / Payment Log / Status History / Emails Sent / Retention) + 1 tab that changes based on delivery type

### Phase 4 — Analytics Page
- [ ] New page: KPIs, 5 charts, churn risk table, revenue goals widget

### Phase 5 — Settings Page
- [ ] New page with a Subscriptions tab holding 14 sections (General, Billing & Dunning, Retention, etc.)

### Phase 6 — Navigation & Polish
- [ ] Wire everything into the app's menu/routing, empty states, final visual consistency pass

---

**Icons:** ⬜ Not Started · 🔄 In Progress · ✅ Complete

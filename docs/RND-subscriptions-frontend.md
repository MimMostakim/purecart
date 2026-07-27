# PureCart — Subscription Frontend R&D

> **Scope:** Admin UI only (`src/app/`). All analysis is based on end-to-end reading of the current
> React/TypeScript codebase. Cross-references the backend subscription model in `docs/RND-subscriptions.md`.

> **Customer-facing UI is NOT React.** The WooCommerce My Account portal (what customers see at
> `/my-account/purecart-subscriptions/`) is server-rendered PHP using WC templates. It is fully
> specified in `docs/RND-subscriptions.md` → **§ Customer My Account Portal**. This document covers
> only the PureCart wp-admin React panel.

---

## WooCommerce Integration Context (Admin Panel)

The React admin panel is embedded in the WordPress admin via a single `<div id="purecart-root">` mount point rendered by a PHP page hook. It calls the PureCart REST API (`/purecart/v1/`) — **not** the WooCommerce REST API.

Key WooCommerce-specific concerns for the admin React panel:

| Concern | Implementation note |
|---|---|
| WP Admin color scheme | React panel uses M3 tokens (not WP admin colors); panel is visually self-contained |
| Auth / nonce | All REST requests include `X-WP-Nonce` header (value injected via `wp_localize_script` as `purecartConfig.nonce`) |
| i18n | All user-facing strings use `__( 'text', 'purecart' )` on the PHP side; React uses string constants (no WP i18n in React) |
| Admin menu | PureCart admin menu registered via `add_menu_page` / `add_submenu_page`; React renders within the page output |
| Product edit links | Subscription list "Product" column links to `/wp-admin/post.php?post={productId}&action=edit` |
| Order links | Payment log "Order" links to `/wp-admin/post.php?post={orderId}&action=edit` (or HPOS equivalent) |
| Customer My Account link | "View Customer Portal" action opens `/my-account/purecart-subscription/{id}/` in a new tab |
| WC Payment methods page | "Update Card" action links customer to `/my-account/payment-methods/` |

### Injected Config Object

PHP injects a `purecartConfig` global via `wp_localize_script` before the React bundle loads:

```ts
declare global {
  interface Window {
    purecartConfig: {
      nonce: string;           // wp_create_nonce( 'wp_rest' )
      restBase: string;        // e.g. 'https://example.com/wp-json/purecart/v1'
      adminUrl: string;        // e.g. 'https://example.com/wp-admin/'
      myAccountUrl: string;    // e.g. 'https://example.com/my-account/'
      currentUser: number;     // get_current_user_id()
      currency: string;        // get_woocommerce_currency_symbol()
      dateFormat: string;      // get_option('date_format')
    };
  }
}
```

This config object must be defined in `src/app/utils/config.ts` and imported wherever REST calls are made.

---

## 1. Tech Stack & Constraints

| Concern | Current choice |
|---|---|
| Framework | React 18, TypeScript, `strict_types` via tsconfig |
| Styling | Tailwind utility classes (core only, no JIT) + inline `style={}` M3 tokens |
| Design system | Material Design 3 tokens (`M3` object in `static-data.tsx`) |
| Typography | Roboto (body/labels), Roboto Mono (IDs, amounts, keys) |
| Charts | Recharts — `LineChart`, `BarChart`, `PieChart`, `ResponsiveContainer` |
| Routing | Zero-dependency state machine: `useState<Page>` in `App.tsx` — **no React Router** |
| Icons | `lucide-react` |
| State | Local `useState` per page — no global store (Redux/Zustand/Context) |
| API | Not yet wired to REST — all data is static from `utils/static-data.tsx` |
| Modals | Inline fixed-position overlays with `rgba(0,0,0,0.40)` backdrop |
| Toast | `<Toast>` component, auto-dismisses after 3 s |

### M3 Color Tokens (reference)
```ts
M3.primary          = '#6750A4'   // actions, active states
M3.primaryContainer = '#EADDFF'   // selected backgrounds
M3.secondary        = '#625B71'
M3.secondaryContainer = '#E8DEF8'
M3.surface          = '#FFFBFE'
M3.surfaceContainerLow  = '#F7F2FA'
M3.surfaceContainer     = '#F3EDF7'
M3.surfaceContainerHigh = '#ECE6F0'
M3.onSurface        = '#1C1B1F'
M3.onSurfaceVariant = '#49454F'
M3.outlineVariant   = '#CAC4D0'
M3.error   = '#B3261E'
M3.success = '#386A20'   M3.successContainer = '#C2E7A0'
M3.warning = '#7A5900'   M3.warningContainer = '#FFDEA5'
M3.info    = '#00629D'   M3.infoContainer    = '#C8E6FF'
```

---

## 2. Current Component Inventory

### 2.1 UI Primitives (`src/app/components/ui/`)

| Component | Purpose |
|---|---|
| `Card` | White surface wrapper, rounded corners |
| `StatusBadge` | Colored pill for status strings |
| `FilterChip` | Dropdown chip with All + options |
| `ActionDropdown` | 3-dot menu with grouped actions + dividers |
| `ConfirmDialog` | Modal with icon, title, body, danger/safe confirm |
| `Toast` | Bottom-center notification, auto-dismiss |
| `FilledButton` | Primary action, danger variant |
| `OutlinedButton` | Secondary action, small variant |
| `TonalButton` | Mid-weight action |
| `TextButton` | Ghost/link style, small variant |
| `IconButton` | Icon-only button |
| `KpiCard` | Metric card with label, value, trend, icon |
| `StatCard` | Smaller stat display |
| `SectionTitle` | Section heading with divider |
| `SettingsField` | Label + input row for settings |
| `SettingsSelectField` | Label + `<select>` row |
| `SettingsToggleField` | Label + toggle row |
| `SettingsSectionHeader` | Bold section header within a settings panel |
| `Toggle` | On/off switch |
| `TrendChip` | Up/down delta chip |
| `RowActionMenu` | Inline row action button |
| `TopBar` | Page header with breadcrumb |
| `Sidebar` | Left nav, collapsible, module-aware |

### 2.2 Subscription Pages (current)

#### `SubscriptionsPage` — `/subscriptions`
- **KPI strip (4 cards):** Active · Paused · Past Due · Cancelled This Month
- **Filter bar:** text search + `FilterChip` (Status, Product, Cycle) + Export CSV
- **Table columns:** ☑ · ID (mono) · Customer+Product (stacked) · Product *(duplicate bug)* · Amount (mono) · Cycle (pill) · Status (`StatusBadge`) · Next Payment · `ActionDropdown`
- **Row action groups:**
  - *Navigation:* View Customer · View Payment History · Send Payment Receipt
  - *Billing:* Retry Payment *(past-due only)* · Update Payment Method
  - *Plan:* Change Plan · Apply Discount · Extend Trial +7d *(trialing only)*
  - *Status:* Pause *(active only)* · Resume *(paused only)*
  - *Destructive:* Cancel · Refund Last Payment · Delete Record
- **Modals:** Change Plan (radio plan picker + proration note) · Apply Discount (%, duration picker, live price preview) · Payment History (scrollable list per sub ID)
- **Bulk action bar (floats bottom):** Pause All · Send Receipts · Cancel N

#### `SubscriptionAnalyticsPage` — `analytics-subscriptions`
- Date range toggle: 30d / 3m / 6m / 12m
- **KPIs:** Active Subs · New This Month · Churn Rate · Sub MRR
- **Charts:** LineChart (active/new/churned/paused trend) · PieChart (plan mix) · BarChart (revenue by product)
- **Churn Risk table:** at-risk rows + "Send Reminder" action

### 2.3 Settings (`SettingsPage`)
Current tabs: Modules · Licensing · Downloads · Emails · Advanced *(no Subscriptions tab)*

---

## 3. Current TypeScript Data Shapes

```ts
// static-data.tsx — current subscription record
type SubscriptionRow = {
  id: string;            // 'SUB-001'
  customer: string;      // display name
  product: string;
  amount: string;        // '$99/yr' (formatted string)
  cycle: string;         // 'Monthly' | 'Annual' | 'Lifetime'
  status: string;        // 'active' | 'paused' | 'past-due' | 'cancelled' | 'trialing'
  nextPayment: string;   // ISO date or '—'
};

type PlanOption = {
  label: string; amount: string; cycle: string; note: string;
};

type DiscountDuration = 'Once' | '3 months' | '6 months' | 'Forever';

type PaymentRecord = {
  date: string; amount: string; method: string;
  status: 'paid' | 'failed' | 'trial';
};
```

**Gaps vs backend model:** no `payment_type`, `churn_risk_score`, `customer_ltv`,
`max_renewals`, `payments_completed`, `pending_switch_product`, `pending_switch_type`,
`pause_end_date`, `cancellation_date`, `access_timing`, `skip_count`.

---

## 4. Subscription Delivery Types

PureCart is not limited to a single subscription model. It supports **6 delivery types**,
each with distinct admin UI requirements. The delivery type is derived from product meta
(`_purecart_sub_delivery_type`) and determines which columns, tabs, row actions, and
analytics are shown for that subscription.

### 4.1 Type Overview

| Type | Icon | Delivery mechanism | Linked entity | Example products |
|---|---|---|---|---|
| **Software / Plugin** | `Key` | License key + auto-updates | `license_id` | Plugin Pro, Theme Bundle, WP themes |
| **SaaS Platform** | `Cloud` | Account provisioning + seat management | `saas_account_id` | Project tools, CRM, analytics dashboards |
| **Membership** | `Shield` | WordPress role → content restriction | WP user role | Premium club, community access, member portal |
| **Digital Download** | `Download` | Recurring file/media access + drip | WC download permissions | Stock photos, ebooks, templates, audio packs |
| **Learning / Course** | `GraduationCap` | LMS enrollment (LearnDash / LifterLMS / Tutor LMS) | External LMS enrollment ID | Online courses, bootcamps, certifications |
| **Service / Retainer** | `Briefcase` | Manual invoicing + deliverable tracking | None | Monthly agency retainer, consulting, support plan |

> **How the type is stored:** `_purecart_sub_delivery_type` product meta. When `license_id`
> is set, always treat as Software regardless of this meta. When `saas_account_id` is set,
> always treat as SaaS.

---

### 4.2 Type-Aware TypeScript additions

```ts
export type SubscriptionDeliveryType =
  | 'software'      // license key + updates
  | 'saas'          // account provisioning + seats
  | 'membership'    // WP role + content restriction
  | 'download'      // recurring file/media access
  | 'course'        // LMS enrollment
  | 'service';      // manual retainer / agency

// Linked entity summary (only one will be non-null per record)
export interface SubscriptionLinkedEntity {
  type: SubscriptionDeliveryType;

  // software
  licenseId: string | null;
  licenseKey: string | null;
  domainCount: string | null;         // '2/3'

  // saas
  saasAccountId: string | null;
  saasAccountName: string | null;
  seatUsage: string | null;           // '18/25'

  // membership
  membershipTier: string | null;      // 'Gold', 'Silver', 'Bronze'
  assignedRole: string | null;        // WP role slug
  contentAccessLabel: string | null;  // 'Premium + Community'

  // download
  downloadsThisCycle: number | null;
  downloadLimit: number | null;       // null = unlimited
  nextDripDate: string | null;        // ISO date

  // course
  enrolledCourses: string[];          // course titles
  lmsEnrollmentId: string | null;
  courseAccessUntil: string | null;   // ISO date

  // service
  deliverableNotes: string | null;
  nextDeliverableDue: string | null;
}

// Add to SubscriptionRecord:
//   deliveryType: SubscriptionDeliveryType;
//   linkedEntity: SubscriptionLinkedEntity;
```

---

### 4.3 Type badge component — `SubscriptionTypeBadge`

```tsx
// Renders a small colored icon-pill in the table and detail page header
// Props: type: SubscriptionDeliveryType
const TYPE_CONFIG = {
  software:   { icon: Key,            label: 'Software',   bg: M3.primaryContainer,   fg: M3.primary   },
  saas:       { icon: Cloud,          label: 'SaaS',       bg: M3.secondaryContainer, fg: M3.secondary },
  membership: { icon: Shield,         label: 'Membership', bg: M3.infoContainer,      fg: M3.info      },
  download:   { icon: Download,       label: 'Download',   bg: M3.successContainer,   fg: M3.success   },
  course:     { icon: GraduationCap,  label: 'Course',     bg: M3.warningContainer,   fg: M3.warning   },
  service:    { icon: Briefcase,      label: 'Service',    bg: M3.surfaceContainerHigh, fg: M3.onSurfaceVariant },
};
```

---

### 4.4 Type-specific table columns

The main subscriptions table adds a **"Type"** column showing `SubscriptionTypeBadge`, and
a **"Linked"** column that renders different content based on type:

| Type | "Linked" column content |
|---|---|
| Software | `Key` icon + license key (truncated) + domain count `2/3` |
| SaaS | `Cloud` icon + account name + seat count `18/25` |
| Membership | `Shield` icon + tier name + role badge |
| Download | `Download` icon + `3/10 downloads` this cycle |
| Course | `GraduationCap` icon + enrolled course count |
| Service | `Briefcase` icon + next deliverable date |

---

### 4.5 Type-specific row actions

In addition to the universal actions (pause, cancel, change plan, etc.):

**Software:**
```ts
{ label: 'View License', icon: Key, onClick: () => navigate('license-detail') }
{ label: 'Revoke License', icon: XCircle, danger: true }
{ label: 'Reset Activations', icon: RotateCcw }
```

**SaaS:**
```ts
{ label: 'View Account', icon: Cloud, onClick: () => navigate('saas-detail') }
{ label: 'Adjust Seat Count', icon: Users }
{ label: 'Suspend Account', icon: PauseCircle, danger: false }
```

**Membership:**
```ts
{ label: 'Change Tier', icon: ArrowUpRight }
{ label: 'View Restricted Content', icon: Lock }
{ label: 'Extend Grace Period (+7 days)', icon: Calendar }
```

**Download:**
```ts
{ label: 'Reset Download Count', icon: RotateCcw }
{ label: 'Send New Content Email', icon: Mail }
{ label: 'Manage Drip Schedule', icon: Clock }
```

**Course:**
```ts
{ label: 'View Course Progress', icon: BarChart2 }
{ label: 'Extend Course Access (+30 days)', icon: Calendar }
{ label: 'Resend Enrollment Email', icon: Mail }
```

**Service:**
```ts
{ label: 'Mark Deliverable Complete', icon: CheckCircle }
{ label: 'Send Invoice', icon: FileText }
{ label: 'Add Deliverable Note', icon: Edit }
```

---

### 4.6 Type-specific detail page tabs

The Subscription Detail page renders a **type-specific tab** between Overview and Payment Log:

| Type | Tab name | Tab contents |
|---|---|---|
| Software | **License** | License key (copyable), activation domains list, activation limit, revoke/reset buttons |
| SaaS | **Account** | Account name, seats used/total, user list preview, provisioning log, "View Full Account" link |
| Membership | **Access** | Current tier badge, assigned WP role, content restriction status, grace period config, tier history |
| Download | **Downloads** | Downloads used this cycle (progress bar), full download log (file, date, IP), drip content schedule |
| Course | **Courses** | Enrolled course list with access dates, LMS enrollment ID, "Extend Access" per course, progress % if available |
| Service | **Deliverables** | Deliverable notes textarea, past deliverables log (date, note, completed), next due date |

---

### 4.7 Type-specific KPI cards

The `SubscriptionAnalyticsPage` shows a **"By Type"** breakdown section below the main KPIs:

```
[Software]    [SaaS]    [Membership]    [Downloads]    [Courses]    [Service]
  4,120          841        1,204            612           283          181
  active subs  active      active          active        active       active
```

Each card: count of active subscriptions by type, click → filters the main list.

---

### 4.8 Type-specific charts

**Subscription mix by type** — PieChart (adds to analytics page):
```ts
// dataset
export const subTypeMix = [
  { name: 'Software',   value: 58, color: M3.primary },
  { name: 'SaaS',       value: 12, color: M3.secondary },
  { name: 'Membership', value: 17, color: M3.info },
  { name: 'Download',   value: 8,  color: M3.success },
  { name: 'Course',     value: 4,  color: M3.warning },
  { name: 'Service',    value: 1,  color: M3.onSurfaceVariant },
];
```

**Revenue by type** — horizontal BarChart (adds to analytics page):
```ts
export const subRevenueByType = [
  { type: 'Software',   revenue: 24800 },
  { type: 'SaaS',       revenue: 11200 },
  { type: 'Membership', revenue: 6400  },
  { type: 'Download',   revenue: 2800  },
  { type: 'Course',     revenue: 1900  },
  { type: 'Service',    revenue: 1100  },
];
```

---

### 4.9 Type-specific filter chips

Add to the filter bar:

```tsx
<FilterChip
  label="Type"
  value={filterType}
  options={['Software', 'SaaS', 'Membership', 'Download', 'Course', 'Service']}
  onChange={setFilterType}
/>
```

---

### 4.10 Type-specific sample static data

```ts
// Software subscription (existing pattern — license-linked)
{
  id: 'SUB-001', customer: 'Sarah Johnson', product: 'Plugin Pro',
  deliveryType: 'software',
  linkedEntity: { type: 'software', licenseKey: 'WDD-A1B2-C3D4-E5F6', domainCount: '1/1', licenseId: '1', ... },
  amount: '$99/yr', cycle: 'Annual', status: 'active', churnRiskScore: 12,
}

// SaaS subscription (existing pattern — saas-linked)
{
  id: 'SUB-010', customer: 'Acme Corp', product: 'SaaS Pro',
  deliveryType: 'saas',
  linkedEntity: { type: 'saas', saasAccountId: 'SAAS-001', saasAccountName: 'Acme Corp', seatUsage: '18/25', ... },
  amount: '$299/mo', cycle: 'Monthly', status: 'active', churnRiskScore: 8,
}

// Membership subscription (NEW)
{
  id: 'SUB-011', customer: 'Tom Baker', product: 'Premium Membership',
  deliveryType: 'membership',
  linkedEntity: { type: 'membership', membershipTier: 'Gold', assignedRole: 'premium_member', contentAccessLabel: 'All Content + Community', ... },
  amount: '$19/mo', cycle: 'Monthly', status: 'active', churnRiskScore: 22,
}

// Digital download subscription (NEW)
{
  id: 'SUB-012', customer: 'Nina Patel', product: 'Design Asset Pack',
  deliveryType: 'download',
  linkedEntity: { type: 'download', downloadsThisCycle: 3, downloadLimit: 10, nextDripDate: '2025-02-01', ... },
  amount: '$29/mo', cycle: 'Monthly', status: 'active', churnRiskScore: 18,
}

// Course / LMS subscription (NEW)
{
  id: 'SUB-013', customer: 'Yuki Tanaka', product: 'Developer Bootcamp',
  deliveryType: 'course',
  linkedEntity: { type: 'course', enrolledCourses: ['PHP Mastery', 'React Fundamentals'], lmsEnrollmentId: 'LMS-4421', courseAccessUntil: '2025-12-31', ... },
  amount: '$49/mo', cycle: 'Monthly', status: 'active', churnRiskScore: 5,
}

// Service / retainer subscription (NEW)
{
  id: 'SUB-014', customer: 'Pixel Studio', product: 'Support Retainer',
  deliveryType: 'service',
  linkedEntity: { type: 'service', deliverableNotes: '5 support tickets/month', nextDeliverableDue: '2025-02-28', ... },
  amount: '$149/mo', cycle: 'Monthly', status: 'active', churnRiskScore: 9,
}
```

---

### 4.11 Type-specific email additions

Extending the 25 backend emails with type-specific variants:

| Email | Type | Trigger |
|---|---|---|
| Membership tier upgraded | Membership | Plan change to higher tier |
| Membership tier downgraded | Membership | Plan change to lower tier (retention offer) |
| Membership access expiring | Membership | N days before cancellation_date (pending_cancel) |
| Membership grace period notice | Membership | past_due — access maintained for N days |
| New content available (drip) | Download | Drip delivery date reached |
| Download quota reset | Download | New billing cycle starts |
| Download limit reached | Download | Customer hits quota within cycle |
| Course access granted | Course | Subscription created / trial converted |
| Course access expiring soon | Course | N days before cancellation or expiry |
| Course access revoked | Course | Cancellation / suspension |
| Deliverable submitted | Service | Admin marks deliverable complete |
| Invoice sent | Service | Manual renewal / monthly retainer invoice |

Total email count: **25 core (backend) + 12 type-specific = 37 email types**

---

### 4.12 Type-specific settings sections

Add to `SettingsSubscriptions.tsx` — collapsible, visible only when relevant module/type is used:

**Membership settings:**
```
Grace period after cancellation (days)  [3]   — keep content access briefly after cancel
Content restriction plugin              [select: MemberPress / Restrict Content Pro / custom]
Available tiers                         [textarea: Gold, Silver, Bronze]
Allow self-tier-upgrade                 [●] toggle
```

**Digital Download settings:**
```
Download limit per billing cycle        [10]  number (0 = unlimited)
Reset downloads on renewal              [●]  toggle
Enable drip content delivery            [●]  toggle
Drip interval (days between releases)   [7]   number
```

**Course / LMS settings:**
```
LMS integration                         [select: LearnDash / LifterLMS / Tutor LMS / None]
LMS API key                             [text input, masked]
Default course access duration          [12 months]
Enroll on trial start                   [●]  toggle
Revoke enrollment on cancellation       [●]  toggle
```

**Service / Retainer settings:**
```
Default invoicing mode                  [● Manual  ○ Auto]
Invoice due days (after renewal)        [7]  number
Enable deliverable tracking             [●]  toggle
Default deliverable notes template      [textarea]
```

---

## 4. Extended TypeScript Data Shapes (to add)

```ts
// ── Subscription list record (extended) ──────────────────────────────────────
export interface SubscriptionRecord {
  id: string;
  customer: string;
  customerId: string;          // CUST-xxx
  email: string;
  product: string;
  productId: number;
  amount: string;              // formatted '$99/yr'
  amountRaw: number;           // 99.00
  currency: string;            // 'USD'
  cycle: BillingCycle;
  status: SubscriptionStatus;
  nextPayment: string | null;  // ISO date
  startDate: string;           // ISO date
  paymentMethod: PaymentMethodSummary;

  // Delivery type — determines type-specific UI (see §4)
  deliveryType: SubscriptionDeliveryType;
  linkedEntity: SubscriptionLinkedEntity;

  // New fields from backend model
  paymentType: 'recurring' | 'split';
  paymentsCompleted: number;
  maxPayments: number | null;        // null = unlimited
  accessTiming: 'immediate' | 'after_full_payment' | 'custom_duration';
  accessEndDate: string | null;
  pauseEndDate: string | null;
  cancellationDate: string | null;   // pending_cancel: cancel at this date
  skipCount: number;
  churnRiskScore: number;            // 0–100
  customerLtv: number;               // 24-month projected
  pendingSwitchProduct: string | null;
  pendingSwitchType: 'upgrade' | 'downgrade' | null;
  retentionDiscountRemaining: number; // 0 = none active
  maxRenewals: number | null;
  cardExpiryDate: string | null;     // 'MM/YYYY'
  cardExpiring: boolean;             // within warning threshold
  tags: string[];
}

// NOTE: backend DB ENUM uses underscores (past_due, pending_cancel).
// The REST API will return those exact strings. The display layer maps them
// to hyphenated forms only for legacy reasons in the existing static data.
// New code should match the backend enum values exactly.
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'paused'
  | 'past_due'        // backend enum — existing UI uses 'past-due'; align on next refactor
  | 'pending_cancel'
  | 'suspended'
  | 'cancelled'
  | 'expired'
  | 'completed';      // split payment fully paid

// NOTE: backend stores billing_interval (INT) + billing_period (day/week/month/year).
// The current UI simplifies to 'Monthly' | 'Annual' | 'Lifetime' for display.
// When wiring to the REST API, map billing_interval + billing_period → display string
// and pass product_id (not cycle string) to upgrade/cancel endpoints.
export type BillingCycle = 'Monthly' | 'Annual' | 'Lifetime';
export type BillingPeriod = 'day' | 'week' | 'month' | 'year';
export interface BillingSchedule {
  interval: number;       // e.g. 3 (every 3 months)
  period: BillingPeriod;  // 'month'
  displayLabel: string;   // 'Every 3 months'
}

export interface PaymentMethodSummary {
  brand: string;      // 'Visa' | 'Mastercard' | 'PayPal' | …
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

// ── Extended payment record ───────────────────────────────────────────────────
export interface PaymentRecord {
  id: string;
  date: string;
  amount: string;
  amountRaw: number;
  method: string;
  status: 'paid' | 'failed' | 'refunded' | 'trial' | 'pending';
  transactionId: string | null;
  gatewayResponse: string | null;
  dunningAttempt: number;       // 0 = first try
  isEarlyRenewal: boolean;
  isSplitInstallment: boolean;
  installmentNumber: number | null;
}

// ── Retention offer ───────────────────────────────────────────────────────────
export interface RetentionOffer {
  // Backend defines 5 offer types (RetentionFlow.php):
  // discount, pause, skip (skip next cycle), downgrade, contact (support redirect)
  type: 'discount' | 'pause' | 'skip' | 'downgrade' | 'contact';
  label: string;                // 'Get 20% off for 3 months'
  discountPct?: number;
  discountDuration?: DiscountDuration;
  pauseDuration?: number;       // days
  downgradePlanId?: string;
  contactUrl?: string;          // for type='contact' — redirect to support URL
  description: string;
}

// ── Cancellation flow ─────────────────────────────────────────────────────────
export interface CancellationReason {
  id: string;
  label: string;
  hasTextBox: boolean;
  offer: RetentionOffer | null;
}

// ── Churn risk entry (for analytics table) ───────────────────────────────────
export interface ChurnRiskEntry {
  customer: string;
  product: string;
  plan: BillingCycle;
  status: SubscriptionStatus;
  churnScore: number;
  dayLabel: string;             // '8 days overdue' | '2 days left'
  cardExpiring: boolean;
}

// ── Revenue goal ─────────────────────────────────────────────────────────────
export interface RevenueGoal {
  id: string;
  label: string;                // 'MRR Target Q3'
  type: 'mrr' | 'arr' | 'total_revenue';
  target: number;
  current: number;
  period: string;               // 'Q3 2026'
  status: 'on_track' | 'at_risk' | 'exceeded';
}

// ── Split payment progress ────────────────────────────────────────────────────
export interface SplitPaymentStatus {
  subscriptionId: string;
  product: string;
  totalInstallments: number;
  completedInstallments: number;
  nextInstallmentDate: string;
  nextInstallmentAmount: number;
  accessGranted: boolean;
  accessTiming: 'immediate' | 'after_full_payment' | 'custom_duration';
  accessEndDate: string | null;
}
```

---

## 5. Static Data Expansions

### 5.1 Extended `subscriptionsData`
Add to each row:
```ts
paymentType: 'recurring' | 'split'
churnRiskScore: number                  // 0–100
customerLtv: number
maxPayments: number | null
paymentsCompleted: number
cardExpiring: boolean
cardExpiryDate: string | null
pendingSwitchType: 'upgrade' | 'downgrade' | null
pendingSwitchProduct: string | null
pauseEndDate: string | null
cancellationDate: string | null
retentionDiscountRemaining: number
```

**Sample additions to existing rows:**
```ts
// SUB-001 Sarah Johnson — active annual
{ ...existing, churnRiskScore: 12, customerLtv: 297, cardExpiring: false, paymentType: 'recurring' }

// SUB-003 Emily Davis — past-due
{ ...existing, churnRiskScore: 88, customerLtv: 147, cardExpiring: true, cardExpiryDate: '02/2025', paymentType: 'recurring' }

// New: split payment row
{
  id: 'SUB-008', customer: 'Liam Anderson', product: 'Plugin Pro',
  amount: '$83/mo', cycle: 'Monthly', status: 'active',
  nextPayment: '2025-02-15', paymentType: 'split',
  paymentsCompleted: 2, maxPayments: 3,
  accessTiming: 'immediate', churnRiskScore: 5, customerLtv: 249,
}

// New: pending_cancel row
{
  id: 'SUB-009', customer: 'Ava Garcia', product: 'SaaS Pro',
  amount: '$199/yr', cycle: 'Annual', status: 'pending_cancel',
  nextPayment: '—', cancellationDate: '2025-02-22',
  churnRiskScore: 72, customerLtv: 199,
}
```

### 5.2 New static datasets to add
```ts
// Revenue goals for analytics widget
export const revenueGoalsData: RevenueGoal[] = [ ... ]

// Churn risk entries with score — use 4 bands matching backend ChurnScorer:
// 0–25 Low / 26–50 Medium / 51–75 High / 76–100 Critical
export const churnRiskData: ChurnRiskEntry[] = [ ... ]

// Extended sub analytics — ARR, MRR, net revenue retention
export const subMrrArrData = [
  { month: 'Jan', mrr: 29800, arr: 357600, nrr: 104 },
  ...
]

// Cancellation reasons config — matches backend RetentionFlow offer types:
// discount | pause | skip | downgrade | contact (5 types from backend RND)
export const CANCELLATION_REASONS: CancellationReason[] = [
  { id: 'too_expensive',    label: 'Too expensive',              hasTextBox: false, offer: { type: 'discount', discountPct: 20, discountDuration: '3 months', ... } },
  { id: 'not_using',        label: 'Not using it enough',        hasTextBox: false, offer: { type: 'pause', pauseDuration: 30, ... } },
  { id: 'missing_features', label: 'Missing features I need',    hasTextBox: true,  offer: { type: 'contact', contactUrl: '/support', ... } },
  { id: 'switching',        label: 'Switching to another product',hasTextBox: true,  offer: { type: 'discount', ... } },
  { id: 'temporary',        label: 'Temporary — taking a break', hasTextBox: false, offer: { type: 'skip', ... } },
  { id: 'other',            label: 'Other',                      hasTextBox: true,  offer: null },
]

// Dunning config preset options
export const DUNNING_RETRY_PRESETS = [
  { label: '3 attempts · 3 days apart (default)', attempts: 3, intervalDays: 3 },
  { label: '4 attempts · 7 days apart', attempts: 4, intervalDays: 7 },
  { label: 'Aggressive: 5 attempts · 2 days apart', attempts: 5, intervalDays: 2 },
]
```

### 5.3 New `Page` values
```ts
export type Page =
  | ... // existing
  | 'subscription-detail'    // new: per-subscription detail drawer/page
```

---

## 6. SubscriptionsPage — Extensions

### 6.1 Table column fixes & additions

**Fix existing duplicate "Product" column** — currently `customer+product` are stacked in col 3
and `product` repeats alone in col 4. Replace col 4 with:

| Column | Content |
|---|---|
| ID | `SUB-001` mono |
| Customer | Name + email stacked |
| Product | Product name + cycle pill |
| Amount | `$99/yr` mono |
| Payment type | `Recurring` or installment progress badge `2/3 installments` |
| Churn score | Colored score pill (green ≤30, amber ≤60, red >60) |
| Status | `StatusBadge` — including `pending_cancel`, `completed` |
| Next payment | Date; red if past-due; `Cancels MM/DD` for pending_cancel |
| LTV | `$297` mono, subdued |
| ⋮ | `ActionDropdown` |

**Churn score pill:**
```tsx
// Score 0–30: successContainer / success
// Score 31–60: warningContainer / warning
// Score 61–100: error bg #FFDAD6 / error
<span style={{ backgroundColor: scoreColor.bg, color: scoreColor.fg }}>
  {score}
</span>
```

### 6.2 Status badge additions

Add to `StatusBadge` component (full set matching backend ENUM — 9 statuses total):
```ts
'trialing'       → infoContainer / info          label: "Trialing"       // already exists
'active'         → successContainer / success    label: "Active"         // already exists
'paused'         → secondaryContainer / secondary label: "Paused"        // already exists
'past_due'       → warningContainer / warning    label: "Past Due"       // existing uses 'past-due'; align key
'pending_cancel' → warningContainer / warning    label: "Cancels Soon"   // NEW
'suspended'      → '#FFDAD6' / error             label: "Suspended"      // NEW
'cancelled'      → outlineVariant / onSurface    label: "Cancelled"      // already exists
'expired'        → outlineVariant / onSurfaceVariant label: "Expired"    // NEW
'completed'      → infoContainer / info          label: "Completed"      // NEW (split payment done)
```

### 6.3 KPI strip additions

Current 4 cards → expand to 6:
```
Active | Paused | Past Due | Pending Cancel | Cancelled This Month | MRR
```
MRR card: sum of `amountRaw` for active subscriptions (monthly normalized).

### 6.4 New row action items

Append to existing `rowActions()`:

**Billing group:**
```ts
// Early renewal — active only, not lifetime
{ label: 'Early Renewal', icon: FastForward, disabled: row.cycle === 'Lifetime' || row.status !== 'active' }

// Skip next renewal — active recurring only
{ label: 'Skip Next Cycle', icon: SkipForward, disabled: row.paymentType !== 'recurring' || row.status !== 'active' }
```

**Plan group:**
```ts
// Pending switch badge — show if pendingSwitchProduct is set
{ label: `Cancel Scheduled ${row.pendingSwitchType} → ${row.pendingSwitchProduct}`, icon: XCircle, disabled: !row.pendingSwitchProduct }
```

**Status group:**
```ts
// Pending cancel — offer immediate cancel or "keep scheduled"
{ label: 'Cancel Immediately', icon: XCircle, danger: true, disabled: row.status !== 'pending_cancel' }
{ label: 'Reinstate (undo pending cancel)', icon: CheckCircle, disabled: row.status !== 'pending_cancel' }
```

**Destructive group:**
```ts
// For split payments: mark manually completed
{ label: 'Mark Split Payments Complete', icon: CheckSquare, danger: false, disabled: row.paymentType !== 'split' }
```

### 6.5 New modals from the row actions

#### Early Renewal Modal
- Icon: `FastForward` in `primaryContainer`
- Body: "Renew {product} now? Their billing cycle will restart from today."
- Shows new next payment date (today + 1 billing period)
- Confirm: "Renew Now"

#### Skip Next Cycle Modal
- Icon: `SkipForward` in `infoContainer`
- Body: "Skip the next renewal for {customer}? Their next charge will move from {date} to {newDate}."
- Confirm: "Skip Cycle"

#### Cancellation Flow Modal (multi-step — see §8)

### 6.6 Filter bar additions
Add `FilterChip`:
- **Type:** All · Software · SaaS · Membership · Download · Course · Service *(see §4.9)*
- **Payment Type:** All · Recurring · Split
- **Churn Risk:** All · Low (≤25) · Medium · High (>50)

### 6.7 Bulk action bar additions
- **Send Card Update Email** — for selected past-due with expired cards
- **Apply Discount to All** — opens discount modal pre-filled, applies to all selected

### 6.8 Card expiry warning indicator
When `row.cardExpiring === true`, show a small amber `CreditCard` icon before the Next Payment date
with tooltip "Card expires MM/YYYY". Clicking opens "Send Card Update Email" confirm dialog.

---

## 7. New Pages

### 7.1 Subscription Detail Page — `subscription-detail`

Navigation: clicking the ID in the table navigates to `subscription-detail`,
passing `subscriptionId` via `useState<string>`. Back → `subscriptions`.

**Layout:** Single-column with sticky back bar, then two-column content (main + sidebar).

#### Header section
```
← Subscriptions          [Status badge]      [Action buttons: Pause | Cancel | ⋮]
SUB-001 · Plugin Pro Annual
Sarah Johnson · sarah@example.com
```

#### Main column tabs: Overview · Payment Log · Status History · Emails Sent · Retention
*(aligned with backend admin detail page tab spec)*

**Overview tab:**
- Billing summary card: Amount · Cycle · Next payment · Started · Payment method (masked)
- Churn risk gauge (0–100 circular or bar indicator with color zones)
- LTV projected card: "$297 projected over 24 months"
- Split payment progress (visible if `paymentType === 'split'`):
  - Progress bar: `paymentsCompleted / maxPayments` installments
  - Access timing label: "Access granted: Immediately" / "After full payment"
  - Next installment date + amount
- Pending switch badge: "Scheduled downgrade to Theme Bundle on renewal"
- Card expiry warning banner (amber): "⚠ Payment card expires 02/2025 — send update link"

**Payment Log tab:**
- Full payment history table (same as current modal, but in-page)
- Columns: Date · Amount · Method · Retry # · Gateway Response · Status · Receipt link
- "Export CSV" button
- Dunning attempt counter badge: "3/3 retries exhausted" if past_due

**Status History tab:**
- Every status transition with timestamp, who triggered it (customer/admin/system), reason text
- Feeds from `wp_purecart_subscription_logs` (event, old_status, new_status, note)
- Rendered as `<SubscriptionTimeline>` component

**Emails Sent tab:**
- Log of all 25 email types sent for this subscription
- Columns: Email type · Sent at · To (customer email) · Opened? (if trackable)
- Matches backend `SubscriptionEmail` class — 25 email types

**Retention tab:**
- Cancellation reason (if cancelled/pending_cancel): shows the reason text
- Retention offer history: list of offers shown/accepted/rejected
- Discount remaining: "Retention discount: 20% off — 2 cycles remaining"

#### Sidebar:
- Customer mini-card: avatar, name, email, LTV, "View Full Profile" link
- Product card: name, version, license key link
- Quick actions: Send Receipt · Send Card Update Link · Send Renewal Reminder ·
  View in WooCommerce

---

## 8. New Modals & Drawers

### 8.1 Cancellation Flow Modal (3-step)

Multi-step modal replaces the current single ConfirmDialog for "Cancel Subscription".

**Step 1 — Reason selection:**
```
Title: Why are you cancelling?
Subtitle: {customer} · {product}

Radio list from CANCELLATION_REASONS:
  ○ Too expensive
  ○ Not using it enough
  ○ Missing features I need  [text area expands below]
  ○ Switching to another product
  ○ Temporary — taking a break
  ○ Other  [text area expands below]

[Next →]
```

**Step 2 — Retention offer (if reason has an offer):**
```
Title: Before you go…
Icon: relevant (Tag for discount, PauseCircle for pause, SkipForward for skip,
      ArrowDownRight for downgrade, HeadphonesIcon for contact)

Offer card (highlighted primaryContainer or secondaryContainer):
  [discount]  "Get 20% off for the next 3 months"
              Current: $49/mo  →  After: $39.20/mo  (3 months)

  [pause]     "Pause for 30 days — no billing, keep access"

  [skip]      "Skip your next payment — extend access by one cycle for free"

  [downgrade] "Switch to Theme Bundle ($29/mo) at your next renewal"

  [contact]   "Talk to our team — we may be able to help"
              [Open Support Chat]

  [Accept Offer]   [Continue Cancelling →]
```
- Accept offer → `POST /purecart/v1/subscriptions/{id}/cancellation/accept-offer`
- Contact offer → opens `contactUrl` in new tab, does not cancel
- Continue Cancelling: advances to step 3

**Step 3 — Cancel timing:**
```
Title: When should access end?

  ● Cancel at end of billing period  (recommended)
    "Access continues until 2025-02-15"

  ○ Cancel immediately
    "Access ends now"

[Cancel Subscription]   [Keep Subscription]
```
- "Cancel at end of period" → sets `status: 'pending_cancel'`, `cancellationDate: nextPayment`
- "Cancel immediately" → sets `status: 'cancelled'`

**Step indicator:** 3 dots at top of modal, filled for current step.

### 8.2 SCA Reauthorization Modal

Triggered when admin clicks "Request Reauthorization" in row actions.

```
Icon: Lock (primaryContainer)
Title: Request Payment Reauthorization
Body: A secure payment confirmation link will be emailed to {customer}.
      They must re-confirm their payment method to continue their subscription.
      The subscription will remain active for 7 days while they confirm.

[Send Reauth Email]   [Cancel]
```

### 8.3 Early Renewal Modal
```
Icon: FastForward (primaryContainer)
Title: Process Early Renewal
Body: Charge {amount} to {customer}'s {method} now?
      Their next billing cycle will restart from today.
      New next payment date: {today + 1 cycle}

[Renew Now]   [Cancel]
```

### 8.4 Skip Cycle Modal
```
Icon: SkipForward (infoContainer)
Title: Skip Next Renewal Cycle
Body: Skip {customer}'s next payment on {nextPayment}?
      Their subscription stays active and the next charge will be on {newDate}.

[Skip Cycle]   [Cancel]
```

### 8.5 Pause with Duration Modal
Extends the current instant-pause confirm to include a duration selector.
```
Icon: PauseCircle
Title: Pause Subscription
Selector: Pause duration
  [ 1 month ]  [ 2 months ]  [ 3 months ]  [ Until I resume ]
Body updates: "Access continues until {endDate}, then billing resumes automatically."

[Pause Subscription]   [Cancel]
```

### 8.6 Plan Change → Schedule vs Immediate toggle
Extend existing Change Plan modal to add:
```
Apply change:
  ● Immediately (prorate difference)
  ○ At next renewal ({nextPayment})

[Confirm Plan Change]
```

---

## 9. New UI Components

### 9.1 `ChurnScoreBadge`
```tsx
// Props: score: number (0–100)
// 4 bands matching backend ChurnScorer exactly:
//   0–25   Low      → successContainer / success (green)
//   26–50  Medium   → warningContainer / warning  (yellow)
//   51–75  High     → '#FFE0CC' / '#8B4513'       (orange — custom, M3 has no orange token)
//   76–100 Critical → '#FFDAD6' / M3.error        (red)
const zone = score <= 25 ? 'low' : score <= 50 ? 'medium' : score <= 75 ? 'high' : 'critical';
const colors = {
  low:      { bg: M3.successContainer, fg: M3.success },
  medium:   { bg: M3.warningContainer, fg: M3.warning },
  high:     { bg: '#FFE0CC',          fg: '#7D3200' },
  critical: { bg: '#FFDAD6',          fg: M3.error  },
};
```

### 9.2 `InstallmentProgress`
```tsx
// Props: completed: number, total: number, nextDate: string, nextAmount: string
// Renders: [●●○] 2 of 3 installments · Next: $83 on Feb 15
```
A horizontal dot-bar with completed dots filled in `primary`, remaining as `outlineVariant`.

### 9.3 `StepIndicator`
```tsx
// Props: steps: number, current: number (0-indexed)
// Used by multi-step modals
// Renders 3 small circles: filled = current, ring = upcoming, checkmark = done
```

### 9.4 `CancellationReasonList`
```tsx
// Props: reasons: CancellationReason[], selected: string, onChange: (id) => void
// Renders radio list; selected reason expands optional text area below
```

### 9.5 `RetentionOfferCard`
```tsx
// Props: offer: RetentionOffer, onAccept: () => void, onDecline: () => void
// Highlighted card (primaryContainer border) showing the offer details + price comparison
```

### 9.6 `ChurnGauge`
```tsx
// Props: score: number (0–100)
// Simple semicircular arc or horizontal segmented bar
// Used in Subscription Detail page Overview tab
// 4 segments matching backend ChurnScorer bands:
//   0–25 green / 26–50 yellow / 51–75 orange / 76–100 red
// Shows label: "Low" | "Medium" | "High" | "Critical"
```

### 9.7 `CardExpiryWarning`
```tsx
// Props: expiryDate: string ('MM/YYYY'), subscriptionId: string
// Renders amber banner: "⚠ Payment card expires {expiryDate}"
// CTA: "Send update link" → ConfirmDialog → toast
```

### 9.8 `SubscriptionTimeline`
```tsx
// Props: events: TimelineEvent[]
// Renders vertical feed like CustomerDetailPage eventLog
// Each entry: icon + color chip · description · date · optional meta amount
```

### 9.9 `RevenueGoalCard`
```tsx
// Props: goal: RevenueGoal
// Renders: label, type badge, progress bar (current/target), percentage, status chip
```

---

## 10. Analytics Page — Subscription Extensions

### 10.1 New KPI cards
Add to existing 4 (`SubscriptionAnalyticsPage`):

| KPI | Value | Trend |
|---|---|---|
| ARR | `$458,400` | ▲ +9.2% |
| Net Revenue Retention | `104%` | ▲ +1.1pp |
| Avg LTV | `$312` | ▲ +$14 |
| At-Risk Subs | `14` | ▼ -3 |

### 10.2 New charts

**Subscription mix by type** — PieChart (see §4.8 `subTypeMix` dataset)

**Revenue by type** — horizontal BarChart (see §4.8 `subRevenueByType` dataset)

**MRR/ARR trend chart** (LineChart, dual Y-axis or separate lines):
```ts
// Dataset: subMrrArrData
// Lines: MRR (primary), ARR (secondary), NRR % (right Y-axis info color)
```

**Dunning funnel BarChart:**
```ts
// X: attempt number (1st, 2nd, 3rd retry)
// Bar: recovered count at each attempt
// Color gradient: primary → warning → error
```

**Churn by reason PieChart:**
```ts
// Segments: Too expensive / Not using / Missing features / Switching / Other
// On click: filter churn risk table to that reason
```

**Revenue Goals widget:**
```tsx
// Grid of RevenueGoalCard components
// Add new goal button → simple form modal (label, type, target, period)
```

### 10.3 Extended Churn Risk table columns
Current: Customer · Product · Plan · Status · Days Overdue/Left · Action

Add:
- **Churn Score** — `ChurnScoreBadge` component
- **Card Expiring** — amber `CreditCard` icon if `cardExpiring === true`
- **LTV** — `$312` mono, helps prioritize high-value at-risk
- **Actions** — "Send Reminder" · "Apply Discount" · "Retry Payment" (contextual)

---

## 11. Settings → Subscriptions Tab

Add `'Subscriptions'` to `SETTINGS_TABS` array (between 'Downloads' and 'Emails').

Create `SettingsSubscriptions.tsx`. Mirrors the 9 backend settings tabs
(`purecart_sub_*` options) as collapsible sections within a single React panel.

### 11.1 General
```
Enable subscriptions module       [●]  toggle   — purecart_sub_auto_renew
Enable auto-renewal               [●]  toggle
Allow mixed cart                  [●]  toggle   — subscription + one-time in same checkout
One trial per customer            [●]  toggle   — purecart_sub_one_trial_per_customer
Average lifetime months (LTV)     [24] number   — purecart_sub_avg_lifetime_months
```

### 11.2 Billing & Dunning
```
Max retry attempts                [3]  number   — purecart_sub_retry_attempts (backend default 3)
Retry schedule (days after fail)  [1, 3, 5]     — purecart_sub_retry_intervals (comma-separated)
Active grace days (past_due → suspended) [7]    — purecart_sub_active_grace_days
Suspended grace days (suspended → cancelled) [7]— purecart_sub_suspended_grace_days
Send dunning emails               [●]  toggle
```

### 11.3 Renewals & Reminders
```
Renewal reminder days (before due) [7, 3, 1]   — purecart_sub_renewal_reminder_days
Card expiry warning days           [30]  number — purecart_sub_card_expiry_warning_days
Enable renewal sync                [○]  toggle  — purecart_sub_renewal_sync
Sync day of month                  [1]  number  — purecart_sub_renewal_sync_date
```

### 11.4 Upgrade / Downgrade
```
Default proration mode    [● apply_at_renewal  ○ prorate_immediately  ○ no_proration]
                          — purecart_sub_proration_mode
Allow customer upgrade/downgrade  [●]  toggle  — purecart_sub_allow_upgrade
```

### 11.5 Retention
```
Enable retention flow             [●]  toggle  — _purecart_sub_retention_enabled (per-product)
(Note: per-reason offer config is set on each product; global toggle here)
```

### 11.6 Customer Portal
```
Allow customer self-pause         [●]  toggle  — purecart_sub_allow_pause
Allow customer self-cancel        [●]  toggle  — purecart_sub_allow_cancel
Allow customer early renewal      [●]  toggle  — purecart_sub_allow_early_renewal
Allow customer to skip renewal    [●]  toggle  — purecart_sub_allow_skip
Max skips per billing year        [1]  number  — purecart_sub_skip_limit (0 = unlimited)
```

### 11.7 Role Mapping
```
Trial role         [select WP role or none]    — purecart_sub_trial_role
Active role        [select WP role or none]    — purecart_sub_active_role
Cancelled role     [select WP role or none]    — purecart_sub_cancelled_role
```

### 11.8 Subscribe & Save
```
Enable Subscribe & Save           [●]  toggle
Discount type    [● Percentage  ○ Fixed amount] — _purecart_sub_discount_type
Discount value                    [15] number   — _purecart_sub_discount_value
Savings badge label               [Save 15% with a subscription]  text input
```

### 11.9 Advanced
```
Staging/blocked domains  [textarea, one per line] — purecart_sub_staging_domains
Gateway meta keys        [textarea, one per line] — purecart_sub_gateway_meta_keys
Cancel SaaS immediately  [○]  toggle              — purecart_sub_cancel_saas_immediately
Debug mode               [○]  toggle
```

### 11.10 Membership (visible when membership-type products exist)
*(see §4.12 Membership settings)*

### 11.11 Digital Downloads (visible when download-type products exist)
*(see §4.12 Digital Download settings)*

### 11.12 Courses / LMS (visible when course-type products exist)
*(see §4.12 Course/LMS settings)*

### 11.13 Service / Retainer (visible when service-type products exist)
*(see §4.12 Service/Retainer settings)*

### 11.15 Revenue Goals
```
[+ Add Goal] button → modal: name · target amount · start date · end date
Goals list table: name · target · current · period · status chip · [Delete]
```

---

## 12. Customer Profile — Subscription Tab Extensions

`CustomerDetailPage` already has a `subscriptions` tab. Add to each row:

```
Churn score column: ChurnScoreBadge
LTV column: $312
Payment type badge: "Installment 2/3" for split payments
Pending cancel badge: "Cancels Feb 22"
```

Row action: "View Subscription Detail" → navigate to `subscription-detail`.

---

## 13. Page Registration (App.tsx additions)

```tsx
// Add to Page type
| 'subscription-detail'

// Add state
const [ subDetailId, setSubDetailId ] = useState<string>('SUB-001');

// Add to SubscriptionsPage props
onViewDetail={(id) => { setSubDetailId(id); navigate('subscription-detail'); }}

// Add page render
{ page === 'subscription-detail' && (
  <SubscriptionDetailPage subscriptionId={subDetailId} onBack={goBack} />
)}
```

---

## 14. REST API Hook Shapes (future wiring)

When the frontend connects to the backend REST API (`purecart/v1`), these are the
query/mutation shapes needed per component:

```ts
// ── Confirmed endpoints (from backend RND REST API table) ────────────────────

// List subscriptions
GET /purecart/v1/subscriptions
params: { status?, product_id?, payment_type?, churn_risk_min?, page?, per_page?, search? }
response: { data: SubscriptionRecord[], total: number, pages: number }

// Single subscription (detail page)
GET /purecart/v1/subscriptions/{id}
response: SubscriptionRecord & { logs: LogEntry[], payments: PaymentRecord[] }

// Event log (subscription_logs table)
GET /purecart/v1/subscriptions/{id}/logs

// Pause
POST /purecart/v1/subscriptions/{id}/pause
body: { duration_days?: number }  // omit = indefinite

// Resume
POST /purecart/v1/subscriptions/{id}/resume

// Cancel (immediate or end-of-period)
POST /purecart/v1/subscriptions/{id}/cancel
body: { timing: 'immediate' | 'end_of_period', reason_id: string, reason_text?: string }

// Skip next renewal — backend endpoint is /skip (not /skip-cycle)
POST /purecart/v1/subscriptions/{id}/skip

// Manual renewal trigger (admin — manage_woocommerce)
POST /purecart/v1/subscriptions/{id}/renew

// Early renewal (customer or admin)
POST /purecart/v1/subscriptions/{id}/early-renewal

// Upgrade or downgrade — backend uses /upgrade for both directions
POST /purecart/v1/subscriptions/{id}/upgrade
body: { product_id: number, timing: 'prorate_immediately' | 'apply_at_renewal' | 'no_proration' }

// Resubscribe
POST /purecart/v1/subscriptions/{id}/resubscribe

// External renewal (gateway webhook path)
POST /purecart/v1/subscriptions/{id}/external-renewal
body: { transaction_id: string }

// Cancellation flow (retention)
GET  /purecart/v1/subscriptions/{id}/cancellation/reasons
GET  /purecart/v1/subscriptions/{id}/cancellation/offers
POST /purecart/v1/subscriptions/{id}/cancellation/accept-offer
body: { offer_type: RetentionOffer['type'], offer_data: object }

// Revenue goals — namespace is /subscriptions/revenue-goals (not /revenue-goals)
GET    /purecart/v1/subscriptions/revenue-goals
POST   /purecart/v1/subscriptions/revenue-goals
body: { name: string, target_amount: number, start_date: string, end_date: string }
DELETE /purecart/v1/subscriptions/revenue-goals/{goal_id}

// ── Confirmed admin-only endpoints ───────────────────────────────────────────
POST /purecart/v1/subscriptions/{id}/retry-payment
POST /purecart/v1/subscriptions/{id}/send-card-update   // emails customer link to /my-account/payment-methods/
POST /purecart/v1/subscriptions/{id}/request-reauth     // SCA reauth email

// ── Type-specific admin endpoints ────────────────────────────────────────────
POST /purecart/v1/subscriptions/{id}/membership/change-tier
body: { tier: string }

POST /purecart/v1/subscriptions/{id}/membership/sync-role

POST /purecart/v1/subscriptions/{id}/downloads/reset-quota

POST /purecart/v1/subscriptions/{id}/downloads/trigger-drip

POST /purecart/v1/subscriptions/{id}/courses/extend-access
body: { days: number }

POST /purecart/v1/subscriptions/{id}/courses/revoke

POST /purecart/v1/subscriptions/{id}/service/complete-deliverable
body: { notes?: string }

POST /purecart/v1/subscriptions/{id}/service/send-invoice
```

### WooCommerce URL Helpers (admin panel use)

These WC-generated URLs must be constructed from `purecartConfig` rather than hardcoded:

```ts
// Product edit link (in subscription table / detail page)
`${purecartConfig.adminUrl}post.php?post=${productId}&action=edit`

// Order edit link (in payment log)
`${purecartConfig.adminUrl}post.php?post=${orderId}&action=edit`

// Customer My Account subscription detail (View Portal action)
`${purecartConfig.myAccountUrl}purecart-subscription/${subscriptionId}/`

// Customer payment methods page (Update Card action)
`${purecartConfig.myAccountUrl}payment-methods/`
```

All external WP/WC admin links should open in a new tab (`target="_blank" rel="noopener"`).
The My Account links are for "View in customer portal" row actions — they link the admin to
what the customer sees, not for navigation within the React panel.

---

## 15. Implementation Roadmap

### Phase 1 — Table & data model (no new pages)
1. Extend `SubscriptionRecord` interface: add `deliveryType`, `linkedEntity`, and all new fields
2. Add 6 sample rows covering all delivery types to `subscriptionsData`
3. Fix duplicate "Product" column bug in table
4. Add `ChurnScoreBadge` (4-band), `InstallmentProgress`, `CardExpiryWarning`, `SubscriptionTypeBadge` components
5. Add "Type" and "Linked" columns to table
6. Add new status values to `StatusBadge`: `pending_cancel`, `completed`, `expired`, `suspended`
7. Expand KPI strip from 4 → 6 cards (add MRR, Pending Cancel)
8. Add "Type", "Churn Risk", "Payment Type" FilterChips

### Phase 2 — New modals
1. Replace cancel ConfirmDialog with 3-step `CancellationFlowModal`
2. Add `StepIndicator`, `CancellationReasonList`, `RetentionOfferCard` sub-components
3. Add Early Renewal modal
4. Add Skip Cycle modal
5. Add Pause with Duration selector
6. Add Change Plan timing toggle (immediate vs next renewal)
7. Add SCA Reauthorization modal

### Phase 3 — Subscription Detail page
1. Register `subscription-detail` page in App.tsx and `Page` type
2. Create `SubscriptionDetailPage` with tab layout: Overview · Payment Log · Status History · Emails Sent · Retention
3. Add **type-specific tab** (License / Account / Access / Downloads / Courses / Deliverables) — rendered based on `deliveryType`
4. Add `ChurnGauge`, `SubscriptionTimeline` components
5. Wire "View Detail" from table row → navigate

### Phase 4 — Analytics extensions
1. Extend `SubscriptionAnalyticsPage` with MRR/ARR chart and dunning funnel
2. Add subscription-by-type KPI strip (§4.7) and type mix PieChart + revenue-by-type BarChart (§4.8)
3. Add `RevenueGoalCard`, goals widget section
4. Expand churn risk table with score, card expiry, LTV, type columns
5. Add churn-by-reason PieChart

### Phase 5 — Settings tab
1. Add `'Subscriptions'` to `SETTINGS_TABS`
2. Create `SettingsSubscriptions.tsx` with all 15 sections (§11.1–§11.15)
3. Type-specific sections (§11.10–§11.13) render only when relevant product types exist

### Phase 6 — Customer profile integration
1. Extend CustomerDetailPage subscriptions tab with churn score + LTV
2. Wire "View Subscription Detail" navigation

---

## 16. Backend Features Requiring Future Frontend Work

These backend subscription features exist in the backend RND but have no frontend UI yet
and are not covered by the sections above:

| Feature | Backend Class | Frontend needed |
|---|---|---|
| **Stepped renewal pricing** | `RenewalEngine` — `step_price`, `step_after` | Show "Price steps to $29/mo after 3 cycles" badge on subscription row + detail page |
| **Renewal sync** | `RenewalSync` | Settings 11.3 covers config; product page needs "Next billing: 1st of month" display |
| **Role mapping on status change** | `RoleManager` | Settings 11.7 covers role select fields |
| **Resubscribe flow** | `SubscriptionManager::resubscribe()` | Row action "Resubscribe" → confirm dialog → WC checkout redirect |
| **SaaS suspend-on-cancel timing** | `purecart_sub_cancel_saas_immediately` | Settings 11.9 covers toggle |
| **Subscription coupons** | WC coupon types | Apply coupon field on manual renewal modal |
| **Mixed cart badge** | WC cart compat | Checkout summary (outside React admin UI) |
| **Subscription length badge** | `max_length_at` | Detail page Overview: "Ends: Jun 15 2027" when not indefinite |
| **Privacy / GDPR export** | `PrivacyHandler` | No admin UI needed — hooks into WP's built-in exporter |
| **Subscribe & Save product display** | `SubscriptionProduct` | WC product page (outside React admin UI) |
| **Membership content restriction** | `RoleManager` | Covered in §4.6 Access tab + §11.10 Membership settings |
| **Drip content delivery** | Phase 4 / Downloads module | Covered in §4.6 Downloads tab + §11.11 Download settings |
| **LMS enrollment management** | External LMS plugin API | Covered in §4.6 Courses tab + §11.12 Course/LMS settings |
| **Service deliverable tracking** | Admin-only UI | Covered in §4.6 Deliverables tab + §11.13 Service settings |

---

## 17. Known Bugs (current codebase)

| Location | Bug | Fix |
|---|---|---|
| `SubscriptionsPage` table | Column 3 = Customer+Product stacked; Column 4 = Product alone (duplicate) | Remove col 4, put product in col 3 subtext only |
| `SubscriptionsPage` row | `isPastDue` row highlight uses `onMouseLeave` inline; loses selection highlight on hover-out | Cache `isSelected` in closure correctly |
| `SubscriptionAnalyticsPage` | Churn risk table uses hardcoded array, not derived from `subTrendData` | Wire to `churnRiskData` static array |
| `SettingsPage` | Two `borderRight` style keys on same object — second overwrites first | Merge into a single key |
| `static-data.tsx` | `SETTINGS_TABS` referenced but its definition is beyond line 2343 (not yet read) | Confirm it excludes 'Subscriptions' then add it |

---

## 18. Design Consistency Rules (must follow)

- All new modals: `rounded-3xl`, `backgroundColor: M3.surfaceContainer`, `boxShadow: '0 8px 32px rgba(0,0,0,0.24)'`
- All modal headers: centered icon in colored container circle (48×48, `rounded-full`)
- All table headers: `text-xs font-medium uppercase letterSpacing 0.5px color M3.onSurfaceVariant`
- All mono values (IDs, amounts, dates): `fontFamily: 'Roboto Mono, monospace'`
- All labels/body: `fontFamily: 'Roboto, sans-serif'`
- Status badges: use existing `StatusBadge` — do not create ad-hoc status spans
- Danger actions: always route through `ConfirmDialog` or multi-step modal — never trigger directly
- Toasts: always call `showToast()` after any mutation; use `'success'` / `'warning'` / `'error'` / `'info'`
- All new settings fields: use `SettingsField`, `SettingsToggleField`, `SettingsSelectField`, `SettingsSectionHeader` — never raw `<input>` in settings panel
- Never add external libraries — use Recharts (already installed), lucide-react icons, inline styles with M3 tokens

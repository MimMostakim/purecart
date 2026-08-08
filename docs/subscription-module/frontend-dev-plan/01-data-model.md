# PureCart Subscriptions — Frontend Dev Plan — 01. Data Model (Phase 0, part 1)

**Do this file first.** Every later phase (table columns, detail-page tabs, settings fields, charts)
reads from the types and static data defined here. Get this right once and Phases 1–6 are just
"render this data" rather than "figure out the shape while also building UI."

**How you'll actually pull this off:** you're not wiring a real API yet. You build every page against
the static data in this file, exactly like `SubscriptionsPage.tsx` already does today. When the
backend is ready later, you swap the *source* of this data (static arrays → `fetch()` calls returning
the same shapes) — the components themselves shouldn't need to change. That's the whole point of
nailing the types now: get the shape right once, and "connecting the backend" becomes a data-fetching
task, not a rewrite.

---

## 1. New file: `src/app/utils/subscription-types.ts`

This file doesn't exist yet — create it. All subscription-related interfaces live here instead of
inline in `static-data.tsx`, so every component can `import type { ... } from '../../utils/subscription-types'`
without pulling in the sample data too.

### 1.1 Delivery type & linked entity (discriminated union)

This is the one deliberate improvement over `RND-subscriptions-frontend.md`'s version: that doc used
one flat interface with ~20 nullable fields (one group per type). Use a **discriminated union**
instead — it's the same information, but TypeScript narrows it for you:

```ts
export type SubscriptionDeliveryType =
	| 'software'      // license key + updates
	| 'saas'          // account provisioning + seats
	| 'membership'    // WP role + content restriction
	| 'download'      // recurring file/media access
	| 'course'        // LMS enrollment
	| 'service';      // manual retainer / agency

interface BaseLinkedEntity {
	type: SubscriptionDeliveryType;
}

export interface SoftwareLinkedEntity extends BaseLinkedEntity {
	type: 'software';
	licenseId: string;
	licenseKey: string;
	domainCount: string;      // display string, e.g. '1/3'
	domainsUsed: number;
	domainLimit: number;      // 0 = unlimited
}

export interface SaaSLinkedEntity extends BaseLinkedEntity {
	type: 'saas';
	saasAccountId: string;
	saasAccountName: string;
	seatUsage: string;        // display string, e.g. '18/25'
	seatsUsed: number;
	seatsTotal: number;
}

export interface MembershipLinkedEntity extends BaseLinkedEntity {
	type: 'membership';
	membershipTier: string;         // 'Gold' | 'Silver' | 'Bronze' | custom
	assignedRole: string;           // WP role slug
	contentAccessLabel: string;     // 'All Content + Community'
	graceEndsAt: string | null;     // ISO date, set only during past_due/pending_cancel grace
}

export interface DownloadLinkedEntity extends BaseLinkedEntity {
	type: 'download';
	downloadsThisCycle: number;
	downloadLimit: number | null;   // null = unlimited
	nextDripDate: string | null;    // ISO date
}

export interface CourseLinkedEntity extends BaseLinkedEntity {
	type: 'course';
	enrolledCourses: string[];      // course titles, display only
	lmsEnrollmentId: string;
	courseAccessUntil: string | null; // ISO date
	progressPct: number | null;     // 0–100, null if LMS doesn't report it
}

export interface ServiceLinkedEntity extends BaseLinkedEntity {
	type: 'service';
	deliverableNotes: string;
	nextDeliverableDue: string | null;  // ISO date
	lastDeliverableAt: string | null;   // ISO date
}

export type SubscriptionLinkedEntity =
	| SoftwareLinkedEntity
	| SaaSLinkedEntity
	| MembershipLinkedEntity
	| DownloadLinkedEntity
	| CourseLinkedEntity
	| ServiceLinkedEntity;
```

**Why this matters for later phases:** in the Detail page's type-specific tab (Phase 3) and the
table's "Linked" column (Phase 1), you'll write `if (sub.linkedEntity.type === 'software') { ... }`
and TypeScript will know `sub.linkedEntity.licenseKey` exists inside that branch, with no `as` casts
and no `licenseKey: string | null` guard clutter repeated on every field.

### 1.2 Subscription status

Backend enum uses underscores (`past_due`, `pending_cancel`) — confirmed against
`subscription-final-dev-plan.md` § 2's `status ENUM(...)`. The **existing** `subscriptionsData` in
this repo uses hyphenated `'past-due'`. Fix this now, in Phase 0, not later — one enum, matching the
backend exactly, everywhere:

```ts
export type SubscriptionStatus =
	| 'trialing'
	| 'active'
	| 'paused'
	| 'past_due'
	| 'pending_reauth'
	| 'suspended'
	| 'pending_cancel'
	| 'cancelled'
	| 'expired'
	| 'completed';
```

This is a breaking rename against today's `SubscriptionsPage.tsx` (`'past-due'` string literals in
the status filter and row-highlight logic) — Phase 1 fixes those call sites as part of the table
rebuild. Flagging it here so it isn't a surprise.

### 1.3 Billing schedule

```ts
export type BillingPeriod = 'day' | 'week' | 'month' | 'year';

export interface BillingSchedule {
	interval: number;         // e.g. 3 (every 3 months)
	period: BillingPeriod;
	displayLabel: string;     // 'Every 3 months' — precomputed, don't recompute in every component
}

// Display-only convenience derived from BillingSchedule for places that just need a short label
// (filter chips, table pill). Compute this once when building sample/API data, not per-render.
export type BillingCycle = 'Monthly' | 'Annual' | 'Lifetime' | 'Custom';
```

### 1.4 Payment method

```ts
export interface PaymentMethodSummary {
	brand: string;       // 'Visa' | 'Mastercard' | 'PayPal' | ...
	last4: string;
	expiryMonth: number;
	expiryYear: number;
	isDefault: boolean;
}
```

### 1.5 The main record — `SubscriptionRecord`

This is what every row in the table, and the Detail page header, is built from.

```ts
export interface SubscriptionRecord {
	id: string;                      // 'SUB-001'
	customer: string;
	customerId: string;              // 'CUST-xxx' — stub link target, see § 4
	email: string;
	product: string;
	productId: number;
	amount: string;                  // formatted, '$99/yr'
	amountRaw: number;                // 99.00
	currency: string;                 // 'USD'
	billing: BillingSchedule;
	cycle: BillingCycle;
	status: SubscriptionStatus;
	nextPayment: string | null;       // ISO date, null = no future charge scheduled
	startDate: string;                // ISO date
	paymentMethod: PaymentMethodSummary | null;

	// Delivery type — drives type-specific UI everywhere (table col, row actions, detail tab, settings)
	deliveryType: SubscriptionDeliveryType;
	linkedEntity: SubscriptionLinkedEntity;

	// Split payments
	paymentType: 'recurring' | 'split';
	paymentsCompleted: number;
	maxPayments: number | null;                              // null = not a split payment plan
	accessTiming: 'immediate' | 'after_full_payment' | 'custom_duration';
	accessEndDate: string | null;

	// Lifecycle extras
	pauseEndDate: string | null;
	cancellationDate: string | null;   // pending_cancel: access ends this date
	skipCount: number;
	maxRenewals: number | null;        // null = unlimited
	maxLengthAt: string | null;        // fixed-length subscription cap, null = indefinite

	// Analytics
	churnRiskScore: number;            // 0–100, see ChurnScoreBadge bands in 02-shared-components.md
	customerLtv: number;               // 24-month projected value

	// Pending plan switch (retention downgrade or manual scheduled switch)
	pendingSwitchProduct: string | null;
	pendingSwitchType: 'upgrade' | 'downgrade' | null;
	retentionDiscountRemaining: number; // cycles of an active retention discount remaining, 0 = none

	// Payment health
	cardExpiryDate: string | null;     // 'MM/YYYY'
	cardExpiring: boolean;             // true within the configured warning window

	// Stepped renewal pricing
	stepPrice: number | null;
	stepAfter: number | null;          // cycles remaining until price steps

	tags: string[];
}
```

### 1.6 Payment record (per-charge-attempt ledger row)

```ts
export interface PaymentRecord {
	id: string;
	date: string;
	amount: string;
	amountRaw: number;
	method: string;
	status: 'paid' | 'failed' | 'refunded' | 'trial' | 'pending';
	transactionId: string | null;
	gatewayResponse: string | null;
	dunningAttempt: number;           // 0 = first try, not a retry
	isEarlyRenewal: boolean;
	isSplitInstallment: boolean;
	installmentNumber: number | null;
	refundedAmount: number | null;
}
```

### 1.7 Retention & cancellation

```ts
export interface RetentionOffer {
	type: 'discount' | 'pause' | 'skip' | 'downgrade' | 'contact';
	label: string;                // 'Get 20% off for 3 months'
	discountPct?: number;
	discountDuration?: 'Once' | '3 months' | '6 months' | 'Forever';
	pauseDuration?: number;       // days
	downgradePlanId?: string;
	downgradePlanLabel?: string;  // for display without a lookup, e.g. 'Starter ($9/mo)'
	contactUrl?: string;
	description: string;
}

export interface CancellationReason {
	id: string;
	label: string;
	hasTextBox: boolean;
	offer: RetentionOffer | null;
}
```

### 1.8 Churn, LTV, revenue goals

```ts
export interface ChurnRiskEntry {
	subscriptionId: string;
	customer: string;
	product: string;
	cycle: BillingCycle;
	status: SubscriptionStatus;
	churnScore: number;
	dayLabel: string;             // '8 days overdue' | '2 days left'
	cardExpiring: boolean;
	ltv: number;
}

export interface RevenueGoal {
	id: string;
	label: string;                // 'MRR Target Q3'
	type: 'mrr' | 'arr' | 'total_revenue';
	target: number;
	current: number;
	period: string;               // 'Q3 2026'
	status: 'on_track' | 'at_risk' | 'exceeded';
}
```

### 1.9 Status history & email log (feed the Detail page's tabs — new, not in prior docs)

Neither prior frontend doc fully specified these, but the Detail page (Phase 3) needs them and the
backend already has the source tables (`wp_purecart_subscription_logs`, `SubscriptionEmail` registry —
see `subscription-final-dev-plan.md` §§ 1–2). Define the frontend shape now so Phase 3 isn't guessing:

```ts
export interface SubscriptionLogEntry {
	id: string;
	event: string;                       // 'payment_failed' | 'status_changed' | 'paused' | 'resumed' | ...
	oldStatus: SubscriptionStatus | null;
	newStatus: SubscriptionStatus | null;
	amount: number | null;
	orderId: string | null;
	note: string | null;
	actorType: 'system' | 'customer' | 'admin' | 'webhook';
	actorLabel: string | null;           // display name, e.g. 'Sarah Johnson' or 'System' — resolved once, not looked up per render
	createdAt: string;                   // ISO datetime
}

export interface SubscriptionEmailLogEntry {
	id: string;
	emailType: string;      // 'Renewal Reminder' | 'Payment Failed' | ... — see the 37-email list in the feature doc § 22
	sentAt: string;         // ISO datetime
	to: string;
	opened: boolean | null; // null = open-tracking not available for this email/gateway
}
```

### 1.10 Split payment progress (Overview tab widget)

```ts
export interface SplitPaymentStatus {
	subscriptionId: string;
	totalInstallments: number;
	completedInstallments: number;
	nextInstallmentDate: string | null;    // null if completed
	nextInstallmentAmount: number | null;
	accessGranted: boolean;
	accessTiming: 'immediate' | 'after_full_payment' | 'custom_duration';
	accessEndDate: string | null;
}
```

---

## 2. Changes to `src/app/utils/static-data.tsx`

Keep `M3` tokens as-is — unchanged. Everything below is additive or a targeted rename.

### 2.1 `Page` type — add the pages this plan builds

```ts
export type Page =
	| 'subscriptions'
	| 'subscription-analytics'
	| 'subscription-detail'   // NEW — Phase 3
	| 'settings';             // NEW — Phase 5
```

(`NAV_SCHEMA` additions for these are Phase 6's job — see `08-navigation-and-testing.md` once written.
Adding them to `Page` now just means nothing else has to touch this union type again later.)

### 2.2 Rename `subscriptionsData` rows to the new `SubscriptionRecord` shape

Replace the existing 7-row array with rows matching `SubscriptionRecord` (§ 1.5) — every field
required, no `undefined`. Below is the full replacement set: the original 7 customers, upgraded to
the new shape, plus new rows covering every delivery type and every status this plan's UI needs to
demonstrate. **13 rows total** is enough to exercise every column, filter, and badge without the
dataset itself becoming a maintenance burden.

```ts
import type { SubscriptionRecord } from './subscription-types';

export const subscriptionsData: SubscriptionRecord[] = [
	// ── Software (existing customer, active, annual) ──────────────────────────
	{
		id: 'SUB-001', customer: 'Sarah Johnson', customerId: 'CUST-101',
		email: 'sarah@example.com', product: 'Plugin Pro', productId: 42,
		amount: '$99/yr', amountRaw: 99, currency: 'USD',
		billing: { interval: 1, period: 'year', displayLabel: 'Yearly' }, cycle: 'Annual',
		status: 'active', nextPayment: '2025-06-15', startDate: '2023-06-15',
		paymentMethod: { brand: 'Visa', last4: '4242', expiryMonth: 8, expiryYear: 2027, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-001', licenseKey: 'WDD-A1B2-C3D4-E5F6', domainCount: '1/1', domainsUsed: 1, domainLimit: 1 },
		paymentType: 'recurring', paymentsCompleted: 3, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 12, customerLtv: 297,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '08/2027', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Software (existing customer, paused, monthly) ─────────────────────────
	{
		id: 'SUB-002', customer: 'Marcus Chen', customerId: 'CUST-102',
		email: 'marcus@example.com', product: 'Theme Bundle', productId: 43,
		amount: '$29/mo', amountRaw: 29, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Monthly',
		status: 'paused', nextPayment: null, startDate: '2024-03-02',
		paymentMethod: { brand: 'Mastercard', last4: '1234', expiryMonth: 4, expiryYear: 2026, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-002', licenseKey: 'WDD-B2C3-D4E5-F6A1', domainCount: '2/3', domainsUsed: 2, domainLimit: 3 },
		paymentType: 'recurring', paymentsCompleted: 10, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: '2025-04-02', cancellationDate: null, skipCount: 1, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 35, customerLtv: 180,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '04/2026', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Software (past_due, card expiring — drives dunning + card-expiry UI) ──
	{
		id: 'SUB-003', customer: 'Emily Davis', customerId: 'CUST-103',
		email: 'emily@example.com', product: 'SaaS Starter', productId: 44,
		amount: '$49/mo', amountRaw: 49, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Monthly',
		status: 'past_due', nextPayment: '2025-01-08', startDate: '2024-06-08',
		paymentMethod: { brand: 'Visa', last4: '7777', expiryMonth: 2, expiryYear: 2025, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-003', licenseKey: 'WDD-C3D4-E5F6-A1B2', domainCount: '1/1', domainsUsed: 1, domainLimit: 1 },
		paymentType: 'recurring', paymentsCompleted: 6, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 88, customerLtv: 147,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '02/2025', cardExpiring: true,
		stepPrice: null, stepAfter: null, tags: [ 'at-risk' ],
	},

	// ── SaaS (active, seats) ───────────────────────────────────────────────────
	{
		id: 'SUB-010', customer: 'Acme Corp', customerId: 'CUST-110',
		email: 'billing@acme.test', product: 'SaaS Pro', productId: 50,
		amount: '$299/mo', amountRaw: 299, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Monthly',
		status: 'active', nextPayment: '2025-02-01', startDate: '2023-11-01',
		paymentMethod: { brand: 'Visa', last4: '5678', expiryMonth: 9, expiryYear: 2028, isDefault: true },
		deliveryType: 'saas',
		linkedEntity: { type: 'saas', saasAccountId: 'SAAS-001', saasAccountName: 'Acme Corp', seatUsage: '18/25', seatsUsed: 18, seatsTotal: 25 },
		paymentType: 'recurring', paymentsCompleted: 15, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 8, customerLtv: 7176,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '09/2028', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [ 'enterprise' ],
	},

	// ── Membership (active, tier) ──────────────────────────────────────────────
	{
		id: 'SUB-011', customer: 'Tom Baker', customerId: 'CUST-111',
		email: 'tom@example.com', product: 'Premium Membership', productId: 60,
		amount: '$19/mo', amountRaw: 19, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Monthly',
		status: 'active', nextPayment: '2025-02-10', startDate: '2024-08-10',
		paymentMethod: { brand: 'PayPal', last4: '----', expiryMonth: 0, expiryYear: 0, isDefault: true },
		deliveryType: 'membership',
		linkedEntity: { type: 'membership', membershipTier: 'Gold', assignedRole: 'premium_member', contentAccessLabel: 'All Content + Community', graceEndsAt: null },
		paymentType: 'recurring', paymentsCompleted: 6, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 22, customerLtv: 456,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: null, cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Download (active, quota) ───────────────────────────────────────────────
	{
		id: 'SUB-012', customer: 'Nina Patel', customerId: 'CUST-112',
		email: 'nina@example.com', product: 'Design Asset Pack', productId: 61,
		amount: '$29/mo', amountRaw: 29, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Monthly',
		status: 'active', nextPayment: '2025-02-01', startDate: '2024-09-01',
		paymentMethod: { brand: 'Mastercard', last4: '3344', expiryMonth: 11, expiryYear: 2026, isDefault: true },
		deliveryType: 'download',
		linkedEntity: { type: 'download', downloadsThisCycle: 3, downloadLimit: 10, nextDripDate: '2025-02-01' },
		paymentType: 'recurring', paymentsCompleted: 5, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 18, customerLtv: 348,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '11/2026', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Course (active, LMS) ────────────────────────────────────────────────────
	{
		id: 'SUB-013', customer: 'Yuki Tanaka', customerId: 'CUST-113',
		email: 'yuki@example.com', product: 'Developer Bootcamp', productId: 62,
		amount: '$49/mo', amountRaw: 49, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Monthly',
		status: 'active', nextPayment: '2025-02-05', startDate: '2024-05-05',
		paymentMethod: { brand: 'Visa', last4: '9012', expiryMonth: 3, expiryYear: 2027, isDefault: true },
		deliveryType: 'course',
		linkedEntity: { type: 'course', enrolledCourses: [ 'PHP Mastery', 'React Fundamentals' ], lmsEnrollmentId: 'LMS-4421', courseAccessUntil: '2025-12-31', progressPct: 64 },
		paymentType: 'recurring', paymentsCompleted: 9, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 5, customerLtv: 1176,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '03/2027', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Service (active, retainer) ─────────────────────────────────────────────
	{
		id: 'SUB-014', customer: 'Pixel Studio', customerId: 'CUST-114',
		email: 'hello@pixelstudio.test', product: 'Support Retainer', productId: 63,
		amount: '$149/mo', amountRaw: 149, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Monthly',
		status: 'active', nextPayment: '2025-02-28', startDate: '2024-01-28',
		paymentMethod: { brand: 'Visa', last4: '6655', expiryMonth: 6, expiryYear: 2027, isDefault: true },
		deliveryType: 'service',
		linkedEntity: { type: 'service', deliverableNotes: '5 support tickets/month', nextDeliverableDue: '2025-02-28', lastDeliverableAt: '2025-01-28' },
		paymentType: 'recurring', paymentsCompleted: 12, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 9, customerLtv: 3576,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '06/2027', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Split payment (installments) ───────────────────────────────────────────
	{
		id: 'SUB-008', customer: 'Liam Anderson', customerId: 'CUST-108',
		email: 'liam@example.com', product: 'Plugin Pro', productId: 42,
		amount: '$83/mo', amountRaw: 83, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Custom',
		status: 'active', nextPayment: '2025-02-15', startDate: '2024-12-15',
		paymentMethod: { brand: 'Visa', last4: '2211', expiryMonth: 10, expiryYear: 2026, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-008', licenseKey: 'WDD-D4E5-F6A1-B2C3', domainCount: '1/1', domainsUsed: 1, domainLimit: 1 },
		paymentType: 'split', paymentsCompleted: 2, maxPayments: 3,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 5, customerLtv: 249,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '10/2026', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Pending cancel ──────────────────────────────────────────────────────────
	{
		id: 'SUB-009', customer: 'Ava Garcia', customerId: 'CUST-109',
		email: 'ava@example.com', product: 'SaaS Pro', productId: 50,
		amount: '$199/yr', amountRaw: 199, currency: 'USD',
		billing: { interval: 1, period: 'year', displayLabel: 'Yearly' }, cycle: 'Annual',
		status: 'pending_cancel', nextPayment: null, startDate: '2023-02-22',
		paymentMethod: { brand: 'Mastercard', last4: '8899', expiryMonth: 5, expiryYear: 2026, isDefault: true },
		deliveryType: 'saas',
		linkedEntity: { type: 'saas', saasAccountId: 'SAAS-009', saasAccountName: 'Ava Garcia', seatUsage: '1/1', seatsUsed: 1, seatsTotal: 1 },
		paymentType: 'recurring', paymentsCompleted: 2, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: '2025-02-22', skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 72, customerLtv: 199,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '05/2026', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Suspended (dunning exhausted) ──────────────────────────────────────────
	{
		id: 'SUB-015', customer: 'James Wilson', customerId: 'CUST-104',
		email: 'james@example.com', product: 'Plugin Pro', productId: 42,
		amount: '$99/yr', amountRaw: 99, currency: 'USD',
		billing: { interval: 1, period: 'year', displayLabel: 'Yearly' }, cycle: 'Annual',
		status: 'suspended', nextPayment: null, startDate: '2022-08-20',
		paymentMethod: { brand: 'Visa', last4: '0001', expiryMonth: 1, expiryYear: 2025, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-015', licenseKey: 'WDD-E5F6-A1B2-C3D4', domainCount: '0/1', domainsUsed: 0, domainLimit: 1 },
		paymentType: 'recurring', paymentsCompleted: 2, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 95, customerLtv: 99,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '01/2025', cardExpiring: true,
		stepPrice: null, stepAfter: null, tags: [ 'at-risk' ],
	},

	// ── Cancelled ───────────────────────────────────────────────────────────────
	{
		id: 'SUB-005', customer: 'Olivia Martinez', customerId: 'CUST-105',
		email: 'olivia@example.com', product: 'Theme Bundle', productId: 43,
		amount: '$99/yr', amountRaw: 99, currency: 'USD',
		billing: { interval: 1, period: 'year', displayLabel: 'Yearly' }, cycle: 'Annual',
		status: 'cancelled', nextPayment: null, startDate: '2023-01-05',
		paymentMethod: null,
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-005', licenseKey: 'WDD-F6A1-B2C3-D4E5', domainCount: '0/1', domainsUsed: 0, domainLimit: 1 },
		paymentType: 'recurring', paymentsCompleted: 1, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: '2024-01-05', skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 100, customerLtv: 99,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: null, cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Trialing ────────────────────────────────────────────────────────────────
	{
		id: 'SUB-007', customer: 'Ava Garcia', customerId: 'CUST-109',
		email: 'ava@example.com', product: 'SaaS Pro', productId: 50,
		amount: '$199/yr', amountRaw: 199, currency: 'USD',
		billing: { interval: 1, period: 'year', displayLabel: 'Yearly' }, cycle: 'Annual',
		status: 'trialing', nextPayment: '2025-01-22', startDate: '2025-01-08',
		paymentMethod: { brand: 'Visa', last4: '4444', expiryMonth: 12, expiryYear: 2028, isDefault: true },
		deliveryType: 'saas',
		linkedEntity: { type: 'saas', saasAccountId: 'SAAS-007', saasAccountName: 'Ava Garcia (trial)', seatUsage: '1/1', seatsUsed: 1, seatsTotal: 1 },
		paymentType: 'recurring', paymentsCompleted: 0, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 15, customerLtv: 199,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '12/2028', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [ 'trial' ],
	},

	// ── Completed (split payment fully paid) ───────────────────────────────────
	{
		id: 'SUB-016', customer: 'Noah Thompson', customerId: 'CUST-106',
		email: 'noah@example.com', product: 'Plugin Pro', productId: 42,
		amount: '$33/mo', amountRaw: 33, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Custom',
		status: 'completed', nextPayment: null, startDate: '2024-08-30',
		paymentMethod: { brand: 'Visa', last4: '3030', expiryMonth: 7, expiryYear: 2027, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-016', licenseKey: 'WDD-A1B2-D4E5-F6C3', domainCount: '1/1', domainsUsed: 1, domainLimit: 1 },
		paymentType: 'split', paymentsCompleted: 3, maxPayments: 3,
		accessTiming: 'after_full_payment', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 5, customerLtv: 99,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '07/2027', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},
];
```

### 2.3 New static datasets to add alongside `subscriptionsData`

```ts
import type {
	RevenueGoal, ChurnRiskEntry, CancellationReason,
	SubscriptionLogEntry, SubscriptionEmailLogEntry,
} from './subscription-types';

// ── Revenue goals (Analytics widget, Phase 4) ────────────────────────────────
export const revenueGoalsData: RevenueGoal[] = [
	{ id: 'goal-1', label: 'MRR Target Q3', type: 'mrr', target: 3000, current: 2310, period: 'Q3 2026', status: 'on_track' },
	{ id: 'goal-2', label: 'ARR Target 2026', type: 'arr', target: 30000, current: 27720, period: '2026', status: 'on_track' },
];

// ── Churn risk table (Analytics, Phase 4) — bands: 0–25 Low / 26–50 Medium / 51–75 High / 76–100 Critical
export const churnRiskData: ChurnRiskEntry[] = [
	{ subscriptionId: 'SUB-003', customer: 'Emily Davis', product: 'SaaS Starter', cycle: 'Monthly', status: 'past_due', churnScore: 88, dayLabel: '8 days overdue', cardExpiring: true, ltv: 147 },
	{ subscriptionId: 'SUB-015', customer: 'James Wilson', product: 'Plugin Pro', cycle: 'Annual', status: 'suspended', churnScore: 95, dayLabel: '21 days overdue', cardExpiring: true, ltv: 99 },
	{ subscriptionId: 'SUB-009', customer: 'Ava Garcia', product: 'SaaS Pro', cycle: 'Annual', status: 'pending_cancel', churnScore: 72, dayLabel: '18 days left', cardExpiring: false, ltv: 199 },
	{ subscriptionId: 'SUB-002', customer: 'Marcus Chen', product: 'Theme Bundle', cycle: 'Monthly', status: 'paused', churnScore: 35, dayLabel: 'resumes in 45 days', cardExpiring: false, ltv: 180 },
];

// ── MRR/ARR/NRR trend (Analytics LineChart, Phase 4) ─────────────────────────
export const subMrrArrData = [
	{ month: 'Jan', mrr: 29800, arr: 357600, nrr: 104 },
	{ month: 'Feb', mrr: 30650, arr: 367800, nrr: 103 },
	{ month: 'Mar', mrr: 31420, arr: 377040, nrr: 105 },
	{ month: 'Apr', mrr: 32100, arr: 385200, nrr: 106 },
	{ month: 'May', mrr: 33580, arr: 402960, nrr: 104 },
	{ month: 'Jun', mrr: 34990, arr: 419880, nrr: 107 },
];

// ── Subscription mix / revenue by delivery type (Analytics, Phase 4) ─────────
export const subTypeMix = [
	{ name: 'Software', value: 58, color: 'M3.primary' },      // resolve M3.* at usage site, not here
	{ name: 'SaaS', value: 12, color: 'M3.secondary' },
	{ name: 'Membership', value: 17, color: 'M3.info' },
	{ name: 'Download', value: 8, color: 'M3.success' },
	{ name: 'Course', value: 4, color: 'M3.warning' },
	{ name: 'Service', value: 1, color: 'M3.onSurfaceVariant' },
];
export const subRevenueByType = [
	{ type: 'Software', revenue: 24800 },
	{ type: 'SaaS', revenue: 11200 },
	{ type: 'Membership', revenue: 6400 },
	{ type: 'Download', revenue: 2800 },
	{ type: 'Course', revenue: 1900 },
	{ type: 'Service', revenue: 1100 },
];

// ── Cancellation reasons + retention offers (CancellationFlowModal, Phase 2) ─
export const CANCELLATION_REASONS: CancellationReason[] = [
	{ id: 'too_expensive', label: 'Too expensive', hasTextBox: false,
		offer: { type: 'discount', label: 'Get 20% off for 3 months', discountPct: 20, discountDuration: '3 months', description: '20% off your next 3 renewals.' } },
	{ id: 'not_using', label: 'Not using it enough', hasTextBox: false,
		offer: { type: 'pause', label: 'Pause for 30 days', pauseDuration: 30, description: 'No billing for 30 days, access stays on.' } },
	{ id: 'missing_features', label: 'Missing features I need', hasTextBox: true,
		offer: { type: 'contact', label: 'Talk to our team', contactUrl: '/support', description: 'We may already support this — let us check.' } },
	{ id: 'switching', label: 'Switching to another product', hasTextBox: true,
		offer: { type: 'discount', label: 'Get 15% off forever', discountPct: 15, discountDuration: 'Forever', description: 'A permanent discount to stay.' } },
	{ id: 'temporary', label: 'Temporary — taking a break', hasTextBox: false,
		offer: { type: 'skip', label: 'Skip your next payment', description: 'Extend access by one cycle for free, no cancellation needed.' } },
	{ id: 'other', label: 'Other', hasTextBox: true, offer: null },
];

// ── Dunning config presets (Settings → Billing & Dunning, Phase 5) ───────────
export const DUNNING_RETRY_PRESETS = [
	{ label: '3 attempts · 3 days apart (default)', attempts: 3, intervalDays: 3 },
	{ label: '4 attempts · 7 days apart', attempts: 4, intervalDays: 7 },
	{ label: 'Aggressive: 5 attempts · 2 days apart', attempts: 5, intervalDays: 2 },
];

// ── Status History tab data, keyed by subscription ID (Phase 3) ──────────────
export const subscriptionLogsData: Record<string, SubscriptionLogEntry[]> = {
	'SUB-003': [
		{ id: 'log-1', event: 'payment_failed', oldStatus: 'active', newStatus: 'past_due', amount: 49, orderId: 'ORD-2201', note: 'Card declined: insufficient_funds', actorType: 'webhook', actorLabel: 'Stripe', createdAt: '2025-01-08T09:15:00' },
		{ id: 'log-2', event: 'retry_scheduled', oldStatus: null, newStatus: null, amount: null, orderId: null, note: 'Retry scheduled for 2025-01-11', actorType: 'system', actorLabel: 'System', createdAt: '2025-01-08T09:15:05' },
	],
	'SUB-009': [
		{ id: 'log-3', event: 'cancellation_requested', oldStatus: 'active', newStatus: 'pending_cancel', amount: null, orderId: null, note: 'Reason: too_expensive — retention offer declined', actorType: 'customer', actorLabel: 'Ava Garcia', createdAt: '2025-02-04T14:02:00' },
	],
};

// ── Emails Sent tab data, keyed by subscription ID (Phase 3) ──────────────────
export const subscriptionEmailsData: Record<string, SubscriptionEmailLogEntry[]> = {
	'SUB-003': [
		{ id: 'email-1', emailType: 'Payment Failed', sentAt: '2025-01-08T09:16:00', to: 'emily@example.com', opened: true },
		{ id: 'email-2', emailType: 'Card Expiring Soon', sentAt: '2025-01-05T08:00:00', to: 'emily@example.com', opened: false },
	],
};
```

Keep the existing `PLAN_OPTIONS`, `DISCOUNT_DURATIONS` untouched. Extend `paymentHistory`'s value type
to the new `PaymentRecord` shape (§ 1.6) — same keys, richer objects — needed once the Payment Log tab
(Phase 3) and the extracted `PaymentHistoryModal` (Phase 2) both read from it.

---

## 3. Mapping notes for the future REST wiring (read once, act on it in Phase 2 of the *backend* dev plan's Step 12, not now)

Keep this table around — it's what makes "connect the backend" later a translation exercise instead
of a redesign:

| Frontend field | Backend column / endpoint field | Note |
|---|---|---|
| `SubscriptionRecord.status` | `wp_purecart_subscriptions.status` | Same enum values verbatim — no mapping layer needed now that § 1.2 aligned them |
| `billing.interval` + `billing.period` | `billing_interval` + `billing_period` | `displayLabel`/`cycle` are frontend-only conveniences — compute them, don't expect the API to send them |
| `churnRiskScore` | `churn_risk_score` | Same 0–100 scale, same bands |
| `customerLtv` | `customer_ltv` | — |
| `linkedEntity` | Depends on `deliveryType`: `license_id`/`saas_account_id` columns (software/saas) or a row in `wp_purecart_subscription_linked_entities` (other 4 types) | The REST response will need to assemble this into one object — that's a backend `RestController` concern, not frontend |
| `paymentType`, `maxPayments`, `paymentsCompleted`, `accessTiming` | Same-named split-payment columns | — |
| `pendingSwitchProduct`, `pendingSwitchType` | `pending_switch_product`, `pending_switch_type` | — |
| `cardExpiryDate`, `cardExpiring` | Derived from the stored payment token's expiry vs. `purecart_sub_card_expiry_warning_days` setting | Backend computes `cardExpiring`; frontend never recomputes it |

---

## 4. Stub link targets (until other modules exist in this repo)

Per `00-overview.md` § 1's decision: `customerId`, `linkedEntity.licenseId`, `linkedEntity.saasAccountId`
are all present in the data model now so the shape is REST-ready later, but **no component in this
plan navigates using them yet**. Every "View Customer" / "View License" / "View SaaS Account" action
shows a toast (matching the existing `SubscriptionsPage.tsx` pattern) until those pages exist in this
codebase.

---

## 5. Manual test checklist for this file

- [ ] `subscription-types.ts` compiles standalone with `strict: true`, zero `any`
- [ ] All 6 `SubscriptionDeliveryType` values appear at least once in `subscriptionsData`
- [ ] All 10 `SubscriptionStatus` values appear at least once in `subscriptionsData` (check: `trialing`, `active`, `paused`, `past_due`, `pending_reauth` — **note**: no sample row above uses `pending_reauth` yet, add one when Phase 2's SCA Reauth modal needs it — `suspended`, `pending_cancel`, `cancelled`, `expired` — **note**: also add one `expired` row before Phase 1 — `completed`)
- [ ] `SubscriptionsPage.tsx` will show type errors after this change — expected, it's fixed in Phase 1, not this one. Don't try to make the old file compile against the new types; rebuild it in Phase 1 instead.
- [ ] Discriminated union narrowing works: write a throwaway `if (row.linkedEntity.type === 'course') console.log(row.linkedEntity.enrolledCourses)` somewhere and confirm no TS error and no `as` cast needed

---

Two gaps I flagged inline above and want your call on before Phase 1:
1. Add a `pending_reauth` sample row now, or wait until Phase 2 builds the SCA Reauth modal that needs it?
2. Add an `expired` sample row now for the same reason (Phase 1's `StatusBadge` needs to render it)?

Next file up: `02-shared-components.md` (Phase 0 part 2 — the UI primitives and subscription-domain
components that read this data).

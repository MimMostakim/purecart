/**
 * Subscription module TypeScript data shapes.
 *
 * Every subscription-related interface lives here rather than inline in
 * static-data.tsx, so components can `import type { ... }` without pulling
 * in sample data.
 *
 * @file
 * @since 1.0.0
 */

// ─── Delivery type & linked entity (discriminated union) ───────────────────────

export type SubscriptionDeliveryType =
	| 'software' // license key + updates
	| 'saas' // account provisioning + seats
	| 'membership' // WP role + content restriction
	| 'download' // recurring file/media access
	| 'course' // LMS enrollment
	| 'service'; // manual retainer / agency

interface BaseLinkedEntity {
	type: SubscriptionDeliveryType;
}

export interface SoftwareLinkedEntity extends BaseLinkedEntity {
	type: 'software';
	licenseId: string;
	licenseKey: string;
	domainCount: string; // display string, e.g. '1/3'
	domainsUsed: number;
	domainLimit: number; // 0 = unlimited
}

export interface SaaSLinkedEntity extends BaseLinkedEntity {
	type: 'saas';
	saasAccountId: string;
	saasAccountName: string;
	seatUsage: string; // display string, e.g. '18/25'
	seatsUsed: number;
	seatsTotal: number;
}

export interface MembershipLinkedEntity extends BaseLinkedEntity {
	type: 'membership';
	membershipTier: string; // 'Gold', 'Silver', 'Bronze', or custom
	assignedRole: string; // WP role slug
	contentAccessLabel: string; // 'All Content + Community'
	graceEndsAt: string | null; // ISO date, set only during past_due/pending_cancel grace
}

export interface DownloadLinkedEntity extends BaseLinkedEntity {
	type: 'download';
	downloadsThisCycle: number;
	downloadLimit: number | null; // null = unlimited
	nextDripDate: string | null; // ISO date
}

export interface CourseLinkedEntity extends BaseLinkedEntity {
	type: 'course';
	enrolledCourses: string[]; // course titles, display only
	lmsEnrollmentId: string;
	courseAccessUntil: string | null; // ISO date
	progressPct: number | null; // 0-100, null if the LMS doesn't report it
}

export interface ServiceLinkedEntity extends BaseLinkedEntity {
	type: 'service';
	deliverableNotes: string;
	nextDeliverableDue: string | null; // ISO date
	lastDeliverableAt: string | null; // ISO date
}

export type SubscriptionLinkedEntity =
	| SoftwareLinkedEntity
	| SaaSLinkedEntity
	| MembershipLinkedEntity
	| DownloadLinkedEntity
	| CourseLinkedEntity
	| ServiceLinkedEntity;

// ─── Status & billing schedule ──────────────────────────────────────────────────

/**
 * Matches the backend ENUM exactly (wp_purecart_subscriptions.status) so no
 * translation layer is ever needed between the REST response and the UI.
 */
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

export type BillingPeriod = 'day' | 'week' | 'month' | 'year';

export interface BillingSchedule {
	interval: number; // e.g. 3 (every 3 months)
	period: BillingPeriod;
	displayLabel: string; // precomputed, e.g. 'Every 3 months'
}

/** Display-only convenience for places that just need a short label. */
export type BillingCycle = 'Monthly' | 'Annual' | 'Lifetime' | 'Custom';

export interface PaymentMethodSummary {
	brand: string; // 'Visa' | 'Mastercard' | 'PayPal' | ...
	last4: string;
	expiryMonth: number;
	expiryYear: number;
	isDefault: boolean;
}

// ─── The main subscription record ───────────────────────────────────────────────

export interface SubscriptionRecord {
	id: string; // 'SUB-001'
	customer: string;
	customerId: string; // 'CUST-xxx' - stub link target until a customer module exists
	email: string;
	product: string;
	productId: number;
	amount: string; // formatted, '$99/yr'
	amountRaw: number; // 99.00
	currency: string; // 'USD'
	billing: BillingSchedule;
	cycle: BillingCycle;
	status: SubscriptionStatus;
	nextPayment: string | null; // ISO date, null = no future charge scheduled
	startDate: string; // ISO date
	paymentMethod: PaymentMethodSummary | null;

	// Delivery type - drives type-specific UI everywhere (table col, row actions, detail tab, settings)
	deliveryType: SubscriptionDeliveryType;
	linkedEntity: SubscriptionLinkedEntity;

	// Split payments
	paymentType: 'recurring' | 'split';
	paymentsCompleted: number;
	maxPayments: number | null; // null = not a split payment plan
	accessTiming: 'immediate' | 'after_full_payment' | 'custom_duration';
	accessEndDate: string | null;

	// Lifecycle extras
	pauseEndDate: string | null;
	cancellationDate: string | null; // pending_cancel: access ends this date
	cancellationReasonId: string | null; // which CANCELLATION_REASONS entry was picked
	skipCount: number;
	maxRenewals: number | null; // null = unlimited
	maxLengthAt: string | null; // fixed-length subscription cap, null = indefinite

	// Analytics
	churnRiskScore: number; // 0-100
	customerLtv: number; // 24-month projected value

	// Pending plan switch (retention downgrade or manual scheduled switch)
	pendingSwitchProduct: string | null;
	pendingSwitchType: 'upgrade' | 'downgrade' | null;
	retentionDiscountRemaining: number; // cycles of an active retention discount remaining, 0 = none

	// Payment health
	cardExpiryDate: string | null; // 'MM/YYYY'
	cardExpiring: boolean; // true within the configured warning window

	// Stepped renewal pricing
	stepPrice: number | null;
	stepAfter: number | null; // cycles remaining until price steps

	tags: string[];
}

// ─── Payment ledger ──────────────────────────────────────────────────────────────

export interface PaymentRecord {
	id: string;
	date: string;
	amount: string;
	amountRaw: number;
	method: string;
	status: 'paid' | 'failed' | 'refunded' | 'trial' | 'pending';
	transactionId: string | null;
	gatewayResponse: string | null;
	dunningAttempt: number; // 0 = first try, not a retry
	isEarlyRenewal: boolean;
	isSplitInstallment: boolean;
	installmentNumber: number | null;
	refundedAmount: number | null;
}

// ─── Retention & cancellation ────────────────────────────────────────────────────

export interface RetentionOffer {
	type: 'discount' | 'pause' | 'skip' | 'downgrade' | 'contact';
	label: string; // 'Get 20% off for 3 months'
	discountPct?: number;
	discountDuration?: 'Once' | '3 months' | '6 months' | 'Forever';
	pauseDuration?: number; // days
	downgradePlanId?: string;
	downgradePlanLabel?: string; // for display without a lookup
	contactUrl?: string;
	description: string;
}

export interface CancellationReason {
	id: string;
	label: string;
	hasTextBox: boolean;
	offer: RetentionOffer | null;
}

// ─── Churn, LTV, revenue goals ────────────────────────────────────────────────────

export interface ChurnRiskEntry {
	subscriptionId: string;
	customer: string;
	product: string;
	cycle: BillingCycle;
	status: SubscriptionStatus;
	churnScore: number;
	dayLabel: string; // '8 days overdue' | '2 days left'
	cardExpiring: boolean;
	ltv: number;
}

export interface RevenueGoal {
	id: string;
	label: string; // 'MRR Target Q3'
	type: 'mrr' | 'arr' | 'total_revenue';
	target: number;
	current: number;
	period: string; // 'Q3 2026'
	status: 'on_track' | 'at_risk' | 'exceeded';
}

// ─── Status history & email log ───────────────────────────────────────────────────

export interface SubscriptionLogEntry {
	id: string;
	event: string; // 'payment_failed' | 'status_changed' | 'paused' | 'resumed' | ...
	oldStatus: SubscriptionStatus | null;
	newStatus: SubscriptionStatus | null;
	amount: number | null;
	orderId: string | null;
	note: string | null;
	actorType: 'system' | 'customer' | 'admin' | 'webhook';
	actorLabel: string | null; // display name, resolved once, not looked up per render
	createdAt: string; // ISO datetime
}

export interface SubscriptionEmailLogEntry {
	id: string;
	emailType: string; // 'Renewal Reminder' | 'Payment Failed' | ...
	sentAt: string; // ISO datetime
	to: string;
	opened: boolean | null; // null = open-tracking not available
}

// ─── Module settings (Settings → Subscriptions tab) ──────────────────────────────

export interface SubscriptionSettings {
	// General
	enableSubscriptions: boolean;
	enableAutoRenewal: boolean;
	allowMixedCart: boolean;
	oneTrialPerCustomer: boolean;
	avgLifetimeMonths: number;
	// Billing & Dunning
	maxRetryAttempts: number;
	retryIntervalDays: number[]; // e.g. [1, 3, 5]
	activeGraceDays: number;
	suspendedGraceDays: number;
	sendDunningEmails: boolean;
	// Renewals & Reminders
	renewalReminderDays: number[]; // e.g. [7, 3, 1]
	cardExpiryWarningDays: number;
	enableRenewalSync: boolean;
	renewalSyncDate: number; // day of month, 1-28
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
	skipLimitPerYear: number; // 0 = unlimited
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
	stagingDomains: string; // raw textarea text, one domain per line
	gatewayMetaKeys: string;
	cancelSaasImmediately: boolean;
	debugMode: boolean;
	// Membership (conditional section)
	membershipGraceDays: number;
	contentRestrictionPlugin: string;
	availableTiers: string; // raw textarea text
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

// ─── Split payment progress ────────────────────────────────────────────────────────

export interface SplitPaymentStatus {
	subscriptionId: string;
	totalInstallments: number;
	completedInstallments: number;
	nextInstallmentDate: string | null; // null if completed
	nextInstallmentAmount: number | null;
	accessGranted: boolean;
	accessTiming: 'immediate' | 'after_full_payment' | 'custom_duration';
	accessEndDate: string | null;
}

import {
	LayoutDashboard,
	Key,
	Download,
	RefreshCcw,
	Repeat,
	Cloud,
	Users,
	ShoppingCart,
	Shield,
	BarChart2,
	Settings as SettingsIcon,
} from 'lucide-react';
import type {
	SubscriptionRecord,
	PaymentRecord,
	RevenueGoal,
	ChurnRiskEntry,
	CancellationReason,
	SubscriptionLogEntry,
	SubscriptionEmailLogEntry,
	SubscriptionSettings,
} from './subscription-types';

// ─── M3 Color Tokens ──────────────────────────────────────────────────────────
export const M3 = {
	primary: '#6750A4',
	onPrimary: '#FFFFFF',
	primaryContainer: '#EADDFF',
	onPrimaryContainer: '#21005D',
	secondary: '#625B71',
	onSecondary: '#FFFFFF',
	secondaryContainer: '#E8DEF8',
	onSecondaryContainer: '#1D192B',
	surface: '#FFFBFE',
	surfaceContainerLow: '#F7F2FA',
	surfaceContainer: '#F3EDF7',
	surfaceContainerHigh: '#ECE6F0',
	onSurface: '#1C1B1F',
	onSurfaceVariant: '#49454F',
	outline: '#79747E',
	outlineVariant: '#CAC4D0',
	error: '#B3261E',
	errorContainer: '#F9DEDC',
	success: '#386A20',
	successContainer: '#C2E7A0',
	warning: '#7A5900',
	warningContainer: '#FFDEA5',
	info: '#00629D',
	infoContainer: '#C8E6FF',
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export type Page =
	| 'overview'
	| 'licenses'
	| 'downloads'
	| 'updates'
	| 'subscriptions'
	| 'subscription-analytics'
	| 'subscription-detail'
	| 'saas-accounts'
	| 'affiliates'
	| 'abandoned-cart'
	| 'security'
	| 'analytics'
	| 'settings';

// ─── Nav items definition ──────────────────────────────────────────────────────
export const NAV_SCHEMA: Array< {
	id: Page;
	icon: React.ElementType;
	label: string;
	/** Render a horizontal rule after this item. */
	dividerAfter?: boolean;
} > = [
	{ id: 'overview',       icon: LayoutDashboard, label: 'Overview' },
	{ id: 'licenses',       icon: Key,             label: 'Licenses' },
	{ id: 'downloads',      icon: Download,        label: 'Downloads' },
	{ id: 'updates',        icon: RefreshCcw,      label: 'Updates' },
	{ id: 'subscriptions',  icon: Repeat,          label: 'Subscriptions' },
	{ id: 'saas-accounts',  icon: Cloud,           label: 'SaaS Accounts' },
	{ id: 'affiliates',     icon: Users,           label: 'Affiliates' },
	{ id: 'abandoned-cart', icon: ShoppingCart,    label: 'Abandoned Cart' },
	{ id: 'security',       icon: Shield,          label: 'Security' },
	{ id: 'analytics',      icon: BarChart2,       label: 'Analytics', dividerAfter: true },
	{ id: 'settings',       icon: SettingsIcon,    label: 'Settings' },
];

// ─── Page titles ───────────────────────────────────────────────────────────────
export const PAGE_TITLES: Record< Page, string > = {
	'overview':               'Overview',
	'licenses':               'Licenses',
	'downloads':              'Downloads',
	'updates':                'Updates',
	'subscriptions':          'Subscriptions',
	'subscription-analytics': 'Subscription Analytics',
	'subscription-detail':    'Subscription Detail',
	'saas-accounts':          'SaaS Accounts',
	'affiliates':             'Affiliates',
	'abandoned-cart':         'Abandoned Cart',
	'security':               'Security',
	'analytics':              'Analytics',
	'settings':               'Settings',
};

// ─── Parent page map (for breadcrumbs) ────────────────────────────────────────
/** Pages that are children of another page in the breadcrumb trail. */
export const PAGE_PARENT: Partial< Record< Page, Page > > = {
	'subscription-analytics': 'subscriptions',
};

// ─── Subscription sample data ───────────────────────────────────────────────────
// Covers all 6 delivery types and 9 of the 10 SubscriptionStatus values.
// 'pending_reauth' is deliberately not represented yet - it's added alongside
// the SCA Reauth row action, a later build step, so it doesn't sit unused in
// the meantime.
export const subscriptionsData: SubscriptionRecord[] = [
	// ── Software (active, annual) ──────────────────────────────────────────────
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
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 12, customerLtv: 297,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '08/2027', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Software (paused, monthly) ─────────────────────────────────────────────
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
		pauseEndDate: '2025-04-02', cancellationDate: null, cancellationReasonId: null, skipCount: 1, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 35, customerLtv: 180,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '04/2026', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Software (past_due, card expiring) ─────────────────────────────────────
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
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 88, customerLtv: 147,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '02/2025', cardExpiring: true,
		stepPrice: null, stepAfter: null, tags: [ 'at-risk' ],
	},

	// ── Software (active, annual) ──────────────────────────────────────────────
	{
		id: 'SUB-004', customer: 'James Wilson', customerId: 'CUST-104',
		email: 'james@example.com', product: 'Plugin Pro', productId: 42,
		amount: '$99/yr', amountRaw: 99, currency: 'USD',
		billing: { interval: 1, period: 'year', displayLabel: 'Yearly' }, cycle: 'Annual',
		status: 'active', nextPayment: '2025-08-20', startDate: '2022-08-20',
		paymentMethod: { brand: 'Visa', last4: '9999', expiryMonth: 5, expiryYear: 2028, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-004', licenseKey: 'WDD-D4E5-F6A1-B2C3', domainCount: '1/1', domainsUsed: 1, domainLimit: 1 },
		paymentType: 'recurring', paymentsCompleted: 2, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 20, customerLtv: 198,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '05/2028', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
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
		pauseEndDate: null, cancellationDate: '2024-01-05', cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 100, customerLtv: 99,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: null, cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Software (active, monthly - low price plan) ────────────────────────────
	{
		id: 'SUB-006', customer: 'Noah Thompson', customerId: 'CUST-106',
		email: 'noah@example.com', product: 'Plugin Pro', productId: 42,
		amount: '$9/mo', amountRaw: 9, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Monthly',
		status: 'active', nextPayment: '2025-01-30', startDate: '2024-07-30',
		paymentMethod: { brand: 'Visa', last4: '3030', expiryMonth: 7, expiryYear: 2027, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-006', licenseKey: 'WDD-A1B2-D4E5-F6C3', domainCount: '1/1', domainsUsed: 1, domainLimit: 1 },
		paymentType: 'recurring', paymentsCompleted: 6, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 15, customerLtv: 54,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '07/2027', cardExpiring: false,
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
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 15, customerLtv: 199,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '12/2028', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [ 'trial' ],
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
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
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
		pauseEndDate: null, cancellationDate: '2025-02-22', cancellationReasonId: 'too_expensive', skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 72, customerLtv: 199,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '05/2026', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
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
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
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
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
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
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
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
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
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
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 9, customerLtv: 3576,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '06/2027', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Suspended (dunning exhausted) ──────────────────────────────────────────
	{
		id: 'SUB-015', customer: 'Grace Kim', customerId: 'CUST-115',
		email: 'grace@example.com', product: 'Plugin Pro', productId: 42,
		amount: '$99/yr', amountRaw: 99, currency: 'USD',
		billing: { interval: 1, period: 'year', displayLabel: 'Yearly' }, cycle: 'Annual',
		status: 'suspended', nextPayment: null, startDate: '2022-09-20',
		paymentMethod: { brand: 'Visa', last4: '0001', expiryMonth: 1, expiryYear: 2025, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-015', licenseKey: 'WDD-E5F6-A1B2-C3D4', domainCount: '0/1', domainsUsed: 0, domainLimit: 1 },
		paymentType: 'recurring', paymentsCompleted: 2, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 95, customerLtv: 99,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '01/2025', cardExpiring: true,
		stepPrice: null, stepAfter: null, tags: [ 'at-risk' ],
	},

	// ── Completed (split payment fully paid) ───────────────────────────────────
	{
		id: 'SUB-016', customer: 'Ben Foster', customerId: 'CUST-116',
		email: 'ben@example.com', product: 'Plugin Pro', productId: 42,
		amount: '$33/mo', amountRaw: 33, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Custom',
		status: 'completed', nextPayment: null, startDate: '2024-08-30',
		paymentMethod: { brand: 'Visa', last4: '3030', expiryMonth: 7, expiryYear: 2027, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-016', licenseKey: 'WDD-A1B2-D4E5-F6C3', domainCount: '1/1', domainsUsed: 1, domainLimit: 1 },
		paymentType: 'split', paymentsCompleted: 3, maxPayments: 3,
		accessTiming: 'after_full_payment', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 5, customerLtv: 99,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '07/2027', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Expired (fixed-length subscription ran out) ────────────────────────────
	{
		id: 'SUB-017', customer: 'Priya Nair', customerId: 'CUST-117',
		email: 'priya@example.com', product: 'Developer Bootcamp', productId: 62,
		amount: '$49/mo', amountRaw: 49, currency: 'USD',
		billing: { interval: 1, period: 'month', displayLabel: 'Monthly' }, cycle: 'Monthly',
		status: 'expired', nextPayment: null, startDate: '2023-12-01',
		paymentMethod: { brand: 'Visa', last4: '1122', expiryMonth: 4, expiryYear: 2026, isDefault: true },
		deliveryType: 'course',
		linkedEntity: { type: 'course', enrolledCourses: [ 'PHP Mastery' ], lmsEnrollmentId: 'LMS-3310', courseAccessUntil: '2024-12-01', progressPct: 100 },
		paymentType: 'recurring', paymentsCompleted: 12, maxPayments: 12,
		accessTiming: 'immediate', accessEndDate: '2024-12-01',
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: 12, maxLengthAt: '2024-12-01',
		churnRiskScore: 10, customerLtv: 588,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '04/2026', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},

	// ── Pending reauth (SCA/3DS challenge required) ────────────────────────────
	{
		id: 'SUB-018', customer: 'Carlos Mendes', customerId: 'CUST-118',
		email: 'carlos@example.com', product: 'Plugin Pro', productId: 42,
		amount: '$99/yr', amountRaw: 99, currency: 'USD',
		billing: { interval: 1, period: 'year', displayLabel: 'Yearly' }, cycle: 'Annual',
		status: 'pending_reauth', nextPayment: '2025-02-10', startDate: '2022-02-10',
		paymentMethod: { brand: 'Visa', last4: '5566', expiryMonth: 3, expiryYear: 2026, isDefault: true },
		deliveryType: 'software',
		linkedEntity: { type: 'software', licenseId: 'LIC-018', licenseKey: 'WDD-B2C3-A1D4-E5F6', domainCount: '1/1', domainsUsed: 1, domainLimit: 1 },
		paymentType: 'recurring', paymentsCompleted: 3, maxPayments: null,
		accessTiming: 'immediate', accessEndDate: null,
		pauseEndDate: null, cancellationDate: null, cancellationReasonId: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
		churnRiskScore: 45, customerLtv: 297,
		pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
		cardExpiryDate: '03/2026', cardExpiring: false,
		stepPrice: null, stepAfter: null, tags: [],
	},
];

// ── Subscription analytics data ────────────────────────────────────────────────
export const subTrendData = [
	{ month: 'Jan', active: 4100, new: 420, churned: 190, paused: 310 },
	{ month: 'Feb', active: 4330, new: 510, churned: 210, paused: 298 },
	{ month: 'Mar', active: 4620, new: 480, churned: 180, paused: 320 },
	{ month: 'Apr', active: 4880, new: 540, churned: 200, paused: 305 },
	{ month: 'May', active: 5100, new: 610, churned: 230, paused: 290 },
	{ month: 'Jun', active: 5241, new: 580, churned: 215, paused: 412 },
];

export const subPlanMix = [
	{ name: 'Annual',   value: 58, color: M3.primary },
	{ name: 'Monthly',  value: 31, color: M3.secondary },
	{ name: 'Lifetime', value: 11, color: M3.info },
];

export const subRevenueByProduct = [
	{ product: 'Plugin Pro',   revenue: 24800 },
	{ product: 'Theme Bundle', revenue: 11200 },
	{ product: 'SaaS Pro',     revenue: 6400 },
	{ product: 'SaaS Starter', revenue: 2200 },
];

// ── Revenue goals (Analytics widget + Settings management) ──────────────────────
export const revenueGoalsData: RevenueGoal[] = [
	{ id: 'goal-1', label: 'MRR Target Q3', type: 'mrr', target: 3000, current: 2310, period: 'Q3 2026', status: 'on_track' },
	{ id: 'goal-2', label: 'ARR Target 2026', type: 'arr', target: 30000, current: 27720, period: '2026', status: 'on_track' },
];

// ── Churn risk table (Analytics) — bands: 0–25 Low / 26–50 Medium / 51–75 High / 76–100 Critical
export const churnRiskData: ChurnRiskEntry[] = [
	{ subscriptionId: 'SUB-003', customer: 'Emily Davis', product: 'SaaS Starter', cycle: 'Monthly', status: 'past_due', churnScore: 88, dayLabel: '8 days overdue', cardExpiring: true, ltv: 147 },
	{ subscriptionId: 'SUB-015', customer: 'Grace Kim', product: 'Plugin Pro', cycle: 'Annual', status: 'suspended', churnScore: 95, dayLabel: '21 days overdue', cardExpiring: true, ltv: 99 },
	{ subscriptionId: 'SUB-009', customer: 'Ava Garcia', product: 'SaaS Pro', cycle: 'Annual', status: 'pending_cancel', churnScore: 72, dayLabel: '18 days left', cardExpiring: false, ltv: 199 },
	{ subscriptionId: 'SUB-002', customer: 'Marcus Chen', product: 'Theme Bundle', cycle: 'Monthly', status: 'paused', churnScore: 35, dayLabel: 'resumes in 45 days', cardExpiring: false, ltv: 180 },
];

// ── MRR/ARR/NRR trend (Analytics LineChart) ──────────────────────────────────────
export const subMrrArrData = [
	{ month: 'Jan', mrr: 29800, arr: 357600, nrr: 104 },
	{ month: 'Feb', mrr: 30650, arr: 367800, nrr: 103 },
	{ month: 'Mar', mrr: 31420, arr: 377040, nrr: 105 },
	{ month: 'Apr', mrr: 32100, arr: 385200, nrr: 106 },
	{ month: 'May', mrr: 33580, arr: 402960, nrr: 104 },
	{ month: 'Jun', mrr: 34990, arr: 419880, nrr: 107 },
];

// ── Subscription mix / revenue by delivery type (Analytics) ───────────────────────
export const subTypeMix = [
	{ name: 'Software', value: 58, color: M3.primary },
	{ name: 'SaaS', value: 12, color: M3.secondary },
	{ name: 'Membership', value: 17, color: M3.info },
	{ name: 'Download', value: 8, color: M3.success },
	{ name: 'Course', value: 4, color: M3.warning },
	{ name: 'Service', value: 1, color: M3.onSurfaceVariant },
];
export const subRevenueByType = [
	{ type: 'Software', revenue: 24800 },
	{ type: 'SaaS', revenue: 11200 },
	{ type: 'Membership', revenue: 6400 },
	{ type: 'Download', revenue: 2800 },
	{ type: 'Course', revenue: 1900 },
	{ type: 'Service', revenue: 1100 },
];

// ── Dunning funnel (Analytics BarChart) ─────────────────────────────────────────
export const dunningFunnelData = [
	{ attempt: '1st retry', recovered: 14 },
	{ attempt: '2nd retry', recovered: 6 },
	{ attempt: '3rd retry', recovered: 2 },
];

// ── Churn by cancellation reason (Analytics PieChart) ────────────────────────────
export const churnByReasonData = [
	{ reasonId: 'too_expensive', label: 'Too expensive', count: 14 },
	{ reasonId: 'not_using', label: 'Not using it enough', count: 8 },
	{ reasonId: 'missing_features', label: 'Missing features', count: 5 },
	{ reasonId: 'switching', label: 'Switching products', count: 3 },
	{ reasonId: 'other', label: 'Other', count: 2 },
];

// ── Cancellation reasons + retention offers (CancellationFlowModal) ──────────────
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

// ── Dunning config presets (Settings → Billing & Dunning) ────────────────────────
export const DUNNING_RETRY_PRESETS = [
	{ label: '3 attempts · 3 days apart (default)', attempts: 3, intervalDays: 3 },
	{ label: '4 attempts · 7 days apart', attempts: 4, intervalDays: 7 },
	{ label: 'Aggressive: 5 attempts · 2 days apart', attempts: 5, intervalDays: 2 },
];

// ── Status History tab data, keyed by subscription ID ────────────────────────────
export const subscriptionLogsData: Record< string, SubscriptionLogEntry[] > = {
	'SUB-003': [
		{ id: 'log-1', event: 'payment_failed', oldStatus: 'active', newStatus: 'past_due', amount: 49, orderId: 'ORD-2201', note: 'Card declined: insufficient_funds', actorType: 'webhook', actorLabel: 'Stripe', createdAt: '2025-01-08T09:15:00' },
		{ id: 'log-2', event: 'retry_scheduled', oldStatus: null, newStatus: null, amount: null, orderId: null, note: 'Retry scheduled for 2025-01-11', actorType: 'system', actorLabel: 'System', createdAt: '2025-01-08T09:15:05' },
	],
	'SUB-009': [
		{ id: 'log-3', event: 'cancellation_requested', oldStatus: 'active', newStatus: 'pending_cancel', amount: null, orderId: null, note: 'Reason: too_expensive — retention offer declined', actorType: 'customer', actorLabel: 'Ava Garcia', createdAt: '2025-02-04T14:02:00' },
	],
};

// ── Emails Sent tab data, keyed by subscription ID ────────────────────────────────
export const subscriptionEmailsData: Record< string, SubscriptionEmailLogEntry[] > = {
	'SUB-003': [
		{ id: 'email-1', emailType: 'Payment Failed', sentAt: '2025-01-08T09:16:00', to: 'emily@example.com', opened: true },
		{ id: 'email-2', emailType: 'Card Expiring Soon', sentAt: '2025-01-05T08:00:00', to: 'emily@example.com', opened: false },
	],
};

export const PLAN_OPTIONS = [
	{
		label: 'Monthly',
		amount: '$9/mo',
		cycle: 'Monthly',
		note: 'Billed every month, cancel any time.',
	},
	{
		label: 'Annual',
		amount: '$99/yr',
		cycle: 'Annual',
		note: 'Save 8% vs monthly. Billed once per year.',
	},
	{
		label: 'Lifetime',
		amount: '$249',
		cycle: 'Lifetime',
		note: 'One-time payment, never pay again.',
	},
];

export const DISCOUNT_DURATIONS = [
	'Once',
	'3 months',
	'6 months',
	'Forever',
] as const;

// ── Subscriptions module settings — default values ────────────────────────────────
export const defaultSubscriptionSettings: SubscriptionSettings = {
	enableSubscriptions: true, enableAutoRenewal: true, allowMixedCart: true,
	oneTrialPerCustomer: true, avgLifetimeMonths: 24,
	maxRetryAttempts: 3, retryIntervalDays: [ 1, 3, 5 ], activeGraceDays: 7,
	suspendedGraceDays: 7, sendDunningEmails: true,
	renewalReminderDays: [ 7, 3, 1 ], cardExpiryWarningDays: 30,
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

// Static payment history per subscription (keyed by sub ID)
export const paymentHistory: Record< string, PaymentRecord[] > = {
	'SUB-001': [
		{ id: 'pay-001-1', date: '2025-01-01', amount: '$99.00', amountRaw: 99, method: 'Visa ···4242', status: 'paid', transactionId: 'txn_a1', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
		{ id: 'pay-001-2', date: '2024-01-01', amount: '$99.00', amountRaw: 99, method: 'Visa ···4242', status: 'paid', transactionId: 'txn_a2', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
		{ id: 'pay-001-3', date: '2023-01-01', amount: '$99.00', amountRaw: 99, method: 'Visa ···4242', status: 'paid', transactionId: 'txn_a3', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
	],
	'SUB-002': [
		{ id: 'pay-002-1', date: '2025-01-02', amount: '$29.00', amountRaw: 29, method: 'Mastercard ···1234', status: 'paid', transactionId: 'txn_b1', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
		{ id: 'pay-002-2', date: '2024-12-02', amount: '$29.00', amountRaw: 29, method: 'Mastercard ···1234', status: 'paid', transactionId: 'txn_b2', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
		{ id: 'pay-002-3', date: '2024-11-02', amount: '$29.00', amountRaw: 29, method: 'Mastercard ···1234', status: 'failed', transactionId: null, gatewayResponse: 'insufficient_funds', dunningAttempt: 1, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
		{ id: 'pay-002-4', date: '2024-10-02', amount: '$29.00', amountRaw: 29, method: 'Mastercard ···1234', status: 'paid', transactionId: 'txn_b4', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
	],
	'SUB-003': [
		{ id: 'pay-003-1', date: '2025-01-08', amount: '$49.00', amountRaw: 49, method: 'PayPal', status: 'failed', transactionId: null, gatewayResponse: 'insufficient_funds', dunningAttempt: 1, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
		{ id: 'pay-003-2', date: '2024-12-08', amount: '$49.00', amountRaw: 49, method: 'PayPal', status: 'paid', transactionId: 'txn_c2', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
	],
	'SUB-004': [
		{ id: 'pay-004-1', date: '2025-01-01', amount: '$99.00', amountRaw: 99, method: 'Visa ···9999', status: 'paid', transactionId: 'txn_d1', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
	],
	'SUB-007': [
		{ id: 'pay-007-1', date: '2025-01-10', amount: '$0.00', amountRaw: 0, method: '—', status: 'trial', transactionId: null, gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: false, installmentNumber: null, refundedAmount: null },
	],
	'SUB-008': [
		{ id: 'pay-008-1', date: '2025-01-15', amount: '$83.00', amountRaw: 83, method: 'Visa ···2211', status: 'paid', transactionId: 'txn_h1', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: true, installmentNumber: 2, refundedAmount: null },
		{ id: 'pay-008-2', date: '2024-12-15', amount: '$83.00', amountRaw: 83, method: 'Visa ···2211', status: 'paid', transactionId: 'txn_h2', gatewayResponse: null, dunningAttempt: 0, isEarlyRenewal: false, isSplitInstallment: true, installmentNumber: 1, refundedAmount: null },
	],
};

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

// ─── Page identifiers ──────────────────────────────────────────────────────────
export type Page =
	| 'overview'
	| 'licenses'
	| 'downloads'
	| 'updates'
	| 'subscriptions'
	| 'subscription-analytics'
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

// ─── Sample / static data ─────────────────────────────────────────────────────
export const subscriptionsData = [
	{
		id: 'SUB-001',
		customer: 'Sarah Johnson',
		product: 'Plugin Pro',
		amount: '$99/yr',
		cycle: 'Annual',
		status: 'active',
		nextPayment: '2025-06-15',
	},
	{
		id: 'SUB-002',
		customer: 'Marcus Chen',
		product: 'Theme Bundle',
		amount: '$29/mo',
		cycle: 'Monthly',
		status: 'paused',
		nextPayment: '—',
	},
	{
		id: 'SUB-003',
		customer: 'Emily Davis',
		product: 'SaaS Starter',
		amount: '$49/mo',
		cycle: 'Monthly',
		status: 'past-due',
		nextPayment: '2025-01-08',
	},
	{
		id: 'SUB-004',
		customer: 'James Wilson',
		product: 'Plugin Pro',
		amount: '$99/yr',
		cycle: 'Annual',
		status: 'active',
		nextPayment: '2025-08-20',
	},
	{
		id: 'SUB-005',
		customer: 'Olivia Martinez',
		product: 'Theme Bundle',
		amount: '$99/yr',
		cycle: 'Annual',
		status: 'cancelled',
		nextPayment: '—',
	},
	{
		id: 'SUB-006',
		customer: 'Noah Thompson',
		product: 'Plugin Pro',
		amount: '$9/mo',
		cycle: 'Monthly',
		status: 'active',
		nextPayment: '2025-01-30',
	},
	{
		id: 'SUB-007',
		customer: 'Ava Garcia',
		product: 'SaaS Pro',
		amount: '$199/yr',
		cycle: 'Annual',
		status: 'trialing',
		nextPayment: '2025-01-22',
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

// Static payment history per subscription (keyed by sub ID)
export const paymentHistory: Record<
	string,
	Array< { date: string; amount: string; method: string; status: string } >
> = {
	'SUB-001': [
		{ date: '2025-01-01', amount: '$99.00', method: 'Visa ···4242',        status: 'paid' },
		{ date: '2024-01-01', amount: '$99.00', method: 'Visa ···4242',        status: 'paid' },
		{ date: '2023-01-01', amount: '$99.00', method: 'Visa ···4242',        status: 'paid' },
	],
	'SUB-002': [
		{ date: '2025-01-02', amount: '$29.00', method: 'Mastercard ···1234',  status: 'paid' },
		{ date: '2024-12-02', amount: '$29.00', method: 'Mastercard ···1234',  status: 'paid' },
		{ date: '2024-11-02', amount: '$29.00', method: 'Mastercard ···1234',  status: 'failed' },
		{ date: '2024-10-02', amount: '$29.00', method: 'Mastercard ···1234',  status: 'paid' },
	],
	'SUB-003': [
		{ date: '2025-01-08', amount: '$49.00', method: 'PayPal',              status: 'failed' },
		{ date: '2024-12-08', amount: '$49.00', method: 'PayPal',              status: 'paid' },
	],
	'SUB-004': [
		{ date: '2025-01-01', amount: '$99.00', method: 'Visa ···9999',        status: 'paid' },
	],
	'SUB-007': [
		{ date: '2025-01-10', amount: '$0.00',  method: '—',                   status: 'trial' },
	],
};

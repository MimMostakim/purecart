import {
	LayoutDashboard,
	Key,
	Download,
	RefreshCw,
	Repeat,
	Cloud,
	Users,
	ShoppingCart,
	Shield,
	BarChart2,
	Settings,
	CheckCircle,
	Bell,
	CreditCard,
	Mail,
	XCircle,
	UserPlus,
	Ban,
	PauseCircle,
	ArrowUpRight,
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
	| 'license-summary'
	| 'license-detail'
	| 'customer-detail'
	| 'subscriptions'
	| 'analytics'
	| 'analytics-subscriptions'
	| 'analytics-affiliates'
	| 'analytics-abandoned-cart'
	| 'settings'
	| 'downloads'
	| 'updates'
	| 'saas'
	| 'saas-detail'
	| 'affiliates'
	| 'affiliate-detail'
	| 'abandoned-cart'
	| 'security';

export interface Module {
	name: string;
	desc: string;
	phase: string;
	enabled: boolean;
	navId: Page | null;
}

// ─── Module → Nav mapping ──────────────────────────────────────────────────────
export const INITIAL_MODULES: Module[] = [
	{
		name: 'Secure Downloads',
		desc: 'Protect download links with expiring tokens',
		phase: 'Phase 1',
		enabled: true,
		navId: 'downloads',
	},
	{
		name: 'License Manager',
		desc: 'Issue and validate software licenses',
		phase: 'Phase 1',
		enabled: true,
		navId: 'licenses',
	},
	{
		name: 'Update Manager',
		desc: 'Serve plugin/theme update packages',
		phase: 'Phase 1',
		enabled: true,
		navId: 'updates',
	},
	{
		name: 'Subscriptions',
		desc: 'Recurring billing and subscription management',
		phase: 'Phase 1',
		enabled: true,
		navId: 'subscriptions',
	},
	{
		name: 'SaaS Provisioning',
		desc: 'Automated account and seat management',
		phase: 'Phase 2',
		enabled: true,
		navId: 'saas',
	},
	{
		name: 'Affiliate Program',
		desc: 'Track referrals and manage commissions',
		phase: 'Phase 2',
		enabled: true,
		navId: 'affiliates',
	},
	{
		name: 'Abandoned Cart',
		desc: 'Recover lost sales with automated emails',
		phase: 'Phase 2',
		enabled: true,
		navId: 'abandoned-cart',
	},
	{
		name: 'Analytics',
		desc: 'Advanced reporting and revenue dashboards',
		phase: 'Phase 1',
		enabled: true,
		navId: 'analytics',
	},
	{
		name: 'Security Suite',
		desc: 'Fraud detection and IP blocking',
		phase: 'Phase 3',
		enabled: true,
		navId: 'security',
	},
];

// ─── Nav items definition ──────────────────────────────────────────────────────
export const NAV_SCHEMA: Array< {
	id: Page;
	icon: React.ElementType;
	label: string;
	moduleKey: string | null;
	dividerBefore?: boolean;
} > = [
	{
		id: 'overview',
		icon: LayoutDashboard,
		label: 'Overview',
		moduleKey: null,
	},
	{
		id: 'licenses',
		icon: Key,
		label: 'Licenses',
		moduleKey: 'License Manager',
	},
	{
		id: 'downloads',
		icon: Download,
		label: 'Downloads',
		moduleKey: 'Secure Downloads',
	},
	{
		id: 'updates',
		icon: RefreshCw,
		label: 'Updates',
		moduleKey: 'Update Manager',
	},
	{
		id: 'subscriptions',
		icon: Repeat,
		label: 'Subscriptions',
		moduleKey: 'Subscriptions',
	},
	{
		id: 'saas',
		icon: Cloud,
		label: 'SaaS Accounts',
		moduleKey: 'SaaS Provisioning',
	},
	{
		id: 'affiliates',
		icon: Users,
		label: 'Affiliates',
		moduleKey: 'Affiliate Program',
	},
	{
		id: 'abandoned-cart',
		icon: ShoppingCart,
		label: 'Abandoned Cart',
		moduleKey: 'Abandoned Cart',
	},
	{
		id: 'security',
		icon: Shield,
		label: 'Security',
		moduleKey: 'Security Suite',
	},
	{
		id: 'analytics',
		icon: BarChart2,
		label: 'Analytics',
		moduleKey: 'Analytics',
	},
	{
		id: 'settings',
		icon: Settings,
		label: 'Settings',
		moduleKey: null,
		dividerBefore: true,
	},
];

// ─── Sample Data ───────────────────────────────────────────────────────────────
export const mrrData = [
	{ month: 'Jul', mrr: 18400, arr: 220800 },
	{ month: 'Aug', mrr: 21200, arr: 254400 },
	{ month: 'Sep', mrr: 23800, arr: 285600 },
	{ month: 'Oct', mrr: 22100, arr: 265200 },
	{ month: 'Nov', mrr: 26500, arr: 318000 },
	{ month: 'Dec', mrr: 30200, arr: 362400 },
	{ month: 'Jan', mrr: 28900, arr: 346800 },
	{ month: 'Feb', mrr: 32400, arr: 388800 },
	{ month: 'Mar', mrr: 35100, arr: 421200 },
	{ month: 'Apr', mrr: 37800, arr: 453600 },
	{ month: 'May', mrr: 41200, arr: 494400 },
	{ month: 'Jun', mrr: 44600, arr: 535200 },
];

export const licenseStatusData = [
	{ name: 'Active', value: 8432, color: M3.success },
	{ name: 'Expired', value: 1241, color: M3.error },
	{ name: 'Suspended', value: 312, color: M3.warning },
	{ name: 'Revoked', value: 89, color: M3.onSurfaceVariant },
];

export const recentLicenses = [
	{
		key: 'WDD-A1B2-C3D4-E5F6',
		product: 'Plugin Pro',
		customer: 'Sarah Johnson',
		status: 'active',
		date: '2h ago',
	},
	{
		key: 'WDD-B2C3-D4E5-F6G7',
		product: 'Theme Bundle',
		customer: 'Marcus Chen',
		status: 'active',
		date: '4h ago',
	},
	{
		key: 'WDD-C3D4-E5F6-G7H8',
		product: 'SaaS Starter',
		customer: 'Emily Davis',
		status: 'expired',
		date: '6h ago',
	},
	{
		key: 'WDD-D4E5-F6G7-H8I9',
		product: 'Plugin Pro',
		customer: 'James Wilson',
		status: 'active',
		date: '8h ago',
	},
	{
		key: 'WDD-E5F6-G7H8-I9J0',
		product: 'Theme Bundle',
		customer: 'Olivia Martinez',
		status: 'suspended',
		date: '12h ago',
	},
];

export const recentDownloads = [
	{
		country: '🇺🇸',
		ip: '192.168.1.1',
		product: 'Plugin Pro v2.4.1',
		time: '3m ago',
	},
	{
		country: '🇩🇪',
		ip: '10.0.0.52',
		product: 'Theme Bundle v1.8.0',
		time: '7m ago',
	},
	{
		country: '🇬🇧',
		ip: '172.16.0.8',
		product: 'Plugin Pro v2.4.1',
		time: '12m ago',
	},
	{
		country: '🇨🇦',
		ip: '192.168.2.45',
		product: 'SaaS Connector v3.1.0',
		time: '18m ago',
	},
	{
		country: '🇦🇺',
		ip: '10.20.30.40',
		product: 'Plugin Pro v2.4.1',
		time: '25m ago',
	},
];

export const expiringLicenses = [
	{
		key: 'WDD-X1Y2-Z3A4-B5C6',
		customer: 'Tom Baker',
		product: 'Plugin Pro',
		expiresIn: '2 days',
	},
	{
		key: 'WDD-Y2Z3-A4B5-C6D7',
		customer: 'Nina Patel',
		product: 'Theme Bundle',
		expiresIn: '5 days',
	},
	{
		key: 'WDD-Z3A4-B5C6-D7E8',
		customer: 'David Kim',
		product: 'Plugin Pro',
		expiresIn: '7 days',
	},
	{
		key: 'WDD-A4B5-C6D7-E8F9',
		customer: 'Lisa Wang',
		product: 'SaaS Starter',
		expiresIn: '9 days',
	},
];

export const licensesTableData = [
	{
		id: 1,
		key: 'WDD-A1B2-C3D4-E5F6',
		customer: 'Sarah Johnson',
		email: 'sarah@example.com',
		product: 'Plugin Pro',
		plan: 'Annual',
		sites: '1/1',
		status: 'active',
		expires: '2025-06-15',
	},
	{
		id: 2,
		key: 'WDD-B2C3-D4E5-F6G7',
		customer: 'Marcus Chen',
		email: 'marcus@example.com',
		product: 'Theme Bundle',
		plan: 'Lifetime',
		sites: '3/5',
		status: 'active',
		expires: 'Lifetime',
	},
	{
		id: 3,
		key: 'WDD-C3D4-E5F6-G7H8',
		customer: 'Emily Davis',
		email: 'emily@example.com',
		product: 'SaaS Starter',
		plan: 'Monthly',
		sites: '1/1',
		status: 'expired',
		expires: '2024-12-01',
	},
	{
		id: 4,
		key: 'WDD-D4E5-F6G7-H8I9',
		customer: 'James Wilson',
		email: 'james@example.com',
		product: 'Plugin Pro',
		plan: 'Annual',
		sites: '2/3',
		status: 'active',
		expires: '2025-08-20',
	},
	{
		id: 5,
		key: 'WDD-E5F6-G7H8-I9J0',
		customer: 'Olivia Martinez',
		email: 'olivia@example.com',
		product: 'Theme Bundle',
		plan: 'Annual',
		sites: '0/5',
		status: 'suspended',
		expires: '2025-03-10',
	},
	{
		id: 6,
		key: 'WDD-F6G7-H8I9-J0K1',
		customer: 'Noah Thompson',
		email: 'noah@example.com',
		product: 'Plugin Pro',
		plan: 'Monthly',
		sites: '1/1',
		status: 'active',
		expires: '2025-01-30',
	},
	{
		id: 7,
		key: 'WDD-G7H8-I9J0-K1L2',
		customer: 'Ava Garcia',
		email: 'ava@example.com',
		product: 'SaaS Pro',
		plan: 'Annual',
		sites: '5/10',
		status: 'active',
		expires: '2025-11-14',
	},
	{
		id: 8,
		key: 'WDD-H8I9-J0K1-L2M3',
		customer: 'Liam Anderson',
		email: 'liam@example.com',
		product: 'Plugin Pro',
		plan: 'Lifetime',
		sites: '1/1',
		status: 'revoked',
		expires: 'N/A',
	},
];

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

export const analyticsBarData = [
	{ month: 'Jan', active: 6200, expired: 820, suspended: 210, revoked: 45 },
	{ month: 'Feb', active: 6800, expired: 790, suspended: 195, revoked: 52 },
	{ month: 'Mar', active: 7100, expired: 870, suspended: 230, revoked: 60 },
	{ month: 'Apr', active: 7400, expired: 910, suspended: 248, revoked: 68 },
	{ month: 'May', active: 7900, expired: 980, suspended: 275, revoked: 74 },
	{ month: 'Jun', active: 8432, expired: 1241, suspended: 312, revoked: 89 },
];

export const topCountries = [
	{ flag: '🇺🇸', country: 'United States', downloads: 14823, pct: 100 },
	{ flag: '🇩🇪', country: 'Germany', downloads: 7214, pct: 49 },
	{ flag: '🇬🇧', country: 'United Kingdom', downloads: 6891, pct: 46 },
	{ flag: '🇨🇦', country: 'Canada', downloads: 5432, pct: 37 },
	{ flag: '🇦🇺', country: 'Australia', downloads: 4876, pct: 33 },
	{ flag: '🇫🇷', country: 'France', downloads: 4201, pct: 28 },
	{ flag: '🇳🇱', country: 'Netherlands', downloads: 3812, pct: 26 },
	{ flag: '🇸🇪', country: 'Sweden', downloads: 2941, pct: 20 },
];

export const versionData = [
	{ name: 'v2.4.x', value: 38, color: M3.primary },
	{ name: 'v2.3.x', value: 27, color: M3.secondary },
	{ name: 'v2.2.x', value: 18, color: M3.info },
	{ name: 'v2.1.x', value: 10, color: M3.warning },
	{ name: 'older', value: 7, color: M3.outlineVariant },
];

export const activationData = [
	{
		domain: 'example.com',
		env: 'production',
		ip: '93.184.216.34',
		activatedAt: '2024-06-15 09:23',
		id: 1,
	},
	{
		domain: 'staging.example.com',
		env: 'staging',
		ip: '93.184.216.35',
		activatedAt: '2024-06-14 14:11',
		id: 2,
	},
	{
		domain: 'dev.local',
		env: 'local',
		ip: '127.0.0.1',
		activatedAt: '2024-06-10 08:00',
		id: 3,
	},
];

export const eventLog = [
	{
		type: 'activated',
		desc: 'License activated on example.com',
		time: '2024-06-15 09:23',
		icon: CheckCircle,
		color: M3.success,
	},
	{
		type: 'renewed',
		desc: 'License renewed — Annual plan',
		time: '2024-06-01 00:00',
		icon: RefreshCw,
		color: M3.info,
	},
	{
		type: 'warning',
		desc: 'Expiry reminder sent to customer',
		time: '2024-05-15 08:00',
		icon: Bell,
		color: M3.warning,
	},
	{
		type: 'created',
		desc: 'License issued after purchase #1234',
		time: '2023-06-01 10:42',
		icon: Key,
		color: M3.primary,
	},
];

// ─── Customer Data ─────────────────────────────────────────────────────────────
export interface CustomerLicense {
	id: number;
	key: string;
	product: string;
	plan: string;
	sites: string;
	status: string;
	expires: string;
	created: string;
}
export interface CustomerSubscription {
	id: string;
	product: string;
	amount: string;
	cycle: string;
	status: string;
	started: string;
	nextPayment: string;
}
export interface CustomerDownload {
	product: string;
	version: string;
	ip: string;
	country: string;
	flag: string;
	date: string;
	size: string;
}
export interface CustomerEvent {
	type: string;
	desc: string;
	time: string;
	icon: React.ElementType;
	color: string;
	meta?: string;
}

export const CUSTOMER_SARAH = {
	id: 'CUST-001',
	name: 'Sarah Johnson',
	email: 'sarah@example.com',
	phone: '+1 (415) 555-0182',
	location: 'San Francisco, CA, US',
	flag: '🇺🇸',
	website: 'example.com',
	joinDate: 'Jun 3, 2022',
	lastActive: '2h ago',
	avatar: 'SJ',
	ltv: '$842',
	totalSpent: '$842.00',
	ordersCount: 9,
	notes: 'Enterprise customer — prefers annual billing. Reached out about volume licensing in Dec 2024.',
	tags: [ 'annual', 'enterprise', 'plugin-pro' ],
	spendHistory: [
		{ month: 'Jul', spend: 0 },
		{ month: 'Aug', spend: 0 },
		{ month: 'Sep', spend: 99 },
		{ month: 'Oct', spend: 0 },
		{ month: 'Nov', spend: 0 },
		{ month: 'Dec', spend: 49 },
		{ month: 'Jan', spend: 0 },
		{ month: 'Feb', spend: 99 },
		{ month: 'Mar', spend: 199 },
		{ month: 'Apr', spend: 0 },
		{ month: 'May', spend: 99 },
		{ month: 'Jun', spend: 297 },
	],
	licenses: [
		{
			id: 1,
			key: 'WDD-A1B2-C3D4-E5F6',
			product: 'Plugin Pro',
			plan: 'Annual',
			sites: '1/1',
			status: 'active',
			expires: '2025-06-15',
			created: '2024-06-15',
		},
		{
			id: 2,
			key: 'WDD-P9Q8-R7S6-T5U4',
			product: 'Theme Bundle',
			plan: 'Lifetime',
			sites: '2/5',
			status: 'active',
			expires: 'Lifetime',
			created: '2023-09-01',
		},
		{
			id: 3,
			key: 'WDD-V3W2-X1Y0-Z9A8',
			product: 'Plugin Pro',
			plan: 'Annual',
			sites: '0/1',
			status: 'expired',
			expires: '2024-06-14',
			created: '2023-06-15',
		},
		{
			id: 4,
			key: 'WDD-B7C6-D5E4-F3G2',
			product: 'SaaS Connector',
			plan: 'Monthly',
			sites: '1/1',
			status: 'active',
			expires: '2025-01-30',
			created: '2024-12-30',
		},
	] as CustomerLicense[],
	subscriptions: [
		{
			id: 'SUB-001',
			product: 'Plugin Pro',
			amount: '$99/yr',
			cycle: 'Annual',
			status: 'active',
			started: '2024-06-15',
			nextPayment: '2025-06-15',
		},
		{
			id: 'SUB-009',
			product: 'SaaS Connector',
			amount: '$29/mo',
			cycle: 'Monthly',
			status: 'active',
			started: '2024-12-30',
			nextPayment: '2025-01-30',
		},
		{
			id: 'SUB-003',
			product: 'Plugin Pro',
			amount: '$99/yr',
			cycle: 'Annual',
			status: 'cancelled',
			started: '2023-06-15',
			nextPayment: '—',
		},
	] as CustomerSubscription[],
	downloads: [
		{
			product: 'Plugin Pro',
			version: 'v2.4.1',
			ip: '93.184.216.34',
			country: 'United States',
			flag: '🇺🇸',
			date: '2025-01-12 09:23',
			size: '1.8 MB',
		},
		{
			product: 'Plugin Pro',
			version: 'v2.4.0',
			ip: '93.184.216.34',
			country: 'United States',
			flag: '🇺🇸',
			date: '2025-01-02 14:10',
			size: '1.8 MB',
		},
		{
			product: 'Theme Bundle',
			version: 'v1.8.0',
			ip: '93.184.216.34',
			country: 'United States',
			flag: '🇺🇸',
			date: '2024-12-20 11:05',
			size: '4.2 MB',
		},
		{
			product: 'Plugin Pro',
			version: 'v2.3.2',
			ip: '93.184.216.34',
			country: 'United States',
			flag: '🇺🇸',
			date: '2024-11-15 08:41',
			size: '1.7 MB',
		},
		{
			product: 'Theme Bundle',
			version: 'v1.7.5',
			ip: '93.184.216.34',
			country: 'United States',
			flag: '🇺🇸',
			date: '2024-10-08 16:22',
			size: '4.1 MB',
		},
		{
			product: 'Plugin Pro',
			version: 'v2.3.0',
			ip: '93.184.216.34',
			country: 'United States',
			flag: '🇺🇸',
			date: '2024-09-01 10:00',
			size: '1.7 MB',
		},
		{
			product: 'SaaS Connector',
			version: 'v3.1.0',
			ip: '93.184.216.34',
			country: 'United States',
			flag: '🇺🇸',
			date: '2024-12-31 00:05',
			size: '2.4 MB',
		},
	] as CustomerDownload[],
	events: [
		{
			type: 'download',
			desc: 'Downloaded Plugin Pro v2.4.1',
			time: '2025-01-12 09:23',
			icon: Download,
			color: M3.info,
		},
		{
			type: 'renewal',
			desc: 'Subscription SUB-001 auto-renewed — $99',
			time: '2025-01-01 00:00',
			icon: RefreshCw,
			color: M3.success,
			meta: '$99.00',
		},
		{
			type: 'activated',
			desc: 'SaaS Connector activated on example.com',
			time: '2024-12-31 00:05',
			icon: CheckCircle,
			color: M3.success,
		},
		{
			type: 'purchase',
			desc: 'Purchased SaaS Connector Monthly — $29',
			time: '2024-12-30 18:42',
			icon: CreditCard,
			color: M3.primary,
			meta: '$29.00',
		},
		{
			type: 'download',
			desc: 'Downloaded Theme Bundle v1.8.0',
			time: '2024-12-20 11:05',
			icon: Download,
			color: M3.info,
		},
		{
			type: 'email',
			desc: 'Expiry reminder sent for WDD-V3W2',
			time: '2024-05-15 08:00',
			icon: Mail,
			color: M3.warning,
		},
		{
			type: 'expired',
			desc: 'License WDD-V3W2 expired',
			time: '2024-06-14 23:59',
			icon: XCircle,
			color: M3.error,
		},
		{
			type: 'renewal',
			desc: 'Subscription renewed — Plugin Pro Annual',
			time: '2024-06-15 00:00',
			icon: RefreshCw,
			color: M3.success,
			meta: '$99.00',
		},
		{
			type: 'purchase',
			desc: 'Purchased Theme Bundle Lifetime — $199',
			time: '2023-09-01 12:14',
			icon: CreditCard,
			color: M3.primary,
			meta: '$199.00',
		},
		{
			type: 'purchase',
			desc: 'Purchased Plugin Pro Annual — $99',
			time: '2022-06-03 10:42',
			icon: CreditCard,
			color: M3.primary,
			meta: '$99.00',
		},
		{
			type: 'joined',
			desc: 'Customer account created',
			time: '2022-06-03 10:38',
			icon: UserPlus,
			color: M3.secondary,
		},
	] as CustomerEvent[],
};

// ─── Downloads Page Data ───────────────────────────────────────────────────────
export const downloadsData = [
	{
		id: 1,
		customer: 'Sarah Johnson',
		email: 'sarah@example.com',
		product: 'Plugin Pro',
		version: 'v2.4.1',
		license: 'WDD-A1B2-C3D4',
		ip: '93.184.216.34',
		country: 'United States',
		flag: '🇺🇸',
		date: '2025-01-12 09:23',
		size: '1.8 MB',
		valid: true,
	},
	{
		id: 2,
		customer: 'Marcus Chen',
		email: 'marcus@example.com',
		product: 'Theme Bundle',
		version: 'v1.8.0',
		license: 'WDD-B2C3-D4E5',
		ip: '45.33.32.156',
		country: 'Germany',
		flag: '🇩🇪',
		date: '2025-01-12 08:11',
		size: '4.2 MB',
		valid: true,
	},
	{
		id: 3,
		customer: 'Emily Davis',
		email: 'emily@example.com',
		product: 'Plugin Pro',
		version: 'v2.3.2',
		license: 'WDD-C3D4-E5F6',
		ip: '104.21.14.101',
		country: 'United Kingdom',
		flag: '🇬🇧',
		date: '2025-01-11 22:44',
		size: '1.7 MB',
		valid: false,
	},
	{
		id: 4,
		customer: 'James Wilson',
		email: 'james@example.com',
		product: 'Plugin Pro',
		version: 'v2.4.1',
		license: 'WDD-D4E5-F6G7',
		ip: '198.41.128.84',
		country: 'Canada',
		flag: '🇨🇦',
		date: '2025-01-11 17:09',
		size: '1.8 MB',
		valid: true,
	},
	{
		id: 5,
		customer: 'Ava Garcia',
		email: 'ava@example.com',
		product: 'SaaS Pro',
		version: 'v3.1.0',
		license: 'WDD-G7H8-I9J0',
		ip: '185.199.108.1',
		country: 'Australia',
		flag: '🇦🇺',
		date: '2025-01-11 14:30',
		size: '2.4 MB',
		valid: true,
	},
	{
		id: 6,
		customer: 'Noah Thompson',
		email: 'noah@example.com',
		product: 'Plugin Pro',
		version: 'v2.4.0',
		license: 'WDD-F6G7-H8I9',
		ip: '151.101.65.69',
		country: 'France',
		flag: '🇫🇷',
		date: '2025-01-11 11:05',
		size: '1.8 MB',
		valid: true,
	},
	{
		id: 7,
		customer: 'Olivia Martinez',
		email: 'olivia@example.com',
		product: 'Theme Bundle',
		version: 'v1.7.5',
		license: 'WDD-E5F6-G7H8',
		ip: '23.235.46.133',
		country: 'Netherlands',
		flag: '🇳🇱',
		date: '2025-01-10 20:18',
		size: '4.1 MB',
		valid: false,
	},
	{
		id: 8,
		customer: 'Liam Anderson',
		email: 'liam@example.com',
		product: 'Plugin Pro',
		version: 'v2.4.1',
		license: 'WDD-H8I9-J0K1',
		ip: '103.21.244.0',
		country: 'Japan',
		flag: '🇯🇵',
		date: '2025-01-10 16:42',
		size: '1.8 MB',
		valid: true,
	},
	{
		id: 9,
		customer: 'Sophia Brown',
		email: 'sophia@example.com',
		product: 'Security Module',
		version: 'v1.2.3',
		license: 'WDD-I9J0-K1L2',
		ip: '216.163.128.20',
		country: 'Sweden',
		flag: '🇸🇪',
		date: '2025-01-10 09:55',
		size: '0.9 MB',
		valid: true,
	},
	{
		id: 10,
		customer: 'Ethan Clark',
		email: 'ethan@example.com',
		product: 'Theme Bundle',
		version: 'v1.8.0',
		license: 'WDD-J0K1-L2M3',
		ip: '162.158.0.1',
		country: 'Brazil',
		flag: '🇧🇷',
		date: '2025-01-09 23:01',
		size: '4.2 MB',
		valid: true,
	},
];

// ─── Updates Page Data ─────────────────────────────────────────────────────────
export const packagesData = [
	{
		id: 1,
		product: 'Plugin Pro',
		slug: 'plugin-pro',
		current: 'v2.4.1',
		previous: 'v2.4.0',
		released: '2025-01-08',
		downloads: 14823,
		channel: 'stable',
		status: 'live',
		changelog: 'Performance improvements, security patches, PHP 8.3 compat',
	},
	{
		id: 2,
		product: 'Theme Bundle',
		slug: 'theme-bundle',
		current: 'v1.8.0',
		previous: 'v1.7.5',
		released: '2024-12-20',
		downloads: 9214,
		channel: 'stable',
		status: 'live',
		changelog: 'New block patterns, dark mode improvements, WP 6.7 support',
	},
	{
		id: 3,
		product: 'SaaS Connector',
		slug: 'saas-connector',
		current: 'v3.1.0',
		previous: 'v3.0.4',
		released: '2024-12-01',
		downloads: 6441,
		channel: 'stable',
		status: 'live',
		changelog: 'Webhooks v2 API, improved provisioning speed, bug fixes',
	},
	{
		id: 4,
		product: 'Security Module',
		slug: 'security-module',
		current: 'v1.2.4',
		previous: 'v1.2.3',
		released: '2025-01-10',
		downloads: 4892,
		channel: 'beta',
		status: 'beta',
		changelog: 'IP reputation feed integration, enhanced 2FA options',
	},
	{
		id: 5,
		product: 'Analytics Add-on',
		slug: 'analytics',
		current: 'v2.1.0',
		previous: 'v2.0.1',
		released: '—',
		downloads: 0,
		channel: 'draft',
		status: 'draft',
		changelog:
			'Revenue attribution model, custom date ranges, CSV export v2',
	},
	{
		id: 6,
		product: 'Update Manager',
		slug: 'update-manager',
		current: 'v1.0.3',
		previous: 'v1.0.2',
		released: '2024-11-15',
		downloads: 3109,
		channel: 'stable',
		status: 'live',
		changelog: 'Rollback support, delta updates, Composer integration',
	},
];

export const releaseHistoryData = [
	{
		product: 'Plugin Pro',
		version: 'v2.4.1',
		date: '2025-01-08',
		downloads: 14823,
		type: 'patch',
	},
	{
		product: 'Plugin Pro',
		version: 'v2.4.0',
		date: '2024-11-30',
		downloads: 8912,
		type: 'minor',
	},
	{
		product: 'Theme Bundle',
		version: 'v1.8.0',
		date: '2024-12-20',
		downloads: 9214,
		type: 'minor',
	},
	{
		product: 'Plugin Pro',
		version: 'v2.3.2',
		date: '2024-10-14',
		downloads: 6234,
		type: 'patch',
	},
	{
		product: 'SaaS Connector',
		version: 'v3.1.0',
		date: '2024-12-01',
		downloads: 6441,
		type: 'minor',
	},
	{
		product: 'Theme Bundle',
		version: 'v1.7.5',
		date: '2024-09-05',
		downloads: 4100,
		type: 'patch',
	},
];

// ─── SaaS Accounts Page Data ───────────────────────────────────────────────────
export const saasAccountsData = [
	{
		id: 'SAAS-001',
		account: 'Acme Corp',
		owner: 'tom.baker@acme.com',
		plan: 'Business',
		seats: '18/25',
		mrr: '$299',
		status: 'active',
		created: '2024-03-12',
		nextBilling: '2025-02-12',
	},
	{
		id: 'SAAS-002',
		account: 'Startup Hub',
		owner: 'nina@startuphub.io',
		plan: 'Starter',
		seats: '4/5',
		mrr: '$49',
		status: 'active',
		created: '2024-06-01',
		nextBilling: '2025-02-01',
	},
	{
		id: 'SAAS-003',
		account: 'DevAgency GmbH',
		owner: 'ops@devagency.de',
		plan: 'Enterprise',
		seats: '48/50',
		mrr: '$599',
		status: 'active',
		created: '2023-09-18',
		nextBilling: '2025-09-18',
	},
	{
		id: 'SAAS-004',
		account: 'CloudBase Ltd',
		owner: 'admin@cloudbase.co.uk',
		plan: 'Business',
		seats: '0/25',
		mrr: '$299',
		status: 'suspended',
		created: '2024-01-07',
		nextBilling: '—',
	},
	{
		id: 'SAAS-005',
		account: 'Solo Freelancer',
		owner: 'alex@freelance.me',
		plan: 'Starter',
		seats: '1/1',
		mrr: '$19',
		status: 'trialing',
		created: '2025-01-10',
		nextBilling: '2025-01-24',
	},
	{
		id: 'SAAS-006',
		account: 'Pixel Studio',
		owner: 'hello@pixelstudio.com',
		plan: 'Starter',
		seats: '3/5',
		mrr: '$49',
		status: 'active',
		created: '2024-08-22',
		nextBilling: '2025-02-22',
	},
	{
		id: 'SAAS-007',
		account: 'Merchant Pro',
		owner: 'it@merchantpro.com',
		plan: 'Enterprise',
		seats: '23/50',
		mrr: '$599',
		status: 'past-due',
		created: '2023-12-01',
		nextBilling: '2025-01-01',
	},
];

// ─── Affiliates Page Data ──────────────────────────────────────────────────────
export const affiliatesData = [
	{
		id: 'AFF-001',
		name: 'WP Beginner',
		email: 'partners@wpbeginner.com',
		code: 'WPBEG',
		clicks: 5840,
		conversions: 712,
		revenue: '$9,600',
		commission: '$960',
		rate: '10%',
		status: 'active',
		joined: '2023-01-15',
		paid: '$8,640',
	},
	{
		id: 'AFF-002',
		name: 'Kinsta Blog',
		email: 'affiliate@kinsta.com',
		code: 'KINSTA',
		clicks: 3210,
		conversions: 391,
		revenue: '$5,280',
		commission: '$528',
		rate: '10%',
		status: 'active',
		joined: '2023-03-20',
		paid: '$5,040',
	},
	{
		id: 'AFF-003',
		name: 'Code Canyon',
		email: 'promos@codecanyon.net',
		code: 'CANYON',
		clicks: 2980,
		conversions: 310,
		revenue: '$4,184',
		commission: '$627',
		rate: '15%',
		status: 'active',
		joined: '2022-11-08',
		paid: '$3,762',
	},
	{
		id: 'AFF-004',
		name: 'WP Lift',
		email: 'hello@wplift.com',
		code: 'WPLIFT',
		clicks: 2140,
		conversions: 248,
		revenue: '$3,353',
		commission: '$503',
		rate: '15%',
		status: 'active',
		joined: '2023-06-01',
		paid: '$4,024',
	},
	{
		id: 'AFF-005',
		name: 'ThemeIsle',
		email: 'partner@themeisle.com',
		code: 'ISLE',
		clicks: 1870,
		conversions: 215,
		revenue: '$2,904',
		commission: '$290',
		rate: '10%',
		status: 'pending',
		joined: '2025-01-05',
		paid: '$0',
	},
	{
		id: 'AFF-006',
		name: 'WPMU Dev',
		email: 'affiliates@wpmudev.com',
		code: 'WPMU',
		clicks: 1450,
		conversions: 178,
		revenue: '$2,407',
		commission: '$361',
		rate: '15%',
		status: 'active',
		joined: '2023-09-12',
		paid: '$1,805',
	},
	{
		id: 'AFF-007',
		name: 'Spam Partner',
		email: 'bad@spamsite.net',
		code: 'SPAM1',
		clicks: 8900,
		conversions: 2,
		revenue: '$27',
		commission: '$3',
		rate: '10%',
		status: 'suspended',
		joined: '2024-12-01',
		paid: '$0',
	},
];

// ─── Abandoned Cart Page Data ──────────────────────────────────────────────────
export const abandonedCartData = [
	{
		id: 'CART-001',
		customer: 'Peter Harris',
		email: 'peter@harris.com',
		product: 'Plugin Pro Annual',
		value: '$99',
		abandoned: '2025-01-12 14:23',
		emailsSent: 2,
		lastEmail: '2h ago',
		status: 'recovering',
		recovered: false,
	},
	{
		id: 'CART-002',
		customer: 'Anna Schmidt',
		email: 'anna@schmidt.de',
		product: 'SaaS Pro Annual',
		value: '$199',
		abandoned: '2025-01-12 09:41',
		emailsSent: 1,
		lastEmail: '6h ago',
		status: 'recovering',
		recovered: false,
	},
	{
		id: 'CART-003',
		customer: 'Chris Evans',
		email: 'chris@evans.io',
		product: 'Theme Bundle',
		value: '$59',
		abandoned: '2025-01-11 22:15',
		emailsSent: 3,
		lastEmail: '12h ago',
		status: 'recovered',
		recovered: true,
	},
	{
		id: 'CART-004',
		customer: 'Maria Lopez',
		email: 'maria@lopez.mx',
		product: 'Plugin Pro Monthly',
		value: '$9',
		abandoned: '2025-01-11 18:08',
		emailsSent: 2,
		lastEmail: '18h ago',
		status: 'dismissed',
		recovered: false,
	},
	{
		id: 'CART-005',
		customer: 'Yuki Tanaka',
		email: 'yuki@tanaka.jp',
		product: 'Plugin Pro Annual',
		value: '$99',
		abandoned: '2025-01-11 11:55',
		emailsSent: 3,
		lastEmail: '1d ago',
		status: 'lost',
		recovered: false,
	},
	{
		id: 'CART-006',
		customer: 'Felix Wagner',
		email: 'felix@wagner.de',
		product: 'SaaS Business Plan',
		value: '$299',
		abandoned: '2025-01-10 08:30',
		emailsSent: 1,
		lastEmail: '2d ago',
		status: 'recovering',
		recovered: false,
	},
	{
		id: 'CART-007',
		customer: 'Sophie Martin',
		email: 'sophie@martin.fr',
		product: 'Theme Bundle',
		value: '$59',
		abandoned: '2025-01-09 16:44',
		emailsSent: 3,
		lastEmail: '3d ago',
		status: 'recovered',
		recovered: true,
	},
	{
		id: 'CART-008',
		customer: 'Oliver White',
		email: 'oliver@white.co.uk',
		product: 'Plugin Pro Annual',
		value: '$99',
		abandoned: '2025-01-08 20:10',
		emailsSent: 0,
		lastEmail: '—',
		status: 'new',
		recovered: false,
	},
];

// ─── Security Page Data ────────────────────────────────────────────────────────
export const blockedIPsData = [
	{
		id: 1,
		ip: '185.220.101.45',
		country: 'Romania',
		flag: '🇷🇴',
		reason: 'Brute force — 48 attempts',
		severity: 'critical',
		blocked: '2025-01-12 08:14',
		expires: 'Permanent',
		hits: 48,
	},
	{
		id: 2,
		ip: '91.108.4.18',
		country: 'Russia',
		flag: '🇷🇺',
		reason: 'Invalid license enumeration',
		severity: 'high',
		blocked: '2025-01-12 06:31',
		expires: '2025-01-19 06:31',
		hits: 312,
	},
	{
		id: 3,
		ip: '103.21.244.0',
		country: 'China',
		flag: '🇨🇳',
		reason: 'Download scraping detected',
		severity: 'high',
		blocked: '2025-01-11 22:10',
		expires: '2025-01-18 22:10',
		hits: 188,
	},
	{
		id: 4,
		ip: '45.142.212.100',
		country: 'Netherlands',
		flag: '🇳🇱',
		reason: 'Repeated 403 on API endpoints',
		severity: 'medium',
		blocked: '2025-01-11 17:44',
		expires: '2025-01-14 17:44',
		hits: 74,
	},
	{
		id: 5,
		ip: '198.235.24.109',
		country: 'United States',
		flag: '🇺🇸',
		reason: 'Flagged by threat intelligence',
		severity: 'medium',
		blocked: '2025-01-10 09:00',
		expires: 'Permanent',
		hits: 22,
	},
	{
		id: 6,
		ip: '5.188.206.26',
		country: 'Ukraine',
		flag: '🇺🇦',
		reason: 'Tor exit node',
		severity: 'low',
		blocked: '2025-01-09 14:22',
		expires: '2025-01-23 14:22',
		hits: 9,
	},
	{
		id: 7,
		ip: '162.247.74.201',
		country: 'United States',
		flag: '🇺🇸',
		reason: 'Tor exit node',
		severity: 'low',
		blocked: '2025-01-08 11:05',
		expires: '2025-01-22 11:05',
		hits: 4,
	},
	{
		id: 8,
		ip: '77.247.181.162',
		country: 'Sweden',
		flag: '🇸🇪',
		reason: 'Known credential stuffing IP',
		severity: 'critical',
		blocked: '2025-01-07 03:41',
		expires: 'Permanent',
		hits: 921,
	},
];

export const loginAttemptsData = [
	{
		id: 1,
		ip: '185.220.101.45',
		country: 'Romania',
		flag: '🇷🇴',
		email: 'admin@example.com',
		attempts: 48,
		lastAttempt: '2025-01-12 08:13',
		status: 'blocked',
		target: 'WP Admin',
	},
	{
		id: 2,
		ip: '91.108.4.18',
		country: 'Russia',
		flag: '🇷🇺',
		email: 'sarah@example.com',
		attempts: 12,
		lastAttempt: '2025-01-12 06:28',
		status: 'monitoring',
		target: 'API',
	},
	{
		id: 3,
		ip: '103.21.244.0',
		country: 'China',
		flag: '🇨🇳',
		email: 'info@acmecorp.com',
		attempts: 7,
		lastAttempt: '2025-01-11 22:05',
		status: 'blocked',
		target: 'API',
	},
	{
		id: 4,
		ip: '45.142.212.100',
		country: 'Netherlands',
		flag: '🇳🇱',
		email: 'noah@example.com',
		attempts: 4,
		lastAttempt: '2025-01-11 17:40',
		status: 'monitoring',
		target: 'WP Admin',
	},
	{
		id: 5,
		ip: '203.0.113.55',
		country: 'Brazil',
		flag: '🇧🇷',
		email: 'marcus@example.com',
		attempts: 3,
		lastAttempt: '2025-01-11 14:12',
		status: 'allowed',
		target: 'API',
	},
	{
		id: 6,
		ip: '198.51.100.22',
		country: 'Canada',
		flag: '🇨🇦',
		email: 'ava@example.com',
		attempts: 2,
		lastAttempt: '2025-01-10 09:30',
		status: 'allowed',
		target: 'API',
	},
];

export const suspiciousDownloadsData = [
	{
		id: 1,
		ip: '91.108.4.18',
		country: 'Russia',
		flag: '🇷🇺',
		customer: 'Unknown',
		license: 'WDD-XXXX-INVALID',
		product: 'Plugin Pro',
		version: 'v2.4.1',
		date: '2025-01-12 06:29',
		reason: 'Invalid license key',
		severity: 'critical',
	},
	{
		id: 2,
		ip: '103.21.244.0',
		country: 'China',
		flag: '🇨🇳',
		customer: 'Emily Davis',
		license: 'WDD-C3D4-E5F6-G7H8',
		product: 'Plugin Pro',
		version: 'v2.3.2',
		date: '2025-01-11 22:01',
		reason: 'Expired license used',
		severity: 'high',
	},
	{
		id: 3,
		ip: '45.142.212.100',
		country: 'Netherlands',
		flag: '🇳🇱',
		customer: 'Unknown',
		license: 'WDD-FAKE-0000-0000',
		product: 'Theme Bundle',
		version: 'v1.8.0',
		date: '2025-01-11 17:38',
		reason: 'License key forgery attempt',
		severity: 'critical',
	},
	{
		id: 4,
		ip: '185.234.219.8',
		country: 'Germany',
		flag: '🇩🇪',
		customer: 'Marcus Chen',
		license: 'WDD-B2C3-D4E5-F6G7',
		product: 'Theme Bundle',
		version: 'v1.8.0',
		date: '2025-01-11 10:14',
		reason: 'Geo mismatch (VPN detected)',
		severity: 'medium',
	},
	{
		id: 5,
		ip: '198.235.24.109',
		country: 'United States',
		flag: '🇺🇸',
		customer: 'Unknown',
		license: 'WDD-C3D4-E5F6-G7H8',
		product: 'SaaS Connector',
		version: 'v3.1.0',
		date: '2025-01-10 08:55',
		reason: 'License shared — 8 IPs',
		severity: 'high',
	},
];

export const firewallRulesData = [
	{
		id: 1,
		name: 'Rate Limit — License Validation',
		type: 'rate-limit',
		target: '/api/v1/licenses/validate',
		limit: '60 req/min',
		action: 'block',
		enabled: true,
		hits: 1284,
	},
	{
		id: 2,
		name: 'Rate Limit — Download Endpoint',
		type: 'rate-limit',
		target: '/api/v1/downloads',
		limit: '10 req/min',
		action: 'throttle',
		enabled: true,
		hits: 342,
	},
	{
		id: 3,
		name: 'Geo-Block — High Risk Countries',
		type: 'geo-block',
		target: 'ALL endpoints',
		limit: 'BY COUNTRY',
		action: 'block',
		enabled: false,
		hits: 0,
	},
	{
		id: 4,
		name: 'Block Tor Exit Nodes',
		type: 'ip-list',
		target: 'ALL endpoints',
		limit: 'IP reputation',
		action: 'block',
		enabled: true,
		hits: 89,
	},
	{
		id: 5,
		name: 'Block Known VPN Ranges',
		type: 'ip-list',
		target: '/api/v1/downloads',
		limit: 'IP reputation',
		action: 'challenge',
		enabled: false,
		hits: 0,
	},
	{
		id: 6,
		name: 'HMAC Signature Validation',
		type: 'signature',
		target: '/api/v1/*',
		limit: 'ALL requests',
		action: 'block',
		enabled: true,
		hits: 4,
	},
	{
		id: 7,
		name: 'License Key Entropy Check',
		type: 'validation',
		target: '/api/v1/licenses/*',
		limit: 'ALL requests',
		action: 'reject',
		enabled: true,
		hits: 27,
	},
];

export const auditLogData = [
	{
		id: 1,
		type: 'block',
		desc: 'IP 185.220.101.45 auto-blocked after 48 failed attempts',
		actor: 'System',
		time: '2025-01-12 08:14',
		severity: 'critical',
	},
	{
		id: 2,
		type: 'alert',
		desc: 'Suspicious download flagged — invalid license WDD-XXXX',
		actor: 'System',
		time: '2025-01-12 06:29',
		severity: 'high',
	},
	{
		id: 3,
		type: 'block',
		desc: 'IP 91.108.4.18 blocked — license enumeration pattern',
		actor: 'System',
		time: '2025-01-12 06:31',
		severity: 'high',
	},
	{
		id: 4,
		type: 'config',
		desc: "Firewall rule 'Rate Limit — Download' threshold changed 20→10",
		actor: 'Admin',
		time: '2025-01-12 05:00',
		severity: 'info',
	},
	{
		id: 5,
		type: 'unblock',
		desc: 'IP 203.0.113.42 manually unblocked',
		actor: 'Admin',
		time: '2025-01-11 23:10',
		severity: 'info',
	},
	{
		id: 6,
		type: 'alert',
		desc: 'License key WDD-C3D4 used from expired account',
		actor: 'System',
		time: '2025-01-11 22:01',
		severity: 'high',
	},
	{
		id: 7,
		type: 'block',
		desc: 'IP 103.21.244.0 blocked — download scraping pattern',
		actor: 'System',
		time: '2025-01-11 22:10',
		severity: 'high',
	},
	{
		id: 8,
		type: 'config',
		desc: 'Geo-block rule disabled by Admin',
		actor: 'Admin',
		time: '2025-01-11 18:00',
		severity: 'info',
	},
	{
		id: 9,
		type: 'alert',
		desc: 'Brute-force wave detected from /24 subnet 185.220.101.0',
		actor: 'System',
		time: '2025-01-11 08:00',
		severity: 'critical',
	},
	{
		id: 10,
		type: 'rule',
		desc: "New firewall rule 'License Key Entropy Check' created",
		actor: 'Admin',
		time: '2025-01-10 14:30',
		severity: 'info',
	},
	{
		id: 11,
		type: 'unblock',
		desc: 'IP 77.88.55.60 removed from allowlist',
		actor: 'Admin',
		time: '2025-01-10 11:15',
		severity: 'info',
	},
	{
		id: 12,
		type: 'block',
		desc: '77.247.181.162 permanently blocked — credential stuffing',
		actor: 'System',
		time: '2025-01-07 03:41',
		severity: 'critical',
	},
];

export const threatTrendData = [
	{ day: 'Mon', blocked: 12, alerts: 5, logins: 28 },
	{ day: 'Tue', blocked: 8, alerts: 3, logins: 19 },
	{ day: 'Wed', blocked: 19, alerts: 9, logins: 44 },
	{ day: 'Thu', blocked: 6, alerts: 2, logins: 14 },
	{ day: 'Fri', blocked: 23, alerts: 11, logins: 61 },
	{ day: 'Sat', blocked: 31, alerts: 14, logins: 78 },
	{ day: 'Sun', blocked: 48, alerts: 18, logins: 92 },
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
	{ name: 'Annual', value: 58, color: M3.primary },
	{ name: 'Monthly', value: 31, color: M3.secondary },
	{ name: 'Lifetime', value: 11, color: M3.info },
];
export const subRevenueByProduct = [
	{ product: 'Plugin Pro', revenue: 24800 },
	{ product: 'Theme Bundle', revenue: 11200 },
	{ product: 'SaaS Pro', revenue: 6400 },
	{ product: 'SaaS Starter', revenue: 2200 },
];

// ── Affiliate analytics data ───────────────────────────────────────────────────
export const affiliateTrendData = [
	{ month: 'Jan', clicks: 3200, signups: 410, revenue: 4800 },
	{ month: 'Feb', clicks: 3800, signups: 490, revenue: 5600 },
	{ month: 'Mar', clicks: 4100, signups: 530, revenue: 6200 },
	{ month: 'Apr', clicks: 4600, signups: 580, revenue: 7100 },
	{ month: 'May', clicks: 5200, signups: 640, revenue: 8400 },
	{ month: 'Jun', clicks: 5840, signups: 712, revenue: 9600 },
];
export const topAffiliates = [
	{
		name: 'wpbeginner.com',
		clicks: 1840,
		conversions: 214,
		revenue: '$3,420',
		rate: '11.6%',
	},
	{
		name: 'kinsta.com',
		clicks: 1210,
		conversions: 148,
		revenue: '$2,368',
		rate: '12.2%',
	},
	{
		name: 'codecanyon.net',
		clicks: 980,
		conversions: 102,
		revenue: '$1,632',
		rate: '10.4%',
	},
	{
		name: 'wplift.com',
		clicks: 760,
		conversions: 88,
		revenue: '$1,408',
		rate: '11.6%',
	},
	{
		name: 'wpforms.com',
		clicks: 620,
		conversions: 71,
		revenue: '$1,136',
		rate: '11.5%',
	},
];
export const affiliateConversionFunnel = [
	{ name: 'Link Clicks', value: 5840 },
	{ name: 'Landing Views', value: 4210 },
	{ name: 'Sign-ups', value: 712 },
	{ name: 'Purchases', value: 384 },
];

// ── Abandoned cart analytics data ──────────────────────────────────────────────
export const cartTrendData = [
	{ month: 'Jan', abandoned: 920, recovered: 210, revenue: 3200 },
	{ month: 'Feb', abandoned: 1040, recovered: 260, revenue: 3900 },
	{ month: 'Mar', abandoned: 980, recovered: 290, revenue: 4350 },
	{ month: 'Apr', abandoned: 1150, recovered: 340, revenue: 5100 },
	{ month: 'May', abandoned: 1280, recovered: 390, revenue: 5850 },
	{ month: 'Jun', abandoned: 1340, recovered: 430, revenue: 6450 },
];
export const emailSeqPerf = [
	{
		seq: 'Email 1 (1h)',
		sent: 1340,
		opened: 832,
		clicked: 418,
		recovered: 210,
	},
	{
		seq: 'Email 2 (24h)',
		sent: 910,
		opened: 501,
		clicked: 230,
		recovered: 130,
	},
	{
		seq: 'Email 3 (72h)',
		sent: 680,
		opened: 320,
		clicked: 148,
		recovered: 90,
	},
];
export const topAbandonedProducts = [
	{
		product: 'Plugin Pro Annual',
		carts: 312,
		value: '$30,888',
		recoveryRate: '32%',
	},
	{
		product: 'Theme Bundle',
		carts: 248,
		value: '$14,824',
		recoveryRate: '28%',
	},
	{
		product: 'SaaS Pro Annual',
		carts: 189,
		value: '$37,611',
		recoveryRate: '22%',
	},
	{
		product: 'Plugin Pro Monthly',
		carts: 142,
		value: '$1,278',
		recoveryRate: '38%',
	},
	{
		product: 'SaaS Starter Monthly',
		carts: 98,
		value: '$4,802',
		recoveryRate: '19%',
	},
];

export const DATE_RANGE_OPTIONS = [
	'Today',
	'This week',
	'This month',
	'Last 3 months',
	'Last year',
];

export const PAGE_TITLES: Record< Page, string > = {
	overview: 'Overview',
	licenses: 'Licenses',
	'license-summary': 'License Summary',
	'license-detail': 'License Detail',
	'customer-detail': 'Customer Profile',
	subscriptions: 'Subscriptions',
	analytics: 'Analytics',
	'analytics-subscriptions': 'Subscription Analytics',
	'analytics-affiliates': 'Affiliate Analytics',
	'analytics-abandoned-cart': 'Abandoned Cart Analytics',
	settings: 'Settings',
	downloads: 'Downloads',
	updates: 'Updates',
	saas: 'SaaS Accounts',
	'saas-detail': 'Account Details',
	affiliates: 'Affiliates',
	'affiliate-detail': 'Affiliate Details',
	'abandoned-cart': 'Abandoned Cart',
	security: 'Security',
};

// ─── License Summary Data ──────────────────────────────────────────────────────
export const licenseIssuedTrend = [
	{ month: 'Feb', issued: 312, renewed: 198, revoked: 14 },
	{ month: 'Mar', issued: 389, renewed: 231, revoked: 9 },
	{ month: 'Apr', issued: 421, renewed: 256, revoked: 17 },
	{ month: 'May', issued: 378, renewed: 214, revoked: 22 },
	{ month: 'Jun', issued: 445, renewed: 289, revoked: 11 },
	{ month: 'Jul', issued: 502, renewed: 318, revoked: 8 },
	{ month: 'Aug', issued: 467, renewed: 301, revoked: 19 },
	{ month: 'Sep', issued: 531, renewed: 342, revoked: 13 },
	{ month: 'Oct', issued: 488, renewed: 327, revoked: 16 },
	{ month: 'Nov', issued: 612, renewed: 391, revoked: 7 },
	{ month: 'Dec', issued: 574, renewed: 368, revoked: 21 },
	{ month: 'Jan', issued: 649, renewed: 412, revoked: 12 },
];

export const licensesByProduct = [
	{
		product: 'Plugin Pro',
		active: 4812,
		expired: 621,
		suspended: 184,
		revoked: 49,
	},
	{
		product: 'Theme Bundle',
		active: 2108,
		expired: 389,
		suspended: 91,
		revoked: 22,
	},
	{
		product: 'SaaS Connector',
		active: 891,
		expired: 142,
		suspended: 28,
		revoked: 11,
	},
	{
		product: 'Security Module',
		active: 421,
		expired: 64,
		suspended: 7,
		revoked: 4,
	},
	{
		product: 'Analytics Add-on',
		active: 200,
		expired: 25,
		suspended: 2,
		revoked: 3,
	},
];

export const licensesByPlan = [
	{ name: 'Annual', value: 5820, color: M3.primary },
	{ name: 'Monthly', value: 1944, color: M3.secondary },
	{ name: 'Lifetime', value: 668, color: M3.info },
];

export const activationRateByProduct = [
	{ product: 'Plugin Pro', rate: 94, total: 4812 },
	{ product: 'Theme Bundle', rate: 72, total: 2108 },
	{ product: 'SaaS Connector', rate: 88, total: 891 },
	{ product: 'Security Module', rate: 63, total: 421 },
	{ product: 'Analytics Add-on', rate: 51, total: 200 },
];

export const topCustomersByLicense = [
	{ name: 'Acme Corp', licenses: 12, active: 11, ltv: '$2,388' },
	{ name: 'DevAgency GmbH', licenses: 8, active: 8, ltv: '$1,592' },
	{ name: 'Pixel Studio', licenses: 5, active: 4, ltv: '$995' },
	{ name: 'Sarah Johnson', licenses: 4, active: 3, ltv: '$842' },
	{ name: 'Startup Hub', licenses: 3, active: 3, ltv: '$597' },
	{ name: 'Marcus Chen', licenses: 3, active: 2, ltv: '$447' },
];

export const recentLicenseActivity = [
	{
		type: 'issued',
		customer: 'Yuki Tanaka',
		product: 'Plugin Pro',
		plan: 'Annual',
		time: '8m ago',
		icon: Key,
		color: M3.primary,
	},
	{
		type: 'renewed',
		customer: 'Acme Corp',
		product: 'Theme Bundle',
		plan: 'Lifetime',
		time: '24m ago',
		icon: RefreshCw,
		color: M3.success,
	},
	{
		type: 'expired',
		customer: 'Felix Wagner',
		product: 'SaaS Connector',
		plan: 'Monthly',
		time: '1h ago',
		icon: XCircle,
		color: M3.error,
	},
	{
		type: 'revoked',
		customer: 'Spam Corp',
		product: 'Plugin Pro',
		plan: 'Annual',
		time: '2h ago',
		icon: Ban,
		color: M3.error,
	},
	{
		type: 'issued',
		customer: 'Sophie Martin',
		product: 'Analytics',
		plan: 'Annual',
		time: '3h ago',
		icon: Key,
		color: M3.primary,
	},
	{
		type: 'suspended',
		customer: 'Oliver White',
		product: 'Theme Bundle',
		plan: 'Monthly',
		time: '5h ago',
		icon: PauseCircle,
		color: M3.warning,
	},
	{
		type: 'issued',
		customer: 'Peter Harris',
		product: 'Plugin Pro',
		plan: 'Lifetime',
		time: '6h ago',
		icon: Key,
		color: M3.primary,
	},
	{
		type: 'renewed',
		customer: 'Anna Schmidt',
		product: 'Security Module',
		plan: 'Annual',
		time: '8h ago',
		icon: RefreshCw,
		color: M3.success,
	},
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
		{
			date: '2025-01-01',
			amount: '$99.00',
			method: 'Visa ···4242',
			status: 'paid',
		},
		{
			date: '2024-01-01',
			amount: '$99.00',
			method: 'Visa ···4242',
			status: 'paid',
		},
		{
			date: '2023-01-01',
			amount: '$99.00',
			method: 'Visa ···4242',
			status: 'paid',
		},
	],
	'SUB-002': [
		{
			date: '2025-01-02',
			amount: '$29.00',
			method: 'Mastercard ···1234',
			status: 'paid',
		},
		{
			date: '2024-12-02',
			amount: '$29.00',
			method: 'Mastercard ···1234',
			status: 'paid',
		},
		{
			date: '2024-11-02',
			amount: '$29.00',
			method: 'Mastercard ···1234',
			status: 'failed',
		},
		{
			date: '2024-10-02',
			amount: '$29.00',
			method: 'Mastercard ···1234',
			status: 'paid',
		},
	],
	'SUB-003': [
		{
			date: '2025-01-08',
			amount: '$49.00',
			method: 'PayPal',
			status: 'failed',
		},
		{
			date: '2024-12-08',
			amount: '$49.00',
			method: 'PayPal',
			status: 'paid',
		},
	],
	'SUB-004': [
		{
			date: '2025-01-01',
			amount: '$99.00',
			method: 'Visa ···9999',
			status: 'paid',
		},
	],
	'SUB-007': [
		{ date: '2025-01-10', amount: '$0.00', method: '—', status: 'trial' },
	],
};

export const PRODUCTS_LIST = [
	'Plugin Pro',
	'Theme Bundle',
	'SaaS Connector',
	'Security Module',
	'Analytics Add-on',
	'Update Manager',
];
export const RELEASE_TYPES = [ 'patch', 'minor', 'major' ] as const;
export const CHANNELS = [ 'draft', 'beta', 'stable' ] as const;

// ─── SaaS Account Detail Data ─────────────────────────────────────────────────
export const saasDetailUsers: Record<
	string,
	Array< {
		id: number;
		name: string;
		email: string;
		role: string;
		lastLogin: string;
		status: string;
		avatar: string;
	} >
> = {
	'SAAS-001': [
		{
			id: 1,
			name: 'Tom Baker',
			email: 'tom@acme.com',
			role: 'Admin',
			lastLogin: '2h ago',
			status: 'active',
			avatar: 'TB',
		},
		{
			id: 2,
			name: 'Rachel Green',
			email: 'rachel@acme.com',
			role: 'Admin',
			lastLogin: '1d ago',
			status: 'active',
			avatar: 'RG',
		},
		{
			id: 3,
			name: 'Marcus Hill',
			email: 'marcus@acme.com',
			role: 'Member',
			lastLogin: '3h ago',
			status: 'active',
			avatar: 'MH',
		},
		{
			id: 4,
			name: 'Priya Sharma',
			email: 'priya@acme.com',
			role: 'Member',
			lastLogin: '5d ago',
			status: 'active',
			avatar: 'PS',
		},
		{
			id: 5,
			name: 'David Chen',
			email: 'david@acme.com',
			role: 'Member',
			lastLogin: '2d ago',
			status: 'active',
			avatar: 'DC',
		},
		{
			id: 6,
			name: 'Julia West',
			email: 'julia@acme.com',
			role: 'Viewer',
			lastLogin: 'Never',
			status: 'invited',
			avatar: 'JW',
		},
		{
			id: 7,
			name: 'Liam Torres',
			email: 'liam@acme.com',
			role: 'Member',
			lastLogin: '1w ago',
			status: 'active',
			avatar: 'LT',
		},
		{
			id: 8,
			name: 'Amy Rodriguez',
			email: 'amy@acme.com',
			role: 'Viewer',
			lastLogin: '3d ago',
			status: 'active',
			avatar: 'AR',
		},
	],
	'SAAS-002': [
		{
			id: 1,
			name: 'Nina Patel',
			email: 'nina@startuphub.io',
			role: 'Admin',
			lastLogin: '30m ago',
			status: 'active',
			avatar: 'NP',
		},
		{
			id: 2,
			name: 'Jake Morris',
			email: 'jake@startuphub.io',
			role: 'Member',
			lastLogin: '6h ago',
			status: 'active',
			avatar: 'JM',
		},
		{
			id: 3,
			name: 'Sara Kim',
			email: 'sara@startuphub.io',
			role: 'Member',
			lastLogin: 'Never',
			status: 'invited',
			avatar: 'SK',
		},
		{
			id: 4,
			name: 'Ben Clarke',
			email: 'ben@startuphub.io',
			role: 'Viewer',
			lastLogin: '2d ago',
			status: 'active',
			avatar: 'BC',
		},
	],
	'SAAS-003': [
		{
			id: 1,
			name: 'Max Gruber',
			email: 'max@devagency.de',
			role: 'Admin',
			lastLogin: '1h ago',
			status: 'active',
			avatar: 'MG',
		},
		{
			id: 2,
			name: 'Lena Wolf',
			email: 'lena@devagency.de',
			role: 'Admin',
			lastLogin: '4h ago',
			status: 'active',
			avatar: 'LW',
		},
		{
			id: 3,
			name: 'Felix Braun',
			email: 'felix@devagency.de',
			role: 'Member',
			lastLogin: '2h ago',
			status: 'active',
			avatar: 'FB',
		},
		{
			id: 4,
			name: 'Anna Bauer',
			email: 'anna@devagency.de',
			role: 'Member',
			lastLogin: '1d ago',
			status: 'active',
			avatar: 'AB',
		},
		{
			id: 5,
			name: 'Klaus Richter',
			email: 'klaus@devagency.de',
			role: 'Member',
			lastLogin: '3d ago',
			status: 'active',
			avatar: 'KR',
		},
	],
};

export const saasBilling: Record<
	string,
	Array< {
		invoice: string;
		date: string;
		amount: string;
		status: string;
		period: string;
	} >
> = {
	'SAAS-001': [
		{
			invoice: 'INV-2025-001',
			date: '2025-01-12',
			amount: '$299.00',
			status: 'paid',
			period: 'Jan 2025',
		},
		{
			invoice: 'INV-2024-012',
			date: '2024-12-12',
			amount: '$299.00',
			status: 'paid',
			period: 'Dec 2024',
		},
		{
			invoice: 'INV-2024-011',
			date: '2024-11-12',
			amount: '$299.00',
			status: 'paid',
			period: 'Nov 2024',
		},
		{
			invoice: 'INV-2024-010',
			date: '2024-10-12',
			amount: '$249.00',
			status: 'paid',
			period: 'Oct 2024',
		},
		{
			invoice: 'INV-2024-009',
			date: '2024-09-12',
			amount: '$249.00',
			status: 'paid',
			period: 'Sep 2024',
		},
	],
	'SAAS-002': [
		{
			invoice: 'INV-2025-002',
			date: '2025-02-01',
			amount: '$49.00',
			status: 'paid',
			period: 'Feb 2025',
		},
		{
			invoice: 'INV-2025-001',
			date: '2025-01-01',
			amount: '$49.00',
			status: 'paid',
			period: 'Jan 2025',
		},
		{
			invoice: 'INV-2024-012',
			date: '2024-12-01',
			amount: '$49.00',
			status: 'paid',
			period: 'Dec 2024',
		},
	],
	'SAAS-003': [
		{
			invoice: 'INV-2025-001',
			date: '2025-09-18',
			amount: '$599.00',
			status: 'pending',
			period: 'Sep 2025',
		},
		{
			invoice: 'INV-2024-001',
			date: '2024-09-18',
			amount: '$599.00',
			status: 'paid',
			period: 'Sep 2024',
		},
		{
			invoice: 'INV-2023-001',
			date: '2023-09-18',
			amount: '$499.00',
			status: 'paid',
			period: 'Sep 2023',
		},
	],
};

export const saasActivity: Record<
	string,
	Array< {
		type: string;
		desc: string;
		time: string;
		actor: string;
		icon: React.ElementType;
		color: string;
		meta?: string;
	} >
> = {
	'SAAS-001': [
		{
			type: 'seat_added',
			desc: 'New user Marcus Hill invited and accepted',
			time: '2025-01-10 09:12',
			actor: 'tom@acme.com',
			icon: UserPlus,
			color: M3.success,
			meta: '+1 seat',
		},
		{
			type: 'login',
			desc: 'Admin Tom Baker logged in from 93.184.216.34',
			time: '2025-01-10 08:55',
			actor: 'System',
			icon: CheckCircle,
			color: M3.info,
		},
		{
			type: 'plan_change',
			desc: 'Plan upgraded from Business (10) to Business (25)',
			time: '2024-12-01 14:00',
			actor: 'tom@acme.com',
			icon: ArrowUpRight,
			color: M3.primary,
			meta: '$299/mo',
		},
		{
			type: 'payment',
			desc: 'Invoice INV-2024-012 paid — $299',
			time: '2024-12-12 00:00',
			actor: 'System',
			icon: CreditCard,
			color: M3.success,
			meta: '$299.00',
		},
		{
			type: 'seat_removed',
			desc: 'User Chris Evans removed by admin',
			time: '2024-11-20 11:23',
			actor: 'tom@acme.com',
			icon: XCircle,
			color: M3.error,
			meta: '-1 seat',
		},
		{
			type: 'payment',
			desc: 'Invoice INV-2024-011 paid — $299',
			time: '2024-11-12 00:00',
			actor: 'System',
			icon: CreditCard,
			color: M3.success,
			meta: '$299.00',
		},
		{
			type: 'created',
			desc: 'Account created — Business plan',
			time: '2024-03-12 10:38',
			actor: 'System',
			icon: Cloud,
			color: M3.secondary,
		},
	],
};

export const saasUsageMetrics: Record<
	string,
	{
		apiCalls: number;
		apiLimit: number;
		storage: string;
		storageLimit: string;
		bandwidth: string;
		bandwidthLimit: string;
		integrations: number;
		lastActive: string;
		uptimePct: number;
		apiTrend: Array< { day: string; calls: number } >;
	}
> = {
	'SAAS-001': {
		apiCalls: 48291,
		apiLimit: 100000,
		storage: '2.4 GB',
		storageLimit: '10 GB',
		bandwidth: '18.7 GB',
		bandwidthLimit: '100 GB',
		integrations: 3,
		lastActive: '2h ago',
		uptimePct: 99.97,
		apiTrend: [
			{ day: 'Mon', calls: 6200 },
			{ day: 'Tue', calls: 5800 },
			{ day: 'Wed', calls: 7100 },
			{ day: 'Thu', calls: 6500 },
			{ day: 'Fri', calls: 7400 },
			{ day: 'Sat', calls: 4200 },
			{ day: 'Sun', calls: 3800 },
		],
	},
	'SAAS-002': {
		apiCalls: 8120,
		apiLimit: 50000,
		storage: '0.8 GB',
		storageLimit: '5 GB',
		bandwidth: '4.2 GB',
		bandwidthLimit: '50 GB',
		integrations: 1,
		lastActive: '30m ago',
		uptimePct: 100,
		apiTrend: [
			{ day: 'Mon', calls: 1100 },
			{ day: 'Tue', calls: 1300 },
			{ day: 'Wed', calls: 1050 },
			{ day: 'Thu', calls: 1250 },
			{ day: 'Fri', calls: 1420 },
			{ day: 'Sat', calls: 600 },
			{ day: 'Sun', calls: 400 },
		],
	},
	'SAAS-003': {
		apiCalls: 89240,
		apiLimit: 200000,
		storage: '8.1 GB',
		storageLimit: '20 GB',
		bandwidth: '64.2 GB',
		bandwidthLimit: '200 GB',
		integrations: 7,
		lastActive: '1h ago',
		uptimePct: 99.91,
		apiTrend: [
			{ day: 'Mon', calls: 12400 },
			{ day: 'Tue', calls: 13800 },
			{ day: 'Wed', calls: 12100 },
			{ day: 'Thu', calls: 14200 },
			{ day: 'Fri', calls: 13900 },
			{ day: 'Sat', calls: 7800 },
			{ day: 'Sun', calls: 6200 },
		],
	},
};

export const SAAS_PLANS = [
	{
		label: 'Starter',
		seats: 5,
		mrr: '$19',
		note: 'Up to 5 seats, core features.',
	},
	{
		label: 'Business',
		seats: 25,
		mrr: '$299',
		note: 'Up to 25 seats, priority support.',
	},
	{
		label: 'Enterprise',
		seats: 50,
		mrr: '$599',
		note: 'Up to 50 seats, SLA + custom integrations.',
	},
];

// ─── Affiliate Detail Data ─────────────────────────────────────────────────────
export const affiliateConversions: Record<
	string,
	Array< {
		id: number;
		customer: string;
		product: string;
		saleValue: string;
		commission: string;
		date: string;
		status: string;
		orderRef: string;
	} >
> = {
	'AFF-001': [
		{
			id: 1,
			customer: 'felix@wagner.de',
			product: 'Plugin Pro Annual',
			saleValue: '$99',
			commission: '$9.90',
			date: '2025-01-10',
			status: 'approved',
			orderRef: 'ORD-8821',
		},
		{
			id: 2,
			customer: 'sophie@martin.fr',
			product: 'Theme Bundle',
			saleValue: '$59',
			commission: '$5.90',
			date: '2025-01-08',
			status: 'approved',
			orderRef: 'ORD-8817',
		},
		{
			id: 3,
			customer: 'yuki@tanaka.jp',
			product: 'Plugin Pro Annual',
			saleValue: '$99',
			commission: '$9.90',
			date: '2025-01-05',
			status: 'pending',
			orderRef: 'ORD-8809',
		},
		{
			id: 4,
			customer: 'peter@harris.com',
			product: 'SaaS Starter',
			saleValue: '$49',
			commission: '$4.90',
			date: '2024-12-28',
			status: 'approved',
			orderRef: 'ORD-8791',
		},
		{
			id: 5,
			customer: 'anna@schmidt.de',
			product: 'Plugin Pro Monthly',
			saleValue: '$9',
			commission: '$0.90',
			date: '2024-12-20',
			status: 'approved',
			orderRef: 'ORD-8778',
		},
		{
			id: 6,
			customer: 'oliver@white.co',
			product: 'Theme Bundle',
			saleValue: '$59',
			commission: '$5.90',
			date: '2024-12-15',
			status: 'approved',
			orderRef: 'ORD-8762',
		},
		{
			id: 7,
			customer: 'maria@lopez.mx',
			product: 'Plugin Pro Annual',
			saleValue: '$99',
			commission: '$9.90',
			date: '2024-12-10',
			status: 'refunded',
			orderRef: 'ORD-8748',
		},
		{
			id: 8,
			customer: 'chris@evans.io',
			product: 'Security Module',
			saleValue: '$39',
			commission: '$3.90',
			date: '2024-12-05',
			status: 'approved',
			orderRef: 'ORD-8731',
		},
	],
	'AFF-002': [
		{
			id: 1,
			customer: 'noah@example.com',
			product: 'Plugin Pro Annual',
			saleValue: '$99',
			commission: '$9.90',
			date: '2025-01-09',
			status: 'approved',
			orderRef: 'ORD-8820',
		},
		{
			id: 2,
			customer: 'ava@example.com',
			product: 'SaaS Pro Annual',
			saleValue: '$199',
			commission: '$19.90',
			date: '2025-01-06',
			status: 'approved',
			orderRef: 'ORD-8810',
		},
		{
			id: 3,
			customer: 'liam@example.com',
			product: 'Theme Bundle',
			saleValue: '$59',
			commission: '$5.90',
			date: '2024-12-22',
			status: 'pending',
			orderRef: 'ORD-8785',
		},
	],
};

export const affiliatePayouts: Record<
	string,
	Array< {
		id: string;
		date: string;
		amount: string;
		method: string;
		status: string;
		ref: string;
	} >
> = {
	'AFF-001': [
		{
			id: 'PAY-041',
			date: '2025-01-01',
			amount: '$320.00',
			method: 'PayPal',
			status: 'paid',
			ref: 'PP-84920',
		},
		{
			id: 'PAY-033',
			date: '2024-12-01',
			amount: '$280.00',
			method: 'PayPal',
			status: 'paid',
			ref: 'PP-79341',
		},
		{
			id: 'PAY-025',
			date: '2024-11-01',
			amount: '$310.00',
			method: 'PayPal',
			status: 'paid',
			ref: 'PP-74122',
		},
		{
			id: 'PAY-017',
			date: '2024-10-01',
			amount: '$250.00',
			method: 'PayPal',
			status: 'paid',
			ref: 'PP-68901',
		},
		{
			id: 'PAY-009',
			date: '2024-09-01',
			amount: '$300.00',
			method: 'PayPal',
			status: 'paid',
			ref: 'PP-63421',
		},
	],
	'AFF-002': [
		{
			id: 'PAY-040',
			date: '2025-01-01',
			amount: '$180.00',
			method: 'Bank Transfer',
			status: 'paid',
			ref: 'TXN-29182',
		},
		{
			id: 'PAY-032',
			date: '2024-12-01',
			amount: '$210.00',
			method: 'Bank Transfer',
			status: 'paid',
			ref: 'TXN-27441',
		},
	],
};

export const affiliateLinks: Record<
	string,
	Array< {
		id: number;
		label: string;
		url: string;
		clicks: number;
		conversions: number;
		created: string;
	} >
> = {
	'AFF-001': [
		{
			id: 1,
			label: 'Homepage Banner',
			url: 'https://example.com/?ref=WPBEG&utm_source=banner',
			clicks: 2841,
			conversions: 312,
			created: '2023-02-01',
		},
		{
			id: 2,
			label: 'Review Article',
			url: 'https://example.com/?ref=WPBEG&utm_source=review',
			clicks: 1940,
			conversions: 289,
			created: '2023-04-15',
		},
		{
			id: 3,
			label: 'Email Newsletter',
			url: 'https://example.com/?ref=WPBEG&utm_source=email',
			clicks: 812,
			conversions: 89,
			created: '2023-06-10',
		},
		{
			id: 4,
			label: 'YouTube Video',
			url: 'https://example.com/?ref=WPBEG&utm_source=youtube',
			clicks: 247,
			conversions: 22,
			created: '2024-01-20',
		},
	],
	'AFF-002': [
		{
			id: 1,
			label: 'Blog Post — Best Plugins',
			url: 'https://example.com/?ref=KINSTA&utm_source=blog',
			clicks: 1890,
			conversions: 241,
			created: '2023-04-01',
		},
		{
			id: 2,
			label: 'Resource Page',
			url: 'https://example.com/?ref=KINSTA&utm_source=resource',
			clicks: 1320,
			conversions: 150,
			created: '2023-07-12',
		},
	],
};

export const affiliateClickTrend: Record<
	string,
	Array< { month: string; clicks: number; conversions: number } >
> = {
	'AFF-001': [
		{ month: 'Aug', clicks: 420, conversions: 52 },
		{ month: 'Sep', clicks: 510, conversions: 61 },
		{ month: 'Oct', clicks: 480, conversions: 58 },
		{ month: 'Nov', clicks: 620, conversions: 79 },
		{ month: 'Dec', clicks: 590, conversions: 71 },
		{ month: 'Jan', clicks: 649, conversions: 82 },
	],
	'AFF-002': [
		{ month: 'Aug', clicks: 240, conversions: 29 },
		{ month: 'Sep', clicks: 280, conversions: 34 },
		{ month: 'Oct', clicks: 310, conversions: 38 },
		{ month: 'Nov', clicks: 290, conversions: 35 },
		{ month: 'Dec', clicks: 340, conversions: 41 },
		{ month: 'Jan', clicks: 360, conversions: 44 },
	],
};

export const affiliateTopProducts: Record<
	string,
	Array< {
		product: string;
		conversions: number;
		revenue: string;
		pct: number;
	} >
> = {
	'AFF-001': [
		{
			product: 'Plugin Pro Annual',
			conversions: 389,
			revenue: '$38,511',
			pct: 100,
		},
		{
			product: 'Theme Bundle',
			conversions: 210,
			revenue: '$12,390',
			pct: 54,
		},
		{
			product: 'SaaS Starter',
			conversions: 89,
			revenue: '$4,361',
			pct: 23,
		},
		{
			product: 'Security Module',
			conversions: 24,
			revenue: '$936',
			pct: 6,
		},
	],
	'AFF-002': [
		{
			product: 'Plugin Pro Annual',
			conversions: 201,
			revenue: '$19,899',
			pct: 100,
		},
		{
			product: 'SaaS Pro Annual',
			conversions: 98,
			revenue: '$19,502',
			pct: 49,
		},
		{
			product: 'Theme Bundle',
			conversions: 92,
			revenue: '$5,428',
			pct: 46,
		},
	],
};

export const RULE_TYPES = [
	'rate-limit',
	'geo-block',
	'ip-list',
	'signature',
	'validation',
] as const;
export const RULE_ACTIONS = [
	'block',
	'throttle',
	'challenge',
	'reject',
] as const;
export const BLOCK_DURATIONS = [
	'24 hours',
	'7 days',
	'30 days',
	'Permanent',
] as const;
export const SEVERITIES = [ 'low', 'medium', 'high', 'critical' ] as const;

export const SETTINGS_TABS = [
	'Modules',
	'Licensing',
	'Downloads',
	'Updates',
	'Subscriptions',
	'SaaS',
	'Affiliates',
	'Abandoned Cart',
	'Security',
	'Emails',
	'Advanced',
];

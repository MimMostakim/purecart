/**
 * Licenses module TypeScript data shapes.
 *
 * Field names and enum values match includes/API/Licenses.php's prepare_*()
 * output exactly (camelCase, matches the backend ENUM verbatim) so no
 * translation layer is ever needed between the REST response and the UI.
 *
 * @file
 * @since 1.0.0
 */

export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended';
export type LicensePlanType = 'single' | 'multi' | 'unlimited' | 'lifetime';
export type LicenseEnvironment = 'production' | 'staging' | 'local';

export interface LicenseRecord {
	id: number;
	orderId: number;
	userId: number;
	productId: number;
	productName: string;
	customerName: string;
	customerEmail: string;
	licenseKey: string;
	planType: LicensePlanType;
	status: LicenseStatus;
	activationLimit: number;
	activatedCount: number;
	expiresAt: string | null; // ISO-ish MySQL datetime, or null = lifetime
	createdAt: string;
	updatedAt: string;
}

export interface LicenseActivationRecord {
	id: number;
	licenseId: number;
	domain: string;
	ipAddress: string;
	environment: LicenseEnvironment;
	activatedAt: string;
	lastCheck: string | null;
}

export interface JwtTokenStatus {
	accessTokenActive: boolean;
	accessTokenExpiresAt: string | null;
	refreshTokenExpiresAt: string | null;
}

export interface LicenseStats {
	total: number;
	active: number;
	expiring_30d: number;
	revoked: number;
}

export interface LicenseQueryParams {
	page?: number;
	perPage?: number;
	search?: string;
	status?: LicenseStatus | 'All';
	productId?: number | 'All';
	expiresWithinDays?: number;
}

export interface LicenseDetailResponse {
	license: LicenseRecord;
	activations: LicenseActivationRecord[];
	jwtStatus: JwtTokenStatus;
}

export interface LicenseIssuedByDay {
	date: string;
	count: number;
}

export interface LicenseByPlan {
	plan: LicensePlanType;
	count: number;
}

export interface LicenseByStatus {
	status: LicenseStatus;
	count: number;
}

export interface LicenseTopProduct {
	productId: number;
	productName: string;
	count: number;
}

export type LicenseActivityType = 'issued' | 'renewed' | 'expired' | 'revoked' | 'suspended';

export interface LicenseActivityByMonth {
	month: string;
	issued: number;
	renewed: number;
	revoked: number;
}

export interface LicenseByProduct {
	productId: number;
	productName: string;
	active: number;
	expired: number;
	suspended: number;
	revoked: number;
}

export interface LicenseRecentActivity {
	type: LicenseActivityType;
	customerName: string;
	productName: string;
	planType: LicensePlanType;
	createdAt: string; // ISO datetime
}

export interface LicenseTopCustomer {
	userId: number;
	customerName: string;
	totalLicenses: number;
	activeLicenses: number;
}

export interface LicenseReportSummary {
	stats: LicenseStats;
	issuedByDay: LicenseIssuedByDay[];
	byPlan: LicenseByPlan[];
	byStatus: LicenseByStatus[];
	topProducts: LicenseTopProduct[];
	activityByMonth?: LicenseActivityByMonth[];
	byProduct?: LicenseByProduct[];
	recentActivity?: LicenseRecentActivity[];
	topCustomers?: LicenseTopCustomer[];
}

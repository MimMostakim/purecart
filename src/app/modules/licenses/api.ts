/**
 * Licenses Module API Client.
 *
 * Typed wrappers for includes/API/Licenses.php's admin routes
 * (GET/POST /purecart/v1/licenses/*, /purecart/v1/reports/licenses/summary).
 *
 * @file
 * @since 1.0.0
 */

import { purecartFetch, purecartFetchRaw } from '@/shared/api';
import type {
	LicenseRecord,
	LicenseDetailResponse,
	LicenseQueryParams,
	LicenseStats,
	LicenseReportSummary,
} from './types';

export interface PaginatedLicensesResponse {
	data: LicenseRecord[];
	total: number;
	totalPages: number;
	stats: LicenseStats;
}

/**
 * GET /purecart/v1/licenses — paginated, filtered admin list + KPI stats.
 *
 * @since 1.0.0
 * @param {LicenseQueryParams} params Page/search/status/product/expiry filters.
 * @return {Promise<PaginatedLicensesResponse>} The list page + stats.
 */
export async function fetchLicenses(params: LicenseQueryParams = {}): Promise<PaginatedLicensesResponse> {
	const qs = new URLSearchParams();
	if (params.page) qs.append('page', String(params.page));
	if (params.perPage) qs.append('perPage', String(params.perPage));
	if (params.search) qs.append('search', params.search);
	if (params.status && params.status !== 'All') qs.append('status', params.status);
	if (params.productId && params.productId !== 'All') qs.append('productId', String(params.productId));
	if (params.expiresWithinDays) qs.append('expiresWithinDays', String(params.expiresWithinDays));

	const query = qs.toString() ? `?${qs.toString()}` : '';
	return purecartFetch<PaginatedLicensesResponse>(`/licenses${query}`);
}

/**
 * GET /purecart/v1/licenses/{id} — one license, its activations, and JWT status.
 *
 * @since 1.0.0
 * @param {number} id License row ID.
 * @return {Promise<LicenseDetailResponse>} The license detail payload.
 */
export async function fetchLicense(id: number): Promise<LicenseDetailResponse> {
	return purecartFetch<LicenseDetailResponse>(`/licenses/${id}`);
}

/**
 * POST /purecart/v1/licenses/{id}/extend — push expiry forward by N days.
 *
 * @since 1.0.0
 */
export async function extendLicense(id: number, days: number): Promise<{ success: boolean; license: LicenseRecord }> {
	return purecartFetch<{ success: boolean; license: LicenseRecord }>(`/licenses/${id}/extend`, {
		method: 'POST',
		data: { days },
	});
}

/**
 * POST /purecart/v1/licenses/{id}/suspend
 *
 * @since 1.0.0
 */
export async function suspendLicense(id: number): Promise<{ success: boolean; license: LicenseRecord }> {
	return purecartFetch<{ success: boolean; license: LicenseRecord }>(`/licenses/${id}/suspend`, { method: 'POST' });
}

/**
 * POST /purecart/v1/licenses/{id}/reinstate
 *
 * @since 1.0.0
 */
export async function reinstateLicense(id: number): Promise<{ success: boolean; license: LicenseRecord }> {
	return purecartFetch<{ success: boolean; license: LicenseRecord }>(`/licenses/${id}/reinstate`, { method: 'POST' });
}

/**
 * POST /purecart/v1/licenses/{id}/revoke
 *
 * @since 1.0.0
 */
export async function revokeLicense(id: number): Promise<{ success: boolean; license: LicenseRecord }> {
	return purecartFetch<{ success: boolean; license: LicenseRecord }>(`/licenses/${id}/revoke`, { method: 'POST' });
}

/**
 * POST /purecart/v1/licenses/bulk-revoke
 *
 * @since 1.0.0
 */
export async function bulkRevokeLicenses(ids: number[]): Promise<{ success: boolean; revoked: number }> {
	return purecartFetch<{ success: boolean; revoked: number }>('/licenses/bulk-revoke', {
		method: 'POST',
		data: { ids },
	});
}

/**
 * POST /purecart/v1/licenses/{id}/reset-activations — clears every
 * activation record and resets the used-slot counter to zero.
 *
 * @since 1.0.0
 */
export async function resetLicenseActivations(id: number): Promise<{ success: boolean; license: LicenseRecord }> {
	return purecartFetch<{ success: boolean; license: LicenseRecord }>(`/licenses/${id}/reset-activations`, {
		method: 'POST',
	});
}

/**
 * POST /purecart/v1/licenses/{id}/duplicate — issues a fresh license for
 * the same order/customer/product.
 *
 * @since 1.0.0
 */
export async function duplicateLicense(id: number): Promise<{ success: boolean; license: LicenseRecord }> {
	return purecartFetch<{ success: boolean; license: LicenseRecord }>(`/licenses/${id}/duplicate`, { method: 'POST' });
}

/**
 * GET /purecart/v1/reports/licenses/summary — LicenseSummaryPage's data.
 *
 * @since 1.0.0
 * @param {Object} [params]        Optional query parameters.
 * @param {string} [params.range]  Date range filter: '3m' | '6m' | '12m' | 'All time'.
 */
export async function fetchLicenseReportSummary( params: { range?: string } = {} ): Promise<LicenseReportSummary> {
	const qs = params.range ? `?range=${ encodeURIComponent( params.range ) }` : '';
	return purecartFetch<LicenseReportSummary>( `/reports/licenses/summary${ qs }` );
}

export interface LicenseSettings {
	deliveryStatus: 'completed' | 'processing' | 'both';
	/** Auto-generated on first use; read-only here — no regenerate endpoint exists yet. */
	jwtSecret: string;
}

interface RawLicenseSettings {
	delivery_status: LicenseSettings['deliveryStatus'];
	jwt_secret: string;
}

/**
 * GET /purecart/v1/licenses/settings
 *
 * @since 1.0.0
 */
export async function fetchLicenseSettings(): Promise<LicenseSettings> {
	const raw = await purecartFetch<RawLicenseSettings>('/licenses/settings');
	return { deliveryStatus: raw.delivery_status, jwtSecret: raw.jwt_secret };
}

/**
 * POST /purecart/v1/licenses/settings — `jwtSecret` is intentionally not
 * accepted here (see includes/API/Licenses.php::save_settings()'s own
 * docblock: rotating it isn't a side effect of saving this form).
 *
 * @since 1.0.0
 */
export async function saveLicenseSettings(
	settings: Pick<LicenseSettings, 'deliveryStatus'>
): Promise<void> {
	await purecartFetch('/licenses/settings', {
		method: 'POST',
		data: { delivery_status: settings.deliveryStatus },
	});
}

/**
 * GET /purecart/v1/licenses/export — trigger browser download of CSV.
 *
 * @since 1.0.0
 */
export async function exportLicensesCsv(): Promise<void> {
	const res = await purecartFetchRaw('/licenses/export', { method: 'GET' });

	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.setAttribute('download', `purecart-licenses-${new Date().toISOString().slice(0, 10)}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

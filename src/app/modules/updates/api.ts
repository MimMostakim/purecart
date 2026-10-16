/**
 * Updates Module API Client.
 *
 * Provides typed methods for interacting with PureCart Software Update REST routes.
 *
 * @file
 * @since 1.0.0
 */

import { purecartFetch } from '@/shared/api';
import type {
	ProductVersion,
	UpdateStats,
	VersionQueryParams,
	UpdateAnalyticsData,
	RollbackRecord,
	NewReleasePayload,
} from './types';

export interface PaginatedVersionsResponse {
	data: ProductVersion[];
	total: number;
	totalPages: number;
	stats: UpdateStats;
}

/**
 * Fetches all WooCommerce products available for updates.
 */
export async function fetchProducts(): Promise<Array<{ id: number; name: string; slug: string }>> {
	const res = await purecartFetch<Array<{ product_id: number; product_name: string; slug: string }>>('/updates/products');
	return ( res || [] ).map( ( p ) => ( {
		id: p.product_id,
		name: p.product_name,
		slug: p.slug,
	} ) );
}

/**
 * Fetches software packages and versions with pagination, search, and filter queries.
 */
export async function fetchVersions(
	params: VersionQueryParams = {}
): Promise<PaginatedVersionsResponse> {
	const qs = new URLSearchParams();
	if (params.page) qs.append('page', String(params.page));
	if (params.perPage) qs.append('perPage', String(params.perPage));
	if (params.search) qs.append('search', params.search);
	if (params.channel && params.channel !== 'All') qs.append('channel', params.channel);
	if (params.platform && params.platform !== 'All') qs.append('platform', params.platform);
	if (params.productType && params.productType !== 'All') qs.append('productType', params.productType);
	if (params.productId && params.productId !== 'All') qs.append('productId', String(params.productId));
	if (params.status && params.status !== 'All') qs.append('status', params.status);

	const query = qs.toString() ? `?${qs.toString()}` : '';
	return purecartFetch<PaginatedVersionsResponse>(`/updates/versions${query}`);
}

/**
 * Uploads a new package archive with form metadata.
 */
export async function uploadPackage(
	payload: NewReleasePayload
): Promise<{ success: boolean; version: ProductVersion }> {
	const formData = new FormData();
	formData.append('productId', String(payload.productId));
	formData.append('version', payload.version);
	formData.append('channel', payload.channel);
	formData.append('platform', payload.platform);
	if (payload.requiresVersion) formData.append('requiresVersion', payload.requiresVersion);
	if (payload.testedVersion) formData.append('testedVersion', payload.testedVersion);
	formData.append('changelog', payload.changelog);
	formData.append('notifyCustomers', payload.notifyCustomers ? '1' : '0');
	if (payload.file) {
		formData.append('file', payload.file);
	}

	// Passed as `body` (not `data`) so apiFetch doesn't JSON-stringify it —
	// the browser sets the multipart Content-Type + boundary automatically,
	// same as it would for a raw fetch() call with a FormData body.
	return purecartFetch<{ success: boolean; version: ProductVersion }>('/updates/upload', {
		method: 'POST',
		body: formData,
	});
}

/**
 * Publishes or promotes a version to a channel.
 */
export async function publishVersion(
	versionId: number,
	channel: string = 'stable'
): Promise<{ success: boolean }> {
	return purecartFetch<{ success: boolean }>(`/updates/versions/${versionId}/publish`, {
		method: 'POST',
		data: { channel },
	});
}

/**
 * Sets active/archived status for a package version.
 */
export async function setVersionStatus(
	versionId: number,
	status: 'active' | 'archived'
): Promise<{ success: boolean }> {
	return purecartFetch<{ success: boolean }>(`/updates/versions/${versionId}/status`, {
		method: 'POST',
		data: { status },
	});
}

/**
 * Deletes a package version and its stored physical file.
 */
export async function deleteVersion(versionId: number): Promise<{ success: boolean }> {
	return purecartFetch<{ success: boolean }>(`/updates/versions/${versionId}`, {
		method: 'DELETE',
	});
}

/**
 * Generates a temporary 15-minute test download URL.
 */
export async function generateTestUrl(versionId: number): Promise<{ url: string }> {
	return purecartFetch<{ url: string }>(`/updates/versions/${versionId}/test-url`, {
		method: 'POST',
	});
}

/**
 * Executes an emergency rollback.
 */
export async function rollbackVersion(payload: {
	productId: number;
	version: string;
	reason: string;
}): Promise<{ success: boolean; record: RollbackRecord }> {
	return purecartFetch<{ success: boolean; record: RollbackRecord }>('/updates/rollback', {
		method: 'POST',
		data: {
			product_id: payload.productId,
			version: payload.version,
			reason: payload.reason,
		},
	});
}

/**
 * Fetches update adoption analytics and download trends.
 */
export async function fetchUpdateAnalytics(): Promise<UpdateAnalyticsData> {
	return purecartFetch<UpdateAnalyticsData>('/updates/analytics');
}

/**
 * Fetches customer notification email preview HTML.
 */
export async function fetchEmailPreview(): Promise<{ html: string }> {
	return purecartFetch<{ html: string }>('/updates/email-preview');
}

// ─── Settings API ──────────────────────────────────────────────────────

export interface UpdateSettings {
	defaultChannel: 'stable' | 'beta' | 'nightly';
	requireLicense: boolean;
	allowRollback: boolean;
	tokenTtl: number;
	emailNotifications: boolean;
}

interface RawUpdateSettings {
	default_channel: string;
	require_license: boolean;
	allow_rollback: boolean;
	token_ttl: number;
	email_notifications: boolean;
}

/**
 * GET /purecart/v1/updates/settings
 *
 * @since 1.0.0
 */
export async function fetchUpdateSettings(): Promise< UpdateSettings > {
	const raw = await purecartFetch< RawUpdateSettings >( '/updates/settings' );
	return {
		defaultChannel: raw.default_channel as UpdateSettings[ 'defaultChannel' ],
		requireLicense: raw.require_license,
		allowRollback: raw.allow_rollback,
		tokenTtl: raw.token_ttl,
		emailNotifications: raw.email_notifications,
	};
}

/**
 * POST /purecart/v1/updates/settings
 *
 * @since 1.0.0
 */
export async function saveUpdateSettings( settings: UpdateSettings ): Promise< void > {
	await purecartFetch( '/updates/settings', {
		method: 'POST',
		data: {
			default_channel: settings.defaultChannel,
			require_license: settings.requireLicense,
			allow_rollback: settings.allowRollback,
			token_ttl: settings.tokenTtl,
			email_notifications: settings.emailNotifications,
		},
	} );
}

/**
 * POST /purecart/v1/updates/regenerate-secret
 *
 * @since 1.0.0
 */
export async function regenerateUpdateSecret(): Promise< void > {
	await purecartFetch( '/updates/regenerate-secret', { method: 'POST' } );
}

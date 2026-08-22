/**
 * Dummy API layer for the Subscriptions module.
 *
 * Every exported function here mimics a real REST call to `/purecart/v1/...`
 * (see docs/subscription-module/subscription-final-dev-plan.md §6 for the
 * full real endpoint list) but currently resolves from local static data
 * instead of a network request.
 *
 * TO GO LIVE: flip `USE_DUMMY_DATA` to `false` below (and point `API_BASE` at
 * the real REST base, already read from `window.purecartConfig.restBase` when
 * PHP localizes it). Every function's signature - params in, `Promise<Shape>`
 * out - already matches what the real REST responses should look like, so
 * callers (pages/components) never need to change, only this file does.
 *
 * @file
 * @since 1.0.0
 */
import {
    subscriptionsData,
    revenueGoalsData,
    churnRiskData,
    subscriptionLogsData,
    subscriptionEmailsData,
    paymentHistory,
} from './static-data';
import type {
    SubscriptionRecord,
    PaymentRecord,
    SubscriptionLogEntry,
    SubscriptionEmailLogEntry,
    RevenueGoal,
    ChurnRiskEntry,
} from './subscription-types';

declare global {
	interface Window {
		purecartAdmin?: {
			nonce: string;
			restNonce: string; // wp_create_nonce( 'wp_rest' )
			apiUrl: string; // e.g. 'http://localhost:8080/woo-digital-downloads/wp-json/purecart/v1/'
			currentPage: string;
			version: string;
		};
		purecartConfig?: {
			nonce: string; // wp_create_nonce( 'wp_rest' )
			restBase: string; // e.g. 'https://example.com/wp-json/purecart/v1'
			adminUrl: string;
			myAccountUrl: string;
			currentUser: number;
			currency: string;
			dateFormat: string;
		};
	}
}

/**
 * Resolves the base REST API URL from localized script data.
 */
export function getApiBase(): string {
	const base = window.purecartAdmin?.apiUrl ?? window.purecartConfig?.restBase ?? '/wp-json/purecart/v1';
	return base.replace( /\/$/, '' );
}

/**
 * Resolves the REST API nonce for X-WP-Nonce header.
 */
export function getRestNonce(): string {
	return window.purecartAdmin?.restNonce ?? window.purecartConfig?.nonce ?? '';
}

/**
 * The one flag to flip when the backend is ready. Set to `false` to route
 * calls through the live WordPress REST API.
 */
export const USE_DUMMY_DATA = false;

/**
 * Resolves `value` after `ms` milliseconds - stands in for real network
 * latency so components built against this file already handle loading
 * states correctly before a real backend exists.
 *
 * @since 1.0.0
 *
 * @param {T}      value Value to resolve with.
 * @param {number} [ms]  Delay in milliseconds.
 *
 * @return {Promise<T>} A promise resolving to `value` after the delay.
 */
function delay<T>( value: T, ms = 300 ): Promise<T> {
	return new Promise( ( resolve ) => setTimeout( () => resolve( value ), ms ) );
}

/**
 * Builds a query string from key-value parameters.
 *
 * @param {Record<string, unknown>} [params]
 * @return {string}
 */
export function buildQueryString( params?: Record< string, unknown > ): string {
	if ( ! params || Object.keys( params ).length === 0 ) return '';
	const validKeys = Object.keys( params ).filter(
		( k ) => params[ k ] !== undefined && params[ k ] !== null && params[ k ] !== '' && params[ k ] !== 'All'
	);
	if ( validKeys.length === 0 ) return '';
	const qs = validKeys
		.map( ( k ) => `${ encodeURIComponent( k ) }=${ encodeURIComponent( String( params[ k ] ) ) }` )
		.join( '&' );
	return `?${ qs }`;
}

export interface ApiResponseWithMeta< T > {
	data: T;
	total: number;
	totalPages: number;
}

/**
 * Performs an authenticated JSON request against the real PureCart REST API,
 * extracting pagination metadata headers.
 *
 * @since 1.0.0
 *
 * @param {string}                  path     Endpoint path (e.g. '/subscriptions').
 * @param {Record<string, unknown>} [params] Query params.
 * @param {RequestInit}             [options] Extra fetch options.
 *
 * @return {Promise<ApiResponseWithMeta<T>>}
 */
export async function apiFetchWithMeta< T >(
	path: string,
	params?: Record< string, unknown >,
	options?: RequestInit
): Promise< ApiResponseWithMeta< T > > {
	const qs = buildQueryString( params );
	const apiBase = getApiBase();
	const normalizedPath = path.startsWith( '/' ) ? path : `/${ path }`;
	const res = await fetch( `${ apiBase }${ normalizedPath }${ qs }`, {
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': getRestNonce(),
		},
		...options,
	} );

	if ( ! res.ok ) {
		throw new Error( `API request failed: ${ res.status } ${ res.statusText }` );
	}

	const totalHeader = res.headers.get( 'x-wp-total' ) ?? res.headers.get( 'X-WP-Total' );
	const totalPagesHeader = res.headers.get( 'x-wp-totalpages' ) ?? res.headers.get( 'X-WP-TotalPages' );
	const data = ( await res.json() ) as T;

	const total = totalHeader ? parseInt( totalHeader, 10 ) : ( Array.isArray( data ) ? data.length : 0 );
	const totalPages = totalPagesHeader ? parseInt( totalPagesHeader, 10 ) : 1;

	return {
		data,
		total,
		totalPages,
	};
}

/**
 * Performs an authenticated JSON request against the real PureCart REST API.
 *
 * @since 1.0.0
 *
 * @param {string}      path    Path appended to API_BASE, e.g. '/subscriptions'.
 * @param {RequestInit} [options] Extra fetch options (method, body, etc.).
 *
 * @return {Promise<T>} The parsed JSON response body.
 */
async function apiFetch<T>( path: string, options?: RequestInit ): Promise<T> {
	const apiBase = getApiBase();
	const normalizedPath = path.startsWith( '/' ) ? path : `/${ path }`;
	const res = await fetch( `${ apiBase }${ normalizedPath }`, {
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': getRestNonce(),
		},
		...options,
	} );
	if ( ! res.ok ) {
		throw new Error( `API request failed: ${ res.status } ${ res.statusText }` );
	}
	return res.json();
}

// In-memory mutable copy so dummy "writes" (pause/cancel/update) persist
// across calls within a session, the same way a real backend would persist
// them in the database. Reset on a full page reload, same as any client cache.
let dummySubscriptions: SubscriptionRecord[] = [ ...subscriptionsData ];

/**
 * Filters & paginates dummy subscriptions for seamless mock testing.
 *
 * @since 1.0.0
 * @param {Record<string, unknown>} [params] Query filters and pagination.
 * @return {Promise<{items: SubscriptionRecord[], total: number, totalPages: number}>}
 */
export async function getDummySubscriptionsPaginated( params?: Record< string, unknown > ) {
	const search = String( params?.search ?? '' ).toLowerCase();
	const status = String( params?.status ?? 'All' );
	const product = String( params?.product ?? 'All' );
	const cycle = String( params?.cycle ?? 'All' );
	const deliveryType = String( params?.deliveryType ?? 'All' );
	const paymentType = String( params?.paymentType ?? 'All' );
	const churnRisk = String( params?.churnRisk ?? 'All' );
	const page = Math.max( 1, Number( params?.page ?? 1 ) );
	const perPage = Math.max( 1, Number( params?.per_page ?? 10 ) );

	let filtered = dummySubscriptions.filter( ( r ) => {
		const matchSearch =
			! search ||
			r.customer.toLowerCase().includes( search ) ||
			r.product.toLowerCase().includes( search ) ||
			r.id.toLowerCase().includes( search );
		const matchStatus = status === 'All' || r.status === status.toLowerCase().replace( / /g, '_' );
		const matchProduct = product === 'All' || r.product === product;
		const matchCycle = cycle === 'All' || r.cycle === cycle;
		const matchType = deliveryType === 'All' || r.deliveryType === deliveryType.toLowerCase();
		const matchPaymentType = paymentType === 'All' || r.paymentType === paymentType.toLowerCase();
		const matchChurnRisk =
			churnRisk === 'All' ||
			( churnRisk.toLowerCase() === 'low'
				? r.churnRiskScore <= 25
				: churnRisk.toLowerCase() === 'medium'
				? r.churnRiskScore > 25 && r.churnRiskScore <= 50
				: churnRisk.toLowerCase() === 'high'
				? r.churnRiskScore > 50 && r.churnRiskScore <= 75
				: r.churnRiskScore > 75 );
		return (
			matchSearch &&
			matchStatus &&
			matchProduct &&
			matchCycle &&
			matchType &&
			matchPaymentType &&
			matchChurnRisk
		);
	} );

	const total = filtered.length;
	const totalPages = Math.max( 1, Math.ceil( total / perPage ) );
	const items = filtered.slice( ( page - 1 ) * perPage, page * perPage );

	return delay( { items, total, totalPages } );
}

/**
 * GET /purecart/v1/subscriptions - list all subscriptions.
 *
 * @since 1.0.0
 * @return {Promise<SubscriptionRecord[]>} All subscription records.
 */
export async function fetchSubscriptions(): Promise<SubscriptionRecord[]> {
    if (USE_DUMMY_DATA) return delay([...dummySubscriptions]);
    return apiFetch<SubscriptionRecord[]>('/subscriptions');
}

/**
 * GET /purecart/v1/subscriptions/{id} - a single subscription.
 *
 * @since 1.0.0
 *
 * @param {string} id Subscription ID, e.g. 'SUB-001'.
 *
 * @return {Promise<SubscriptionRecord|undefined>} The matching record, or undefined if not found.
 */
export async function fetchSubscription(id: string): Promise<SubscriptionRecord | undefined> {
    if (USE_DUMMY_DATA) return delay(dummySubscriptions.find((r) => r.id === id));
    return apiFetch<SubscriptionRecord>(`/subscriptions/${id}`);
}

/**
 * Generic patch used by every row-action mutation (pause/resume/cancel/skip/etc.)
 * while the dedicated endpoints below aren't wired to a real backend yet.
 * Once live, prefer calling the specific action endpoint for each mutation
 * (POST .../pause, .../cancel, etc. - see the backend dev plan §6) instead of
 * a generic patch, since the real endpoints run business logic (proration,
 * license sync, etc.) a raw field patch can't reproduce.
 *
 * @since 1.0.0
 *
 * @param {string}                        id    Subscription ID to update.
 * @param {Partial<SubscriptionRecord>}   patch Fields to merge into the record.
 *
 * @return {Promise<SubscriptionRecord>} The updated record.
 */
export async function updateSubscription(
    id: string,
    patch: Partial<SubscriptionRecord>
): Promise<SubscriptionRecord> {
    if (USE_DUMMY_DATA) {
        dummySubscriptions = dummySubscriptions.map((r) =>
            r.id === id ? { ...r, ...patch } : r
        );
        const updated = dummySubscriptions.find((r) => r.id === id);
        if (!updated) throw new Error(`Subscription ${id} not found`);
        return delay(updated, 200);
    }
    return apiFetch<SubscriptionRecord>(`/subscriptions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
    });
}

/**
 * GET /purecart/v1/subscriptions/{id}/logs - the status-history event log.
 *
 * @since 1.0.0
 *
 * @param {string} id Subscription ID.
 *
 * @return {Promise<SubscriptionLogEntry[]>} That subscription's log entries.
 */
export async function fetchSubscriptionLogs(id: string): Promise<SubscriptionLogEntry[]> {
    if (USE_DUMMY_DATA) return delay(subscriptionLogsData[id] ?? []);
    return apiFetch<SubscriptionLogEntry[]>(`/subscriptions/${id}/logs`);
}

/**
 * Emails-sent history for one subscription. No dedicated endpoint exists in
 * the backend dev plan yet - this path is a best guess, confirm it once the
 * REST controller ships.
 *
 * @since 1.0.0
 *
 * @param {string} id Subscription ID.
 *
 * @return {Promise<SubscriptionEmailLogEntry[]>} That subscription's sent-email log.
 */
export async function fetchSubscriptionEmails(id: string): Promise<SubscriptionEmailLogEntry[]> {
    if (USE_DUMMY_DATA) return delay(subscriptionEmailsData[id] ?? []);
    return apiFetch<SubscriptionEmailLogEntry[]>(`/subscriptions/${id}/emails`);
}

/**
 * Per-charge payment ledger for one subscription (backs the Payment History
 * modal/tab). No dedicated endpoint documented yet either - same caveat as
 * fetchSubscriptionEmails().
 *
 * @since 1.0.0
 *
 * @param {string} id Subscription ID.
 *
 * @return {Promise<PaymentRecord[]>} That subscription's payment records.
 */
export async function fetchPaymentHistory(id: string): Promise<PaymentRecord[]> {
    if (USE_DUMMY_DATA) return delay(paymentHistory[id] ?? []);
    return apiFetch<PaymentRecord[]>(`/subscriptions/${id}/payments`);
}

/**
 * GET /purecart/v1/subscriptions/revenue-goals - admin-configured revenue goals.
 *
 * @since 1.0.0
 * @return {Promise<RevenueGoal[]>} All revenue goals.
 */
export async function fetchRevenueGoals(): Promise<RevenueGoal[]> {
    if (USE_DUMMY_DATA) return delay([...revenueGoalsData]);
    return apiFetch<RevenueGoal[]>('/subscriptions/revenue-goals');
}

/**
 * Analytics churn-risk table data. Bundled under the backend's
 * report/summary endpoint in practice - this path is a placeholder until
 * that response shape is confirmed.
 *
 * @since 1.0.0
 * @return {Promise<ChurnRiskEntry[]>} At-risk subscription entries.
 */
export async function fetchChurnRisk(): Promise<ChurnRiskEntry[]> {
    if (USE_DUMMY_DATA) return delay([...churnRiskData]);
    return apiFetch<ChurnRiskEntry[]>('/subscriptions/report/churn-risk');
}

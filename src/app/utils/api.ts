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
 * Base URL every real request is built against. Falls back to the standard
 * WP REST path so this still points somewhere sane even before PHP injects
 * `purecartConfig` via `wp_localize_script`.
 */
const API_BASE = window.purecartConfig?.restBase ?? '/wp-json/purecart/v1';

/**
 * The one flag to flip when the backend is ready. While `true`, every
 * function below resolves from the static sample data (with a small
 * artificial delay, so loading states are exercised realistically). Set to
 * `false` to route every call through `apiFetch()` instead.
 */
const USE_DUMMY_DATA = true;

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
 * Performs an authenticated JSON request against the real PureCart REST API.
 * Not called anywhere while `USE_DUMMY_DATA` is `true`.
 *
 * @since 1.0.0
 *
 * @param {string}      path    Path appended to API_BASE, e.g. '/subscriptions'.
 * @param {RequestInit} [options] Extra fetch options (method, body, etc.).
 *
 * @return {Promise<T>} The parsed JSON response body.
 */
async function apiFetch<T>( path: string, options?: RequestInit ): Promise<T> {
	const res = await fetch( `${ API_BASE }${ path }`, {
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': window.purecartConfig?.nonce ?? '',
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
 * GET /purecart/v1/subscriptions - list all subscriptions.
 *
 * @since 1.0.0
 * @return {Promise<SubscriptionRecord[]>} All subscription records.
 */
export async function fetchSubscriptions(): Promise<SubscriptionRecord[]> {
	if ( USE_DUMMY_DATA ) return delay( [ ...dummySubscriptions ] );
	return apiFetch<SubscriptionRecord[]>( '/subscriptions' );
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
export async function fetchSubscription( id: string ): Promise<SubscriptionRecord | undefined> {
	if ( USE_DUMMY_DATA ) return delay( dummySubscriptions.find( ( r ) => r.id === id ) );
	return apiFetch<SubscriptionRecord>( `/subscriptions/${ id }` );
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
	if ( USE_DUMMY_DATA ) {
		dummySubscriptions = dummySubscriptions.map( ( r ) =>
			r.id === id ? { ...r, ...patch } : r
		);
		const updated = dummySubscriptions.find( ( r ) => r.id === id );
		if ( ! updated ) throw new Error( `Subscription ${ id } not found` );
		return delay( updated, 200 );
	}
	return apiFetch<SubscriptionRecord>( `/subscriptions/${ id }`, {
		method: 'PATCH',
		body: JSON.stringify( patch ),
	} );
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
export async function fetchSubscriptionLogs( id: string ): Promise<SubscriptionLogEntry[]> {
	if ( USE_DUMMY_DATA ) return delay( subscriptionLogsData[ id ] ?? [] );
	return apiFetch<SubscriptionLogEntry[]>( `/subscriptions/${ id }/logs` );
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
export async function fetchSubscriptionEmails( id: string ): Promise<SubscriptionEmailLogEntry[]> {
	if ( USE_DUMMY_DATA ) return delay( subscriptionEmailsData[ id ] ?? [] );
	return apiFetch<SubscriptionEmailLogEntry[]>( `/subscriptions/${ id }/emails` );
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
export async function fetchPaymentHistory( id: string ): Promise<PaymentRecord[]> {
	if ( USE_DUMMY_DATA ) return delay( paymentHistory[ id ] ?? [] );
	return apiFetch<PaymentRecord[]>( `/subscriptions/${ id }/payments` );
}

/**
 * GET /purecart/v1/subscriptions/revenue-goals - admin-configured revenue goals.
 *
 * @since 1.0.0
 * @return {Promise<RevenueGoal[]>} All revenue goals.
 */
export async function fetchRevenueGoals(): Promise<RevenueGoal[]> {
	if ( USE_DUMMY_DATA ) return delay( [ ...revenueGoalsData ] );
	return apiFetch<RevenueGoal[]>( '/subscriptions/revenue-goals' );
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
	if ( USE_DUMMY_DATA ) return delay( [ ...churnRiskData ] );
	return apiFetch<ChurnRiskEntry[]>( '/subscriptions/report/churn-risk' );
}

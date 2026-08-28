/**
 * Core PureCart REST Client & Fetch Helpers.
 *
 * Provides base URL resolution, nonce extraction, query serialization,
 * and authenticated HTTP wrappers against WordPress REST APIs.
 *
 * @file
 * @since 1.0.0
 */

import type { ApiResponseWithMeta } from './types';

/**
 * Resolves the base REST API URL from localized script data.
 */
export function getApiBase(): string {
	const base = window.purecartAdmin?.apiUrl ?? window.purecartConfig?.restBase ?? '/wp-json/purecart/v1';
	return base.replace(/\/$/, '');
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
 * latency so components handle loading states properly before a real backend exists.
 *
 * @since 1.0.0
 * @param {T}      value Value to resolve with.
 * @param {number} [ms]  Delay in milliseconds.
 * @return {Promise<T>} A promise resolving to `value` after the delay.
 */
export function delay<T>(value: T, ms = 300): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Builds a query string from key-value parameters.
 *
 * @param {Record<string, unknown>} [params]
 * @return {string}
 */
export function buildQueryString(params?: Record<string, unknown>): string {
	if (!params || Object.keys(params).length === 0) return '';
	const validKeys = Object.keys(params).filter(
		(k) => params[k] !== undefined && params[k] !== null && params[k] !== '' && params[k] !== 'All'
	);
	if (validKeys.length === 0) return '';
	const qs = validKeys
		.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
		.join('&');
	return `?${qs}`;
}

/**
 * Performs an authenticated JSON request against the real PureCart REST API,
 * extracting pagination metadata headers.
 *
 * @since 1.0.0
 * @param {string}                  path     Endpoint path (e.g. '/subscriptions').
 * @param {Record<string, unknown>} [params] Query params.
 * @param {RequestInit}             [options] Extra fetch options.
 * @return {Promise<ApiResponseWithMeta<T>>}
 */
export async function apiFetchWithMeta<T>(
	path: string,
	params?: Record<string, unknown>,
	options?: RequestInit
): Promise<ApiResponseWithMeta<T>> {
	const qs = buildQueryString(params);
	const apiBase = getApiBase();
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const res = await fetch(`${apiBase}${normalizedPath}${qs}`, {
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': getRestNonce(),
		},
		...options,
	});

	if (!res.ok) {
		let errorMsg = `API request failed: ${res.status} ${res.statusText}`;
		try {
			const errJson = await res.json();
			if (errJson?.message) errorMsg = errJson.message;
		} catch {}
		throw new Error(errorMsg);
	}

	const totalHeader = res.headers.get('x-wp-total') ?? res.headers.get('X-WP-Total');
	const totalPagesHeader = res.headers.get('x-wp-totalpages') ?? res.headers.get('X-WP-TotalPages');
	const data = (await res.json()) as T;

	const total = totalHeader ? parseInt(totalHeader, 10) : (Array.isArray(data) ? data.length : 0);
	const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1;

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
 * @param {string}      path    Path appended to API_BASE, e.g. '/subscriptions'.
 * @param {RequestInit} [options] Extra fetch options (method, body, etc.).
 * @return {Promise<T>} The parsed JSON response body.
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const apiBase = getApiBase();
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const res = await fetch(`${apiBase}${normalizedPath}`, {
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': getRestNonce(),
		},
		...options,
	});
	if (!res.ok) {
		let errorMsg = `API request failed: ${res.status} ${res.statusText}`;
		try {
			const errJson = await res.json();
			if (errJson?.message) errorMsg = errJson.message;
		} catch {}
		throw new Error(errorMsg);
	}
	return res.json();
}

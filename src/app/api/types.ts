/**
 * Core API Types & Interfaces.
 *
 * @file
 * @since 1.0.0
 */

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

export interface ApiResponseWithMeta<T> {
	data: T;
	total: number;
	totalPages: number;
}

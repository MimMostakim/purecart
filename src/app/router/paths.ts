import type { Page } from '../utils/static-data';

// ─── Route paths (hash-routed) ─────────────────────────────────────────────────
export const PAGE_PATHS: Record< Page, string > = {
	'overview':               '/overview',
	'licenses':               '/licenses',
	'downloads':              '/downloads',
	'updates':                '/updates',
	'subscriptions':          '/subscriptions',
	'subscription-analytics': '/subscriptions/analytics',
	// 'subscription-detail' has no single canonical path — its real route is
	// `${PAGE_PATHS.subscriptions}/:id` (see SUBSCRIPTION_DETAIL_PATH below).
	// This entry only exists so PAGE_PATHS satisfies Record<Page, string>.
	'subscription-detail': '/subscriptions',
	settings: '/settings',
};

/** Route pattern for the Subscription Detail page, used by AppRoutes and navigation callers. */
export const SUBSCRIPTION_DETAIL_PATH = `${ PAGE_PATHS.subscriptions }/:id`;

/** Builds a real, navigable detail-page URL for one subscription. */
export function subscriptionDetailPath( id: string ): string {
	return `${ PAGE_PATHS.subscriptions }/${ id }`;
}

// Reverse lookup: route path -> Page id. Used by components (Sidebar, TopBar)
// that only know about the Page type and have no awareness of routing.
export const PATH_TO_PAGE: Record< string, Page > = Object.fromEntries(
	Object.entries( PAGE_PATHS ).map( ( [ page, path ] ) => [ path, page as Page ] )
) as Record< string, Page >;

/**
 * Resolves the current Page id from a pathname, including the parameterized
 * Subscription Detail route (`/subscriptions/{id}`) which PATH_TO_PAGE's
 * exact-match lookup can't handle on its own.
 */
export function getPageFromPath( pathname: string ): Page {
	if ( pathname === PAGE_PATHS.subscriptions ) return 'subscriptions';
	if ( pathname === PAGE_PATHS[ 'subscription-analytics' ] ) return 'subscription-analytics';
	if ( pathname === PAGE_PATHS.settings ) return 'settings';
	if ( pathname.startsWith( `${ PAGE_PATHS.subscriptions }/` ) ) return 'subscription-detail';
	return 'subscriptions';
}

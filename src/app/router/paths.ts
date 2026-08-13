import type { Page } from '../utils/static-data';

// ─── Route paths (hash-routed) ─────────────────────────────────────────────────
export const PAGE_PATHS: Record< Page, string > = {
	'overview':               '/overview',
	'licenses':               '/licenses',
	'downloads':              '/downloads',
	'updates':                '/updates',
	'subscriptions':          '/subscriptions',
	'subscription-analytics': '/subscriptions/analytics',
	'saas-accounts':          '/saas-accounts',
	'affiliates':             '/affiliates',
	'abandoned-cart':         '/abandoned-cart',
	'security':               '/security',
	'analytics':              '/analytics',
	'settings':               '/settings',
};

// Reverse lookup: route path -> Page id. Used by components (Sidebar, TopBar)
// that only know about the Page type and have no awareness of routing.
export const PATH_TO_PAGE: Record< string, Page > = Object.fromEntries(
	Object.entries( PAGE_PATHS ).map( ( [ page, path ] ) => [ path, page as Page ] )
) as Record< string, Page >;

export function getPageFromPath( pathname: string ): Page {
	return PATH_TO_PAGE[ pathname ] ?? 'overview';
}

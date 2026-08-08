import type { Page } from '../utils/static-data';

// ─── Route paths (hash-routed, scoped to the Subscriptions module) ─────────────
export const PAGE_PATHS: Record< Page, string > = {
	subscriptions: '/subscriptions',
	'subscription-analytics': '/subscriptions/analytics',
};

// Reverse lookup: route path -> Page id. Used by components (Sidebar, TopBar)
// that only know about the Page type and have no awareness of routing.
export const PATH_TO_PAGE: Record< string, Page > = Object.fromEntries(
	Object.entries( PAGE_PATHS ).map( ( [ page, path ] ) => [ path, page ] )
) as Record< string, Page >;

export function getPageFromPath( pathname: string ): Page {
	return PATH_TO_PAGE[ pathname ] ?? 'subscriptions';
}

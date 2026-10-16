/**
 * Admin navigation schema — page titles, breadcrumb parents, and the sidebar
 * nav item list. Only consumed by Sidebar and TopBar, so it lives alongside
 * them rather than in a more broadly-shared location.
 *
 * Labels here are deliberately left as plain strings, not @wordpress/i18n
 * __() calls: these are module-level constants evaluated once at import
 * time, which can run before WordPress's locale data is registered
 * (wp.i18n.setLocaleData()), silently shipping untranslated strings instead
 * of failing loudly. Moving these into a function called per-render (so the
 * __() call happens at a safe time) is the correct fix, but is a behavior
 * change beyond this relocation's scope — tracked as a known gap, not fixed
 * here. This matches the pre-existing behavior before this file existed.
 *
 * @file
 * @since 1.0.0
 */
import {
	LayoutDashboard,
	Key,
	Download,
	RefreshCcw,
	Repeat,
	Cloud,
	Users,
	ShoppingCart,
	Shield,
	BarChart2,
	Settings as SettingsIcon,
} from 'lucide-react';
import type { Page } from '@/shared/types/page';

// ─── Nav items definition ──────────────────────────────────────────────────────
export const NAV_SCHEMA: Array< {
	id: Page;
	icon: React.ElementType;
	label: string;
	/** Render a horizontal rule after this item. */
	dividerAfter?: boolean;
} > = [
	{ id: 'overview',       icon: LayoutDashboard, label: 'Overview' },
	{ id: 'licenses',       icon: Key,             label: 'Licenses' },
	{ id: 'downloads',      icon: Download,        label: 'Downloads' },
	{ id: 'updates',        icon: RefreshCcw,      label: 'Updates' },
	{ id: 'subscriptions',  icon: Repeat,          label: 'Subscriptions' },
	{ id: 'saas-accounts',  icon: Cloud,           label: 'SaaS Accounts' },
	{ id: 'affiliates',     icon: Users,           label: 'Affiliates' },
	{ id: 'abandoned-cart', icon: ShoppingCart,    label: 'Abandoned Cart' },
	{ id: 'security',       icon: Shield,          label: 'Security' },
	{ id: 'analytics',      icon: BarChart2,       label: 'Analytics', dividerAfter: true },
	{ id: 'settings',       icon: SettingsIcon,    label: 'Settings' },
];

/**
 * Maps a module slug (stored in the enabled_modules option) to
 * the nav-schema Page id it controls.
 */
export const MODULE_SLUG_TO_PAGE: Record< string, Page > = {
	'secure-downloads':  'downloads',
	'license-manager':   'licenses',
	'update-manager':    'updates',
	'subscriptions':     'subscriptions',
	'saas-provisioning': 'saas-accounts',
	'affiliate-program': 'affiliates',
	'abandoned-cart':    'abandoned-cart',
	'analytics':         'analytics',
	'security-suite':    'security',
};

const ALWAYS_VISIBLE: Set< Page > = new Set( [ 'overview', 'settings' ] );

export function getVisibleNavItems( enabledSlugs: string[] ) {
	const enabledPages = new Set< Page >(
		enabledSlugs
			.map( ( s ) => MODULE_SLUG_TO_PAGE[ s ] )
			.filter( ( p ): p is Page => !! p )
	);

	return NAV_SCHEMA.filter(
		( item ) => ALWAYS_VISIBLE.has( item.id ) || enabledPages.has( item.id )
	);
}

// ─── Page titles ───────────────────────────────────────────────────────────────
export const PAGE_TITLES: Record< Page, string > = {
	'overview':               'Overview',
	'licenses':               'Licenses',
	'license-detail':         'License Detail',
	'license-summary':        'License Summary',
	'downloads':              'Downloads',
	'updates':                'Updates',
	'subscriptions':          'Subscriptions',
	'subscription-analytics': 'Subscription Analytics',
	'subscription-detail':    'Subscription Detail',
	'saas-accounts':          'SaaS Accounts',
	'affiliates':             'Affiliates',
	'abandoned-cart':         'Abandoned Cart',
	'security':               'Security',
	'analytics':              'Analytics',
	'settings':               'Settings',
};

// ─── Parent page map (for breadcrumbs) ────────────────────────────────────────
/** Pages that are children of another page in the breadcrumb trail. */
export const PAGE_PARENT: Partial< Record< Page, Page > > = {
	'subscription-analytics': 'subscriptions',
	'license-detail':         'licenses',
	'license-summary':        'licenses',
};

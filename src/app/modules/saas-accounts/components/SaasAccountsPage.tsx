/**
 * SaasAccountsPage — top-level orchestrator for the SaaS Accounts page.
 *
 * Accounts, KPI stats, filters and pagination live in the Redux
 * saasAccountsSlice (server-driven, same shape as Licenses/Downloads);
 * this file owns only which row the detail panel is showing. Every
 * mutation goes through useSaasAccountActions, shared with the panel.
 *
 * Settings are deliberately not a tab here: Settings → SaaS
 * (modules/settings/components/SettingsSaas.tsx) is already wired to the
 * same GET/POST /saas-accounts/settings pair, so the filter bar links
 * across to it rather than shipping a second form against one endpoint.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { __ } from '@wordpress/i18n';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { getOrCreateResource } from '@/shared/suspense';
import { settingsTabPath } from '@/app/router/paths';
import { M3 } from '@/theme';
import {
	loadSaasAccounts,
	loadSaasStats,
	setSearch,
	setStatusFilter,
	setPlanFilter,
	setProductIdFilter,
	clearFilters,
	setPage,
} from '../store/saas-accounts.slice';
import {
	selectSaasAccountItems,
	selectSaasStats,
	selectSaasFilters,
	selectSaasLoadStatus,
	selectSaasError,
	selectSaasPage,
	selectSaasTotal,
	selectSaasTotalPages,
	selectSaasAccountById,
} from '../store/saas-accounts.selectors';
import { useSaasAccountActions } from '../hooks/useSaasAccountActions';
import { SaasAccountsKpiStrip } from './SaasAccountsKpiStrip';
import { SaasAccountsFilterBar } from './SaasAccountsFilterBar';
import { SaasAccountsTable } from './SaasAccountsTable';
import { SaasAccountDetailPanel } from './SaasAccountDetailPanel';

/**
 * Flipped by the first mount in this browser tab, whose data the Suspense
 * resource below has already fetched. Module-level for the same reason the
 * resource cache itself is (see shared/suspense/resourceCache.ts): "has
 * this page loaded once yet" is a fact about the tab, not about a render
 * attempt of a component that suspends before it ever commits — so
 * `getOrCreateResource`'s `created` flag, true only on that discarded
 * render, can't answer it from inside an effect.
 */
let hasCompletedInitialLoad = false;

/**
 * Renders the SaaS Accounts page.
 *
 * @since 1.0.0
 *
 * @return {JSX.Element} The page.
 */
export function SaasAccountsPage() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const items = useAppSelector( selectSaasAccountItems );
	const stats = useAppSelector( selectSaasStats );
	const filters = useAppSelector( selectSaasFilters );
	const loadStatus = useAppSelector( selectSaasLoadStatus );
	const error = useAppSelector( selectSaasError );
	const page = useAppSelector( selectSaasPage );
	const total = useAppSelector( selectSaasTotal );
	const totalPages = useAppSelector( selectSaasTotalPages );

	const [ selectedId, setSelectedId ] = useState< number | null >( null );

	const { rowActions, modals } = useSaasAccountActions( {
		onViewDetail: ( account ) => setSelectedId( account.id ),
	} );

	// Suspense covers the true first load of this page per browser tab.
	const { resource } = getOrCreateResource( 'saas-accounts', () =>
		Promise.all( [
			dispatch( loadSaasAccounts( {} ) ).unwrap(),
			dispatch( loadSaasStats() ).unwrap(),
		] )
	);
	resource.read();

	// Every later visit refetches, so navigating back doesn't show a list
	// that went stale while the admin was elsewhere. The first mount skips
	// it — the resource above just fetched exactly this.
	useEffect( () => {
		if ( ! hasCompletedInitialLoad ) {
			hasCompletedInitialLoad = true;
			return;
		}
		dispatch( loadSaasAccounts( {} ) );
		dispatch( loadSaasStats() );
	}, [ dispatch ] );

	// Filters and pagination are server-side: the list has to be re-fetched
	// when either changes, or the chips and page buttons would only ever
	// move Redux state around. The thunk reads the current filters out of
	// state itself, so nothing is threaded through here. Skipping this
	// effect's first run per mount avoids duplicating the load above.
	const skipFilterEffectRef = useRef( true );
	useEffect( () => {
		if ( skipFilterEffectRef.current ) {
			skipFilterEffectRef.current = false;
			return;
		}
		// Debounced, so typing in the search box doesn't fire one request
		// per keystroke; a chip or page click just waits out the same delay.
		const timer = setTimeout( () => {
			dispatch( loadSaasAccounts( {} ) );
		}, 300 );
		return () => clearTimeout( timer );
	}, [ dispatch, filters.search, filters.status, filters.plan, filters.productId, page ] );

	// Filter options come from the rows currently loaded plus the stats
	// endpoint's plan census — so a plan with no row on this page is still
	// selectable.
	const productMap = new Map< number, string >();
	items.forEach( ( account ) => {
		if ( ! productMap.has( account.productId ) ) {
			productMap.set( account.productId, account.productName );
		}
	} );
	const productOptions = Array.from( productMap.entries() ).map( ( [ id, name ] ) => ( { id, name } ) );

	const planOptions = Array.from(
		new Set( [ ...stats.topPlans.map( ( row ) => row.plan ), ...items.map( ( account ) => account.plan ) ] )
	).filter( Boolean );

	const selectedAccount = useAppSelector( ( state ) => selectSaasAccountById( state, selectedId ) );

	// A row can leave the page under the panel (a filter change, a re-fetch
	// after suspending the last active account) — close rather than leave an
	// empty panel open.
	useEffect( () => {
		if ( null !== selectedId && null === selectedAccount && 'loading' !== loadStatus ) {
			setSelectedId( null );
		}
	}, [ selectedId, selectedAccount, loadStatus ] );

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center justify-between">
				<div>
					<h1 style={ { margin: 0, fontSize: '24px', fontWeight: 500, color: M3.onSurface } }>
						{ __( 'SaaS Accounts', 'purecart' ) }
					</h1>
					<p style={ { margin: '4px 0 0', fontSize: '13px', color: M3.onSurfaceVariant } }>
						{ __(
							'Tenants provisioned on purchase — plan, status, API key and the webhooks sent to your SaaS backend.',
							'purecart'
						) }
					</p>
				</div>
			</div>

			<SaasAccountsKpiStrip stats={ stats } />

			<SaasAccountsFilterBar
				search={ filters.search }
				onSearchChange={ ( v ) => dispatch( setSearch( v ) ) }
				filterStatus={ filters.status }
				onFilterStatusChange={ ( v ) => dispatch( setStatusFilter( v ) ) }
				filterPlan={ filters.plan }
				onFilterPlanChange={ ( v ) => dispatch( setPlanFilter( v ) ) }
				planOptions={ planOptions }
				filterProduct={
					'All' === filters.productId ? 'All' : productMap.get( filters.productId ) ?? 'All'
				}
				onFilterProductChange={ ( v ) => {
					const match = productOptions.find( ( p ) => p.name === v );
					dispatch( setProductIdFilter( match ? match.id : 'All' ) );
				} }
				productOptions={ productOptions }
				onClearAll={ () => dispatch( clearFilters() ) }
				onOpenSettings={ () => navigate( settingsTabPath( 'saas' ) ) }
			/>

			{ 'failed' === loadStatus && error && (
				<div
					className="px-4 py-3 rounded-xl text-sm"
					style={ { backgroundColor: M3.errorContainer, color: M3.error } }
				>
					{ error }
				</div>
			) }

			<SaasAccountsTable
				items={ items }
				loading={ 'loading' === loadStatus }
				currentPage={ page }
				totalPages={ totalPages }
				totalCount={ total }
				onPageChange={ ( p ) => dispatch( setPage( p ) ) }
				onViewDetail={ ( account ) => setSelectedId( account.id ) }
				rowActions={ rowActions }
			/>

			<SaasAccountDetailPanel
				account={ selectedAccount }
				onClose={ () => setSelectedId( null ) }
				actions={
					selectedAccount ? rowActions( selectedAccount, { includeViewDetail: false } ) : []
				}
			/>

			{ modals }
		</div>
	);
}

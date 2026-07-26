import { useState, useCallback } from 'react';
import { M3, INITIAL_MODULES } from './utils/static-data';
import type { Page, Module } from './utils/static-data';
import { Sidebar, TopBar } from './components/ui';
import { OverviewPage } from './components/Overview';
import {
	LicenseSummaryPage,
	LicensesPage,
	LicenseDetailPage,
} from './components/Licenses';
import { SubscriptionsPage } from './components/Subscriptions';
import {
	AnalyticsPage,
	SubscriptionAnalyticsPage,
	AffiliateAnalyticsPage,
	AbandonedCartAnalyticsPage,
} from './components/Analytics';
import { CustomerDetailPage } from './components/Customers';
import { DownloadsPage } from './components/Downloads';
import { UpdatesPage } from './components/Updates';
import { SaasDetailPage, SaasPage } from './components/Saas';
import { AffiliateDetailPage, AffiliatesPage } from './components/Affiliates';
import { AbandonedCartPage } from './components/AbandonedCart';
import { SecurityPage } from './components/Security';
import { SettingsPage } from './components/Settings';

// ─── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
	const [ page, setPage ] = useState< Page >( 'overview' );
	const [ collapsed, setCollapsed ] = useState( false );
	const [ prevPage, setPrevPage ] = useState< Page | null >( null );
	const [ modules, setModules ] = useState< Module[] >( INITIAL_MODULES );
	const [ saasDetailId, setSaasDetailId ] = useState< string >( 'SAAS-001' );
	const [ affiliateDetailId, setAffiliateDetailId ] =
		useState< string >( 'AFF-001' );

	const enabledModules = new Set(
		modules.filter( ( m ) => m.enabled ).map( ( m ) => m.name )
	);

	const navigate = useCallback(
		( p: Page ) => {
			setPrevPage( page );
			setPage( p );
		},
		[ page ]
	);

	const goBack = () => {
		if ( prevPage ) setPage( prevPage );
		else setPage( 'licenses' );
	};

	const toggleModule = ( name: string ) => {
		setModules( ( prev ) =>
			prev.map( ( m ) =>
				m.name === name ? { ...m, enabled: ! m.enabled } : m
			)
		);
	};

	return (
		<div
			className="flex h-screen overflow-hidden"
			style={ {
				backgroundColor: M3.surfaceContainerLow,
				fontFamily: 'Roboto, sans-serif',
			} }
		>
			<Sidebar
				activePage={ page }
				onNav={ navigate }
				collapsed={ collapsed }
				onToggle={ () => setCollapsed( ( c ) => ! c ) }
				enabledModules={ enabledModules }
			/>

			<div className="flex flex-col flex-1 min-w-0 overflow-hidden">
				<TopBar page={ page } onNav={ navigate } />

				<main
					className="flex-1 overflow-y-auto"
					style={ { padding: 24 } }
				>
					{ page === 'overview' && (
						<OverviewPage onNav={ navigate } />
					) }
					{ page === 'licenses' && (
						<LicensesPage
							onDetail={ () => navigate( 'license-detail' ) }
							onCustomer={ () => navigate( 'customer-detail' ) }
							onSummary={ () => navigate( 'license-summary' ) }
						/>
					) }
					{ page === 'license-summary' && (
						<LicenseSummaryPage
							onBack={ goBack }
							onViewAll={ () => navigate( 'licenses' ) }
						/>
					) }
					{ page === 'license-detail' && (
						<LicenseDetailPage onBack={ goBack } />
					) }
					{ page === 'customer-detail' && (
						<CustomerDetailPage
							onBack={ goBack }
							onLicenseDetail={ () =>
								navigate( 'license-detail' )
							}
						/>
					) }
					{ page === 'subscriptions' && <SubscriptionsPage /> }
					{ page === 'analytics' && (
						<AnalyticsPage
							onNav={ navigate }
							enabledModules={ enabledModules }
						/>
					) }
					{ page === 'analytics-subscriptions' && (
						<SubscriptionAnalyticsPage
							onBack={ () => navigate( 'analytics' ) }
						/>
					) }
					{ page === 'analytics-affiliates' && (
						<AffiliateAnalyticsPage
							onBack={ () => navigate( 'analytics' ) }
						/>
					) }
					{ page === 'analytics-abandoned-cart' && (
						<AbandonedCartAnalyticsPage
							onBack={ () => navigate( 'analytics' ) }
						/>
					) }
					{ page === 'downloads' && <DownloadsPage /> }
					{ page === 'updates' && <UpdatesPage /> }
					{ page === 'saas' && (
						<SaasPage
							onViewDetail={ ( id ) => {
								setSaasDetailId( id );
								navigate( 'saas-detail' );
							} }
						/>
					) }
					{ page === 'saas-detail' && (
						<SaasDetailPage
							accountId={ saasDetailId }
							onBack={ goBack }
						/>
					) }
					{ page === 'affiliates' && (
						<AffiliatesPage
							onViewDetail={ ( id ) => {
								setAffiliateDetailId( id );
								navigate( 'affiliate-detail' );
							} }
						/>
					) }
					{ page === 'affiliate-detail' && (
						<AffiliateDetailPage
							affiliateId={ affiliateDetailId }
							onBack={ goBack }
						/>
					) }
					{ page === 'abandoned-cart' && <AbandonedCartPage /> }
					{ page === 'settings' && (
						<SettingsPage
							modules={ modules }
							onToggleModule={ toggleModule }
						/>
					) }
					{ page === 'security' && <SecurityPage /> }
				</main>
			</div>
		</div>
	);
}

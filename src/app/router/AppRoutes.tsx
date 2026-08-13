import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { PAGE_PATHS } from './paths';

// Subscriptions (fully built)
import { SubscriptionsPage, SubscriptionAnalyticsPage } from '../components/Subscriptions';

// Overview
import { OverviewPage } from '../components/Overview/OverviewPage';

// Module stubs
import { LicensesPage }     from '../components/Licenses/LicensesPage';
import { DownloadsPage }    from '../components/Downloads/DownloadsPage';
import { UpdatesPage }      from '../components/Updates/UpdatesPage';
import { SaasAccountsPage } from '../components/SaasAccounts/SaasAccountsPage';
import { AffiliatesPage }   from '../components/Affiliates/AffiliatesPage';
import { AbandonedCartPage} from '../components/AbandonedCart/AbandonedCartPage';
import { SecurityPage }     from '../components/Security/SecurityPage';
import { AnalyticsPage }    from '../components/Analytics/AnalyticsPage';
import { SettingsPage }     from '../components/Settings/SettingsPage';

/**
 * Centralised route table for the PureCart admin SPA.
 *
 * Every admin menu entry maps to one route here. Stub pages display a
 * "Coming soon" card until the full module UI is implemented.
 *
 * @since 1.0.0
 */
export function AppRoutes() {
	const navigate = useNavigate();

	return (
		<Routes>
			{ /* Default redirect to Overview */ }
			<Route
				path="/"
				element={ <Navigate to={ PAGE_PATHS.overview } replace /> }
			/>

			{ /* Overview */ }
			<Route
				path={ PAGE_PATHS.overview }
				element={
					<OverviewPage
						onNav={ ( page ) => navigate( PAGE_PATHS[ page as keyof typeof PAGE_PATHS ] ?? PAGE_PATHS.overview ) }
					/>
				}
			/>

			{ /* Licenses */ }
			<Route path={ PAGE_PATHS.licenses }               element={ <LicensesPage /> } />

			{ /* Downloads */ }
			<Route path={ PAGE_PATHS.downloads }              element={ <DownloadsPage /> } />

			{ /* Updates */ }
			<Route path={ PAGE_PATHS.updates }                element={ <UpdatesPage /> } />

			{ /* Subscriptions */ }
			<Route path={ PAGE_PATHS.subscriptions }          element={ <SubscriptionsPage /> } />
			<Route
				path={ PAGE_PATHS[ 'subscription-analytics' ] }
				element={
					<SubscriptionAnalyticsPage
						onBack={ () => navigate( PAGE_PATHS.subscriptions ) }
					/>
				}
			/>

			{ /* SaaS Accounts */ }
			<Route path={ PAGE_PATHS[ 'saas-accounts' ] }    element={ <SaasAccountsPage /> } />

			{ /* Affiliates */ }
			<Route path={ PAGE_PATHS.affiliates }             element={ <AffiliatesPage /> } />

			{ /* Abandoned Cart */ }
			<Route path={ PAGE_PATHS[ 'abandoned-cart' ] }   element={ <AbandonedCartPage /> } />

			{ /* Security */ }
			<Route path={ PAGE_PATHS.security }               element={ <SecurityPage /> } />

			{ /* Analytics */ }
			<Route path={ PAGE_PATHS.analytics }              element={ <AnalyticsPage /> } />

			{ /* Settings */ }
			<Route path={ PAGE_PATHS.settings }               element={ <SettingsPage /> } />
		</Routes>
	);
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { SubscriptionsPage, SubscriptionDetailPage } from '../components/Subscriptions';
import { SubscriptionAnalyticsPage } from '../components/Analytics';
import { SettingsPage } from '../components/Settings';
import { PAGE_PATHS, SUBSCRIPTION_DETAIL_PATH } from './paths';

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

/**
 * All routes for the app.
 *
 * Kept here rather than inline in App.tsx so route definitions, and the
 * components they map to, live in one place. React Router v6 ranks static
 * path segments above dynamic ones, so `/subscriptions/analytics` always
 * matches its own route rather than being swallowed by `/subscriptions/:id`,
 * regardless of declaration order.
 */
export function AppRoutes() {
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
				path={ SUBSCRIPTION_DETAIL_PATH }
				element={ <SubscriptionDetailPage /> }
			/>
			<Route
				path={ PAGE_PATHS[ 'subscription-analytics' ] }
				element={ <SubscriptionAnalyticsPage /> }
			/>
			<Route
				path={ PAGE_PATHS.settings }
				element={ <SettingsPage /> }
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

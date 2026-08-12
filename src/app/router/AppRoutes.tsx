import { Routes, Route, Navigate } from 'react-router-dom';
import { SubscriptionsPage, SubscriptionDetailPage } from '../components/Subscriptions';
import { SubscriptionAnalyticsPage } from '../components/Analytics';
import { SettingsPage } from '../components/Settings';
import { PAGE_PATHS, SUBSCRIPTION_DETAIL_PATH } from './paths';

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
			<Route
				path="/"
				element={ <Navigate to={ PAGE_PATHS.subscriptions } replace /> }
			/>
			<Route
				path={ PAGE_PATHS.subscriptions }
				element={ <SubscriptionsPage /> }
			/>
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
		</Routes>
	);
}

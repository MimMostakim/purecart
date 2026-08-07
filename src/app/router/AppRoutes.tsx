import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
	SubscriptionsPage,
	SubscriptionAnalyticsPage,
} from '../components/Subscriptions';
import { PAGE_PATHS } from './paths';

/**
 * All routes for the Subscriptions module.
 *
 * Kept here rather than inline in App.tsx so route definitions, and the
 * components they map to, live in one place.
 */
export function AppRoutes() {
	const navigate = useNavigate();

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
				path={ PAGE_PATHS[ 'subscription-analytics' ] }
				element={
					<SubscriptionAnalyticsPage
						onBack={ () => navigate( PAGE_PATHS.subscriptions ) }
					/>
				}
			/>
		</Routes>
	);
}

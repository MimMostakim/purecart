import { useState } from 'react';
import { M3 } from './utils/static-data';
import type { Page } from './utils/static-data';
import { Sidebar, TopBar } from './components/ui';
import {
	SubscriptionsPage,
	SubscriptionAnalyticsPage,
} from './components/Subscriptions';

// ─── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
	const [ page, setPage ] = useState< Page >( 'subscriptions' );
	const [ collapsed, setCollapsed ] = useState( false );

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
				onNav={ setPage }
				collapsed={ collapsed }
				onToggle={ () => setCollapsed( ( c ) => ! c ) }
			/>

			<div className="flex flex-col flex-1 min-w-0 overflow-hidden">
				<TopBar page={ page } onNav={ setPage } />

				<main
					className="flex-1 overflow-y-auto"
					style={ { padding: 24 } }
				>
					{ page === 'subscriptions' && <SubscriptionsPage /> }
					{ page === 'subscription-analytics' && (
						<SubscriptionAnalyticsPage
							onBack={ () => setPage( 'subscriptions' ) }
						/>
					) }
				</main>
			</div>
		</div>
	);
}

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { M3 } from './utils/static-data';
import type { Page } from './utils/static-data';
import { Sidebar, TopBar } from './components/ui';
import { AppRoutes, PAGE_PATHS, getPageFromPath } from './router';

// ─── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
	const [ collapsed, setCollapsed ] = useState( false );
	const location = useLocation();
	const navigate = useNavigate();

	const page: Page = getPageFromPath( location.pathname );
	const goToPage = ( p: Page ) => navigate( PAGE_PATHS[ p ] );

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
				onNav={ goToPage }
				collapsed={ collapsed }
				onToggle={ () => setCollapsed( ( c ) => ! c ) }
			/>

			<div className="flex flex-col flex-1 min-w-0 overflow-hidden">
				<TopBar page={ page } onNav={ goToPage } />

				<main
					className="flex-1 overflow-y-auto"
					style={ { padding: 24 } }
				>
					<AppRoutes />
				</main>
			</div>
		</div>
	);
}

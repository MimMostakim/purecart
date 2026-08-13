import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { M3 } from './utils/static-data';
import type { Page } from './utils/static-data';
import { Sidebar, TopBar } from './components/ui';
import { AppRoutes, PAGE_PATHS, getPageFromPath } from './router';

// ─── WordPress global type declaration ─────────────────────────────────────────
declare global {
	interface Window {
		purecartAdmin?: {
			/** React page slug to navigate to on initial load, set by wp_localize_script. */
			currentPage?: string;
			nonce?: string;
			apiUrl?: string;
			restNonce?: string;
			version?: string;
		};
	}
}

// ─── Root App ──────────────────────────────────────────────────────────────────
/**
 * Root application shell.
 *
 * Renders the Sidebar + TopBar chrome around the page content and handles
 * initial navigation: on first mount it reads `window.purecartAdmin.currentPage`
 * (localized by WordPress via wp_localize_script) and pushes the matching
 * hash route so the SPA opens on the page the WordPress admin link points to.
 *
 * @since 1.0.0
 */
export default function App() {
	const [ collapsed, setCollapsed ] = useState( false );
	const location = useLocation();
	const navigate = useNavigate();

	/**
	 * On first render, navigate to the WordPress-specified page when the
	 * hash router is still at its initial "/" (i.e. no deep-link in the URL).
	 */
	useEffect( () => {
		if ( location.pathname !== '/' ) return;

		const wpPage = window.purecartAdmin?.currentPage as Page | undefined;
		if ( ! wpPage ) return;

		const path = PAGE_PATHS[ wpPage ];
		if ( path ) {
			navigate( path, { replace: true } );
		}
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const page: Page = getPageFromPath( location.pathname );
	const goToPage  = ( p: Page ) => navigate( PAGE_PATHS[ p ] );

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

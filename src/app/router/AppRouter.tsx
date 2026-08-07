import type { ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';

/**
 * Top-level router wrapper.
 *
 * Uses HashRouter (not BrowserRouter) because this SPA is mounted on a fixed
 * WP admin URL (admin.php?page=purecart-react-dashboard) that WordPress
 * owns — client-side routes live after the # so they never conflict with it
 * and deep links / refreshes keep working.
 */
export function AppRouter( { children }: { children: ReactNode } ) {
	return <HashRouter>{ children }</HashRouter>;
}

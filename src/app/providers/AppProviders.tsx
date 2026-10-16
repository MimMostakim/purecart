import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { AppRouter } from '../router';
import { ErrorBoundary } from '../ErrorBoundary';
import { EnabledModulesProvider } from '@/modules/settings';

interface AppProvidersProps {
	children: ReactNode;
}

/**
 * Composes the app-wide providers the admin SPA needs: an ErrorBoundary
 * around everything, the Redux store, and the router. `main.tsx` only
 * needs to know about this one component, not each provider individually.
 *
 * @since 1.1.0
 */
export function AppProviders({ children }: AppProvidersProps) {
	return (
		<ErrorBoundary>
			<Provider store={store}>
				<EnabledModulesProvider>
					<AppRouter>{children}</AppRouter>
				</EnabledModulesProvider>
			</Provider>
		</ErrorBoundary>
	);
}

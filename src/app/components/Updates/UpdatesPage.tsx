import { RefreshCcw } from 'lucide-react';
import { ComingSoon } from '../ui/ComingSoon';

/**
 * Auto-Update Manager module page (stub).
 *
 * Full spec: docs/RND-frontend-update-manager.md
 *
 * @since 1.0.0
 */
export function UpdatesPage() {
	return (
		<ComingSoon
			icon={ <RefreshCcw size={ 32 } /> }
			title="Update Manager"
			description="Distribute plugin and theme updates via WP admin-ajax, manage version channels (stable / beta / nightly), and track update adoption rates."
		/>
	);
}

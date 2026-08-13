import { Download } from 'lucide-react';
import { ComingSoon } from '../ui/ComingSoon';

/**
 * Secure Downloads module page (stub).
 *
 * Full spec: docs/RND-frontend-secure-downloads.md
 *
 * @since 1.0.0
 */
export function DownloadsPage() {
	return (
		<ComingSoon
			icon={ <Download size={ 32 } /> }
			title="Secure Downloads"
			description="Time-limited signed tokens, download logs, per-order access control, and delivery analytics. Full file streaming through PHP coming soon."
		/>
	);
}

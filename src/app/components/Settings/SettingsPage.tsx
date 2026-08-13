import { Settings as SettingsIcon } from 'lucide-react';
import { ComingSoon } from '../ui/ComingSoon';

/** @since 1.0.0 */
export function SettingsPage() {
	return (
		<ComingSoon
			icon={ <SettingsIcon size={ 32 } /> }
			title="Settings"
			description="Global plugin configuration: webhook URLs, download expiry, subscription roles, module toggles, and licence keys — full React settings UI coming soon."
		/>
	);
}

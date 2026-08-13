import { Shield } from 'lucide-react';
import { ComingSoon } from '../ui/ComingSoon';

/** @since 1.0.0 */
export function SecurityPage() {
	return (
		<ComingSoon
			icon={ <Shield size={ 32 } /> }
			title="Security"
			description="Download abuse detection, IP-based rate limiting, license fraud alerts, and audit logs for all sensitive admin actions — coming in a future release."
		/>
	);
}

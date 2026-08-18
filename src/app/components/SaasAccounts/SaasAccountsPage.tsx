import { Cloud } from 'lucide-react';
import { ComingSoon } from '../ui/ComingSoon';

/** @since 1.0.0 */
export function SaasAccountsPage() {
	return (
		<ComingSoon
			icon={ <Cloud size={ 32 } /> }
			title="SaaS Accounts"
			description="Provision SaaS tenants on purchase, manage plan tiers, send webhook events to your SaaS backend, and track account status in one place."
		/>
	);
}

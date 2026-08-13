import {
	Cloud
} from 'lucide-react';
import { ComingSoon } from '../ui';

/**
 * Main dashboard overview page.
 *
 * Displays KPI summary cards and quick-links to each PureCart module.
 * Data is static for now — will be replaced with REST API calls when the
 * Overview REST endpoint is implemented.
 *
 * @since 1.0.0
 */
export function OverviewPage( ) {

	return (
			<ComingSoon
				icon={ <Cloud size={ 32 } /> }
				title="SaaS Accounts"
				description="Provision SaaS tenants on purchase, manage plan tiers, send webhook events to your SaaS backend, and track account status in one place."
			/>
		);
}

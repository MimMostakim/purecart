import { BarChart2 } from 'lucide-react';
import { ComingSoon } from '../ui/ComingSoon';

/** @since 1.0.0 */
export function AnalyticsPage() {
	return (
		<ComingSoon
			icon={ <BarChart2 size={ 32 } /> }
			title="Analytics"
			description="Cross-module reporting: MRR, churn rate, download trends, license utilisation, and customer LTV — all in one unified dashboard coming soon."
		/>
	);
}

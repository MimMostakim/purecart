import { Users } from 'lucide-react';
import { ComingSoon } from '../ui/ComingSoon';

/** @since 1.0.0 */
export function AffiliatesPage() {
	return (
		<ComingSoon
			icon={ <Users size={ 32 } /> }
			title="Affiliates"
			description="Referral tracking, commission management, payout history, and affiliate performance dashboards — coming in a future release."
		/>
	);
}

import { ShoppingCart } from 'lucide-react';
import { ComingSoon } from '../ui/ComingSoon';

/** @since 1.0.0 */
export function AbandonedCartPage() {
	return (
		<ComingSoon
			icon={ <ShoppingCart size={ 32 } /> }
			title="Abandoned Cart"
			description="Recover lost revenue with automated follow-up emails, cart recovery links, and conversion funnel analytics — coming in a future release."
		/>
	);
}

/**
 * SubscriptionsKpiStrip component.
 *
 * Renders the 6-card KPI strip at the top of the subscriptions list page.
 * Always computed from the full (unfiltered) data set, so the numbers here
 * never change when the table below is filtered.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';
import { StatCard } from '../ui/StatCard';
import { computeMRR, isCancelledThisMonth, formatCurrency } from './utils';
import type { SubscriptionRecord } from './types';

/**
 * Renders 6 stat cards summarizing the full subscription data set.
 *
 * @since 1.0.0
 *
 * @param {Object}                 props      Component props.
 * @param {SubscriptionRecord[]}   props.data Full (unfiltered) subscription list.
 *
 * @return {JSX.Element} The KPI strip element.
 */
export function SubscriptionsKpiStrip( { data }: { data: SubscriptionRecord[] } ) {
	const cards = [
		{
			label: 'Active',
			value: String( data.filter( ( r ) => r.status === 'active' ).length ),
			color: M3.success,
		},
		{
			label: 'Paused',
			value: String( data.filter( ( r ) => r.status === 'paused' ).length ),
			color: M3.info,
		},
		{
			label: 'Past Due',
			value: String( data.filter( ( r ) => r.status === 'past_due' ).length ),
			color: M3.warning,
		},
		{
			label: 'Pending Cancel',
			value: String( data.filter( ( r ) => r.status === 'pending_cancel' ).length ),
			color: M3.warning,
		},
		{
			label: 'Cancelled This Month',
			value: String( data.filter( ( r ) => isCancelledThisMonth( r ) ).length ),
			color: M3.error,
		},
		{
			label: 'MRR',
			value: formatCurrency( computeMRR( data ) ),
			color: M3.primary,
		},
	];
	return (
		<div className="grid grid-cols-6 gap-4">
			{ cards.map( ( c ) => (
				<StatCard key={ c.label } label={ c.label } value={ c.value } color={ c.color } />
			) ) }
		</div>
	);
}

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
import { CheckCircle, PauseCircle, AlertCircle, Clock, XCircle, TrendingUp } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { KpiCard } from '@/shared/ui/KpiCard';
import { computeMRR, isCancelledThisMonth, formatCurrency } from '../utils';
import type { SubscriptionRecord } from '../types';

/**
 * Renders 6 stat cards summarizing the full subscription data set.
 *
 * @since 1.0.0
 *
 * @param {Object}               props      Component props.
 * @param {SubscriptionRecord[]} props.data Full (unfiltered) subscription list.
 *
 * @return {JSX.Element} The KPI strip element.
 */
export function SubscriptionsKpiStrip( { data }: { data: SubscriptionRecord[] } ) {
	const active          = data.filter( ( r ) => r.status === 'active' ).length;
	const paused          = data.filter( ( r ) => r.status === 'paused' ).length;
	const pastDue         = data.filter( ( r ) => r.status === 'past_due' ).length;
	const pendingCancel   = data.filter( ( r ) => r.status === 'pending_cancel' ).length;
	const cancelledMonth  = data.filter( ( r ) => isCancelledThisMonth( r ) ).length;
	const mrr             = computeMRR( data );

	return (
		<div className="grid grid-cols-6 gap-4">
			<KpiCard
				label={ __( 'Active', 'purecart' ) }
				value={ String( active ) }
				trend={ __( 'Active subscribers', 'purecart' ) }
				trendUp={ active > 0 }
				icon={ CheckCircle }
			/>
			<KpiCard
				label={ __( 'Paused', 'purecart' ) }
				value={ String( paused ) }
				trend={
					paused > 0
						? __( 'Access paused', 'purecart' )
						: __( 'None paused', 'purecart' )
				}
				trendUp={ 0 === paused }
				icon={ PauseCircle }
			/>
			<KpiCard
				label={ __( 'Past Due', 'purecart' ) }
				value={ String( pastDue ) }
				trend={
					pastDue > 0
						? __( 'Needs attention', 'purecart' )
						: __( 'All clear', 'purecart' )
				}
				trendUp={ 0 === pastDue }
				icon={ AlertCircle }
			/>
			<KpiCard
				label={ __( 'Pending Cancel', 'purecart' ) }
				value={ String( pendingCancel ) }
				trend={
					pendingCancel > 0
						? __( 'At risk', 'purecart' )
						: __( 'None at risk', 'purecart' )
				}
				trendUp={ 0 === pendingCancel }
				icon={ Clock }
			/>
			<KpiCard
				label={ __( 'Cancelled This Month', 'purecart' ) }
				value={ String( cancelledMonth ) }
				trend={
					cancelledMonth > 0
						? __( 'Lost this month', 'purecart' )
						: __( 'No churn', 'purecart' )
				}
				trendUp={ 0 === cancelledMonth }
				icon={ XCircle }
			/>
			<KpiCard
				label={ __( 'MRR', 'purecart' ) }
				value={ formatCurrency( mrr ) }
				trend={ __( 'Monthly recurring', 'purecart' ) }
				trendUp={ mrr > 0 }
				icon={ TrendingUp }
			/>
		</div>
	);
}

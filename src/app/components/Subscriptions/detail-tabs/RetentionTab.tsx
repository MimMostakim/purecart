/**
 * RetentionTab component.
 *
 * Shows the cancellation reason (if any), remaining retention discount, and
 * an "offer history" that's really just a filtered view of the same log
 * data Status History shows in full - no new component needed for that.
 *
 * @file
 * @since 1.0.0
 */
import { M3, CANCELLATION_REASONS } from '../../../utils/static-data';
import { Card } from '../../ui/Card';
import { SubscriptionTimeline } from '../shared';
import type { SubscriptionRecord, SubscriptionLogEntry } from '../../../utils/subscription-types';

interface RetentionTabProps {
	row: SubscriptionRecord;
	events: SubscriptionLogEntry[];
}

/**
 * Renders the Detail page's Retention tab.
 *
 * @since 1.0.0
 *
 * @param {RetentionTabProps} props Component props.
 *
 * @return {JSX.Element} The retention tab content.
 */
export function RetentionTab( { row, events }: RetentionTabProps ) {
	const hasCancellation = row.status === 'cancelled' || row.status === 'pending_cancel';
	const reason = CANCELLATION_REASONS.find( ( r ) => r.id === row.cancellationReasonId );
	const offerEvents = events.filter(
		( e ) => e.event.startsWith( 'retention_' ) || e.event === 'cancellation_requested'
	);

	if ( ! hasCancellation ) {
		return (
			<Card className="p-5">
				<div className="text-sm" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
					No cancellation on record.
				</div>
			</Card>
		);
	}

	return (
		<Card className="p-5 flex flex-col gap-4">
			<div>
				<div className="text-xs font-medium mb-1" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }>
					Cancellation Reason
				</div>
				<div className="text-sm" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
					{ reason?.label ?? 'Not recorded' }
				</div>
			</div>
			<div>
				<div className="text-xs font-medium mb-1" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }>
					Retention Discount Remaining
				</div>
				<div className="text-sm" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
					{ row.retentionDiscountRemaining } cycle{ row.retentionDiscountRemaining !== 1 ? 's' : '' }
				</div>
			</div>
			<div>
				<div className="text-xs font-medium mb-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }>
					Offer History
				</div>
				<SubscriptionTimeline events={ offerEvents } />
			</div>
		</Card>
	);
}

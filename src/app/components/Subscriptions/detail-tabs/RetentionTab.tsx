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
import type { SubscriptionRecord, SubscriptionLogEntry } from '../types';

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
export function RetentionTab( { row, events = [] }: RetentionTabProps ) {
	const offerEvents = ( events || [] ).filter( ( e ) => {
		const ev = ( e.event || '' ).toLowerCase();
		const note = ( e.note || '' ).toLowerCase();
		return (
			ev.startsWith( 'retention_' ) ||
			ev.includes( 'cancel' ) ||
			ev.includes( 'resubscribe' ) ||
			ev.includes( 'discount' ) ||
			ev.includes( 'offer' ) ||
			ev === 'skipped' ||
			note.includes( 'reason=' ) ||
			note.includes( 'offer=' ) ||
			note.includes( 'discount' ) ||
			note.includes( 'cancel' )
		);
	} );

	const matchedReason = CANCELLATION_REASONS.find( ( r ) => r.id === row.cancellationReasonId );
	let reasonLabel = matchedReason?.label;
	if ( ! reasonLabel && row.cancellationReasonId ) {
		reasonLabel = row.cancellationReasonId
			.replace( /[_-]/g, ' ' )
			.replace( /\b\w/g, ( c ) => c.toUpperCase() );
	}
	if ( ! reasonLabel && offerEvents.length > 0 ) {
		for ( const ev of offerEvents ) {
			if ( ev.note && ev.note.includes( 'reason=' ) ) {
				const match = ev.note.match( /reason=([^,;]+)/ );
				if ( match && match[ 1 ] ) {
					const reasonId = match[ 1 ].trim();
					const found = CANCELLATION_REASONS.find( ( r ) => r.id === reasonId );
					reasonLabel = found?.label ?? reasonId.replace( /[_-]/g, ' ' ).replace( /\b\w/g, ( c ) => c.toUpperCase() );
					break;
				}
			}
		}
	}

	const hasActiveDiscount = Boolean( ( row.retentionDiscountRemaining ?? 0 ) > 0 || ( row.discountPercent ?? 0 ) > 0 );
	const hasCancellationHistory = Boolean(
		row.status === 'cancelled' ||
		row.status === 'pending_cancel' ||
		row.cancellationDate ||
		row.cancellationReasonId ||
		hasActiveDiscount ||
		offerEvents.length > 0
	);

	if ( ! hasCancellationHistory ) {
		return (
			<Card className="p-5">
				<div className="text-sm font-semibold mb-2" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
					Retention & Cancellation
				</div>
				<div className="text-sm" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
					No cancellation or retention activity recorded for this subscription yet.
				</div>
			</Card>
		);
	}

	return (
		<Card className="p-5 flex flex-col gap-5">
			<div className="text-sm font-semibold" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
				Retention & Cancellation
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<div className="text-xs font-medium mb-1" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }>
						Cancellation Reason
					</div>
					<div className="text-sm font-medium" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						{ reasonLabel ?? 'Not recorded' }
					</div>
				</div>

				<div>
					<div className="text-xs font-medium mb-1" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }>
						Retention Discount
					</div>
					<div className="text-sm" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						{ hasActiveDiscount ? (
							<span
								className="text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1"
								style={ { backgroundColor: '#DCFCE7', color: '#15803D' } }
							>
								🏷️ { row.discountPercent }% off · { row.retentionDiscountRemaining } renewal{ row.retentionDiscountRemaining !== 1 ? 's' : '' } remaining
							</span>
						) : (
							<span style={ { color: M3.onSurfaceVariant } }>None active</span>
						) }
					</div>
				</div>

				{ row.cancellationDate && (
					<div>
						<div className="text-xs font-medium mb-1" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }>
							Cancellation Date
						</div>
						<div className="text-sm" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
							{ row.cancellationDate }
						</div>
					</div>
				) }
			</div>

			<div className="pt-2" style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }>
				<div className="text-xs font-medium mb-3" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }>
					Offer & Retention History
				</div>
				{ offerEvents.length > 0 ? (
					<SubscriptionTimeline events={ offerEvents } />
				) : (
					<div className="text-sm" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						No retention offer events recorded.
					</div>
				) }
			</div>
		</Card>
	);
}

/**
 * StatusHistoryTab component.
 *
 * Thin wrapper around SubscriptionTimeline - sorts events newest-first and
 * renders them. Most sample rows have no log data yet, so the empty state
 * (handled inside SubscriptionTimeline) is the common case in the demo data.
 *
 * @file
 * @since 1.0.0
 */
import { Card } from '../../ui/Card';
import { M3 } from '../../../utils/static-data';
import { SubscriptionTimeline } from '../shared';
import type { SubscriptionLogEntry } from '../types';

interface StatusHistoryTabProps {
	events: SubscriptionLogEntry[];
}

/**
 * Renders the Detail page's Status History tab.
 *
 * @since 1.0.0
 *
 * @param {StatusHistoryTabProps} props Component props.
 *
 * @return {JSX.Element} The status history tab content.
 */
export function StatusHistoryTab( { events = [] }: StatusHistoryTabProps ) {
	const sorted = [ ...( events || [] ) ].sort( ( a, b ) => {
		const dateA = a?.createdAt ?? ( a as any )?.created_at ?? '';
		const dateB = b?.createdAt ?? ( b as any )?.created_at ?? '';
		return dateB.localeCompare( dateA );
	} );
	return (
		<Card className="p-5">
			<div className="text-sm font-semibold mb-4" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
				Status History
			</div>
			<SubscriptionTimeline events={ sorted } />
		</Card>
	);
}

/**
 * SubscriptionTimeline component.
 *
 * Renders a vertical feed of subscription log entries (status changes,
 * payment events, retention actions). Used by the Detail page's Status
 * History tab and, filtered to a subset, its Retention tab. Renders events
 * in the order given - sorting is the caller's responsibility.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';
import type { SubscriptionLogEntry } from '../types';

const ACTOR_COLOR: Record< SubscriptionLogEntry[ 'actorType' ], string > = {
	system: M3.onSurfaceVariant,
	customer: M3.info,
	admin: M3.primary,
	webhook: M3.secondary,
};

/**
 * Builds a human-readable one-line description for a log entry.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionLogEntry} entry Log entry to describe.
 *
 * @return {string} A one-line description.
 */
function describe( entry: SubscriptionLogEntry ): string {
	if ( entry.oldStatus && entry.newStatus ) {
		return `Status changed: ${ entry.oldStatus } → ${ entry.newStatus }`;
	}
	if ( entry.note ) return entry.note;
	return entry.event.replace( /_/g, ' ' );
}

/**
 * Renders a vertical timeline of subscription log entries.
 *
 * @since 1.0.0
 *
 * @param {Object}                 props        Component props.
 * @param {SubscriptionLogEntry[]} props.events Log entries to render, in the order given.
 *
 * @return {JSX.Element} The timeline element, or an empty-state message when there are no events.
 */
export function SubscriptionTimeline( { events }: { events: SubscriptionLogEntry[] } ) {
	if ( events.length === 0 ) {
		return (
			<div
				className="text-sm py-6 text-center"
				style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
			>
				No events recorded yet.
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-3">
			{ events.map( ( entry ) => (
				<div key={ entry.id } className="flex items-start gap-3">
					<span
						className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
						style={ { backgroundColor: ACTOR_COLOR[ entry.actorType ] } }
					/>
					<div className="flex-1 min-w-0">
						<div
							className="text-sm"
							style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }
						>
							{ describe( entry ) }
						</div>
						<div
							className="text-xs mt-0.5"
							style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
						>
							{ entry.actorLabel ?? entry.actorType } · { entry.createdAt }
						</div>
					</div>
					{ entry.amount !== null && (
						<div
							className="text-sm font-medium flex-shrink-0"
							style={ { color: M3.onSurface, fontFamily: 'Roboto Mono, monospace' } }
						>
							${ entry.amount.toFixed( 2 ) }
						</div>
					) }
				</div>
			) ) }
		</div>
	);
}

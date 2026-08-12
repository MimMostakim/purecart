/**
 * RevenueGoalsWidget component.
 *
 * Read-only grid of RevenueGoalCards for the Analytics page — no add/delete
 * controls here (renders RevenueGoalCard without onDelete). Full goal
 * management lives in Settings' Revenue Goals section instead, so there's
 * exactly one place goals get created/edited/deleted.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';
import { RevenueGoalCard } from '../Subscriptions/shared';
import type { RevenueGoal } from '../../utils/subscription-types';

interface RevenueGoalsWidgetProps {
	goals: RevenueGoal[];
}

/**
 * Renders the read-only Revenue Goals widget.
 *
 * @since 1.0.0
 *
 * @param {RevenueGoalsWidgetProps} props Component props.
 *
 * @return {JSX.Element} The revenue goals widget.
 */
export function RevenueGoalsWidget( { goals }: RevenueGoalsWidgetProps ) {
	return (
		<div>
			<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
				Revenue Goals
			</div>
			<div className="grid grid-cols-2 gap-4">
				{ goals.map( ( g ) => (
					<RevenueGoalCard key={ g.id } goal={ g } />
				) ) }
			</div>
		</div>
	);
}

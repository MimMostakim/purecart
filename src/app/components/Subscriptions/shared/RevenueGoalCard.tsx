/**
 * RevenueGoalCard component.
 *
 * Renders one revenue goal: label, type badge, progress bar, and status
 * chip. The delete button only renders when onDelete is passed - the
 * Analytics page's read-only placement omits it, Settings' management
 * placement passes it.
 *
 * @file
 * @since 1.0.0
 */
import { Trash2 } from 'lucide-react';
import { M3 } from '../../../utils/static-data';
import { Card } from '../../ui/Card';
import { IconButton } from '../../ui/IconButton';
import type { RevenueGoal } from '../types';

const TYPE_LABEL: Record< RevenueGoal[ 'type' ], string > = {
	mrr: 'MRR',
	arr: 'ARR',
	total_revenue: 'Total Revenue',
};

const STATUS_COLORS: Record< RevenueGoal[ 'status' ], { bg: string; fg: string } > = {
	on_track: { bg: M3.successContainer, fg: M3.success },
	at_risk: { bg: M3.warningContainer, fg: M3.warning },
	exceeded: { bg: M3.infoContainer, fg: M3.info },
};

const STATUS_LABEL: Record< RevenueGoal[ 'status' ], string > = {
	on_track: 'On Track',
	at_risk: 'At Risk',
	exceeded: 'Exceeded',
};

/**
 * Renders a revenue goal progress card.
 *
 * @since 1.0.0
 *
 * @param {Object}      props           Component props.
 * @param {RevenueGoal} props.goal      Goal to render.
 * @param {Function}    [props.onDelete] When provided, renders a delete icon button.
 *
 * @return {JSX.Element} The revenue goal card.
 */
export function RevenueGoalCard( {
	goal,
	onDelete,
}: {
	goal: RevenueGoal;
	onDelete?: () => void;
} ) {
	const pct = goal.target > 0 ? Math.min( 100, Math.round( ( goal.current / goal.target ) * 100 ) ) : 0;
	const statusColors = STATUS_COLORS[ goal.status ];
	return (
		<Card className="p-4">
			<div className="flex items-center justify-between mb-2">
				<div
					className="text-sm font-medium"
					style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }
				>
					{ goal.label }
				</div>
				<span
					className="text-xs px-2 py-0.5 rounded-full"
					style={ {
						backgroundColor: statusColors.bg,
						color: statusColors.fg,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ STATUS_LABEL[ goal.status ] }
				</span>
			</div>
			<div
				className="text-xs mb-1"
				style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
			>
				{ TYPE_LABEL[ goal.type ] } · { goal.period }
			</div>
			<div
				className="w-full h-2 rounded-full mb-2"
				style={ { backgroundColor: M3.surfaceContainerHigh } }
			>
				<div
					className="h-2 rounded-full"
					style={ { width: `${ pct }%`, backgroundColor: M3.primary } }
				/>
			</div>
			<div className="flex items-center justify-between">
				<span
					className="text-xs"
					style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
				>
					${ goal.current.toLocaleString() } of ${ goal.target.toLocaleString() } ({ pct }%)
				</span>
				{ onDelete && <IconButton icon={ Trash2 } onClick={ onDelete } title="Delete goal" /> }
			</div>
		</Card>
	);
}

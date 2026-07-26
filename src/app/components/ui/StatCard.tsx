import { M3 } from '../../utils/static-data';
import { Card } from './Card';
import { ActionDropdown } from './ActionDropdown';
import type { ActionItem } from './ActionDropdown';
import { TrendChip } from './TrendChip';

export function StatCard( {
	icon: Icon,
	label,
	value,
	trend,
	trendUp,
	warning = false,
	actions = [],
}: {
	icon: React.ElementType;
	label: string;
	value: string;
	trend: string;
	trendUp: boolean;
	warning?: boolean;
	actions?: ActionItem[];
} ) {
	return (
		<Card
			className="p-5 flex flex-col gap-3 cursor-default group"
			style={ {
				borderLeft: warning ? `4px solid ${ M3.warning }` : 'none',
				transition: 'box-shadow 0.15s',
				overflow: 'visible',
			} }
		>
			<div className="flex items-start justify-between">
				<div
					className="flex items-center justify-center w-10 h-10 rounded-xl"
					style={ {
						backgroundColor: warning
							? M3.warningContainer
							: M3.primaryContainer,
					} }
				>
					<Icon
						size={ 20 }
						color={ warning ? M3.warning : M3.primary }
					/>
				</div>
				<div className="opacity-0 group-hover:opacity-100 transition-opacity">
					<ActionDropdown actions={ actions } />
				</div>
			</div>
			<div>
				<div
					className="font-light"
					style={ {
						fontSize: 36,
						color: M3.onSurface,
						fontFamily: 'Roboto, sans-serif',
						lineHeight: 1.1,
					} }
				>
					{ value }
				</div>
				<div
					className="text-sm mt-0.5"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ label }
				</div>
			</div>
			<TrendChip value={ trend } isPositive={ trendUp } />
		</Card>
	);
}

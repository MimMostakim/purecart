/**
 * StatCard UI component.
 *
 * Renders a large statistic card with an icon, numeric value, descriptive label,
 * trend chip, and an optional hover-revealed action dropdown. Supports a warning
 * variant that adds a colored left border.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';
import { Card } from './Card';
import { ActionDropdown } from './ActionDropdown';
import type { ActionItem } from './ActionDropdown';
import { TrendChip } from './TrendChip';

/**
 * Renders a statistic card with icon, value, label, trend chip, and optional actions.
 *
 * The action dropdown is hidden by default and revealed on card hover. When
 * warning is true, the card renders with a warning-colored left border and icon.
 *
 * @since 1.0.0
 *
 * @param {Object}           props             Component props.
 * @param {React.ElementType} props.icon       Lucide icon component rendered in the card header.
 * @param {string}           props.label       Descriptive label displayed below the value.
 * @param {string}           props.value       Formatted metric value displayed prominently.
 * @param {string}           props.trend       Trend string shown in the trend chip.
 * @param {boolean}          props.trendUp     Determines positive or negative trend chip styling.
 * @param {boolean}          [props.warning]   Applies warning color accent to the card when true.
 * @param {ActionItem[]}     [props.actions]   List of action items shown in the hover dropdown.
 *
 * @return {JSX.Element} A styled statistic card element.
 */
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

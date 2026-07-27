/**
 * KpiCard UI component.
 *
 * Renders a key performance indicator card displaying a metric label, large
 * value, icon, and a trend chip indicating direction of change.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';
import { Card } from './Card';
import { TrendChip } from './TrendChip';

/**
 * Renders a KPI summary card with icon, value, label, and trend indicator.
 *
 * @since 1.0.0
 *
 * @param {Object}           props          Component props.
 * @param {string}           props.label    Short descriptive label for the metric.
 * @param {string}           props.value    Formatted metric value to display prominently.
 * @param {string}           props.trend    Trend percentage or delta string shown in the chip.
 * @param {boolean}          props.trendUp  Determines whether the trend chip uses positive styling.
 * @param {React.ElementType} props.icon    Lucide icon component rendered in the card header.
 *
 * @return {JSX.Element} A card element containing the KPI metric display.
 */
export function KpiCard( {
	label,
	value,
	trend,
	trendUp,
	icon: Icon,
}: {
	label: string;
	value: string;
	trend: string;
	trendUp: boolean;
	icon: React.ElementType;
} ) {
	return (
		<Card className="p-4">
			<div className="flex items-start justify-between mb-2">
				<div
					className="text-xs font-medium"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
						textTransform: 'uppercase',
						letterSpacing: '0.5px',
					} }
				>
					{ label }
				</div>
				<div
					className="w-7 h-7 rounded-lg flex items-center justify-center"
					style={ { backgroundColor: M3.primaryContainer } }
				>
					<Icon size={ 14 } color={ M3.primary } />
				</div>
			</div>
			<div
				className="text-3xl font-light mb-2"
				style={ {
					color: M3.onSurface,
					fontFamily: 'Roboto, sans-serif',
				} }
			>
				{ value }
			</div>
			<TrendChip value={ trend } isPositive={ trendUp } />
		</Card>
	);
}

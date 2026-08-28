/**
 * StatCard UI component.
 *
 * Renders a lightweight metric card: a colored accent bar, a large value,
 * and a label - no icon or trend chip. Smaller sibling of KpiCard, intended
 * for dense strips with many cards (e.g. a 6-card subscription KPI row)
 * where KpiCard's icon/trend chrome would be too heavy.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';
import { Card } from './Card';

/**
 * Renders a compact stat card with an accent bar, value, and label.
 *
 * @since 1.0.0
 *
 * @param {Object} props        Component props.
 * @param {string} props.label  Short descriptive label shown under the value.
 * @param {string} props.value  Formatted metric value displayed prominently.
 * @param {string} [props.color] M3 token for the accent bar color, defaults to M3.primary.
 * @param {string} [props.bg]    Reserved for a future background variant - unused today.
 *
 * @return {JSX.Element} A card element containing the stat display.
 */
export function StatCard( {
	label,
	value,
	color = M3.primary,
}: {
	label: string;
	value: string;
	color?: string;
	bg?: string;
} ) {
	return (
		<Card className="p-4 flex items-center gap-3">
			<div
				className="w-2.5 h-10 rounded-full flex-shrink-0"
				style={ { backgroundColor: color } }
			/>
			<div>
				<div
					className="text-2xl font-light"
					style={ {
						color: M3.onSurface,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ value }
				</div>
				<div
					className="text-xs"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ label }
				</div>
			</div>
		</Card>
	);
}

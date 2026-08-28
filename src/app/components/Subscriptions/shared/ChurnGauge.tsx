/**
 * ChurnGauge component.
 *
 * Bigger visual sibling of ChurnScoreBadge for the Subscription Detail page's
 * Overview tab. Renders the same 4 churn zones as a horizontal segmented
 * bar rather than a semicircular arc - no SVG arc math needed.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';
import {
	getChurnZone,
	CHURN_ZONE_COLORS,
	CHURN_ZONE_LABELS,
	type ChurnZone,
} from './ChurnScoreBadge';

const ZONE_ORDER: ChurnZone[] = [ 'low', 'medium', 'high', 'critical' ];

/**
 * Renders a 4-segment churn risk gauge with the active zone highlighted.
 *
 * @since 1.0.0
 *
 * @param {Object} props       Component props.
 * @param {number} props.score Churn risk score, 0-100.
 *
 * @return {JSX.Element} The churn gauge element.
 */
export function ChurnGauge( { score }: { score: number } ) {
	const activeZone = getChurnZone( score );
	return (
		<div>
			<div
				className="flex items-baseline gap-2 mb-2"
				style={ { fontFamily: 'Roboto, sans-serif' } }
			>
				<span
					className="text-2xl font-light"
					style={ { color: M3.onSurface } }
				>
					{ score }
				</span>
				<span
					className="text-sm"
					style={ { color: CHURN_ZONE_COLORS[ activeZone ].fg } }
				>
					{ CHURN_ZONE_LABELS[ activeZone ] }
				</span>
			</div>
			<div className="flex gap-1">
				{ ZONE_ORDER.map( ( zone ) => (
					<div
						key={ zone }
						className="flex-1 h-2 rounded-full"
						style={ {
							backgroundColor: CHURN_ZONE_COLORS[ zone ].fg,
							opacity: zone === activeZone ? 1 : 0.25,
						} }
					/>
				) ) }
			</div>
			<div
				className="flex justify-between text-xs mt-1"
				style={ {
					color: M3.onSurfaceVariant,
					fontFamily: 'Roboto, sans-serif',
				} }
			>
				<span>0-25</span>
				<span>26-50</span>
				<span>51-75</span>
				<span>76-100</span>
			</div>
		</div>
	);
}

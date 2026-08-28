/**
 * ChurnScoreBadge component + the shared churn-zone classification helper.
 *
 * The zone boundaries (0-25 Low / 26-50 Medium / 51-75 High / 76-100
 * Critical) match the backend ChurnScorer bands exactly. getChurnZone() and
 * CHURN_ZONE_COLORS are exported so ChurnGauge and the list page's Churn
 * Risk filter reuse the exact same boundaries instead of re-deriving them.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';

export type ChurnZone = 'low' | 'medium' | 'high' | 'critical';

/**
 * Classifies a 0-100 churn risk score into one of 4 bands.
 *
 * @since 1.0.0
 *
 * @param {number} score Churn risk score, 0-100.
 *
 * @return {ChurnZone} The matching band.
 */
export function getChurnZone( score: number ): ChurnZone {
	if ( score <= 25 ) return 'low';
	if ( score <= 50 ) return 'medium';
	if ( score <= 75 ) return 'high';
	return 'critical';
}

/** M3 (bg, fg) color pair per zone. 'high' uses a custom orange - M3 has no orange token. */
export const CHURN_ZONE_COLORS: Record< ChurnZone, { bg: string; fg: string } > = {
	low: { bg: M3.successContainer, fg: M3.success },
	medium: { bg: M3.warningContainer, fg: M3.warning },
	high: { bg: '#FFE0CC', fg: '#7D3200' },
	critical: { bg: '#FFDAD6', fg: M3.error },
};

export const CHURN_ZONE_LABELS: Record< ChurnZone, string > = {
	low: 'Low',
	medium: 'Medium',
	high: 'High',
	critical: 'Critical',
};

/**
 * Renders a small colored pill showing a churn risk score.
 *
 * @since 1.0.0
 *
 * @param {Object} props       Component props.
 * @param {number} props.score Churn risk score, 0-100.
 *
 * @return {JSX.Element} The churn score pill.
 */
export function ChurnScoreBadge( { score }: { score: number } ) {
	const colors = CHURN_ZONE_COLORS[ getChurnZone( score ) ];
	return (
		<span
			className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
			style={ {
				backgroundColor: colors.bg,
				color: colors.fg,
				fontFamily: 'Roboto Mono, monospace',
			} }
		>
			{ score }
		</span>
	);
}

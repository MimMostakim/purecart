/**
 * TrendChip UI component.
 *
 * Renders a small colored pill badge displaying a trend value with a
 * directional arrow icon. Uses green for positive trends and red for
 * negative trends.
 *
 * @file
 * @since 1.0.0
 */
import { TrendingUp, TrendingDown } from 'lucide-react';
import { M3 } from '../../utils/static-data';

/**
 * Renders a trend indicator chip with a directional icon and value string.
 *
 * @since 1.0.0
 *
 * @param {Object}  props            Component props.
 * @param {string}  props.value      Formatted trend string to display (e.g., '+12%').
 * @param {boolean} props.isPositive Renders green with an up arrow when true, red with a down arrow when false.
 *
 * @return {JSX.Element} A colored pill span containing the trend icon and value.
 */
export function TrendChip( {
	value,
	isPositive,
}: {
	value: string;
	isPositive: boolean;
} ) {
	return (
		<span
			className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
			style={ {
				backgroundColor: isPositive ? '#C2E7A0' : '#FFDAD6',
				color: isPositive ? M3.success : M3.error,
			} }
		>
			{ isPositive ? (
				<TrendingUp size={ 11 } />
			) : (
				<TrendingDown size={ 11 } />
			) }
			{ value }
		</span>
	);
}

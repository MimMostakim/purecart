/**
 * Card UI component.
 *
 * Provides a Material Design 3 surface container with rounded corners and
 * a subtle drop shadow. Accepts arbitrary children and optional style overrides.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a rounded surface card with M3 elevation shadow.
 *
 * @since 1.0.0
 *
 * @param {Object}              props            Component props.
 * @param {React.ReactNode}     props.children   Content rendered inside the card.
 * @param {string}              [props.className] Additional Tailwind utility classes.
 * @param {React.CSSProperties} [props.style]    Inline style overrides merged with card defaults.
 *
 * @return {JSX.Element} A styled div container acting as an M3 card surface.
 */
export function Card( {
	children,
	className = '',
	style = {},
}: {
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
} ) {
	return (
		<div
			className={ `rounded-xl ${ className }` }
			style={ {
				backgroundColor: M3.surface,
				boxShadow:
					'0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
				...style,
			} }
		>
			{ children }
		</div>
	);
}

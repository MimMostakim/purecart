/**
 * TonalButton UI component.
 *
 * Renders a Material Design 3 filled tonal button using the secondary
 * container color. Intended for medium-emphasis actions that sit below
 * a primary filled button in visual hierarchy.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a pill-shaped filled tonal button following M3 tonal button specs.
 *
 * @since 1.0.0
 *
 * @param {Object}          props           Component props.
 * @param {React.ReactNode} props.children  Button label or inner content.
 * @param {Function}        [props.onClick] Click handler callback.
 * @param {boolean}         [props.small]   Renders a compact size variant when true.
 *
 * @return {JSX.Element} A styled tonal button element.
 */
export function TonalButton( {
	children,
	onClick,
	small = false,
}: {
	children: React.ReactNode;
	onClick?: () => void;
	small?: boolean;
} ) {
	return (
		<button
			onClick={ onClick }
			className="inline-flex items-center gap-1.5 rounded-full font-medium transition-all"
			style={ {
				backgroundColor: M3.secondaryContainer,
				color: M3.onSecondaryContainer,
				padding: small ? '6px 16px' : '10px 24px',
				fontSize: small ? '13px' : '14px',
				fontFamily: 'Roboto, sans-serif',
				letterSpacing: '0.1px',
				border: 'none',
				cursor: 'pointer',
			} }
			onMouseEnter={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.opacity = '0.88';
			} }
			onMouseLeave={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.opacity = '1';
			} }
		>
			{ children }
		</button>
	);
}

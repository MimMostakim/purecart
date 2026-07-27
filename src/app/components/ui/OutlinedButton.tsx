/**
 * OutlinedButton UI component.
 *
 * Renders a Material Design 3 outlined button with a transparent background
 * and a colored border. Supports primary and danger color variants and a
 * compact small size mode.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a pill-shaped outlined button following M3 outlined button specs.
 *
 * @since 1.0.0
 *
 * @param {Object}          props           Component props.
 * @param {React.ReactNode} props.children  Button label or inner content.
 * @param {Function}        [props.onClick] Click handler callback.
 * @param {boolean}         [props.danger]  Applies error color border and text when true.
 * @param {boolean}         [props.small]   Renders a compact size variant when true.
 *
 * @return {JSX.Element} A styled outlined button element.
 */
export function OutlinedButton( {
	children,
	onClick,
	danger = false,
	small = false,
}: {
	children: React.ReactNode;
	onClick?: () => void;
	danger?: boolean;
	small?: boolean;
} ) {
	return (
		<button
			onClick={ onClick }
			className="inline-flex items-center gap-1.5 rounded-full font-medium transition-all"
			style={ {
				backgroundColor: 'transparent',
				color: danger ? M3.error : M3.primary,
				padding: small ? '5px 16px' : '9px 24px',
				fontSize: small ? '13px' : '14px',
				fontFamily: 'Roboto, sans-serif',
				letterSpacing: '0.1px',
				border: `1px solid ${ danger ? M3.error : M3.outline }`,
				cursor: 'pointer',
			} }
			onMouseEnter={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					danger ? '#FFDAD6' : M3.primaryContainer;
			} }
			onMouseLeave={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					'transparent';
			} }
		>
			{ children }
		</button>
	);
}

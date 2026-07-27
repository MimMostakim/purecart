/**
 * TextButton UI component.
 *
 * Renders a Material Design 3 text button with no background or border.
 * Supports primary and danger color variants and a compact small size mode.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a borderless pill-shaped text button following M3 text button specs.
 *
 * @since 1.0.0
 *
 * @param {Object}          props           Component props.
 * @param {React.ReactNode} props.children  Button label or inner content.
 * @param {Function}        [props.onClick] Click handler callback.
 * @param {boolean}         [props.danger]  Applies error color text when true.
 * @param {boolean}         [props.small]   Renders a compact size variant when true.
 *
 * @return {JSX.Element} A styled text button element.
 */
export function TextButton( {
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
			className="inline-flex items-center gap-1 rounded-full font-medium transition-all"
			style={ {
				backgroundColor: 'transparent',
				color: danger ? M3.error : M3.primary,
				fontSize: small ? '12px' : '13px',
				fontFamily: 'Roboto, sans-serif',
				letterSpacing: '0.1px',
				border: 'none',
				cursor: 'pointer',
				padding: small ? '4px 10px' : '6px 12px',
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

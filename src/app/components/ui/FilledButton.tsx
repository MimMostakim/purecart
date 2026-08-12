/**
 * FilledButton UI component.
 *
 * Renders a Material Design 3 filled button with primary or error color variants.
 * Supports standard and small size modes.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a full-background pill-shaped button following M3 filled button specs.
 *
 * @since 1.0.0
 *
 * @param {Object}          props           Component props.
 * @param {React.ReactNode} props.children  Button label or inner content.
 * @param {Function}        [props.onClick] Click handler callback.
 * @param {boolean}         [props.danger]  Renders the button with error color when true.
 * @param {boolean}         [props.small]   Renders a compact size variant when true.
 * @param {boolean}         [props.disabled] Disables interaction and dims the button when true.
 *
 * @return {JSX.Element} A styled filled button element.
 */
export function FilledButton( {
	children,
	onClick,
	danger = false,
	small = false,
	disabled = false,
}: {
	children: React.ReactNode;
	onClick?: () => void;
	danger?: boolean;
	small?: boolean;
	disabled?: boolean;
} ) {
	return (
		<button
			onClick={ onClick }
			disabled={ disabled }
			className="inline-flex items-center gap-1.5 rounded-full font-medium transition-all"
			style={ {
				backgroundColor: danger ? M3.error : M3.primary,
				color: danger ? '#FFF' : M3.onPrimary,
				padding: small ? '6px 16px' : '10px 24px',
				fontSize: small ? '13px' : '14px',
				fontFamily: 'Roboto, sans-serif',
				letterSpacing: '0.1px',
				border: 'none',
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.4 : 1,
			} }
			onMouseEnter={ ( e ) => {
				if ( ! disabled ) ( e.currentTarget as HTMLElement ).style.opacity = '0.88';
			} }
			onMouseLeave={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.opacity = disabled ? '0.4' : '1';
			} }
		>
			{ children }
		</button>
	);
}

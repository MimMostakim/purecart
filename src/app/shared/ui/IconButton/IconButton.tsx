/**
 * IconButton UI component.
 *
 * Renders a circular icon-only button with a hover state background fill.
 * Intended for toolbar and top-bar icon actions.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '@/theme';

/**
 * Renders a circular button containing a single Lucide icon.
 *
 * @since 1.0.0
 *
 * @param {Object}           props          Component props.
 * @param {React.ElementType} props.icon    Lucide icon component to render inside the button.
 * @param {Function}         [props.onClick] Click handler callback.
 * @param {string}           [props.title]  Tooltip text exposed via the native title attribute.
 * @param {boolean}          [props.active] Keeps the button in its selected (filled) state — for a button that opens a menu, true while that menu is open.
 * @param {number}           [props.badgeCount] Unread/pending count rendered as a badge on the icon; 0 or omitted renders no badge.
 *
 * @return {JSX.Element} A circular icon button element.
 */
export function IconButton( {
	icon: Icon,
	onClick,
	title = '',
	active = false,
	badgeCount = 0,
}: {
	icon: React.ElementType;
	onClick?: () => void;
	title?: string;
	active?: boolean;
	badgeCount?: number;
} ) {
	return (
		<button
			onClick={ onClick }
			title={ title }
			aria-label={ title || undefined }
			type="button"
			className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all"
			style={ {
				color: active ? M3.primary : M3.onSurfaceVariant,
				border: 'none',
				background: active ? M3.primaryContainer : 'transparent',
				cursor: 'pointer',
			} }
			onMouseEnter={ ( e ) => {
				if ( active ) return;
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					M3.surfaceContainerHigh;
			} }
			onMouseLeave={ ( e ) => {
				if ( active ) return;
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					'transparent';
			} }
		>
			<Icon size={ 20 } />
			{ badgeCount > 0 && (
				<span
					className="absolute flex items-center justify-center rounded-full font-medium"
					style={ {
						top: 4,
						right: 2,
						minWidth: 17,
						height: 17,
						padding: '0 4px',
						fontSize: 10,
						lineHeight: '17px',
						backgroundColor: M3.error,
						color: M3.onPrimary,
						fontFamily: 'Roboto, sans-serif',
						// The badge sits on top of the icon; clicks belong to the button.
						pointerEvents: 'none',
					} }
				>
					{ badgeCount > 9 ? '9+' : badgeCount }
				</span>
			) }
		</button>
	);
}

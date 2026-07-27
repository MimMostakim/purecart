/**
 * IconButton UI component.
 *
 * Renders a circular icon-only button with a hover state background fill.
 * Intended for toolbar and top-bar icon actions.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a circular button containing a single Lucide icon.
 *
 * @since 1.0.0
 *
 * @param {Object}           props          Component props.
 * @param {React.ElementType} props.icon    Lucide icon component to render inside the button.
 * @param {Function}         [props.onClick] Click handler callback.
 * @param {string}           [props.title]  Tooltip text exposed via the native title attribute.
 *
 * @return {JSX.Element} A circular icon button element.
 */
export function IconButton( {
	icon: Icon,
	onClick,
	title = '',
}: {
	icon: React.ElementType;
	onClick?: () => void;
	title?: string;
} ) {
	return (
		<button
			onClick={ onClick }
			title={ title }
			className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
			style={ {
				color: M3.onSurfaceVariant,
				border: 'none',
				background: 'transparent',
				cursor: 'pointer',
			} }
			onMouseEnter={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					M3.surfaceContainerHigh;
			} }
			onMouseLeave={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					'transparent';
			} }
		>
			<Icon size={ 20 } />
		</button>
	);
}

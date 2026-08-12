/**
 * Toggle UI component.
 *
 * Renders a Material Design 3 on/off switch. Purely controlled - visibility
 * of the "on" state is driven entirely by the checked prop.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a pill-shaped on/off switch with a sliding thumb.
 *
 * @since 1.0.0
 *
 * @param {Object}   props            Component props.
 * @param {boolean}  props.checked    Whether the toggle is in the "on" state.
 * @param {Function} props.onChange   Callback invoked with the new checked value on click.
 * @param {boolean}  [props.disabled] Disables interaction and dims the toggle when true.
 * @param {'default'|'small'} [props.size] Renders a compact size variant when 'small'.
 *
 * @return {JSX.Element} A clickable switch element.
 */
export function Toggle( {
	checked,
	onChange,
	disabled = false,
	size = 'default',
}: {
	checked: boolean;
	onChange: ( checked: boolean ) => void;
	disabled?: boolean;
	size?: 'default' | 'small';
} ) {
	const width = size === 'small' ? 32 : 40;
	const height = size === 'small' ? 18 : 22;
	const thumbSize = height - 4;
	return (
		<button
			type="button"
			role="switch"
			aria-checked={ checked }
			disabled={ disabled }
			onClick={ () => ! disabled && onChange( ! checked ) }
			className="relative inline-flex items-center flex-shrink-0 rounded-full transition-all"
			style={ {
				width,
				height,
				backgroundColor: checked ? M3.primary : M3.outlineVariant,
				border: 'none',
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.4 : 1,
			} }
		>
			<span
				className="absolute rounded-full bg-white transition-all"
				style={ {
					width: thumbSize,
					height: thumbSize,
					top: 2,
					left: checked ? width - thumbSize - 2 : 2,
					transitionDuration: '150ms',
				} }
			/>
		</button>
	);
}

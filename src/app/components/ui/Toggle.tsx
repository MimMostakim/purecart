/**
 * Toggle UI component.
 *
 * Renders a Material Design 3 switch toggle button. The track color and
 * thumb size animate between on and off states via inline style transitions.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders an animated on/off toggle switch following M3 switch specs.
 *
 * @since 1.0.0
 *
 * @param {Object}   props          Component props.
 * @param {boolean}  props.on       Current toggle state. True renders the active/on state.
 * @param {Function} props.onChange Callback invoked with the new boolean state when toggled.
 *
 * @return {JSX.Element} A styled toggle switch button element.
 */
export function Toggle( {
	on,
	onChange,
}: {
	on: boolean;
	onChange: ( v: boolean ) => void;
} ) {
	return (
		<button
			onClick={ () => onChange( ! on ) }
			className="relative flex items-center rounded-full transition-all"
			style={ {
				width: 52,
				height: 32,
				backgroundColor: on ? M3.primary : M3.outlineVariant,
				border: on ? 'none' : `2px solid ${ M3.outline }`,
				cursor: 'pointer',
				padding: 0,
			} }
		>
			<span
				className="absolute rounded-full transition-all"
				style={ {
					width: on ? 24 : 16,
					height: on ? 24 : 16,
					backgroundColor: on ? M3.onPrimary : M3.outline,
					left: on ? 'calc(100% - 28px)' : 6,
					top: '50%',
					transform: 'translateY(-50%)',
				} }
			/>
		</button>
	);
}

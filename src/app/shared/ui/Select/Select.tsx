/**
 * Select UI component.
 *
 * Renders a Material Design 3 styled <select>, matching Input's visual
 * language. The single source of truth for that look - Settings' select
 * field rows compose this instead of hand-rolling the same styles.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '@/theme';

/**
 * Renders a bordered, rounded dropdown following the app's M3 styling.
 *
 * @since 1.0.0
 *
 * @param {Object}        props             Component props.
 * @param {string}        props.value       Currently selected option value.
 * @param {Array}         props.options     Selectable { label, value } options.
 * @param {Function}      props.onChange    Callback invoked with the newly selected value.
 * @param {boolean}       [props.disabled]  Disables and dims the select when true.
 * @param {number|string} [props.width]     Select width, defaults to 220.
 * @param {string}        [props.className] Additional class names merged onto the select.
 *
 * @return {JSX.Element} The styled select element.
 */
export function Select( {
	value,
	options,
	onChange,
	disabled = false,
	width = 220,
	className = '',
}: {
	value: string;
	options: { label: string; value: string }[];
	onChange: ( value: string ) => void;
	disabled?: boolean;
	width?: number | string;
	className?: string;
} ) {
	return (
		<select
			value={ value }
			disabled={ disabled }
			onChange={ ( e ) => onChange( e.target.value ) }
			className={ `text-sm outline-none flex-shrink-0 ${ className }` }
			style={ {
				width,
				padding: '8px 12px',
				borderRadius: '0.5rem',
				fontFamily: 'Roboto, sans-serif',
				color: M3.onSurface,
				backgroundColor: disabled
					? M3.surfaceContainer
					: M3.surfaceContainerLow,
				border: `1px solid ${ M3.outlineVariant }`,
				opacity: disabled ? 0.6 : 1,
			} }
		>
			{ options.map( ( opt ) => (
				<option key={ opt.value } value={ opt.value }>
					{ opt.label }
				</option>
			) ) }
		</select>
	);
}

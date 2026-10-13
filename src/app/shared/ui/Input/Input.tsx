/**
 * Input UI component.
 *
 * Renders a Material Design 3 styled text/number/password input. The single
 * source of truth for that look - Settings' field rows (and anything else
 * that needs a styled text input) compose this instead of each hand-rolling
 * the same border/padding/background styles.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '@/theme';

/**
 * Renders a bordered, rounded text input following the app's M3 styling.
 *
 * @since 1.0.0
 *
 * @param {Object}                     props               Component props.
 * @param {string|number}              props.value         Current input value.
 * @param {'text'|'number'|'password'} [props.type]        Input type, defaults to 'text'.
 * @param {Function}                   [props.onChange]    Callback invoked with the new raw string value on change. Omit for a read-only display value.
 * @param {string}                     [props.placeholder] Placeholder text shown when empty.
 * @param {boolean}                    [props.disabled]    Disables and dims the input when true.
 * @param {boolean}                    [props.readOnly]    Prevents editing without dimming the input, for display-only values.
 * @param {number|string}              [props.width]       Input width, defaults to 220.
 * @param {string}                     [props.className]   Additional class names merged onto the input.
 *
 * @return {JSX.Element} The styled input element.
 */
export function Input( {
	type = 'text',
	value,
	onChange,
	placeholder,
	disabled = false,
	readOnly = false,
	width = 220,
	className = '',
}: {
	type?: 'text' | 'number' | 'password';
	value: string | number;
	onChange?: ( value: string ) => void;
	placeholder?: string;
	disabled?: boolean;
	readOnly?: boolean;
	width?: number | string;
	className?: string;
} ) {
	return (
		<input
			type={ type }
			value={ value }
			placeholder={ placeholder }
			disabled={ disabled }
			readOnly={ readOnly }
			onChange={
				onChange ? ( e ) => onChange( e.target.value ) : undefined
			}
			className={ `text-sm outline-none ${ className }` }
			style={ {
				width,
				padding: '8px 12px',
				borderRadius: '0.5rem',
				fontFamily:
					type === 'number'
						? 'Roboto Mono, monospace'
						: 'Roboto, sans-serif',
				color: M3.onSurface,
				backgroundColor: disabled
					? M3.surfaceContainer
					: M3.surfaceContainerLow,
				border: `1px solid ${ M3.outlineVariant }`,
				opacity: disabled ? 0.6 : 1,
			} }
		/>
	);
}

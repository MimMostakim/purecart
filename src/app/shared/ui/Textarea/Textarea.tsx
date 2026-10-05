/**
 * Textarea UI component.
 *
 * Renders a Material Design 3 styled <textarea>, matching Input's visual
 * language. The single source of truth for that look - Settings' textarea
 * field rows compose this instead of hand-rolling the same styles.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '@/theme';

/**
 * Renders a bordered, rounded multi-line text field following the app's M3
 * styling.
 *
 * @since 1.0.0
 *
 * @param {Object}   props               Component props.
 * @param {string}   props.value         Current textarea value.
 * @param {Function} props.onChange      Callback invoked with the new raw text on change.
 * @param {number}   [props.rows]        Visible row count, defaults to 3.
 * @param {string}   [props.placeholder] Placeholder text shown when empty.
 * @param {boolean}  [props.disabled]    Disables and dims the textarea when true.
 * @param {string}   [props.className]   Additional class names merged onto the textarea.
 *
 * @return {JSX.Element} The styled textarea element.
 */
export function Textarea( {
	value,
	onChange,
	rows = 3,
	placeholder,
	disabled = false,
	className = '',
}: {
	value: string;
	onChange: ( value: string ) => void;
	rows?: number;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
} ) {
	return (
		<textarea
			value={ value }
			rows={ rows }
			placeholder={ placeholder }
			disabled={ disabled }
			onChange={ ( e ) => onChange( e.target.value ) }
			className={ `w-full text-sm outline-none resize-y ${ className }` }
			style={ {
				padding: '8px 12px',
				borderRadius: '0.5rem',
				fontFamily: 'Roboto Mono, monospace',
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

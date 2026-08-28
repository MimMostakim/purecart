/**
 * SettingsTextareaField component.
 *
 * Renders a label above a <textarea> for multi-line settings values (e.g.
 * one-domain-per-line lists, notes templates). Label sits above the field
 * rather than beside it, since a textarea needs the full row width. Scoped
 * to the Subscriptions module - not a generic ui/ primitive, since nothing
 * outside Subscriptions' Settings tab uses it.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';

/**
 * Renders a stacked label + textarea settings field.
 *
 * @since 1.0.0
 *
 * @param {Object}   props              Component props.
 * @param {string}   props.label        Field label.
 * @param {string}   props.value        Current textarea value.
 * @param {Function} props.onChange     Callback invoked with the new raw text on change.
 * @param {number}   [props.rows]       Visible row count, defaults to 3.
 * @param {string}   [props.placeholder] Placeholder text shown when empty.
 * @param {string}   [props.helpText]   Optional muted helper text shown under the label.
 * @param {boolean}  [props.disabled]   Disables the textarea when true.
 *
 * @return {JSX.Element} The settings textarea field.
 */
export function SettingsTextareaField( {
	label,
	value,
	onChange,
	rows = 3,
	placeholder,
	helpText,
	disabled = false,
}: {
	label: string;
	value: string;
	onChange: ( value: string ) => void;
	rows?: number;
	placeholder?: string;
	helpText?: string;
	disabled?: boolean;
} ) {
	return (
		<div className="py-2.5">
			<div
				className="text-sm mb-1"
				style={ {
					color: M3.onSurface,
					fontFamily: 'Roboto, sans-serif',
				} }
			>
				{ label }
			</div>
			{ helpText && (
				<div
					className="text-xs mb-2"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ helpText }
				</div>
			) }
			<textarea
				value={ value }
				rows={ rows }
				placeholder={ placeholder }
				disabled={ disabled }
				onChange={ ( e ) => onChange( e.target.value ) }
				className="w-full rounded-lg outline-none resize-y"
				style={ {
					padding: '8px 10px',
					fontSize: 13,
					fontFamily: 'Roboto Mono, monospace',
					color: M3.onSurface,
					backgroundColor: disabled
						? M3.surfaceContainer
						: M3.surfaceContainerLow,
					border: `1px solid ${ M3.outlineVariant }`,
					opacity: disabled ? 0.6 : 1,
				} }
			/>
		</div>
	);
}

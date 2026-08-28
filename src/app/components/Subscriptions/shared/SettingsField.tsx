/**
 * SettingsField component.
 *
 * Renders a single label + text/number input row for the Subscriptions
 * settings tab. The general-purpose field the other Settings* components
 * specialize. Scoped to the Subscriptions module - not a generic ui/
 * primitive, since nothing outside Subscriptions' Settings tab uses it.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';

/**
 * Renders a label-left, input-right settings row.
 *
 * @since 1.0.0
 *
 * @param {Object}   props            Component props.
 * @param {string}   props.label      Field label.
 * @param {string|number} props.value Current field value.
 * @param {Function} props.onChange   Callback invoked with the new raw string value on change.
 * @param {'text'|'number'} [props.type] Input type, defaults to 'text'.
 * @param {string}   [props.suffix]   Unit label shown after the input, e.g. 'days'.
 * @param {string}   [props.helpText] Optional muted helper text shown under the label.
 * @param {boolean}  [props.disabled] Disables the input when true.
 *
 * @return {JSX.Element} The settings field row.
 */
export function SettingsField( {
	label,
	value,
	onChange,
	type = 'text',
	suffix,
	helpText,
	disabled = false,
}: {
	label: string;
	value: string | number;
	onChange: ( value: string ) => void;
	type?: 'text' | 'number';
	suffix?: string;
	helpText?: string;
	disabled?: boolean;
} ) {
	return (
		<div className="flex items-center justify-between gap-4 py-2.5">
			<div>
				<div
					className="text-sm"
					style={ {
						color: M3.onSurface,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ label }
				</div>
				{ helpText && (
					<div
						className="text-xs mt-0.5"
						style={ {
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						{ helpText }
					</div>
				) }
			</div>
			<div className="flex items-center gap-2 flex-shrink-0">
				<input
					type={ type }
					value={ value }
					disabled={ disabled }
					onChange={ ( e ) => onChange( e.target.value ) }
					className="text-right rounded-lg outline-none"
					style={ {
						width: 100,
						padding: '6px 10px',
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
				{ suffix && (
					<span
						className="text-xs"
						style={ {
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						{ suffix }
					</span>
				) }
			</div>
		</div>
	);
}

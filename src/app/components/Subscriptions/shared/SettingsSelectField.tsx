/**
 * SettingsSelectField component.
 *
 * Renders a label + <select> row for the Subscriptions settings tab, styled
 * to match SettingsField's layout. Scoped to the Subscriptions module - not
 * a generic ui/ primitive, since nothing outside Subscriptions' Settings tab
 * uses it.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';

/**
 * Renders a label-left, dropdown-right settings row.
 *
 * @since 1.0.0
 *
 * @param {Object}   props            Component props.
 * @param {string}   props.label      Field label.
 * @param {string}   props.value      Currently selected option value.
 * @param {Array}    props.options    Selectable { label, value } options.
 * @param {Function} props.onChange   Callback invoked with the newly selected value.
 * @param {string}   [props.helpText] Optional muted helper text shown under the label.
 * @param {boolean}  [props.disabled] Disables the select when true.
 *
 * @return {JSX.Element} The settings select-field row.
 */
export function SettingsSelectField( {
	label,
	value,
	options,
	onChange,
	helpText,
	disabled = false,
}: {
	label: string;
	value: string;
	options: { label: string; value: string }[];
	onChange: ( value: string ) => void;
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
			<select
				value={ value }
				disabled={ disabled }
				onChange={ ( e ) => onChange( e.target.value ) }
				className="rounded-lg outline-none flex-shrink-0"
				style={ {
					minWidth: 180,
					padding: '6px 10px',
					fontSize: 13,
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
		</div>
	);
}

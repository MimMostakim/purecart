/**
 * SettingsToggleField UI component.
 *
 * Renders a labeled boolean toggle row for use in settings panels. Manages
 * its own on/off state internally, initialized from the defaultOn prop.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { M3 } from '../../utils/static-data';
import { Toggle } from './Toggle';

/**
 * Renders a settings row containing a label, optional description, and toggle switch.
 *
 * @since 1.0.0
 *
 * @param {Object}  props             Component props.
 * @param {string}  props.label       Field label displayed to the left of the toggle.
 * @param {string}  [props.desc]      Optional helper text displayed below the label.
 * @param {boolean} [props.defaultOn] Initial toggle state. Defaults to false.
 *
 * @return {JSX.Element} A two-column settings row with label and toggle switch.
 */
export function SettingsToggleField( {
	label,
	desc,
	defaultOn = false,
}: {
	label: string;
	desc?: string;
	defaultOn?: boolean;
} ) {
	const [ on, setOn ] = useState( defaultOn );
	return (
		<div
			className="flex items-center justify-between gap-8 py-4"
			style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }
		>
			<div>
				<div
					className="text-sm font-medium"
					style={ {
						color: M3.onSurface,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ label }
				</div>
				{ desc && (
					<div
						className="text-xs mt-0.5"
						style={ {
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						{ desc }
					</div>
				) }
			</div>
			<Toggle on={ on } onChange={ setOn } />
		</div>
	);
}

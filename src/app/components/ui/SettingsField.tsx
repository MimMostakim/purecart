/**
 * SettingsField UI component.
 *
 * Renders a labeled text or number input row for use in settings panels.
 * Displays an optional description below the label and aligns the input
 * to the right at a fixed width.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a settings row containing a label, optional description, and text input.
 *
 * Uses Roboto Mono font for number inputs and Roboto for all other types.
 *
 * @since 1.0.0
 *
 * @param {Object} props               Component props.
 * @param {string} props.label         Field label displayed to the left of the input.
 * @param {string} [props.desc]        Optional helper text displayed below the label.
 * @param {string} [props.type]        HTML input type attribute. Defaults to 'text'.
 * @param {string} [props.defaultValue] Default value for the uncontrolled input.
 * @param {string} [props.placeholder] Placeholder text shown when the input is empty.
 *
 * @return {JSX.Element} A two-column settings row with label and input.
 */
export function SettingsField( {
	label,
	desc,
	type = 'text',
	defaultValue,
	placeholder,
}: {
	label: string;
	desc?: string;
	type?: string;
	defaultValue?: string;
	placeholder?: string;
} ) {
	return (
		<div
			className="flex items-start justify-between gap-8 py-4"
			style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }
		>
			<div className="flex-1">
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
			<input
				type={ type }
				defaultValue={ defaultValue }
				placeholder={ placeholder }
				className="px-3 py-2 rounded-lg text-sm outline-none"
				style={ {
					width: 260,
					backgroundColor: M3.surfaceContainerLow,
					border: `1px solid ${ M3.outlineVariant }`,
					color: M3.onSurface,
					fontFamily:
						type === 'number'
							? 'Roboto Mono, monospace'
							: 'Roboto, sans-serif',
				} }
			/>
		</div>
	);
}

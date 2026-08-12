/**
 * SettingsSectionHeader component.
 *
 * Renders the title and optional description that mark the start of a
 * settings section, with a bottom border separating it from the fields
 * below. Scoped to the Subscriptions module's settings tab - not a generic
 * ui/ primitive, since nothing outside Subscriptions' Settings tab uses it.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';

/**
 * Renders a bold section title with an optional muted description.
 *
 * @since 1.0.0
 *
 * @param {Object} props               Component props.
 * @param {string} props.title         Section heading text.
 * @param {string} [props.description] Optional one-line description shown below the title.
 *
 * @return {JSX.Element} The section header element.
 */
export function SettingsSectionHeader( {
	title,
	description,
}: {
	title: string;
	description?: string;
} ) {
	return (
		<div
			className="pb-3 mb-4"
			style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }
		>
			<div
				className="text-sm font-semibold"
				style={ {
					color: M3.onSurface,
					fontFamily: 'Roboto, sans-serif',
				} }
			>
				{ title }
			</div>
			{ description && (
				<div
					className="text-xs mt-0.5"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ description }
				</div>
			) }
		</div>
	);
}

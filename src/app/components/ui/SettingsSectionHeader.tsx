/**
 * SettingsSectionHeader UI component.
 *
 * Renders a titled sub-section header within a settings panel. Includes an
 * optional description line below the title. Applies zero top margin when
 * it is the first element in its container.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a settings sub-section title with an optional description.
 *
 * @since 1.0.0
 *
 * @param {Object} props        Component props.
 * @param {string} props.title  Sub-section heading text.
 * @param {string} [props.desc] Optional description rendered below the title.
 *
 * @return {JSX.Element} A titled sub-section header element.
 */
export function SettingsSectionHeader( {
	title,
	desc,
}: {
	title: string;
	desc?: string;
} ) {
	return (
		<div className="mb-2 mt-5 first:mt-0">
			<div
				className="font-medium text-sm"
				style={ {
					color: M3.onSurface,
					fontFamily: 'Roboto, sans-serif',
				} }
			>
				{ title }
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
	);
}

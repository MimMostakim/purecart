/**
 * SectionTitle UI component.
 *
 * Renders a small, medium-weight heading used to label content sections
 * within admin page layouts.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';

/**
 * Renders a section heading with M3 surface text styling.
 *
 * @since 1.0.0
 *
 * @param {Object}          props          Component props.
 * @param {React.ReactNode} props.children Heading text or content.
 *
 * @return {JSX.Element} A styled div acting as a section label.
 */
export function SectionTitle( { children }: { children: React.ReactNode } ) {
	return (
		<div
			className="font-medium text-sm mb-4"
			style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }
		>
			{ children }
		</div>
	);
}

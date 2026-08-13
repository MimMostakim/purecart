import type { ReactNode } from 'react';
import { M3 } from '../../utils/static-data';

/**
 * Renders a centred "module coming soon" placeholder card.
 *
 * Used by every admin module page that has not been built yet. Keeps
 * un-built pages visually consistent and on-brand while the full module
 * is in development.
 *
 * @since 1.0.0
 *
 * @param props.icon        Lucide icon element shown at the top of the card.
 * @param props.title       Module name / heading.
 * @param props.description One-line summary of what this module will do.
 */
export function ComingSoon( {
	icon,
	title,
	description,
}: {
	icon: ReactNode;
	title: string;
	description: string;
} ) {
	return (
		<div
			className="flex items-center justify-center"
			style={ { minHeight: 420 } }
		>
			<div
				className="flex flex-col items-center text-center"
				style={ {
					maxWidth: 420,
					padding: 48,
					backgroundColor: M3.surface,
					borderRadius: 28,
					border: `1px solid ${ M3.outlineVariant }`,
					gap: 20,
				} }
			>
				<div
					className="flex items-center justify-center w-16 h-16 rounded-2xl"
					style={ { backgroundColor: M3.primaryContainer } }
				>
					<span style={ { color: M3.onPrimaryContainer } }>{ icon }</span>
				</div>

				<div style={ { gap: 8, display: 'flex', flexDirection: 'column' } }>
					<h2
						style={ {
							fontSize: 22,
							fontWeight: 600,
							color: M3.onSurface,
							fontFamily: 'Roboto, sans-serif',
							margin: 0,
						} }
					>
						{ title }
					</h2>
					<p
						style={ {
							fontSize: 14,
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
							margin: 0,
							lineHeight: 1.5,
						} }
					>
						{ description }
					</p>
				</div>

				<span
					style={ {
						fontSize: 12,
						fontWeight: 500,
						color: M3.primary,
						backgroundColor: M3.primaryContainer,
						borderRadius: 9999,
						padding: '4px 14px',
						fontFamily: 'Roboto, sans-serif',
						letterSpacing: '0.5px',
					} }
				>
					Coming soon
				</span>
			</div>
		</div>
	);
}

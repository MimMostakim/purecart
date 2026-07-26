import { M3 } from '../../utils/static-data';

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

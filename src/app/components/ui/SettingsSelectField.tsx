import { M3 } from '../../utils/static-data';

export function SettingsSelectField( {
	label,
	desc,
	options,
	defaultValue,
}: {
	label: string;
	desc?: string;
	options: string[];
	defaultValue?: string;
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
			<select
				defaultValue={ defaultValue }
				className="px-3 py-2 rounded-lg text-sm outline-none"
				style={ {
					width: 260,
					backgroundColor: M3.surfaceContainerLow,
					border: `1px solid ${ M3.outlineVariant }`,
					color: M3.onSurface,
					fontFamily: 'Roboto, sans-serif',
				} }
			>
				{ options.map( ( o ) => (
					<option key={ o }>{ o }</option>
				) ) }
			</select>
		</div>
	);
}

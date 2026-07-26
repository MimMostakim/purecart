import { M3 } from '../../utils/static-data';

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

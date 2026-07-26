import { useState } from 'react';
import { M3 } from '../../utils/static-data';
import { Toggle } from './Toggle';

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

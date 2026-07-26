import { Layers } from 'lucide-react';
import { M3 } from '../../utils/static-data';

export function PlaceholderPage( { title }: { title: string } ) {
	return (
		<div className="flex flex-col items-center justify-center h-64 gap-3">
			<div
				className="w-12 h-12 rounded-2xl flex items-center justify-center"
				style={ { backgroundColor: M3.primaryContainer } }
			>
				<Layers size={ 22 } color={ M3.primary } />
			</div>
			<div
				className="text-sm font-medium"
				style={ {
					color: M3.onSurface,
					fontFamily: 'Roboto, sans-serif',
				} }
			>
				{ title }
			</div>
			<div
				className="text-xs"
				style={ {
					color: M3.onSurfaceVariant,
					fontFamily: 'Roboto, sans-serif',
				} }
			>
				This module is enabled — content coming soon
			</div>
		</div>
	);
}

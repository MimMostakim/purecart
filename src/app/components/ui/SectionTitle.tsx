import { M3 } from '../../utils/static-data';

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

import { M3 } from '../../utils/static-data';

export function Card( {
	children,
	className = '',
	style = {},
}: {
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
} ) {
	return (
		<div
			className={ `rounded-xl ${ className }` }
			style={ {
				backgroundColor: M3.surface,
				boxShadow:
					'0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
				...style,
			} }
		>
			{ children }
		</div>
	);
}

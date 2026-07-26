import { M3 } from '../../utils/static-data';

export function Toggle( {
	on,
	onChange,
}: {
	on: boolean;
	onChange: ( v: boolean ) => void;
} ) {
	return (
		<button
			onClick={ () => onChange( ! on ) }
			className="relative flex items-center rounded-full transition-all"
			style={ {
				width: 52,
				height: 32,
				backgroundColor: on ? M3.primary : M3.outlineVariant,
				border: on ? 'none' : `2px solid ${ M3.outline }`,
				cursor: 'pointer',
				padding: 0,
			} }
		>
			<span
				className="absolute rounded-full transition-all"
				style={ {
					width: on ? 24 : 16,
					height: on ? 24 : 16,
					backgroundColor: on ? M3.onPrimary : M3.outline,
					left: on ? 'calc(100% - 28px)' : 6,
					top: '50%',
					transform: 'translateY(-50%)',
				} }
			/>
		</button>
	);
}

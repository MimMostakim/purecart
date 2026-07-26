import { M3 } from '../../utils/static-data';

export function TextButton( {
	children,
	onClick,
	danger = false,
	small = false,
}: {
	children: React.ReactNode;
	onClick?: () => void;
	danger?: boolean;
	small?: boolean;
} ) {
	return (
		<button
			onClick={ onClick }
			className="inline-flex items-center gap-1 rounded-full font-medium transition-all"
			style={ {
				backgroundColor: 'transparent',
				color: danger ? M3.error : M3.primary,
				fontSize: small ? '12px' : '13px',
				fontFamily: 'Roboto, sans-serif',
				letterSpacing: '0.1px',
				border: 'none',
				cursor: 'pointer',
				padding: small ? '4px 10px' : '6px 12px',
			} }
			onMouseEnter={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					danger ? '#FFDAD6' : M3.primaryContainer;
			} }
			onMouseLeave={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					'transparent';
			} }
		>
			{ children }
		</button>
	);
}

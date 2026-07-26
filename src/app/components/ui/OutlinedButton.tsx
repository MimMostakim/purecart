import { M3 } from '../../utils/static-data';

export function OutlinedButton( {
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
			className="inline-flex items-center gap-1.5 rounded-full font-medium transition-all"
			style={ {
				backgroundColor: 'transparent',
				color: danger ? M3.error : M3.primary,
				padding: small ? '5px 16px' : '9px 24px',
				fontSize: small ? '13px' : '14px',
				fontFamily: 'Roboto, sans-serif',
				letterSpacing: '0.1px',
				border: `1px solid ${ danger ? M3.error : M3.outline }`,
				cursor: 'pointer',
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

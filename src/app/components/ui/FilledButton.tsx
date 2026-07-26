import { M3 } from '../../utils/static-data';

export function FilledButton( {
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
				backgroundColor: danger ? M3.error : M3.primary,
				color: danger ? '#FFF' : M3.onPrimary,
				padding: small ? '6px 16px' : '10px 24px',
				fontSize: small ? '13px' : '14px',
				fontFamily: 'Roboto, sans-serif',
				letterSpacing: '0.1px',
				border: 'none',
				cursor: 'pointer',
			} }
			onMouseEnter={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.opacity = '0.88';
			} }
			onMouseLeave={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.opacity = '1';
			} }
		>
			{ children }
		</button>
	);
}

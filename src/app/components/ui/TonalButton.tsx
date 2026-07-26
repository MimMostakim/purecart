import { M3 } from '../../utils/static-data';

export function TonalButton( {
	children,
	onClick,
	small = false,
}: {
	children: React.ReactNode;
	onClick?: () => void;
	small?: boolean;
} ) {
	return (
		<button
			onClick={ onClick }
			className="inline-flex items-center gap-1.5 rounded-full font-medium transition-all"
			style={ {
				backgroundColor: M3.secondaryContainer,
				color: M3.onSecondaryContainer,
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

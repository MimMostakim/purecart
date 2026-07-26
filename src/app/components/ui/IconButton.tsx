import { M3 } from '../../utils/static-data';

export function IconButton( {
	icon: Icon,
	onClick,
	title = '',
}: {
	icon: React.ElementType;
	onClick?: () => void;
	title?: string;
} ) {
	return (
		<button
			onClick={ onClick }
			title={ title }
			className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
			style={ {
				color: M3.onSurfaceVariant,
				border: 'none',
				background: 'transparent',
				cursor: 'pointer',
			} }
			onMouseEnter={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					M3.surfaceContainerHigh;
			} }
			onMouseLeave={ ( e ) => {
				( e.currentTarget as HTMLElement ).style.backgroundColor =
					'transparent';
			} }
		>
			<Icon size={ 20 } />
		</button>
	);
}

import { useState } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';
import { M3 } from '../../utils/static-data';

export function FilterChip( {
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: string[];
	onChange: ( v: string ) => void;
} ) {
	const [ open, setOpen ] = useState( false );
	const active = value !== 'All';
	return (
		<div className="relative" style={ { isolation: 'isolate' } }>
			<button
				onClick={ () => setOpen( ( o ) => ! o ) }
				className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all"
				style={ {
					backgroundColor: active
						? M3.primaryContainer
						: M3.surfaceContainerHigh,
					color: active ? M3.onPrimaryContainer : M3.onSurfaceVariant,
					border: `1.5px solid ${
						active ? M3.primary : M3.outlineVariant
					}`,
					fontFamily: 'Roboto, sans-serif',
					cursor: 'pointer',
					fontWeight: active ? 500 : 400,
				} }
			>
				<Filter size={ 13 } />
				<span>{ active ? value : label }</span>
				{ active ? (
					<span
						onClick={ ( e ) => {
							e.stopPropagation();
							onChange( 'All' );
							setOpen( false );
						} }
						style={ {
							cursor: 'pointer',
							fontWeight: 700,
							fontSize: 14,
							lineHeight: 1,
							marginLeft: 1,
							color: M3.primary,
						} }
					>
						×
					</span>
				) : (
					<ChevronDown size={ 13 } />
				) }
			</button>
			{ open && (
				<>
					<div
						className="fixed inset-0 z-30"
						onClick={ () => setOpen( false ) }
					/>
					<div
						className="absolute left-0 z-40 rounded-xl overflow-hidden"
						style={ {
							top: 'calc(100% + 4px)',
							minWidth: 168,
							backgroundColor: M3.surface,
							boxShadow:
								'0 4px 8px rgba(0,0,0,0.12),0 8px 24px rgba(0,0,0,0.10)',
							border: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						<div className="py-1">
							{ [ 'All', ...options ].map( ( opt ) => (
								<button
									key={ opt }
									onClick={ () => {
										onChange( opt );
										setOpen( false );
									} }
									className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left"
									style={ {
										background: 'none',
										border: 'none',
										cursor: 'pointer',
										color:
											value === opt ||
											( opt === 'All' && value === 'All' )
												? M3.primary
												: M3.onSurface,
										backgroundColor:
											value === opt && opt !== 'All'
												? `${ M3.primary }10`
												: 'transparent',
										fontFamily: 'Roboto, sans-serif',
										fontWeight: value === opt ? 500 : 400,
									} }
									onMouseEnter={ ( e ) => {
										(
											e.currentTarget as HTMLElement
										 ).style.backgroundColor =
											value === opt && opt !== 'All'
												? `${ M3.primary }10`
												: M3.surfaceContainerHigh;
									} }
									onMouseLeave={ ( e ) => {
										(
											e.currentTarget as HTMLElement
										 ).style.backgroundColor =
											value === opt && opt !== 'All'
												? `${ M3.primary }10`
												: 'transparent';
									} }
								>
									{ opt === 'All' ? `All ${ label }s` : opt }
									{ value === opt && opt !== 'All' && (
										<Check
											size={ 13 }
											color={ M3.primary }
										/>
									) }
								</button>
							) ) }
						</div>
					</div>
				</>
			) }
		</div>
	);
}

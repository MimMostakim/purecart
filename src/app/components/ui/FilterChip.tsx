/**
 * FilterChip UI component.
 *
 * Renders an M3-style filter chip that opens a dropdown of selectable options.
 * Displays the active value inline and provides a clear (×) control when a
 * non-default option is selected.
 *
 * @file
 * @since 1.0.0
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Filter, ChevronDown, Check } from 'lucide-react';
import { M3 } from '../../utils/static-data';

export interface FilterChipProps {
	label: string;
	value?: string;
	options: string[];
	onChange: ( v: string ) => void;
	isOpen?: boolean;
	onToggle?: () => void;
	onClose?: () => void;
}

/**
 * Renders a filter chip button with a dropdown option list.
 *
 * The chip is considered active when value differs from 'All'. Selecting 'All'
 * resets the chip to its inactive state.
 *
 * @since 1.0.0
 *
 * @param {FilterChipProps} props Component props.
 *
 * @return {JSX.Element} The filter chip trigger and dropdown overlay.
 */
export function FilterChip( {
	label,
	value = 'All',
	options,
	onChange,
	isOpen,
	onToggle,
	onClose,
}: FilterChipProps ) {
	const [ internalOpen, setInternalOpen ] = useState( false );
	const isControlled = typeof isOpen === 'boolean';
	const open = isControlled ? isOpen : internalOpen;

	const buttonRef = useRef< HTMLButtonElement >( null );
	const menuRef = useRef< HTMLDivElement >( null );
	const [ position, setPosition ] = useState< {
		top?: number;
		bottom?: number;
		left?: number;
		right?: number;
	} >( {} );

	const handleToggle = () => {
		if ( isControlled ) {
			onToggle?.();
		} else {
			setInternalOpen( ( o ) => ! o );
		}
	};

	const handleClose = () => {
		if ( isControlled ) {
			onClose?.();
		} else {
			setInternalOpen( false );
		}
	};

	const updatePosition = useCallback( () => {
		if ( ! buttonRef.current ) return;
		const rect = buttonRef.current.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const menuHeight = 280;
		const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

		const left = Math.max( 8, Math.min( rect.left, window.innerWidth - 180 ) );

		if ( openUp ) {
			setPosition( {
				bottom: window.innerHeight - rect.top + 4,
				left,
			} );
		} else {
			setPosition( {
				top: rect.bottom + 4,
				left,
			} );
		}
	}, [] );

	useEffect( () => {
		if ( ! open ) return;

		updatePosition();

		const handleScrollOrResize = () => {
			updatePosition();
		};

		const handleKeyDown = ( e: KeyboardEvent ) => {
			if ( e.key === 'Escape' ) {
				handleClose();
			}
		};

		const handlePointerDown = ( e: MouseEvent | TouchEvent ) => {
			const target = e.target as Node | null;
			if ( ! target ) return;
			if (
				menuRef.current?.contains( target ) ||
				buttonRef.current?.contains( target )
			) {
				return;
			}
			handleClose();
		};

		window.addEventListener( 'resize', handleScrollOrResize );
		window.addEventListener( 'scroll', handleScrollOrResize, true );
		window.addEventListener( 'keydown', handleKeyDown );
		document.addEventListener( 'pointerdown', handlePointerDown );

		return () => {
			window.removeEventListener( 'resize', handleScrollOrResize );
			window.removeEventListener( 'scroll', handleScrollOrResize, true );
			window.removeEventListener( 'keydown', handleKeyDown );
			document.removeEventListener( 'pointerdown', handlePointerDown );
		};
	}, [ open, updatePosition ] );

	const active = Boolean( value && value !== 'All' );

	const getSelectAllLabel = () => {
		if ( label.toLowerCase() === 'status' ) return 'All Statuses';
		if ( label.toLowerCase().endsWith( 's' ) ) return `All ${ label }`;
		return `All ${ label }s`;
	};

	return (
		<div className="relative inline-flex">
			<button
				ref={ buttonRef }
				type="button"
				onClick={ handleToggle }
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
							handleClose();
						} }
						style={ {
							cursor: 'pointer',
							fontWeight: 700,
							fontSize: 14,
							lineHeight: 1,
							marginLeft: 1,
							color: M3.primary,
						} }
						title="Clear filter"
					>
						×
					</span>
				) : (
					<ChevronDown size={ 13 } />
				) }
			</button>
			{ open &&
				createPortal(
					<div
						ref={ menuRef }
						className="fixed rounded-xl overflow-hidden flex flex-col"
						style={ {
							...position,
							zIndex: 9999,
							minWidth: 168,
							maxHeight: 280,
							backgroundColor: M3.surface,
							boxShadow:
								'0 4px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.16)',
							border: `1px solid ${ M3.outlineVariant }`,
						} }
						onClick={ ( e ) => e.stopPropagation() }
					>
						<div
							className="py-1 overflow-y-auto"
							style={ { overscrollBehavior: 'contain' } }
						>
							{ [ 'All', ...options ].map( ( opt ) => (
								<button
									key={ opt }
									type="button"
									onClick={ () => {
										onChange( opt );
										handleClose();
									} }
									className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left transition-colors"
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
									{ opt === 'All' ? getSelectAllLabel() : opt }
									{ value === opt && opt !== 'All' && (
										<Check
											size={ 13 }
											color={ M3.primary }
										/>
									) }
								</button>
							) ) }
						</div>
					</div>,
					document.body
				) }
		</div>
	);
}

/**
 * ActionDropdown UI component.
 *
 * Renders a three-dot vertical menu button with a floating dropdown list of
 * actions. Supports optional dividers, danger styles, and disabled states.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { M3 } from '../../utils/static-data';

/**
 * Describes a single action item displayed in the dropdown menu.
 *
 * @since 1.0.0
 *
 * @typedef  {Object}   ActionItem
 * @property {string}            label         Display label for the action.
 * @property {React.ElementType} icon          Lucide icon component rendered beside the label.
 * @property {boolean}           [danger]      Renders the item in error color when true.
 * @property {boolean}           [disabled]    Prevents the action from firing when true.
 * @property {boolean}           [dividerBefore] Renders a separator above this item when true.
 * @property {Function}          onClick       Callback invoked when the item is selected.
 */
export interface ActionItem {
	label: string;
	icon: React.ElementType;
	danger?: boolean;
	disabled?: boolean;
	dividerBefore?: boolean;
	onClick: () => void;
}

/**
 * Renders a vertical three-dot icon button that opens a floating action menu.
 *
 * @since 1.0.0
 *
 * @param {Object}       props         Component props.
 * @param {ActionItem[]} props.actions List of action items to display in the dropdown.
 * @param {string}       [props.hint]  Optional hint text shown at the top of the menu.
 *
 * @return {JSX.Element} The dropdown trigger button and floating menu overlay.
 */
export function ActionDropdown( {
	actions,
	hint,
}: {
	actions: ActionItem[];
	hint?: string;
} ) {
	const [ open, setOpen ] = useState( false );
	return (
		<div className="relative" style={ { isolation: 'isolate' } }>
			<button
				onClick={ ( e ) => {
					e.stopPropagation();
					setOpen( ( o ) => ! o );
				} }
				className="flex items-center justify-center w-8 h-8 rounded-full transition-all"
				style={ {
					color: open ? M3.primary : M3.onSurfaceVariant,
					backgroundColor: open ? M3.primaryContainer : 'transparent',
					border: 'none',
					cursor: 'pointer',
				} }
			>
				<MoreVertical size={ 16 } />
			</button>
			{ open && (
				<>
					<div
						className="fixed inset-0 z-30"
						onClick={ () => setOpen( false ) }
					/>
					<div
						className="absolute right-0 z-40 rounded-xl overflow-hidden"
						style={ {
							top: 'calc(100% + 4px)',
							minWidth: 210,
							backgroundColor: M3.surface,
							boxShadow:
								'0 4px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.10)',
							border: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						{ hint && (
							<div
								className="px-4 py-2.5"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
									borderBottom: `1px solid ${ M3.outlineVariant }`,
								} }
							>
								<div
									className="text-xs"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ hint }
								</div>
							</div>
						) }
						<div className="py-1">
							{ actions.map( ( a, i ) => {
								const Icon = a.icon;
								return (
									<div key={ i }>
										{ a.dividerBefore && (
											<div
												className="my-1 mx-3"
												style={ {
													borderTop: `1px solid ${ M3.outlineVariant }`,
												} }
											/>
										) }
										<button
											disabled={ a.disabled }
											onClick={ ( e ) => {
												e.stopPropagation();
												if ( ! a.disabled ) {
													a.onClick();
													setOpen( false );
												}
											} }
											className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left"
											style={ {
												background: 'none',
												border: 'none',
												cursor: a.disabled
													? 'default'
													: 'pointer',
												color: a.disabled
													? M3.outlineVariant
													: a.danger
													? M3.error
													: M3.onSurface,
												opacity: a.disabled ? 0.4 : 1,
												fontFamily:
													'Roboto, sans-serif',
											} }
											onMouseEnter={ ( e ) => {
												if ( ! a.disabled )
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														a.danger
															? '#FFDAD6'
															: M3.surfaceContainerHigh;
											} }
											onMouseLeave={ ( e ) => {
												(
													e.currentTarget as HTMLElement
												 ).style.backgroundColor =
													'transparent';
											} }
										>
											<Icon
												size={ 15 }
												color={
													a.disabled
														? M3.outlineVariant
														: a.danger
														? M3.error
														: M3.onSurfaceVariant
												}
											/>
											{ a.label }
										</button>
									</div>
								);
							} ) }
						</div>
					</div>
				</>
			) }
		</div>
	);
}

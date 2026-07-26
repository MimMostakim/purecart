import {
	MoreVertical,
	FileText,
	Users,
	Copy,
	Layers,
	Calendar,
	RotateCcw,
	Mail,
	CheckCircle,
	PauseCircle,
	XCircle,
} from 'lucide-react';
import { M3, licensesTableData } from '../../utils/static-data';

export interface MenuAction {
	label: string;
	icon: React.ElementType;
	danger?: boolean;
	dividerBefore?: boolean;
	onClick: () => void;
	disabled?: boolean;
}

export interface RowMenuProps {
	row: ( typeof licensesTableData )[ 0 ];
	open: boolean;
	onOpen: () => void;
	onClose: () => void;
	onViewDetail: () => void;
	onViewCustomer: () => void;
	onCopyKey: () => void;
	onExtendExpiry: () => void;
	onResetActivations: () => void;
	onSendReminder: () => void;
	onSuspend: () => void;
	onReinstate: () => void;
	onRevoke: () => void;
	onDuplicate: () => void;
}

export function RowActionMenu( {
	row,
	open,
	onOpen,
	onClose,
	onViewDetail,
	onViewCustomer,
	onCopyKey,
	onExtendExpiry,
	onResetActivations,
	onSendReminder,
	onSuspend,
	onReinstate,
	onRevoke,
	onDuplicate,
}: RowMenuProps ) {
	const isSuspended = row.status === 'suspended';
	const isRevoked = row.status === 'revoked';
	const isExpired = row.status === 'expired';
	const isActive = row.status === 'active';

	const actions: MenuAction[] = [
		{ label: 'View License Detail', icon: FileText, onClick: onViewDetail },
		{ label: 'View Customer', icon: Users, onClick: onViewCustomer },
		{ label: 'Copy License Key', icon: Copy, onClick: onCopyKey },
		{
			label: 'Duplicate License',
			icon: Layers,
			onClick: onDuplicate,
			dividerBefore: true,
		},
		{
			label: 'Extend Expiry',
			icon: Calendar,
			onClick: onExtendExpiry,
			disabled: isRevoked,
		},
		{
			label: 'Reset Activations',
			icon: RotateCcw,
			onClick: onResetActivations,
			disabled: isRevoked || isExpired,
		},
		{ label: 'Send Reminder Email', icon: Mail, onClick: onSendReminder },
		...( isSuspended
			? [
					{
						label: 'Reinstate License',
						icon: CheckCircle,
						onClick: onReinstate,
						dividerBefore: true,
					},
			  ]
			: isActive
			? [
					{
						label: 'Suspend License',
						icon: PauseCircle,
						onClick: onSuspend,
						dividerBefore: true,
						danger: false,
					},
			  ]
			: [] ),
		{
			label: 'Revoke License',
			icon: XCircle,
			onClick: onRevoke,
			danger: true,
			dividerBefore: ! isSuspended && ! isActive,
			disabled: isRevoked,
		},
	];

	return (
		<div className="relative" style={ { isolation: 'isolate' } }>
			<button
				onClick={ ( e ) => {
					e.stopPropagation();
					open ? onClose() : onOpen();
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
					{ /* Backdrop */ }
					<div className="fixed inset-0 z-30" onClick={ onClose } />
					{ /* Menu */ }
					<div
						className="absolute right-0 z-40 rounded-xl overflow-hidden"
						style={ {
							top: 'calc(100% + 4px)',
							minWidth: 220,
							backgroundColor: M3.surface,
							boxShadow:
								'0 4px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.10)',
							border: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						{ /* Header — license key hint */ }
						<div
							className="px-4 py-2.5"
							style={ {
								backgroundColor: M3.surfaceContainerLow,
								borderBottom: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<div
								className="text-xs font-medium"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								License actions
							</div>
							<div
								className="text-xs mt-0.5"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.key.substring( 0, 19 ) }…
							</div>
						</div>

						{ /* Items */ }
						<div className="py-1">
							{ actions.map( ( action, i ) => {
								const Icon = action.icon;
								return (
									<div key={ i }>
										{ action.dividerBefore && (
											<div
												className="my-1 mx-3"
												style={ {
													borderTop: `1px solid ${ M3.outlineVariant }`,
												} }
											/>
										) }
										<button
											disabled={ action.disabled }
											onClick={ ( e ) => {
												e.stopPropagation();
												if ( ! action.disabled ) {
													action.onClick();
													onClose();
												}
											} }
											className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-all"
											style={ {
												background: 'none',
												border: 'none',
												cursor: action.disabled
													? 'default'
													: 'pointer',
												color: action.disabled
													? M3.outlineVariant
													: action.danger
													? M3.error
													: M3.onSurface,
												opacity: action.disabled
													? 0.4
													: 1,
												fontFamily:
													'Roboto, sans-serif',
											} }
											onMouseEnter={ ( e ) => {
												if ( ! action.disabled )
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														action.danger
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
													action.disabled
														? M3.outlineVariant
														: action.danger
														? M3.error
														: M3.onSurfaceVariant
												}
											/>
											{ action.label }
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

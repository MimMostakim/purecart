import { useState } from 'react';
import {
	Check,
	Copy,
	Calendar,
	XCircle,
	RotateCcw,
	Server,
	MonitorSmartphone,
	Laptop,
} from 'lucide-react';
import { M3, activationData, eventLog } from '../../utils/static-data';
import {
	TextButton,
	Card,
	StatusBadge,
	OutlinedButton,
	TonalButton,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ToastProps } from '../ui';

export function LicenseDetailPage( { onBack }: { onBack: () => void } ) {
	const [ tab, setTab ] = useState< 'activations' | 'events' >(
		'activations'
	);
	const [ copied, setCopied ] = useState( false );
	const [ status, setStatus ] = useState( 'active' );
	const [ expiry, setExpiry ] = useState( 'Jun 15, 2025' );
	const [ sitesUsed, setSitesUsed ] = useState( 1 );
	const [ activations, setActivations ] = useState( activationData );
	const [ toast, setToast ] = useState< ToastProps >( {
		message: '',
		type: 'success',
		visible: false,
	} );
	const [ dialog, setDialog ] = useState< {
		open: boolean;
		title: string;
		body: React.ReactNode;
		confirmLabel: string;
		danger: boolean;
		icon?: React.ElementType;
		onConfirm: () => void;
	} >( {
		open: false,
		title: '',
		body: null,
		confirmLabel: '',
		danger: false,
		onConfirm: () => {},
	} );

	const showToast = (
		msg: string,
		type: ToastProps[ 'type' ] = 'success'
	) => {
		setToast( { message: msg, type, visible: true } );
		setTimeout(
			() => setToast( ( t ) => ( { ...t, visible: false } ) ),
			3000
		);
	};
	const openDialog = ( opts: typeof dialog ) => setDialog( opts );
	const closeDialog = () => setDialog( ( d ) => ( { ...d, open: false } ) );
	const handleCopy = () => {
		setCopied( true );
		navigator.clipboard?.writeText( 'WDD-A1B2-C3D4-E5F6' );
		setTimeout( () => setCopied( false ), 1500 );
		showToast( 'License key copied', 'info' );
	};

	return (
		<div className="flex flex-col gap-4">
			<TextButton onClick={ onBack }>← Back to Licenses</TextButton>
			<div
				className="grid gap-4"
				style={ { gridTemplateColumns: '2fr 3fr' } }
			>
				<Card className="p-6 flex flex-col gap-5">
					<div>
						<div
							className="text-xs font-medium mb-1"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
								letterSpacing: '0.5px',
								textTransform: 'uppercase',
							} }
						>
							License Key
						</div>
						<div className="flex items-center gap-2">
							<span
								className="text-sm font-medium leading-snug"
								style={ {
									fontFamily: 'Roboto Mono, monospace',
									color: M3.onSurface,
									wordBreak: 'break-all',
								} }
							>
								WDD-A1B2-C3D4-E5F6
							</span>
							<button
								onClick={ handleCopy }
								style={ {
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									flexShrink: 0,
								} }
							>
								{ copied ? (
									<Check size={ 16 } color={ M3.success } />
								) : (
									<Copy
										size={ 16 }
										color={ M3.onSurfaceVariant }
									/>
								) }
							</button>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<StatusBadge status={ status } />
						<span
							className="text-xs"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Since Jun 15, 2024
						</span>
					</div>
					<div className="flex items-center gap-3">
						<div
							className="flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold flex-shrink-0"
							style={ {
								backgroundColor: M3.primaryContainer,
								color: M3.onPrimaryContainer,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							SJ
						</div>
						<div>
							<div
								className="text-sm font-medium"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Sarah Johnson
							</div>
							<div
								className="text-xs"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								sarah@example.com
							</div>
						</div>
					</div>
					<div className="flex items-center justify-between">
						<div>
							<div
								className="text-xs"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Product
							</div>
							<div
								className="text-sm font-medium"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Plugin Pro
							</div>
						</div>
						<span
							className="text-xs px-2 py-0.5 rounded-full"
							style={ {
								backgroundColor: M3.primaryContainer,
								color: M3.onPrimaryContainer,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Plugin
						</span>
					</div>
					<div>
						<div
							className="flex items-center justify-between text-xs mb-1"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							<span>Sites Used</span>
							<span>{ sitesUsed } / 1</span>
						</div>
						<div
							className="h-1.5 rounded-full"
							style={ { backgroundColor: M3.outlineVariant } }
						>
							<div
								className="h-full rounded-full"
								style={ {
									width: `${ sitesUsed * 100 }%`,
									backgroundColor: M3.primary,
								} }
							/>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Calendar size={ 16 } color={ M3.onSurfaceVariant } />
						<span
							className="text-sm"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Expires { expiry }
						</span>
					</div>
					<div
						className="flex flex-col gap-2 pt-2"
						style={ {
							borderTop: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						<OutlinedButton
							danger
							small
							onClick={ () =>
								openDialog( {
									open: true,
									danger: true,
									icon: XCircle,
									title: 'Revoke License?',
									body: (
										<span>
											Permanently revoke{ ' ' }
											<strong
												style={ {
													fontFamily:
														'Roboto Mono, monospace',
												} }
											>
												WDD-A1B2-C3D4-E5F6
											</strong>{ ' ' }
											for Sarah Johnson? All active site
											activations will be invalidated
											immediately.
										</span>
									),
									confirmLabel: 'Revoke License',
									onConfirm: () => {
										setStatus( 'revoked' );
										setActivations( [] );
										showToast(
											'License WDD-A1B2-C3D4-E5F6 revoked',
											'error'
										);
										closeDialog();
									},
								} )
							}
						>
							<XCircle size={ 14 } /> Revoke License
						</OutlinedButton>
						<TonalButton
							small
							onClick={ () =>
								openDialog( {
									open: true,
									danger: false,
									icon: Calendar,
									title: 'Extend License Expiry',
									body: (
										<span>
											Add 12 months to this license.
											<br />
											Current expiry:{ ' ' }
											<strong>{ expiry }</strong>
											<br />
											New expiry:{ ' ' }
											<strong>Jun 15, 2026</strong>
										</span>
									),
									confirmLabel: 'Extend +12 months',
									onConfirm: () => {
										setExpiry( 'Jun 15, 2026' );
										showToast(
											'Expiry extended to Jun 15, 2026',
											'success'
										);
										closeDialog();
									},
								} )
							}
						>
							<Calendar size={ 14 } /> Extend Expiry
						</TonalButton>
						<TextButton
							onClick={ () =>
								openDialog( {
									open: true,
									danger: false,
									icon: RotateCcw,
									title: 'Reset Activations?',
									body: 'All site activations will be cleared. Sarah Johnson will need to re-activate on each domain. Their license remains valid.',
									confirmLabel: 'Reset Activations',
									onConfirm: () => {
										setSitesUsed( 0 );
										setActivations( [] );
										showToast(
											'Activations reset — 0 / 1 sites active',
											'info'
										);
										closeDialog();
									},
								} )
							}
						>
							<RotateCcw size={ 14 } /> Reset Activations
						</TextButton>
					</div>
				</Card>

				<Card className="flex flex-col overflow-hidden">
					<div
						className="flex"
						style={ {
							borderBottom: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						{ ( [ 'activations', 'events' ] as const ).map(
							( t ) => (
								<button
									key={ t }
									onClick={ () => setTab( t ) }
									className="px-6 py-4 text-sm font-medium capitalize transition-all"
									style={ {
										color:
											tab === t
												? M3.primary
												: M3.onSurfaceVariant,
										borderBottom:
											tab === t
												? `2px solid ${ M3.primary }`
												: '2px solid transparent',
										background: 'none',
										border: 'none',
										borderBottom:
											tab === t
												? `2px solid ${ M3.primary }`
												: '2px solid transparent',
										cursor: 'pointer',
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ t === 'activations'
										? `Activations (${ activations.length })`
										: 'Event Log' }
								</button>
							)
						) }
					</div>
					{ tab === 'activations' && (
						<div className="overflow-x-auto flex-1">
							{ activations.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-16 gap-2">
									<RotateCcw
										size={ 32 }
										color={ M3.outlineVariant }
									/>
									<div
										className="text-sm"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										No active site activations
									</div>
								</div>
							) : (
								<table className="w-full">
									<thead>
										<tr
											style={ {
												backgroundColor:
													M3.surfaceContainerLow,
											} }
										>
											{ [
												'Domain',
												'Environment',
												'IP Address',
												'Activated At',
												'',
											].map( ( h ) => (
												<th
													key={ h }
													className="px-4 py-3 text-left text-xs font-medium"
													style={ {
														color: M3.onSurfaceVariant,
														fontFamily:
															'Roboto, sans-serif',
														letterSpacing: '0.5px',
														textTransform:
															'uppercase',
													} }
												>
													{ h }
												</th>
											) ) }
										</tr>
									</thead>
									<tbody>
										{ activations.map( ( row ) => (
											<tr
												key={ row.id }
												style={ {
													borderBottom: `1px solid ${ M3.outlineVariant }`,
												} }
											>
												<td
													className="px-4 py-3 text-sm"
													style={ {
														color: M3.onSurface,
														fontFamily:
															'Roboto Mono, monospace',
													} }
												>
													{ row.domain }
												</td>
												<td className="px-4 py-3">
													<span
														className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
														style={ {
															backgroundColor:
																row.env ===
																'production'
																	? M3.primaryContainer
																	: row.env ===
																	  'staging'
																	? M3.secondaryContainer
																	: M3.surfaceContainerHigh,
															color:
																row.env ===
																'production'
																	? M3.onPrimaryContainer
																	: row.env ===
																	  'staging'
																	? M3.onSecondaryContainer
																	: M3.onSurfaceVariant,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ row.env ===
														'production' ? (
															<Server
																size={ 10 }
															/>
														) : row.env ===
														  'staging' ? (
															<MonitorSmartphone
																size={ 10 }
															/>
														) : (
															<Laptop
																size={ 10 }
															/>
														) }
														{ row.env }
													</span>
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														color: M3.onSurfaceVariant,
														fontFamily:
															'Roboto Mono, monospace',
													} }
												>
													{ row.ip }
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														color: M3.onSurfaceVariant,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ row.activatedAt }
												</td>
												<td className="px-4 py-3">
													<TextButton
														danger
														small
														onClick={ () =>
															openDialog( {
																open: true,
																danger: true,
																icon: XCircle,
																title: 'Deactivate Site?',
																body: (
																	<span>
																		Deactivate{ ' ' }
																		<strong
																			style={ {
																				fontFamily:
																					'Roboto Mono, monospace',
																			} }
																		>
																			{
																				row.domain
																			}
																		</strong>
																		? This
																		slot
																		will
																		become
																		available
																		for a
																		new
																		site.
																	</span>
																),
																confirmLabel:
																	'Deactivate',
																onConfirm:
																	() => {
																		setActivations(
																			(
																				a
																			) =>
																				a.filter(
																					(
																						x
																					) =>
																						x.id !==
																						row.id
																				)
																		);
																		setSitesUsed(
																			(
																				s
																			) =>
																				Math.max(
																					0,
																					s -
																						1
																				)
																		);
																		showToast(
																			`${ row.domain } deactivated`,
																			'warning'
																		);
																		closeDialog();
																	},
															} )
														}
													>
														<XCircle size={ 12 } />{ ' ' }
														Deactivate
													</TextButton>
												</td>
											</tr>
										) ) }
									</tbody>
								</table>
							) }
						</div>
					) }
					{ tab === 'events' && (
						<div className="p-6 flex flex-col gap-0">
							{ eventLog.map( ( evt, i ) => {
								const Icon = evt.icon;
								return (
									<div key={ i } className="flex gap-4">
										<div className="flex flex-col items-center">
											<div
												className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
												style={ {
													backgroundColor: `${ evt.color }20`,
												} }
											>
												<Icon
													size={ 15 }
													color={ evt.color }
												/>
											</div>
											{ i < eventLog.length - 1 && (
												<div
													className="w-px flex-1 my-1"
													style={ {
														backgroundColor:
															M3.outlineVariant,
													} }
												/>
											) }
										</div>
										<div className="pb-6">
											<div
												className="text-sm font-medium"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ evt.desc }
											</div>
											<div
												className="text-xs mt-0.5"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ evt.time }
											</div>
										</div>
									</div>
								);
							} ) }
						</div>
					) }
				</Card>
			</div>
			<ConfirmDialog
				open={ dialog.open }
				title={ dialog.title }
				body={ dialog.body }
				confirmLabel={ dialog.confirmLabel }
				danger={ dialog.danger }
				icon={ dialog.icon }
				onConfirm={ dialog.onConfirm }
				onCancel={ closeDialog }
			/>
			<Toast
				message={ toast.message }
				type={ toast.type }
				visible={ toast.visible }
			/>
		</div>
	);
}

import { useState } from 'react';
import {
	Calendar,
	RotateCcw,
	PauseCircle,
	CheckCircle,
	XCircle,
	Trash2,
	BarChart2,
	Download as DownloadIcon,
	Search,
	Check,
	Copy,
} from 'lucide-react';
import {
	M3,
	licensesTableData,
	DATE_RANGE_OPTIONS,
} from '../../utils/static-data';
import { isInDateRange } from '../../utils/date';
import {
	FilledButton,
	TonalButton,
	OutlinedButton,
	FilterChip,
	Card,
	StatusBadge,
	RowActionMenu,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ToastProps } from '../ui';

export function LicensesPage( {
	onDetail,
	onCustomer,
	onSummary,
}: {
	onDetail: () => void;
	onCustomer: () => void;
	onSummary: () => void;
} ) {
	const [ selected, setSelected ] = useState< number[] >( [] );
	const [ search, setSearch ] = useState( '' );
	const [ copied, setCopied ] = useState< string | null >( null );
	const [ currentPage, setCurrentPage ] = useState( 1 );
	const [ openMenuId, setOpenMenuId ] = useState< number | null >( null );
	const [ tableData, setTableData ] = useState( licensesTableData );
	const [ filterStatus, setFilterStatus ] = useState( 'All' );
	const [ filterProduct, setFilterProduct ] = useState( 'All' );
	const [ filterDate, setFilterDate ] = useState( 'All' );
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
		message: string,
		type: ToastProps[ 'type' ] = 'success'
	) => {
		setToast( { message, type, visible: true } );
		setTimeout(
			() => setToast( ( t ) => ( { ...t, visible: false } ) ),
			3000
		);
	};

	const openDialog = ( opts: typeof dialog ) => setDialog( opts );
	const closeDialog = () => setDialog( ( d ) => ( { ...d, open: false } ) );

	const updateStatus = ( id: number, status: string ) =>
		setTableData( ( rows ) =>
			rows.map( ( r ) => ( r.id === id ? { ...r, status } : r ) )
		);

	const toggleSelect = ( id: number ) =>
		setSelected( ( prev ) =>
			prev.includes( id )
				? prev.filter( ( x ) => x !== id )
				: [ ...prev, id ]
		);

	const handleCopy = ( key: string ) => {
		navigator.clipboard?.writeText( key ).catch( () => {} );
		setCopied( key );
		setTimeout( () => setCopied( null ), 1500 );
		showToast( 'License key copied to clipboard', 'info' );
	};

	const filtered = tableData.filter( ( l ) => {
		const matchSearch =
			! search ||
			l.customer.toLowerCase().includes( search.toLowerCase() ) ||
			l.key.toLowerCase().includes( search.toLowerCase() ) ||
			l.product.toLowerCase().includes( search.toLowerCase() );
		const matchStatus =
			filterStatus === 'All' || l.status === filterStatus.toLowerCase();
		const matchProduct =
			filterProduct === 'All' || l.product === filterProduct;
		const matchDate =
			filterDate === 'All' ||
			isInDateRange(
				l.expires === 'Lifetime' ? l.expires : l.expires,
				filterDate
			);
		return matchSearch && matchStatus && matchProduct && matchDate;
	} );

	// Per-row action handlers
	const makeHandlers = ( row: ( typeof tableData )[ 0 ] ) => ( {
		onViewDetail: () => onDetail(),
		onViewCustomer: () => onCustomer(),
		onCopyKey: () => handleCopy( row.key ),
		onDuplicate: () =>
			showToast(
				`Duplicate license issued for ${ row.customer }`,
				'success'
			),
		onExtendExpiry: () =>
			openDialog( {
				open: true,
				danger: false,
				icon: Calendar,
				title: 'Extend License Expiry',
				body: (
					<span>
						Add 12 months to{ ' ' }
						<strong
							style={ { fontFamily: 'Roboto Mono, monospace' } }
						>
							{ row.key.substring( 0, 16 ) }…
						</strong>
						<br />
						New expiry: <strong>Jan 12, 2026</strong>
					</span>
				),
				confirmLabel: 'Extend',
				onConfirm: () => {
					updateStatus( row.id, row.status );
					showToast(
						`Expiry extended for ${ row.customer }`,
						'success'
					);
					closeDialog();
				},
			} ),
		onResetActivations: () =>
			openDialog( {
				open: true,
				danger: false,
				icon: RotateCcw,
				title: 'Reset Activations?',
				body: (
					<span>
						All site activations for{ ' ' }
						<strong>{ row.customer }</strong> will be cleared. They
						will need to reactivate.
					</span>
				),
				confirmLabel: 'Reset',
				onConfirm: () => {
					showToast(
						`Activations reset for ${ row.key.substring(
							0,
							16
						) }…`,
						'info'
					);
					closeDialog();
				},
			} ),
		onSendReminder: () => {
			showToast( `Reminder email sent to ${ row.customer }`, 'success' );
		},
		onSuspend: () =>
			openDialog( {
				open: true,
				danger: false,
				icon: PauseCircle,
				title: 'Suspend License?',
				body: (
					<span>
						The license for <strong>{ row.customer }</strong> will
						be suspended. Downloads and activations will be blocked
						until reinstated.
					</span>
				),
				confirmLabel: 'Suspend',
				onConfirm: () => {
					updateStatus( row.id, 'suspended' );
					showToast(
						`License suspended for ${ row.customer }`,
						'warning'
					);
					closeDialog();
				},
			} ),
		onReinstate: () =>
			openDialog( {
				open: true,
				danger: false,
				icon: CheckCircle,
				title: 'Reinstate License?',
				body: (
					<span>
						Restore access for <strong>{ row.customer }</strong>?
						The license will return to Active status.
					</span>
				),
				confirmLabel: 'Reinstate',
				onConfirm: () => {
					updateStatus( row.id, 'active' );
					showToast(
						`License reinstated for ${ row.customer }`,
						'success'
					);
					closeDialog();
				},
			} ),
		onRevoke: () =>
			openDialog( {
				open: true,
				danger: true,
				icon: XCircle,
				title: 'Revoke License?',
				body: (
					<span>
						This will permanently revoke <br />
						<strong
							style={ { fontFamily: 'Roboto Mono, monospace' } }
						>
							{ row.key }
						</strong>
						<br />
						for <strong>{ row.customer }</strong>. This cannot be
						undone.
					</span>
				),
				confirmLabel: 'Revoke License',
				onConfirm: () => {
					updateStatus( row.id, 'revoked' );
					showToast(
						`License revoked for ${ row.customer }`,
						'error'
					);
					closeDialog();
				},
			} ),
	} );

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{ selected.length > 0 && (
						<FilledButton
							danger
							small
							onClick={ () =>
								openDialog( {
									open: true,
									danger: true,
									icon: XCircle,
									title: `Revoke ${ selected.length } Licenses?`,
									body: `This will permanently revoke all ${ selected.length } selected licenses. This cannot be undone.`,
									confirmLabel: 'Revoke All',
									onConfirm: () => {
										setTableData( ( rows ) =>
											rows.map( ( r ) =>
												selected.includes( r.id )
													? {
															...r,
															status: 'revoked',
													  }
													: r
											)
										);
										showToast(
											`${ selected.length } licenses revoked`,
											'error'
										);
										setSelected( [] );
										closeDialog();
									},
								} )
							}
						>
							<Trash2 size={ 14 } /> Revoke { selected.length }{ ' ' }
							Selected
						</FilledButton>
					) }
				</div>
				<div className="flex items-center gap-2">
					<TonalButton small onClick={ onSummary }>
						<BarChart2 size={ 14 } /> Summary
					</TonalButton>
					<OutlinedButton small>
						<DownloadIcon size={ 14 } /> Export CSV
					</OutlinedButton>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div
					className="flex items-center gap-2 flex-1 max-w-xs px-3 py-2 rounded-lg"
					style={ {
						backgroundColor: M3.surfaceContainerHigh,
						border: `1px solid ${ M3.outlineVariant }`,
					} }
				>
					<Search size={ 16 } color={ M3.onSurfaceVariant } />
					<input
						type="text"
						placeholder="Search licenses…"
						value={ search }
						onChange={ ( e ) => setSearch( e.target.value ) }
						className="flex-1 bg-transparent outline-none text-sm"
						style={ {
							color: M3.onSurface,
							fontFamily: 'Roboto, sans-serif',
							border: 'none',
						} }
					/>
				</div>
				<FilterChip
					label="Status"
					value={ filterStatus }
					options={ [ 'Active', 'Expired', 'Suspended', 'Revoked' ] }
					onChange={ setFilterStatus }
				/>
				<FilterChip
					label="Product"
					value={ filterProduct }
					options={ [
						'Plugin Pro',
						'Theme Bundle',
						'SaaS Starter',
						'SaaS Pro',
						'SaaS Connector',
					] }
					onChange={ setFilterProduct }
				/>
				<FilterChip
					label="Date Range"
					value={ filterDate }
					options={ DATE_RANGE_OPTIONS }
					onChange={ setFilterDate }
				/>
				{ ( filterStatus !== 'All' ||
					filterProduct !== 'All' ||
					filterDate !== 'All' ) && (
					<button
						onClick={ () => {
							setFilterStatus( 'All' );
							setFilterProduct( 'All' );
							setFilterDate( 'All' );
						} }
						className="text-xs px-3 py-1.5 rounded-full transition-all"
						style={ {
							color: M3.error,
							border: `1px solid ${ M3.error }`,
							background: 'none',
							cursor: 'pointer',
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						Clear all
					</button>
				) }
			</div>

			<Card style={ { overflow: 'visible' } }>
				<div
					className="overflow-x-auto"
					style={ { overflowY: 'visible' } }
				>
					<table
						className="w-full"
						style={ {
							borderCollapse: 'separate',
							borderSpacing: 0,
						} }
					>
						<thead>
							<tr
								style={ {
									backgroundColor: M3.surfaceContainerLow,
								} }
							>
								<th className="w-10 px-4 py-3 text-left">
									<input
										type="checkbox"
										onChange={ ( e ) =>
											setSelected(
												e.target.checked
													? filtered.map(
															( l ) => l.id
													  )
													: []
											)
										}
										checked={
											selected.length ===
												filtered.length &&
											filtered.length > 0
										}
									/>
								</th>
								{ [
									'License Key',
									'Customer',
									'Product',
									'Plan',
									'Sites',
									'Status',
									'Expires',
									'',
								].map( ( h ) => (
									<th
										key={ h }
										className="px-3 py-3 text-left text-xs font-medium"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
											letterSpacing: '0.5px',
											textTransform: 'uppercase',
											whiteSpace: 'nowrap',
										} }
									>
										{ h }
									</th>
								) ) }
							</tr>
						</thead>
						<tbody>
							{ filtered.map( ( row, idx ) => {
								const isSelected = selected.includes( row.id );
								const [ used, max ] = row.sites
									.split( '/' )
									.map( Number );
								const handlers = makeHandlers( row );
								return (
									<tr
										key={ row.id }
										style={ {
											backgroundColor: isSelected
												? `${ M3.primary }14`
												: idx % 2 === 0
												? M3.surface
												: M3.surfaceContainerLow,
											transition: 'background-color 0.1s',
										} }
										onMouseEnter={ ( e ) => {
											if ( ! isSelected )
												(
													e.currentTarget as HTMLElement
												 ).style.backgroundColor =
													M3.surfaceContainerHigh;
										} }
										onMouseLeave={ ( e ) => {
											(
												e.currentTarget as HTMLElement
											 ).style.backgroundColor =
												isSelected
													? `${ M3.primary }14`
													: idx % 2 === 0
													? M3.surface
													: M3.surfaceContainerLow;
										} }
									>
										<td className="px-4 py-3">
											<input
												type="checkbox"
												checked={ isSelected }
												onChange={ () =>
													toggleSelect( row.id )
												}
											/>
										</td>
										<td className="px-3 py-3">
											<div className="flex items-center gap-1">
												<span
													className="text-xs"
													style={ {
														fontFamily:
															'Roboto Mono, monospace',
														color: M3.onSurface,
													} }
												>
													{ row.key.substring(
														0,
														16
													) }
													…
												</span>
												<button
													onClick={ () =>
														handleCopy( row.key )
													}
													style={ {
														background: 'none',
														border: 'none',
														cursor: 'pointer',
														padding: 0,
													} }
													className="opacity-50 hover:opacity-100 transition-opacity"
												>
													{ copied === row.key ? (
														<Check
															size={ 13 }
															color={ M3.success }
														/>
													) : (
														<Copy
															size={ 13 }
															color={
																M3.onSurfaceVariant
															}
														/>
													) }
												</button>
											</div>
										</td>
										<td className="px-3 py-3">
											<button
												onClick={ onCustomer }
												style={ {
													background: 'none',
													border: 'none',
													padding: 0,
													cursor: 'pointer',
													textAlign: 'left',
												} }
											>
												<div
													className="text-sm font-medium hover:underline"
													style={ {
														color: M3.primary,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ row.customer }
												</div>
											</button>
											<div
												className="text-xs"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ row.email }
											</div>
										</td>
										<td
											className="px-3 py-3 text-sm"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.product }
										</td>
										<td className="px-3 py-3">
											<span
												className="text-xs px-2 py-0.5 rounded-full"
												style={ {
													backgroundColor:
														M3.secondaryContainer,
													color: M3.onSecondaryContainer,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ row.plan }
											</span>
										</td>
										<td className="px-3 py-3">
											<div
												className="text-xs mb-0.5"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto Mono, monospace',
												} }
											>
												{ row.sites }
											</div>
											<div
												className="h-1 rounded-full overflow-hidden"
												style={ {
													width: 48,
													backgroundColor:
														M3.outlineVariant,
												} }
											>
												<div
													className="h-full rounded-full"
													style={ {
														width: `${
															( used / max ) * 100
														}%`,
														backgroundColor:
															M3.primary,
													} }
												/>
											</div>
										</td>
										<td className="px-3 py-3">
											<StatusBadge
												status={ row.status }
											/>
										</td>
										<td
											className="px-3 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.expires }
										</td>
										<td
											className="px-3 py-3"
											style={ { overflow: 'visible' } }
										>
											<RowActionMenu
												row={ row }
												open={ openMenuId === row.id }
												onOpen={ () =>
													setOpenMenuId( row.id )
												}
												onClose={ () =>
													setOpenMenuId( null )
												}
												{ ...handlers }
											/>
										</td>
									</tr>
								);
							} ) }
						</tbody>
					</table>
				</div>

				<div
					className="flex items-center justify-between px-4 py-3"
					style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }
				>
					<span
						className="text-xs"
						style={ {
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						Showing { filtered.length } of { tableData.length }{ ' ' }
						licenses
					</span>
					<div className="flex items-center gap-1">
						<button
							className="px-3 py-1.5 rounded-full text-xs"
							style={ {
								color: M3.onSurfaceVariant,
								border: `1px solid ${ M3.outlineVariant }`,
								background: 'transparent',
								cursor: 'pointer',
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Previous
						</button>
						{ [ 1, 2, 3 ].map( ( n ) => (
							<button
								key={ n }
								onClick={ () => setCurrentPage( n ) }
								className="w-8 h-8 rounded-full text-xs"
								style={ {
									backgroundColor:
										currentPage === n
											? M3.primary
											: 'transparent',
									color:
										currentPage === n
											? M3.onPrimary
											: M3.onSurfaceVariant,
									border:
										currentPage === n
											? 'none'
											: `1px solid ${ M3.outlineVariant }`,
									cursor: 'pointer',
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ n }
							</button>
						) ) }
						<button
							className="px-3 py-1.5 rounded-full text-xs"
							style={ {
								color: M3.onSurfaceVariant,
								border: `1px solid ${ M3.outlineVariant }`,
								background: 'transparent',
								cursor: 'pointer',
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Next
						</button>
					</div>
				</div>
			</Card>

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

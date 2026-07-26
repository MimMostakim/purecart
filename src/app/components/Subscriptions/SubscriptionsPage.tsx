import { useState } from 'react';
import {
	Users,
	FileText,
	Mail,
	RefreshCw,
	CreditCard,
	Repeat,
	Tag,
	Calendar,
	PauseCircle,
	CheckCircle,
	XCircle,
	RotateCcw,
	Trash2,
	Search,
	Download as DownloadIcon,
} from 'lucide-react';
import {
	M3,
	subscriptionsData,
	PLAN_OPTIONS,
	DISCOUNT_DURATIONS,
	paymentHistory,
} from '../../utils/static-data';
import {
	Card,
	FilterChip,
	OutlinedButton,
	StatusBadge,
	ActionDropdown,
	TextButton,
	TonalButton,
	FilledButton,
	IconButton,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ActionItem, ToastProps } from '../ui';

export function SubscriptionsPage() {
	const [ tableData, setTableData ] = useState( subscriptionsData );
	const [ selected, setSelected ] = useState< string[] >( [] );
	const [ search, setSearch ] = useState( '' );
	const [ filterStatus, setFilterStatus ] = useState( 'All' );
	const [ filterProduct, setFilterProduct ] = useState( 'All' );
	const [ filterCycle, setFilterCycle ] = useState( 'All' );
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

	// Change Plan modal
	const [ planRow, setPlanRow ] = useState<
		( typeof tableData )[ 0 ] | null
	>( null );
	const [ selectedPlan, setSelectedPlan ] = useState( 0 );

	// Apply Discount modal
	const [ discountRow, setDiscountRow ] = useState<
		( typeof tableData )[ 0 ] | null
	>( null );
	const [ discountPct, setDiscountPct ] = useState( '10' );
	const [ discountDur, setDiscountDur ] =
		useState< ( typeof DISCOUNT_DURATIONS )[ number ] >( 'Once' );

	// Payment History modal
	const [ historyRow, setHistoryRow ] = useState<
		( typeof tableData )[ 0 ] | null
	>( null );

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

	const updateRow = (
		id: string,
		patch: Partial< ( typeof tableData )[ 0 ] >
	) =>
		setTableData( ( rows ) =>
			rows.map( ( r ) => ( r.id === id ? { ...r, ...patch } : r ) )
		);
	const deleteRow = ( id: string ) =>
		setTableData( ( rows ) => rows.filter( ( r ) => r.id !== id ) );
	const toggleSelect = ( id: string ) =>
		setSelected( ( prev ) =>
			prev.includes( id )
				? prev.filter( ( x ) => x !== id )
				: [ ...prev, id ]
		);

	const filtered = tableData.filter( ( r ) => {
		const matchSearch =
			! search ||
			r.customer.toLowerCase().includes( search.toLowerCase() ) ||
			r.product.toLowerCase().includes( search.toLowerCase() ) ||
			r.id.toLowerCase().includes( search.toLowerCase() );
		const statusKey = r.status.replace( '-', ' ' );
		const matchStatus =
			filterStatus === 'All' ||
			statusKey === filterStatus.toLowerCase() ||
			r.status === filterStatus.toLowerCase();
		const matchProduct =
			filterProduct === 'All' || r.product === filterProduct;
		const matchCycle = filterCycle === 'All' || r.cycle === filterCycle;
		return matchSearch && matchStatus && matchProduct && matchCycle;
	} );

	// ── Row actions ─────────────────────────────────────────────────────────────
	const rowActions = ( row: ( typeof tableData )[ 0 ] ): ActionItem[] => [
		// ── Navigation ─────────────────────────────────────────────────────────
		{
			label: 'View Customer',
			icon: Users,
			onClick: () =>
				showToast(
					`Customer profile for ${ row.customer } opened`,
					'info'
				),
		},
		{
			label: 'View Payment History',
			icon: FileText,
			onClick: () => setHistoryRow( row ),
		},
		{
			label: 'Send Payment Receipt',
			icon: Mail,
			onClick: () =>
				showToast( `Receipt emailed to ${ row.customer }`, 'success' ),
		},

		// ── Billing ────────────────────────────────────────────────────────────
		...( row.status === 'past-due'
			? [
					{
						label: 'Retry Payment Now',
						icon: RefreshCw,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: RefreshCw,
								title: 'Retry Payment?',
								body: (
									<span>
										Attempt to charge{ ' ' }
										<strong>{ row.amount }</strong> from{ ' ' }
										<strong>{ row.customer }</strong>'s
										payment method on file immediately?
									</span>
								),
								confirmLabel: 'Retry Payment',
								onConfirm: () => {
									updateRow( row.id, {
										status: 'active',
										nextPayment: '2025-02-15',
									} );
									showToast(
										`Payment retried successfully for ${ row.customer }`,
										'success'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),
		{
			label: 'Update Payment Method',
			icon: CreditCard,
			dividerBefore: row.status !== 'past-due',
			onClick: () =>
				showToast(
					`Payment method update link sent to ${ row.customer }`,
					'success'
				),
		},

		// ── Plan management ─────────────────────────────────────────────────────
		{
			label: 'Change Plan',
			icon: Repeat,
			dividerBefore: true,
			disabled: row.status === 'cancelled',
			onClick: () => {
				const idx = PLAN_OPTIONS.findIndex(
					( p ) => p.cycle === row.cycle
				);
				setSelectedPlan( idx >= 0 ? idx : 0 );
				setPlanRow( row );
			},
		},
		{
			label: 'Apply Discount',
			icon: Tag,
			disabled: row.status === 'cancelled',
			onClick: () => {
				setDiscountPct( '10' );
				setDiscountDur( 'Once' );
				setDiscountRow( row );
			},
		},
		...( row.status === 'trialing'
			? [
					{
						label: 'Extend Trial (+7 days)',
						icon: Calendar,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: Calendar,
								title: 'Extend Trial?',
								body: (
									<span>
										Add 7 more days to{ ' ' }
										<strong>{ row.customer }</strong>'s
										trial for{ ' ' }
										<strong>{ row.product }</strong>?
									</span>
								),
								confirmLabel: 'Extend Trial',
								onConfirm: () => {
									updateRow( row.id, {
										nextPayment: '2025-01-29',
									} );
									showToast(
										`Trial extended for ${ row.customer }`,
										'success'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),

		// ── Status transitions ──────────────────────────────────────────────────
		...( row.status === 'active'
			? [
					{
						label: 'Pause Subscription',
						icon: PauseCircle,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: PauseCircle,
								title: 'Pause Subscription?',
								body: (
									<span>
										Pause <strong>{ row.product }</strong>{ ' ' }
										for <strong>{ row.customer }</strong>?
										They will keep access until the end of
										the current billing period, then billing
										stops.
									</span>
								),
								confirmLabel: 'Pause Subscription',
								onConfirm: () => {
									updateRow( row.id, {
										status: 'paused',
										nextPayment: '—',
									} );
									showToast(
										`Subscription paused for ${ row.customer }`,
										'warning'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),
		...( row.status === 'paused'
			? [
					{
						label: 'Resume Subscription',
						icon: CheckCircle,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: CheckCircle,
								title: 'Resume Subscription?',
								body: (
									<span>
										Resume billing for{ ' ' }
										<strong>{ row.customer }</strong>? Their
										next payment of{ ' ' }
										<strong>{ row.amount }</strong> will be
										charged immediately and then on the
										regular cycle.
									</span>
								),
								confirmLabel: 'Resume Subscription',
								onConfirm: () => {
									updateRow( row.id, {
										status: 'active',
										nextPayment: '2025-02-15',
									} );
									showToast(
										`Subscription resumed for ${ row.customer }`,
										'success'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),

		// ── Destructive ─────────────────────────────────────────────────────────
		{
			label: 'Cancel Subscription',
			icon: XCircle,
			danger: true,
			dividerBefore: true,
			disabled: row.status === 'cancelled',
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: XCircle,
					title: 'Cancel Subscription?',
					body: (
						<span>
							Cancel <strong>{ row.product }</strong> (
							{ row.amount }) for{ ' ' }
							<strong>{ row.customer }</strong>? Access ends
							immediately and billing stops. This cannot be
							reversed without a new purchase.
						</span>
					),
					confirmLabel: 'Cancel Subscription',
					onConfirm: () => {
						updateRow( row.id, {
							status: 'cancelled',
							nextPayment: '—',
						} );
						showToast(
							`Subscription cancelled for ${ row.customer }`,
							'error'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Refund Last Payment',
			icon: RotateCcw,
			danger: true,
			disabled: row.status === 'cancelled' || row.status === 'trialing',
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: RotateCcw,
					title: 'Refund Last Payment?',
					body: (
						<span>
							Issue a full refund of{ ' ' }
							<strong>{ row.amount }</strong> to{ ' ' }
							<strong>{ row.customer }</strong>? The refund will
							be credited to their original payment method within
							5–10 business days.
						</span>
					),
					confirmLabel: 'Issue Refund',
					onConfirm: () => {
						showToast(
							`Refund of ${ row.amount } issued to ${ row.customer }`,
							'warning'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Delete Record',
			icon: Trash2,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Trash2,
					title: 'Delete Subscription Record?',
					body: (
						<span>
							Permanently delete the subscription record{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.id }
							</strong>{ ' ' }
							for <strong>{ row.customer }</strong>? All payment
							history will be lost and this cannot be undone.
						</span>
					),
					confirmLabel: 'Delete Record',
					onConfirm: () => {
						deleteRow( row.id );
						showToast(
							`Subscription ${ row.id } deleted`,
							'error'
						);
						closeDialog();
					},
				} ),
		},
	];

	// ── Plan change handler ──────────────────────────────────────────────────
	const handlePlanChange = () => {
		if ( ! planRow ) return;
		const plan = PLAN_OPTIONS[ selectedPlan ];
		updateRow( planRow.id, {
			cycle: plan.cycle,
			amount: plan.amount,
			nextPayment: plan.cycle === 'Lifetime' ? '—' : '2025-02-15',
		} );
		showToast(
			`${ planRow.customer } moved to ${ plan.label } plan`,
			'success'
		);
		setPlanRow( null );
	};

	// ── Discount apply handler ───────────────────────────────────────────────
	const handleApplyDiscount = () => {
		if ( ! discountRow ) return;
		showToast(
			`${ discountPct }% discount (${ discountDur }) applied for ${ discountRow.customer }`,
			'success'
		);
		setDiscountRow( null );
	};

	return (
		<div className="flex flex-col gap-5">
			{ /* ── KPI strip ──────────────────────────────────────────────────────── */ }
			<div className="grid grid-cols-4 gap-4">
				{ [
					{
						label: 'Active',
						value: String(
							tableData.filter( ( r ) => r.status === 'active' )
								.length
						),
						color: M3.success,
						bg: M3.successContainer,
					},
					{
						label: 'Paused',
						value: String(
							tableData.filter( ( r ) => r.status === 'paused' )
								.length
						),
						color: M3.info,
						bg: M3.infoContainer,
					},
					{
						label: 'Past Due',
						value: String(
							tableData.filter( ( r ) => r.status === 'past-due' )
								.length
						),
						color: M3.warning,
						bg: M3.warningContainer,
					},
					{
						label: 'Cancelled This Month',
						value: String(
							tableData.filter(
								( r ) => r.status === 'cancelled'
							).length
						),
						color: M3.error,
						bg: '#FFDAD6',
					},
				].map( ( s ) => (
					<Card
						key={ s.label }
						className="p-4 flex items-center gap-3"
					>
						<div
							className="w-2.5 h-10 rounded-full flex-shrink-0"
							style={ { backgroundColor: s.color } }
						/>
						<div>
							<div
								className="text-2xl font-light"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ s.value }
							</div>
							<div
								className="text-xs"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ s.label }
							</div>
						</div>
					</Card>
				) ) }
			</div>

			{ /* ── Filter bar ─────────────────────────────────────────────────────── */ }
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
						placeholder="Search subscriptions…"
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
					options={ [
						'Active',
						'Paused',
						'Past Due',
						'Cancelled',
						'Trialing',
					] }
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
					] }
					onChange={ setFilterProduct }
				/>
				<FilterChip
					label="Cycle"
					value={ filterCycle }
					options={ [ 'Monthly', 'Annual', 'Lifetime' ] }
					onChange={ setFilterCycle }
				/>
				{ ( filterStatus !== 'All' ||
					filterProduct !== 'All' ||
					filterCycle !== 'All' ) && (
					<button
						onClick={ () => {
							setFilterStatus( 'All' );
							setFilterProduct( 'All' );
							setFilterCycle( 'All' );
						} }
						className="text-xs px-3 py-1.5 rounded-full"
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
				<div className="ml-auto">
					<OutlinedButton
						small
						onClick={ () =>
							showToast(
								'Subscriptions exported as CSV',
								'success'
							)
						}
					>
						<DownloadIcon size={ 14 } /> Export CSV
					</OutlinedButton>
				</div>
			</div>

			{ /* ── Table ──────────────────────────────────────────────────────────── */ }
			<Card style={ { overflow: 'visible' } }>
				<div
					className="overflow-x-auto"
					style={ { overflowY: 'visible' } }
				>
					<table className="w-full">
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
															( s ) => s.id
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
									'ID',
									'Customer',
									'Product',
									'Amount',
									'Cycle',
									'Status',
									'Next Payment',
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
								const isPastDue = row.status === 'past-due';
								return (
									<tr
										key={ row.id }
										style={ {
											backgroundColor: isSelected
												? `${ M3.primary }14`
												: isPastDue
												? `${ M3.error }08`
												: idx % 2 === 0
												? M3.surface
												: M3.surfaceContainerLow,
										} }
										onMouseEnter={ ( e ) => {
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
													: isPastDue
													? `${ M3.error }08`
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
										<td
											className="px-3 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ row.id }
										</td>
										<td className="px-3 py-3">
											<div
												className="text-sm font-medium"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ row.customer }
											</div>
											<div
												className="text-xs"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ row.product }
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
										<td
											className="px-3 py-3 text-sm font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ row.amount }
										</td>
										<td className="px-3 py-3">
											<span
												className="text-xs px-2 py-0.5 rounded-full"
												style={ {
													backgroundColor:
														M3.surfaceContainerHigh,
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ row.cycle }
											</span>
										</td>
										<td className="px-3 py-3">
											<StatusBadge
												status={ row.status }
											/>
										</td>
										<td
											className="px-3 py-3 text-xs font-medium"
											style={ {
												color: isPastDue
													? M3.error
													: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ isPastDue && (
												<span className="mr-1">⚠</span>
											) }
											{ row.nextPayment }
										</td>
										<td
											className="px-3 py-3"
											style={ { overflow: 'visible' } }
										>
											<ActionDropdown
												actions={ rowActions( row ) }
												hint={ `${ row.id } · ${ row.customer }` }
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
						subscriptions
						{ tableData.filter( ( r ) => r.status === 'past-due' )
							.length > 0 && (
							<span
								className="ml-3 font-medium"
								style={ { color: M3.error } }
							>
								·{ ' ' }
								{
									tableData.filter(
										( r ) => r.status === 'past-due'
									).length
								}{ ' ' }
								past due
							</span>
						) }
					</span>
					<div
						className="flex items-center gap-3 text-xs"
						style={ {
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						<span className="flex items-center gap-1">
							<span
								className="inline-block w-2 h-2 rounded-full"
								style={ { backgroundColor: M3.error } }
							/>{ ' ' }
							Past due (highlighted)
						</span>
					</div>
				</div>
			</Card>

			{ /* ── Bulk action bar ─────────────────────────────────────────────────── */ }
			{ selected.length > 0 && (
				<div
					className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl z-50"
					style={ {
						backgroundColor: M3.onSurface,
						boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
					} }
				>
					<span
						className="text-sm font-medium"
						style={ {
							color: M3.surface,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						{ selected.length } selected
					</span>
					<div
						style={ {
							width: 1,
							height: 20,
							backgroundColor: M3.outlineVariant,
						} }
					/>
					<TextButton onClick={ () => setSelected( [] ) }>
						Cancel
					</TextButton>
					<TonalButton
						small
						onClick={ () =>
							openDialog( {
								open: true,
								danger: false,
								icon: PauseCircle,
								title: `Pause ${ selected.length } Subscriptions?`,
								body: `Pause billing for all ${ selected.length } selected subscriptions? Customers will keep access until their current period ends.`,
								confirmLabel: `Pause ${ selected.length }`,
								onConfirm: () => {
									setTableData( ( rows ) =>
										rows.map( ( r ) =>
											selected.includes( r.id ) &&
											r.status === 'active'
												? {
														...r,
														status: 'paused',
														nextPayment: '—',
												  }
												: r
										)
									);
									showToast(
										`${ selected.length } subscriptions paused`,
										'warning'
									);
									setSelected( [] );
									closeDialog();
								},
							} )
						}
					>
						<PauseCircle size={ 14 } /> Pause All
					</TonalButton>
					<OutlinedButton
						small
						onClick={ () =>
							showToast(
								`Receipt sent to ${ selected.length } customers`,
								'success'
							)
						}
					>
						<Mail size={ 14 } /> Send Receipts
					</OutlinedButton>
					<FilledButton
						danger
						small
						onClick={ () =>
							openDialog( {
								open: true,
								danger: true,
								icon: XCircle,
								title: `Cancel ${ selected.length } Subscriptions?`,
								body: `Immediately cancel billing for all ${ selected.length } selected subscriptions. Access ends immediately. This cannot be reversed.`,
								confirmLabel: `Cancel ${ selected.length } Subscriptions`,
								onConfirm: () => {
									setTableData( ( rows ) =>
										rows.map( ( r ) =>
											selected.includes( r.id )
												? {
														...r,
														status: 'cancelled',
														nextPayment: '—',
												  }
												: r
										)
									);
									showToast(
										`${ selected.length } subscriptions cancelled`,
										'error'
									);
									setSelected( [] );
									closeDialog();
								},
							} )
						}
					>
						<XCircle size={ 14 } /> Cancel { selected.length }
					</FilledButton>
				</div>
			) }

			{ /* ── Change Plan modal ───────────────────────────────────────────────── */ }
			{ planRow && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={ { backgroundColor: 'rgba(0,0,0,0.40)' } }
					onClick={ ( e ) => {
						if ( e.target === e.currentTarget ) setPlanRow( null );
					} }
				>
					<div
						className="rounded-3xl overflow-hidden flex flex-col"
						style={ {
							width: 480,
							backgroundColor: M3.surfaceContainer,
							boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
						} }
					>
						{ /* Header */ }
						<div className="px-6 pt-6 pb-4">
							<div
								className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
								style={ {
									backgroundColor: M3.primaryContainer,
								} }
							>
								<Repeat size={ 22 } color={ M3.primary } />
							</div>
							<div
								className="text-center font-semibold text-lg"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Change Plan
							</div>
							<div
								className="text-center text-sm mt-1"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ planRow.customer } · { planRow.product }
							</div>
						</div>

						{ /* Plan options */ }
						<div className="px-6 pb-4 flex flex-col gap-2">
							{ PLAN_OPTIONS.map( ( plan, i ) => {
								const active = selectedPlan === i;
								const isCurrent = plan.cycle === planRow.cycle;
								return (
									<button
										key={ plan.label }
										onClick={ () => setSelectedPlan( i ) }
										className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all w-full"
										style={ {
											border: `2px solid ${
												active
													? M3.primary
													: M3.outlineVariant
											}`,
											backgroundColor: active
												? M3.primaryContainer
												: M3.surfaceContainerLow,
											cursor: 'pointer',
										} }
									>
										<div
											className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
											style={ {
												border: `2px solid ${
													active
														? M3.primary
														: M3.outlineVariant
												}`,
												backgroundColor: active
													? M3.primary
													: 'transparent',
											} }
										>
											{ active && (
												<div
													className="w-2 h-2 rounded-full"
													style={ {
														backgroundColor:
															M3.onPrimary,
													} }
												/>
											) }
										</div>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<span
													className="text-sm font-medium"
													style={ {
														color: M3.onSurface,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ plan.label }
												</span>
												{ isCurrent && (
													<span
														className="text-xs px-1.5 py-0.5 rounded-full"
														style={ {
															backgroundColor:
																M3.secondaryContainer,
															color: M3.onSecondaryContainer,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														Current
													</span>
												) }
											</div>
											<div
												className="text-xs mt-0.5"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ plan.note }
											</div>
										</div>
										<div
											className="text-sm font-semibold flex-shrink-0"
											style={ {
												color: active
													? M3.primary
													: M3.onSurface,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ plan.amount }
										</div>
									</button>
								);
							} ) }
						</div>

						{ /* Proration note */ }
						<div
							className="mx-6 mb-4 px-3 py-2.5 rounded-xl text-xs"
							style={ {
								backgroundColor: M3.infoContainer,
								color: M3.info,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							ℹ The price difference will be prorated and charged
							or credited on the next billing cycle.
						</div>

						{ /* Footer */ }
						<div
							className="flex items-center justify-end gap-2 px-6 py-4"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<TextButton onClick={ () => setPlanRow( null ) }>
								Cancel
							</TextButton>
							<FilledButton
								small
								onClick={ handlePlanChange }
								disabled={
									PLAN_OPTIONS[ selectedPlan ].cycle ===
									planRow.cycle
								}
							>
								Confirm Plan Change
							</FilledButton>
						</div>
					</div>
				</div>
			) }

			{ /* ── Apply Discount modal ────────────────────────────────────────────── */ }
			{ discountRow && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={ { backgroundColor: 'rgba(0,0,0,0.40)' } }
					onClick={ ( e ) => {
						if ( e.target === e.currentTarget )
							setDiscountRow( null );
					} }
				>
					<div
						className="rounded-3xl overflow-hidden flex flex-col"
						style={ {
							width: 420,
							backgroundColor: M3.surfaceContainer,
							boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
						} }
					>
						{ /* Header */ }
						<div className="px-6 pt-6 pb-4 text-center">
							<div
								className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
								style={ {
									backgroundColor: M3.secondaryContainer,
								} }
							>
								<Tag size={ 22 } color={ M3.secondary } />
							</div>
							<div
								className="font-semibold text-lg"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Apply Discount
							</div>
							<div
								className="text-sm mt-1"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ discountRow.customer } ·{ ' ' }
								{ discountRow.product }
							</div>
						</div>

						<div className="px-6 pb-4 flex flex-col gap-4">
							{ /* Discount % */ }
							<div>
								<div
									className="text-xs font-medium mb-2"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Discount Percentage
								</div>
								<div className="flex items-center gap-3">
									<input
										type="number"
										min={ 1 }
										max={ 100 }
										value={ discountPct }
										onChange={ ( e ) =>
											setDiscountPct( e.target.value )
										}
										className="flex-1 px-3 py-2.5 rounded-lg text-2xl font-light outline-none text-center"
										style={ {
											backgroundColor:
												M3.surfaceContainerLow,
											border: `1px solid ${ M3.primary }`,
											color: M3.primary,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									/>
									<span
										className="text-2xl font-light"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										%
									</span>
								</div>
								{ /* Quick-select pills */ }
								<div className="flex gap-2 mt-2">
									{ [ '10', '15', '20', '25', '50' ].map(
										( p ) => (
											<button
												key={ p }
												onClick={ () =>
													setDiscountPct( p )
												}
												className="flex-1 py-1.5 rounded-full text-xs transition-all"
												style={ {
													backgroundColor:
														discountPct === p
															? M3.primary
															: M3.surfaceContainerHigh,
													color:
														discountPct === p
															? M3.onPrimary
															: M3.onSurfaceVariant,
													border: 'none',
													cursor: 'pointer',
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ p }%
											</button>
										)
									) }
								</div>
							</div>

							{ /* Duration */ }
							<div>
								<div
									className="text-xs font-medium mb-2"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Apply For
								</div>
								<div className="flex gap-2">
									{ DISCOUNT_DURATIONS.map( ( d ) => (
										<button
											key={ d }
											onClick={ () =>
												setDiscountDur( d )
											}
											className="flex-1 py-2 rounded-lg text-xs transition-all"
											style={ {
												backgroundColor:
													discountDur === d
														? M3.secondaryContainer
														: M3.surfaceContainerLow,
												color:
													discountDur === d
														? M3.onSecondaryContainer
														: M3.onSurfaceVariant,
												border: `1px solid ${
													discountDur === d
														? M3.secondary
														: M3.outlineVariant
												}`,
												cursor: 'pointer',
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ d }
										</button>
									) ) }
								</div>
							</div>

							{ /* Preview */ }
							<div
								className="p-3 rounded-xl"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
								} }
							>
								<div
									className="text-xs font-medium mb-2"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Preview
								</div>
								<div
									className="flex items-center justify-between text-sm"
									style={ {
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									<span
										style={ { color: M3.onSurfaceVariant } }
									>
										Current price
									</span>
									<span style={ { color: M3.onSurface } }>
										{ discountRow.amount }
									</span>
								</div>
								<div
									className="flex items-center justify-between text-sm mt-1"
									style={ {
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									<span
										style={ { color: M3.onSurfaceVariant } }
									>
										After discount
									</span>
									<span
										className="font-semibold"
										style={ { color: M3.success } }
									>
										{ ( () => {
											const base = parseFloat(
												discountRow.amount.replace(
													/[^0-9.]/g,
													''
												)
											);
											const disc =
												base *
												( 1 -
													parseInt(
														discountPct || '0'
													) /
														100 );
											const suffix =
												discountRow.amount.includes(
													'/mo'
												)
													? '/mo'
													: discountRow.amount.includes(
															'/yr'
													  )
													? '/yr'
													: '';
											return `$${ disc.toFixed(
												2
											) }${ suffix }`;
										} )() }
									</span>
								</div>
								<div
									className="flex items-center justify-between text-xs mt-1"
									style={ {
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									<span
										style={ { color: M3.onSurfaceVariant } }
									>
										Duration
									</span>
									<span style={ { color: M3.onSurface } }>
										{ discountDur }
									</span>
								</div>
							</div>
						</div>

						<div
							className="flex items-center justify-end gap-2 px-6 py-4"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<TextButton
								onClick={ () => setDiscountRow( null ) }
							>
								Cancel
							</TextButton>
							<FilledButton small onClick={ handleApplyDiscount }>
								Apply Discount
							</FilledButton>
						</div>
					</div>
				</div>
			) }

			{ /* ── Payment History modal ───────────────────────────────────────────── */ }
			{ historyRow && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={ { backgroundColor: 'rgba(0,0,0,0.40)' } }
					onClick={ ( e ) => {
						if ( e.target === e.currentTarget )
							setHistoryRow( null );
					} }
				>
					<div
						className="rounded-3xl overflow-hidden flex flex-col"
						style={ {
							width: 520,
							backgroundColor: M3.surfaceContainer,
							boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
						} }
					>
						{ /* Header */ }
						<div
							className="flex items-center justify-between px-6 py-5"
							style={ {
								borderBottom: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<div>
								<div
									className="font-semibold text-base"
									style={ {
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Payment History
								</div>
								<div
									className="text-sm mt-0.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ historyRow.customer } ·{ ' ' }
									{ historyRow.product } ·{ ' ' }
									<span
										style={ {
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ historyRow.id }
									</span>
								</div>
							</div>
							<IconButton
								icon={ XCircle }
								onClick={ () => setHistoryRow( null ) }
							/>
						</div>

						{ /* Payments list */ }
						<div
							className="p-6 flex flex-col gap-1"
							style={ { maxHeight: 400, overflowY: 'auto' } }
						>
							{ (
								paymentHistory[ historyRow.id ] ?? [
									{
										date: '—',
										amount: historyRow.amount,
										method: '—',
										status: 'paid',
									},
								]
							).map( ( p, i ) => {
								const statusStyle: Record<
									string,
									{ color: string; bg: string; label: string }
								> = {
									paid: {
										color: M3.success,
										bg: M3.successContainer,
										label: 'Paid',
									},
									failed: {
										color: M3.error,
										bg: '#FFDAD6',
										label: 'Failed',
									},
									trial: {
										color: M3.info,
										bg: M3.infoContainer,
										label: 'Trial',
									},
								};
								const s =
									statusStyle[ p.status ] ?? statusStyle.paid;
								return (
									<div
										key={ i }
										className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
										style={ {
											backgroundColor:
												i % 2 === 0
													? M3.surfaceContainerLow
													: 'transparent',
										} }
									>
										<div className="flex-1">
											<div
												className="text-sm font-medium"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ p.date }
											</div>
											<div
												className="text-xs mt-0.5"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ p.method }
											</div>
										</div>
										<div
											className="text-sm font-semibold"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ p.amount }
										</div>
										<span
											className="text-xs px-2 py-0.5 rounded-full"
											style={ {
												backgroundColor: s.bg,
												color: s.color,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ s.label }
										</span>
										{ p.status === 'paid' && (
											<button
												onClick={ () =>
													showToast(
														`Receipt for ${ p.date } sent to ${ historyRow.customer }`,
														'success'
													)
												}
												className="text-xs"
												style={ {
													color: M3.primary,
													background: 'none',
													border: 'none',
													cursor: 'pointer',
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												Receipt
											</button>
										) }
									</div>
								);
							} ) }
						</div>

						<div
							className="flex items-center justify-between px-6 py-4"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<span
								className="text-xs"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{
									( paymentHistory[ historyRow.id ] ?? [] )
										.length
								}{ ' ' }
								payment
								{ ( paymentHistory[ historyRow.id ] ?? [] )
									.length !== 1
									? 's'
									: '' }{ ' ' }
								on record
							</span>
							<OutlinedButton
								small
								onClick={ () =>
									showToast(
										'Payment history exported',
										'success'
									)
								}
							>
								<DownloadIcon size={ 14 } /> Export
							</OutlinedButton>
						</div>
					</div>
				</div>
			) }

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

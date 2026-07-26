import { useState } from 'react';
import {
	Users,
	Copy,
	ShoppingCart,
	Send,
	RefreshCw,
	Tag,
	CheckCircle,
	XCircle,
	AlertCircle,
	Ban,
	Trash2,
	DollarSign,
	Mail,
	ChevronRight,
	Search,
	Download as DownloadIcon,
	Activity,
} from 'lucide-react';
import { M3, abandonedCartData } from '../../utils/static-data';
import {
	KpiCard,
	Card,
	SectionTitle,
	FilterChip,
	OutlinedButton,
	ActionDropdown,
	TextButton,
	FilledButton,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ActionItem, ToastProps } from '../ui';

export function AbandonedCartPage() {
	const [ tableData, setTableData ] = useState( abandonedCartData );
	const [ search, setSearch ] = useState( '' );
	const [ filterStatus, setFilterStatus ] = useState( 'All' );
	const [ filterProduct, setFilterProduct ] = useState( 'All' );
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

	// Apply Discount modal state
	const [ discountRow, setDiscountRow ] = useState<
		( typeof tableData )[ 0 ] | null
	>( null );
	const [ discountCode, setDiscountCode ] = useState( '' );
	const [ discountPct, setDiscountPct ] = useState( '10' );

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
	const updateStatus = ( id: string, status: string, recovered?: boolean ) =>
		setTableData( ( rows ) =>
			rows.map( ( r ) =>
				r.id === id
					? { ...r, status, recovered: recovered ?? r.recovered }
					: r
			)
		);
	const incrementEmails = ( id: string ) =>
		setTableData( ( rows ) =>
			rows.map( ( r ) =>
				r.id === id
					? {
							...r,
							emailsSent: r.emailsSent + 1,
							lastEmail: 'Just now',
							status: 'recovering',
					  }
					: r
			)
		);

	const filtered = tableData.filter( ( r ) => {
		const matchSearch =
			! search ||
			r.customer.toLowerCase().includes( search.toLowerCase() ) ||
			r.email.toLowerCase().includes( search.toLowerCase() ) ||
			r.product.toLowerCase().includes( search.toLowerCase() );
		const matchStatus =
			filterStatus === 'All' || r.status === filterStatus.toLowerCase();
		const matchProduct =
			filterProduct === 'All' || r.product.includes( filterProduct );
		return matchSearch && matchStatus && matchProduct;
	} );

	const cartStatusStyle: Record<
		string,
		{ bg: string; text: string; label: string }
	> = {
		new: {
			bg: M3.primaryContainer,
			text: M3.onPrimaryContainer,
			label: 'New',
		},
		recovering: {
			bg: M3.warningContainer,
			text: M3.warning,
			label: 'Recovering',
		},
		recovered: {
			bg: M3.successContainer,
			text: M3.success,
			label: 'Recovered',
		},
		dismissed: {
			bg: M3.surfaceContainerHigh,
			text: M3.onSurfaceVariant,
			label: 'Dismissed',
		},
		lost: { bg: '#FFDAD6', text: M3.error, label: 'Lost' },
	};

	const rowActions = ( row: ( typeof tableData )[ 0 ] ): ActionItem[] => [
		// ── Navigation ──────────────────────────────────────────────────────
		{
			label: 'View Customer Profile',
			icon: Users,
			onClick: () =>
				showToast(
					`Customer profile for ${ row.customer } opened`,
					'info'
				),
		},
		{
			label: 'Copy Customer Email',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( row.email );
				showToast( `${ row.email } copied to clipboard`, 'info' );
			},
		},
		{
			label: 'View Cart Contents',
			icon: ShoppingCart,
			onClick: () =>
				showToast( `Cart: ${ row.product } — ${ row.value }`, 'info' ),
		},

		// ── Recovery actions ─────────────────────────────────────────────────
		{
			label: 'Send Recovery Email',
			icon: Send,
			dividerBefore: true,
			disabled:
				row.recovered ||
				row.status === 'dismissed' ||
				row.status === 'lost',
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: Send,
					title: 'Send Recovery Email?',
					body: (
						<span>
							Send email #{ row.emailsSent + 1 } to{ ' ' }
							<strong>{ row.customer }</strong> for their
							abandoned <strong>{ row.product }</strong> cart (
							{ row.value })?
							{ row.emailsSent >= 3 && (
								<span
									className="block mt-2"
									style={ { color: M3.warning } }
								>
									⚠ This is beyond the 3-email sequence.
								</span>
							) }
						</span>
					),
					confirmLabel: 'Send Email',
					onConfirm: () => {
						incrementEmails( row.id );
						showToast(
							`Recovery email sent to ${ row.customer }`,
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Resend Last Email',
			icon: RefreshCw,
			disabled:
				row.emailsSent === 0 ||
				row.recovered ||
				row.status === 'dismissed',
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: RefreshCw,
					title: 'Resend Last Email?',
					body: (
						<span>
							Resend the most recent recovery email to{ ' ' }
							<strong>{ row.customer }</strong> ({ row.email })?
						</span>
					),
					confirmLabel: 'Resend',
					onConfirm: () => {
						showToast(
							`Email resent to ${ row.customer }`,
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Apply Discount Code',
			icon: Tag,
			disabled: row.recovered || row.status === 'dismissed',
			onClick: () => {
				setDiscountCode( '' );
				setDiscountPct( '10' );
				setDiscountRow( row );
			},
		},

		// ── Status changes ───────────────────────────────────────────────────
		{
			label: 'Mark as Recovered',
			icon: CheckCircle,
			dividerBefore: true,
			disabled: row.recovered,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: CheckCircle,
					title: 'Mark as Recovered?',
					body: (
						<span>
							Mark <strong>{ row.customer }</strong>'s{ ' ' }
							<strong>{ row.product }</strong> cart ({ row.value }
							) as manually recovered?
						</span>
					),
					confirmLabel: 'Mark Recovered',
					onConfirm: () => {
						updateStatus( row.id, 'recovered', true );
						showToast(
							`${ row.customer }'s cart marked recovered`,
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Mark as Lost',
			icon: XCircle,
			disabled:
				row.recovered ||
				row.status === 'lost' ||
				row.status === 'dismissed',
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: XCircle,
					title: 'Mark as Lost?',
					body: (
						<span>
							Stop all recovery attempts for{ ' ' }
							<strong>{ row.customer }</strong>'s cart and mark as
							lost? No further emails will be sent.
						</span>
					),
					confirmLabel: 'Mark as Lost',
					onConfirm: () => {
						updateStatus( row.id, 'lost' );
						showToast(
							`Cart marked as lost for ${ row.customer }`,
							'warning'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Dismiss Cart',
			icon: AlertCircle,
			disabled:
				row.recovered ||
				row.status === 'dismissed' ||
				row.status === 'lost',
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: AlertCircle,
					title: 'Dismiss Cart?',
					body: (
						<span>
							Stop all recovery emails for{ ' ' }
							<strong>{ row.customer }</strong>'s cart (
							{ row.value }) and mark as dismissed?
						</span>
					),
					confirmLabel: 'Dismiss',
					onConfirm: () => {
						updateStatus( row.id, 'dismissed' );
						showToast(
							`Cart dismissed for ${ row.customer }`,
							'warning'
						);
						closeDialog();
					},
				} ),
		},

		// ── Destructive ──────────────────────────────────────────────────────
		{
			label: 'Blacklist Email Address',
			icon: Ban,
			danger: true,
			dividerBefore: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Ban,
					title: 'Blacklist Email Address?',
					body: (
						<span>
							Add <strong>{ row.email }</strong> to the recovery
							email blacklist? This customer will{ ' ' }
							<strong>never</strong> receive recovery emails
							again, even for future abandoned carts.
						</span>
					),
					confirmLabel: 'Blacklist Email',
					onConfirm: () => {
						updateStatus( row.id, 'dismissed' );
						showToast(
							`${ row.email } added to blacklist`,
							'error'
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
					title: 'Delete Cart Record?',
					body: (
						<span>
							Permanently delete this abandoned cart record for{ ' ' }
							<strong>{ row.customer }</strong> ({ row.product },{ ' ' }
							{ row.value })? This will be removed from all
							analytics and cannot be undone.
						</span>
					),
					confirmLabel: 'Delete Record',
					onConfirm: () => {
						setTableData( ( d ) =>
							d.filter( ( r2 ) => r2.id !== row.id )
						);
						showToast( 'Cart record deleted', 'error' );
						closeDialog();
					},
				} ),
		},
	];

	const totalRecovered = tableData.filter( ( r ) => r.recovered ).length;
	const totalAbandoned = tableData.length;
	const recoveryRate = Math.round(
		( totalRecovered / Math.max( totalAbandoned, 1 ) ) * 100
	);

	return (
		<div className="flex flex-col gap-5">
			<div className="grid grid-cols-4 gap-4">
				<KpiCard
					label="Total Abandoned"
					value={ String( totalAbandoned ) }
					trend="▲ +4.7% this week"
					trendUp={ false }
					icon={ ShoppingCart }
				/>
				<KpiCard
					label="Recovered"
					value={ String( totalRecovered ) }
					trend="▲ +10.3%"
					trendUp
					icon={ CheckCircle }
				/>
				<KpiCard
					label="Recovery Rate"
					value={ `${ recoveryRate }%` }
					trend="▲ +1.8%"
					trendUp
					icon={ Activity }
				/>
				<KpiCard
					label="Revenue Saved"
					value="$557"
					trend="▲ +10.3%"
					trendUp
					icon={ DollarSign }
				/>
			</div>

			{ /* Email sequence progress */ }
			<Card className="p-5">
				<SectionTitle>Automated Email Sequence</SectionTitle>
				<div className="flex items-stretch gap-0">
					{ [
						{
							seq: 'Email 1',
							delay: '1 hour after abandonment',
							sent: tableData.filter( ( r ) => r.emailsSent >= 1 )
								.length,
							icon: Mail,
							color: M3.primary,
						},
						{
							seq: 'Email 2',
							delay: '24 hours after abandonment',
							sent: tableData.filter( ( r ) => r.emailsSent >= 2 )
								.length,
							icon: Mail,
							color: M3.secondary,
						},
						{
							seq: 'Email 3',
							delay: '72 hours after abandonment',
							sent: tableData.filter( ( r ) => r.emailsSent >= 3 )
								.length,
							icon: Mail,
							color: M3.info,
						},
					].map( ( step, i ) => (
						<div
							key={ i }
							className="flex-1 flex items-center gap-0"
						>
							<div
								className="flex-1 p-4 rounded-xl"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
								} }
							>
								<div className="flex items-center gap-2 mb-2">
									<div
										className="w-7 h-7 rounded-lg flex items-center justify-center"
										style={ {
											backgroundColor: `${ step.color }20`,
										} }
									>
										<step.icon
											size={ 14 }
											color={ step.color }
										/>
									</div>
									<div>
										<div
											className="text-xs font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ step.seq }
										</div>
										<div
											className="text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ step.delay }
										</div>
									</div>
								</div>
								<div
									className="text-xl font-light"
									style={ {
										color: step.color,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ step.sent } sent
								</div>
							</div>
							{ i < 2 && (
								<ChevronRight
									size={ 18 }
									color={ M3.outlineVariant }
									className="flex-shrink-0 mx-2"
								/>
							) }
						</div>
					) ) }
				</div>
			</Card>

			<div className="flex items-center gap-2">
				<div
					className="flex items-center gap-2 flex-1 max-w-sm px-3 py-2 rounded-lg"
					style={ {
						backgroundColor: M3.surfaceContainerHigh,
						border: `1px solid ${ M3.outlineVariant }`,
					} }
				>
					<Search size={ 16 } color={ M3.onSurfaceVariant } />
					<input
						type="text"
						placeholder="Search carts…"
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
						'New',
						'Recovering',
						'Recovered',
						'Dismissed',
						'Lost',
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
						'SaaS Business Plan',
					] }
					onChange={ setFilterProduct }
				/>
				{ ( filterStatus !== 'All' || filterProduct !== 'All' ) && (
					<button
						onClick={ () => {
							setFilterStatus( 'All' );
							setFilterProduct( 'All' );
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
								'Abandoned cart report exported as CSV',
								'success'
							)
						}
					>
						<DownloadIcon size={ 14 } /> Export
					</OutlinedButton>
				</div>
			</div>

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
								{ [
									'Customer',
									'Product',
									'Cart Value',
									'Abandoned',
									'Emails Sent',
									'Last Email',
									'Status',
									'',
								].map( ( h ) => (
									<th
										key={ h }
										className="px-4 py-3 text-left text-xs font-medium"
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
								const s =
									cartStatusStyle[ row.status ] ??
									cartStatusStyle.new;
								return (
									<tr
										key={ row.id }
										style={ {
											backgroundColor:
												idx % 2 === 0
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
												idx % 2 === 0
													? M3.surface
													: M3.surfaceContainerLow;
										} }
									>
										<td className="px-4 py-3">
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
												{ row.email }
											</div>
										</td>
										<td
											className="px-4 py-3 text-sm"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.product }
										</td>
										<td
											className="px-4 py-3 text-sm font-semibold"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ row.value }
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.abandoned }
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center gap-1.5">
												{ [ 1, 2, 3 ].map( ( n ) => (
													<div
														key={ n }
														className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
														style={ {
															backgroundColor:
																row.emailsSent >=
																n
																	? M3.primaryContainer
																	: M3.surfaceContainerHigh,
															color:
																row.emailsSent >=
																n
																	? M3.onPrimaryContainer
																	: M3.outlineVariant,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ n }
													</div>
												) ) }
											</div>
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.lastEmail }
										</td>
										<td className="px-4 py-3">
											<span
												className="text-xs px-2 py-0.5 rounded-full"
												style={ {
													backgroundColor: s.bg,
													color: s.text,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ s.label }
											</span>
										</td>
										<td
											className="px-4 py-3"
											style={ { overflow: 'visible' } }
										>
											<ActionDropdown
												actions={ rowActions( row ) }
												hint={ `${ row.customer } · ${ row.product }` }
											/>
										</td>
									</tr>
								);
							} ) }
						</tbody>
					</table>
				</div>
				<div
					className="px-4 py-3"
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
						carts
					</span>
				</div>
			</Card>

			{ /* ── Apply Discount modal ── */ }
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
						className="rounded-3xl overflow-hidden"
						style={ {
							width: 420,
							backgroundColor: M3.surfaceContainer,
							boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
						} }
					>
						<div className="px-6 pt-6 pb-4 text-center">
							<div
								className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
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
								{ discountRow.product } · { discountRow.value }
							</div>
						</div>
						<div className="px-6 pb-4 flex flex-col gap-4">
							{ /* Coupon code input */ }
							<div>
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Coupon Code (optional)
								</div>
								<input
									type="text"
									placeholder="e.g. COMEBACK20"
									value={ discountCode }
									onChange={ ( e ) =>
										setDiscountCode(
											e.target.value.toUpperCase()
										)
									}
									className="w-full px-3 py-2.5 rounded-lg text-sm outline-none tracking-widest text-center uppercase"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${
											discountCode
												? M3.primary
												: M3.outlineVariant
										}`,
										color: M3.primary,
										fontFamily: 'Roboto Mono, monospace',
									} }
								/>
							</div>
							{ /* Discount % */ }
							<div>
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Discount Amount (%)
								</div>
								<div className="flex gap-2">
									{ [ '5', '10', '15', '20', '25', '50' ].map(
										( p ) => (
											<button
												key={ p }
												onClick={ () =>
													setDiscountPct( p )
												}
												className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
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
							{ /* Preview */ }
							<div
								className="p-3 rounded-xl"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
								} }
							>
								<div
									className="flex items-center justify-between text-xs"
									style={ {
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									<span
										style={ { color: M3.onSurfaceVariant } }
									>
										Original cart value
									</span>
									<span style={ { color: M3.onSurface } }>
										{ discountRow.value }
									</span>
								</div>
								<div
									className="flex items-center justify-between text-sm font-semibold mt-1"
									style={ {
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									<span
										style={ { color: M3.onSurfaceVariant } }
									>
										After { discountPct }% discount
									</span>
									<span style={ { color: M3.success } }>
										$
										{ (
											parseFloat(
												discountRow.value.replace(
													'$',
													''
												)
											) *
											( 1 -
												parseInt( discountPct ) / 100 )
										).toFixed( 2 ) }
									</span>
								</div>
								{ discountCode && (
									<div
										className="text-xs mt-1"
										style={ {
											color: M3.primary,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										Code: { discountCode }
									</div>
								) }
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
							<FilledButton
								small
								onClick={ () => {
									const msg = discountCode
										? `Discount code ${ discountCode } (${ discountPct }% off) sent to ${ discountRow.customer }`
										: `${ discountPct }% discount applied for ${ discountRow.customer }`;
									incrementEmails( discountRow.id );
									showToast( msg, 'success' );
									setDiscountRow( null );
								} }
							>
								Apply &amp; Send Email
							</FilledButton>
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

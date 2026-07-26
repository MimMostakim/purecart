import { useState } from 'react';
import {
	Key,
	Users,
	Copy,
	XCircle,
	CheckCircle,
	Ban,
	AlertCircle,
	Trash2,
	Download,
	Activity,
	Globe,
	Zap,
	Search,
	Download as DownloadIcon,
} from 'lucide-react';
import { M3, downloadsData, DATE_RANGE_OPTIONS } from '../../utils/static-data';
import { isInDateRange } from '../../utils/date';
import {
	KpiCard,
	FilterChip,
	OutlinedButton,
	Card,
	ActionDropdown,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ToastProps, ActionItem } from '../ui';

export function DownloadsPage() {
	const [ search, setSearch ] = useState( '' );
	const [ tableData, setTableData ] = useState( downloadsData );
	const [ filterProduct, setFilterProduct ] = useState( 'All' );
	const [ filterCountry, setFilterCountry ] = useState( 'All' );
	const [ filterStatus, setFilterStatus ] = useState( 'All' );
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

	const showToast = ( msg: string, type: ToastProps[ 'type' ] = 'info' ) => {
		setToast( { message: msg, type, visible: true } );
		setTimeout(
			() => setToast( ( t ) => ( { ...t, visible: false } ) ),
			3000
		);
	};
	const openDialog = ( opts: typeof dialog ) => setDialog( opts );
	const closeDialog = () => setDialog( ( d ) => ( { ...d, open: false } ) );

	const setValid = ( id: number, valid: boolean ) =>
		setTableData( ( rows ) =>
			rows.map( ( r ) => ( r.id === id ? { ...r, valid } : r ) )
		);
	const deleteRow = ( id: number ) =>
		setTableData( ( rows ) => rows.filter( ( r ) => r.id !== id ) );

	const filtered = tableData.filter( ( r ) => {
		const matchSearch =
			! search ||
			r.customer.toLowerCase().includes( search.toLowerCase() ) ||
			r.product.toLowerCase().includes( search.toLowerCase() ) ||
			r.ip.includes( search ) ||
			r.country.toLowerCase().includes( search.toLowerCase() );
		const matchProduct =
			filterProduct === 'All' || r.product === filterProduct;
		const matchCountry =
			filterCountry === 'All' || r.country === filterCountry;
		const matchStatus =
			filterStatus === 'All' ||
			( filterStatus === 'Valid' ? r.valid : ! r.valid );
		const matchDate =
			filterDate === 'All' || isInDateRange( r.date, filterDate );
		return (
			matchSearch &&
			matchProduct &&
			matchCountry &&
			matchStatus &&
			matchDate
		);
	} );

	const rowActions = ( row: ( typeof tableData )[ 0 ] ): ActionItem[] => [
		// ── Info / navigation ───────────────────────────────────────────
		{
			label: 'View License Detail',
			icon: Key,
			onClick: () =>
				showToast( `License ${ row.license } opened`, 'info' ),
		},
		{
			label: 'View Customer Profile',
			icon: Users,
			onClick: () =>
				showToast(
					`Customer profile for ${ row.customer } opened`,
					'info'
				),
		},

		// ── Clipboard ───────────────────────────────────────────────────
		{
			label: 'Copy IP Address',
			icon: Copy,
			dividerBefore: true,
			onClick: () => {
				navigator.clipboard?.writeText( row.ip );
				showToast( `IP ${ row.ip } copied to clipboard`, 'info' );
			},
		},
		{
			label: 'Copy License Key',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( row.license );
				showToast( 'License key copied to clipboard', 'info' );
			},
		},
		{
			label: 'Copy Download URL',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText(
					`https://cdn.example.com/${ row.product
						.toLowerCase()
						.replace( / /g, '-' ) }/${ row.version }.zip`
				);
				showToast( 'Download URL copied to clipboard', 'info' );
			},
		},

		// ── Validation ──────────────────────────────────────────────────
		...( row.valid
			? [
					{
						label: 'Mark as Invalid',
						icon: XCircle,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: true,
								icon: XCircle,
								title: 'Mark Download as Invalid?',
								body: (
									<span>
										Mark this download by{ ' ' }
										<strong>{ row.customer }</strong> (
										{ row.product }) as invalid? The record
										will be flagged for security review.
									</span>
								),
								confirmLabel: 'Mark Invalid',
								onConfirm: () => {
									setValid( row.id, false );
									showToast(
										'Download marked as invalid',
										'warning'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [
					{
						label: 'Mark as Valid',
						icon: CheckCircle,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: CheckCircle,
								title: 'Mark Download as Valid?',
								body: (
									<span>
										Clear the invalid flag on this download
										by <strong>{ row.customer }</strong>?
									</span>
								),
								confirmLabel: 'Mark Valid',
								onConfirm: () => {
									setValid( row.id, true );
									showToast(
										'Download marked as valid',
										'success'
									);
									closeDialog();
								},
							} ),
					},
			  ] ),

		// ── Security / destructive ──────────────────────────────────────
		{
			label: 'Block IP (24 hours)',
			icon: Ban,
			danger: true,
			dividerBefore: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Ban,
					title: 'Block IP Address?',
					body: (
						<span>
							Block{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>{ ' ' }
							({ row.country }) for 24 hours? All requests from
							this IP will be rejected.
						</span>
					),
					confirmLabel: 'Block for 24 hours',
					onConfirm: () => {
						showToast(
							`${ row.ip } blocked for 24 hours`,
							'error'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Block IP Permanently',
			icon: Ban,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Ban,
					title: 'Permanently Block IP?',
					body: (
						<span>
							Permanently block{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>
							? This will add it to the permanent blocklist. You
							can remove it from the Security page.
						</span>
					),
					confirmLabel: 'Block Permanently',
					onConfirm: () => {
						showToast( `${ row.ip } permanently blocked`, 'error' );
						closeDialog();
					},
				} ),
		},
		{
			label: 'Flag as Suspicious',
			icon: AlertCircle,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: AlertCircle,
					title: 'Flag as Suspicious?',
					body: (
						<span>
							Flag this download by{ ' ' }
							<strong>{ row.customer }</strong> for security
							review? An alert will be sent to the security team.
						</span>
					),
					confirmLabel: 'Flag Download',
					onConfirm: () => {
						setValid( row.id, false );
						showToast(
							'Download flagged — security team notified',
							'warning'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Revoke License',
			icon: XCircle,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: XCircle,
					title: 'Revoke License?',
					body: (
						<span>
							Revoke license{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.license }
							</strong>{ ' ' }
							for <strong>{ row.customer }</strong>? All site
							activations will be immediately invalidated.
						</span>
					),
					confirmLabel: 'Revoke License',
					onConfirm: () => {
						showToast(
							`License ${ row.license } revoked`,
							'error'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Delete Log Entry',
			icon: Trash2,
			danger: true,
			dividerBefore: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Trash2,
					title: 'Delete Log Entry?',
					body: (
						<span>
							Permanently delete this download record for{ ' ' }
							<strong>{ row.customer }</strong>? This cannot be
							undone and the entry will be removed from all
							reports.
						</span>
					),
					confirmLabel: 'Delete Entry',
					onConfirm: () => {
						deleteRow( row.id );
						showToast( 'Log entry deleted', 'error' );
						closeDialog();
					},
				} ),
		},
	];

	return (
		<div className="flex flex-col gap-5">
			{ /* KPI strip */ }
			<div className="grid grid-cols-4 gap-4">
				<KpiCard
					label="Total Downloads"
					value="38,474"
					trend="▲ +12.3%"
					trendUp
					icon={ Download }
				/>
				<KpiCard
					label="Downloads Today"
					value="1,284"
					trend="▲ +8.1%"
					trendUp
					icon={ Activity }
				/>
				<KpiCard
					label="Unique IPs Today"
					value="891"
					trend="▲ +4.6%"
					trendUp
					icon={ Globe }
				/>
				<KpiCard
					label="Bandwidth Used"
					value="142 GB"
					trend="▲ +9.2%"
					trendUp
					icon={ Zap }
				/>
			</div>

			{ /* Filter bar */ }
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
						placeholder="Search by customer, product, IP…"
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
					label="Product"
					value={ filterProduct }
					options={ [
						'Plugin Pro',
						'Theme Bundle',
						'SaaS Pro',
						'Security Module',
						'Analytics Add-on',
					] }
					onChange={ setFilterProduct }
				/>
				<FilterChip
					label="Country"
					value={ filterCountry }
					options={ [
						'United States',
						'Germany',
						'United Kingdom',
						'Canada',
						'Australia',
						'France',
						'Netherlands',
						'Japan',
						'Sweden',
						'Brazil',
					] }
					onChange={ setFilterCountry }
				/>
				<FilterChip
					label="Status"
					value={ filterStatus }
					options={ [ 'Valid', 'Invalid' ] }
					onChange={ setFilterStatus }
				/>
				<FilterChip
					label="Date Range"
					value={ filterDate }
					options={ DATE_RANGE_OPTIONS }
					onChange={ setFilterDate }
				/>
				{ ( filterProduct !== 'All' ||
					filterCountry !== 'All' ||
					filterStatus !== 'All' ||
					filterDate !== 'All' ) && (
					<button
						onClick={ () => {
							setFilterProduct( 'All' );
							setFilterCountry( 'All' );
							setFilterStatus( 'All' );
							setFilterDate( 'All' );
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
								'Download log exported as CSV',
								'success'
							)
						}
					>
						<DownloadIcon size={ 14 } /> Export Log
					</OutlinedButton>
				</div>
			</div>

			{ /* Table */ }
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
									'Version',
									'IP Address',
									'Country',
									'Date / Time',
									'Size',
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
							{ filtered.map( ( row, idx ) => (
								<tr
									key={ row.id }
									style={ {
										backgroundColor: ! row.valid
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
										 ).style.backgroundColor = ! row.valid
											? `${ M3.error }08`
											: idx % 2 === 0
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
													'Roboto Mono, monospace',
											} }
										>
											{ row.license }
										</div>
									</td>
									<td
										className="px-4 py-3 text-sm"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.product }
									</td>
									<td className="px-4 py-3">
										<span
											className="text-xs px-2 py-0.5 rounded-full"
											style={ {
												backgroundColor:
													M3.primaryContainer,
												color: M3.onPrimaryContainer,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ row.version }
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
									<td className="px-4 py-3">
										<span className="flex items-center gap-1.5">
											{ row.flag }
											<span
												className="text-xs"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ row.country }
											</span>
										</span>
									</td>
									<td
										className="px-4 py-3 text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.date }
									</td>
									<td
										className="px-4 py-3 text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.size }
									</td>
									<td className="px-4 py-3">
										{ row.valid ? (
											<span
												className="inline-flex items-center gap-1 text-xs font-medium"
												style={ { color: M3.success } }
											>
												<CheckCircle size={ 12 } />{ ' ' }
												Valid
											</span>
										) : (
											<span
												className="inline-flex items-center gap-1 text-xs font-medium"
												style={ { color: M3.error } }
											>
												<XCircle size={ 12 } /> Invalid
											</span>
										) }
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
							) ) }
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
						records
						{ tableData.filter( ( r ) => ! r.valid ).length > 0 && (
							<span
								className="ml-3 font-medium"
								style={ { color: M3.error } }
							>
								·{ ' ' }
								{
									tableData.filter( ( r ) => ! r.valid )
										.length
								}{ ' ' }
								invalid
							</span>
						) }
					</span>
					<div className="flex items-center gap-1.5">
						<div
							className="w-2 h-2 rounded-full"
							style={ { backgroundColor: M3.success } }
						/>
						<span
							className="text-xs"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Valid
						</span>
						<div
							className="w-2 h-2 rounded-full ml-3"
							style={ { backgroundColor: M3.error } }
						/>
						<span
							className="text-xs"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Invalid (highlighted)
						</span>
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

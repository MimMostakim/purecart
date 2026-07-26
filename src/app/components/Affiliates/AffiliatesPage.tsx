import { useState } from 'react';
import {
	BarChart2,
	FileText,
	Copy,
	Edit3,
	DollarSign,
	Mail,
	CheckCircle,
	XCircle,
	Ban,
	RefreshCw,
	Trash2,
	Users,
	MousePointerClick,
	Search,
	Download as DownloadIcon,
	UserPlus,
} from 'lucide-react';
import { M3, affiliatesData } from '../../utils/static-data';
import {
	KpiCard,
	FilterChip,
	OutlinedButton,
	FilledButton,
	Card,
	IconButton,
	Toggle,
	TextButton,
	TonalButton,
	ActionDropdown,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ActionItem, ToastProps } from '../ui';

export function AffiliatesPage( {
	onViewDetail,
}: {
	onViewDetail: ( id: string ) => void;
} ) {
	const [ tableData, setTableData ] = useState( affiliatesData );
	const [ search, setSearch ] = useState( '' );
	const [ filterStatus, setFilterStatus ] = useState( 'All' );
	const [ filterRate, setFilterRate ] = useState( 'All' );
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

	// Add Affiliate form
	const [ addOpen, setAddOpen ] = useState( false );
	const [ afName, setAfName ] = useState( '' );
	const [ afEmail, setAfEmail ] = useState( '' );
	const [ afWebsite, setAfWebsite ] = useState( '' );
	const [ afRate, setAfRate ] = useState( '10' );
	const [ afNotes, setAfNotes ] = useState( '' );
	const [ afAutoApprove, setAfAutoApprove ] = useState( false );
	const [ afWelcome, setAfWelcome ] = useState( true );

	// Edit Commission Rate panel
	const [ editRateRow, setEditRateRow ] = useState<
		( typeof tableData )[ 0 ] | null
	>( null );
	const [ editRateValue, setEditRateValue ] = useState( '' );

	// Conversion History modal
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

	const filtered = tableData.filter( ( r ) => {
		const matchSearch =
			! search ||
			r.name.toLowerCase().includes( search.toLowerCase() ) ||
			r.email.toLowerCase().includes( search.toLowerCase() ) ||
			r.code.toLowerCase().includes( search.toLowerCase() );
		const matchStatus =
			filterStatus === 'All' || r.status === filterStatus.toLowerCase();
		const matchRate = filterRate === 'All' || r.rate === filterRate;
		return matchSearch && matchStatus && matchRate;
	} );

	const statusStyle: Record< string, { bg: string; text: string } > = {
		active: { bg: M3.successContainer, text: M3.success },
		pending: { bg: M3.warningContainer, text: M3.warning },
		suspended: { bg: '#FFDAD6', text: M3.error },
	};

	// ── Row actions ─────────────────────────────────────────────────────────────
	const rowActions = ( row: ( typeof tableData )[ 0 ] ): ActionItem[] => [
		// Navigation
		{
			label: 'View Affiliate Details',
			icon: BarChart2,
			onClick: () => onViewDetail( row.id ),
		},
		{
			label: 'View Conversion History',
			icon: FileText,
			onClick: () => setHistoryRow( row ),
		},
		{
			label: 'Copy Referral Link',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText(
					`https://example.com/?ref=${ row.code }`
				);
				showToast( `Referral link for ${ row.name } copied`, 'info' );
			},
		},

		// Payments & rates
		{
			label: 'Edit Commission Rate',
			icon: Edit3,
			dividerBefore: true,
			onClick: () => {
				setEditRateValue( row.rate.replace( '%', '' ) );
				setEditRateRow( row );
			},
		},
		{
			label: 'Send Commission Payment',
			icon: DollarSign,
			disabled: row.status !== 'active' || row.commission === '$0',
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: DollarSign,
					title: 'Send Commission Payment?',
					body: (
						<span>
							Pay <strong>{ row.commission }</strong> owed
							commission to <strong>{ row.name }</strong>? This
							will be recorded as paid and reset the owed balance
							to $0.
						</span>
					),
					confirmLabel: 'Send Payment',
					onConfirm: () => {
						updateRow( row.id, {
							paid: `$${ (
								parseFloat(
									row.paid
										.replace( '$', '' )
										.replace( ',', '' )
								) +
								parseFloat(
									row.commission
										.replace( '$', '' )
										.replace( ',', '' )
								)
							).toLocaleString() }`,
							commission: '$0',
						} );
						showToast(
							`${ row.commission } paid to ${ row.name }`,
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Send Message',
			icon: Mail,
			onClick: () =>
				showToast( `Message sent to ${ row.email }`, 'success' ),
		},

		// Status transitions
		...( row.status === 'pending'
			? [
					{
						label: 'Approve Affiliate',
						icon: CheckCircle,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: CheckCircle,
								title: 'Approve Affiliate?',
								body: (
									<span>
										Approve <strong>{ row.name }</strong> as
										an affiliate partner? They will receive
										an email with their referral code and
										dashboard access.
									</span>
								),
								confirmLabel: 'Approve Affiliate',
								onConfirm: () => {
									updateRow( row.id, { status: 'active' } );
									showToast(
										`${ row.name } approved as affiliate`,
										'success'
									);
									closeDialog();
								},
							} ),
					},
					{
						label: 'Reject Application',
						icon: XCircle,
						danger: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: true,
								icon: XCircle,
								title: 'Reject Application?',
								body: (
									<span>
										Reject <strong>{ row.name }</strong>'s
										affiliate application? They will be
										notified by email.
									</span>
								),
								confirmLabel: 'Reject Application',
								onConfirm: () => {
									deleteRow( row.id );
									showToast(
										`${ row.name }'s application rejected`,
										'warning'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),
		...( row.status === 'suspended'
			? [
					{
						label: 'Reinstate Affiliate',
						icon: CheckCircle,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: CheckCircle,
								title: 'Reinstate Affiliate?',
								body: (
									<span>
										Restore <strong>{ row.name }</strong>'s
										affiliate status? Their referral links
										will start converting again immediately.
									</span>
								),
								confirmLabel: 'Reinstate',
								onConfirm: () => {
									updateRow( row.id, { status: 'active' } );
									showToast(
										`${ row.name } reinstated`,
										'success'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: row.status === 'active'
			? [
					{
						label: 'Suspend Affiliate',
						icon: Ban,
						danger: true,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: true,
								icon: Ban,
								title: 'Suspend Affiliate?',
								body: (
									<span>
										Suspend <strong>{ row.name }</strong>?
										Their referral code{ ' ' }
										<strong
											style={ {
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ row.code }
										</strong>{ ' ' }
										will stop converting immediately.
									</span>
								),
								confirmLabel: 'Suspend Affiliate',
								onConfirm: () => {
									updateRow( row.id, {
										status: 'suspended',
									} );
									showToast(
										`${ row.name } suspended`,
										'error'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),

		// Destructive
		{
			label: 'Regenerate Referral Code',
			icon: RefreshCw,
			danger: true,
			dividerBefore: row.status !== 'pending',
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: RefreshCw,
					title: 'Regenerate Referral Code?',
					body: (
						<span>
							Generate a new referral code for{ ' ' }
							<strong>{ row.name }</strong>? Their current code{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.code }
							</strong>{ ' ' }
							will stop working immediately. Any existing links
							using the old code will break.
						</span>
					),
					confirmLabel: 'Regenerate Code',
					onConfirm: () => {
						const newCode =
							row.name
								.split( ' ' )[ 0 ]
								.toUpperCase()
								.slice( 0, 5 ) +
							Math.floor( Math.random() * 90 + 10 );
						updateRow( row.id, { code: newCode } );
						showToast(
							`New referral code generated: ${ newCode }`,
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Remove Affiliate',
			icon: Trash2,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Trash2,
					title: 'Remove Affiliate?',
					body: (
						<span>
							Remove <strong>{ row.name }</strong> from the
							program? Their referral code will be deactivated.
							Conversion history will be retained for reporting.
						</span>
					),
					confirmLabel: 'Remove Affiliate',
					onConfirm: () => {
						deleteRow( row.id );
						showToast(
							`${ row.name } removed from affiliate program`,
							'error'
						);
						closeDialog();
					},
				} ),
		},
	];

	// ── Add Affiliate submit ─────────────────────────────────────────────────
	const handleAddAffiliate = () => {
		if ( ! afName.trim() || ! afEmail.trim() ) {
			showToast( 'Name and email are required', 'error' );
			return;
		}
		const code =
			afName
				.split( ' ' )
				.map( ( w ) => w[ 0 ] )
				.join( '' )
				.toUpperCase()
				.slice( 0, 5 ) + Math.floor( Math.random() * 90 + 10 );
		const newAff = {
			id: `AFF-${ String( tableData.length + 1 ).padStart( 3, '0' ) }`,
			name: afName.trim(),
			email: afEmail.trim(),
			code,
			clicks: 0,
			conversions: 0,
			revenue: '$0',
			commission: '$0',
			rate: `${ afRate }%`,
			status: afAutoApprove ? 'active' : 'pending',
			joined: new Date().toISOString().split( 'T' )[ 0 ],
			paid: '$0',
		};
		setTableData( ( d ) => [ newAff, ...d ] );
		if ( afWelcome )
			showToast( `${ afName } added & welcome email sent`, 'success' );
		else showToast( `${ afName } added as affiliate`, 'success' );
		setAddOpen( false );
		setAfName( '' );
		setAfEmail( '' );
		setAfWebsite( '' );
		setAfRate( '10' );
		setAfNotes( '' );
		setAfAutoApprove( false );
		setAfWelcome( true );
	};

	return (
		<div className="flex flex-col gap-5">
			{ /* ── KPI strip ── */ }
			<div className="grid grid-cols-4 gap-4">
				<KpiCard
					label="Total Affiliates"
					value={ String( tableData.length ) }
					trend="▲ +2 this month"
					trendUp
					icon={ Users }
				/>
				<KpiCard
					label="Active"
					value={ String(
						tableData.filter( ( r ) => r.status === 'active' )
							.length
					) }
					trend="▲ +1"
					trendUp
					icon={ CheckCircle }
				/>
				<KpiCard
					label="Total Clicks"
					value="17,490"
					trend="▲ +14.2%"
					trendUp
					icon={ MousePointerClick }
				/>
				<KpiCard
					label="Commission Owed"
					value="$2,683"
					trend="▲ +18.1%"
					trendUp
					icon={ DollarSign }
				/>
			</div>

			{ /* ── Filter bar ── */ }
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
						placeholder="Search affiliates…"
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
					options={ [ 'Active', 'Pending', 'Suspended' ] }
					onChange={ setFilterStatus }
				/>
				<FilterChip
					label="Rate"
					value={ filterRate }
					options={ [ '10%', '12.2%', '15%' ] }
					onChange={ setFilterRate }
				/>
				{ ( filterStatus !== 'All' || filterRate !== 'All' ) && (
					<button
						onClick={ () => {
							setFilterStatus( 'All' );
							setFilterRate( 'All' );
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
				<div className="ml-auto flex gap-2">
					<OutlinedButton
						small
						onClick={ () =>
							showToast( 'Affiliates exported as CSV', 'success' )
						}
					>
						<DownloadIcon size={ 14 } /> Export
					</OutlinedButton>
					<FilledButton small onClick={ () => setAddOpen( true ) }>
						<UserPlus size={ 14 } /> Add Affiliate
					</FilledButton>
				</div>
			</div>

			{ /* ── Add Affiliate form panel ── */ }
			{ addOpen && (
				<Card
					className="overflow-hidden"
					style={ { border: `2px solid ${ M3.primary }` } }
				>
					<div
						className="flex items-center justify-between px-6 py-4"
						style={ {
							backgroundColor: M3.primaryContainer,
							borderBottom: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						<div className="flex items-center gap-3">
							<div
								className="w-8 h-8 rounded-lg flex items-center justify-center"
								style={ { backgroundColor: M3.primary } }
							>
								<UserPlus size={ 16 } color={ M3.onPrimary } />
							</div>
							<div>
								<div
									className="font-medium text-sm"
									style={ {
										color: M3.onPrimaryContainer,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Add New Affiliate
								</div>
								<div
									className="text-xs"
									style={ {
										color: M3.onPrimaryContainer,
										opacity: 0.7,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									A unique referral code is generated
									automatically on submission.
								</div>
							</div>
						</div>
						<IconButton
							icon={ XCircle }
							onClick={ () => setAddOpen( false ) }
						/>
					</div>

					<div
						className="p-6 grid gap-5"
						style={ { gridTemplateColumns: '1fr 1fr' } }
					>
						{ /* Left */ }
						<div className="flex flex-col gap-4">
							{ [
								{
									label: 'Full Name *',
									value: afName,
									setter: setAfName,
									placeholder: 'Jane Smith',
									type: 'text',
								},
								{
									label: 'Email Address *',
									value: afEmail,
									setter: setAfEmail,
									placeholder: 'jane@theirblog.com',
									type: 'email',
								},
								{
									label: 'Website / Platform',
									value: afWebsite,
									setter: setAfWebsite,
									placeholder: 'https://theirblog.com',
									type: 'url',
								},
							].map( ( f ) => (
								<div key={ f.label }>
									<div
										className="text-xs font-medium mb-1.5"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
											textTransform: 'uppercase',
											letterSpacing: '0.5px',
										} }
									>
										{ f.label }
									</div>
									<input
										type={ f.type }
										value={ f.value }
										placeholder={ f.placeholder }
										onChange={ ( e ) =>
											f.setter( e.target.value )
										}
										className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
										style={ {
											backgroundColor:
												M3.surfaceContainerLow,
											border: `1px solid ${
												f.value
													? M3.primary
													: M3.outlineVariant
											}`,
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									/>
								</div>
							) ) }
							{ /* Commission rate */ }
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
									Commission Rate (%)
								</div>
								<div className="flex items-center gap-3">
									<input
										type="number"
										min={ 1 }
										max={ 50 }
										value={ afRate }
										onChange={ ( e ) =>
											setAfRate( e.target.value )
										}
										className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
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
										className="text-sm"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										%
									</span>
								</div>
								<div className="flex gap-2 mt-2">
									{ [ '5', '10', '15', '20', '25' ].map(
										( p ) => (
											<button
												key={ p }
												onClick={ () => setAfRate( p ) }
												className="flex-1 py-1.5 rounded-full text-xs transition-all"
												style={ {
													backgroundColor:
														afRate === p
															? M3.primary
															: M3.surfaceContainerHigh,
													color:
														afRate === p
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
						</div>

						{ /* Right */ }
						<div className="flex flex-col gap-4">
							<div className="flex-1">
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Notes (internal)
								</div>
								<textarea
									placeholder="e.g. Reached out via email, runs a WP tutorial blog with 50k monthly readers."
									value={ afNotes }
									onChange={ ( e ) =>
										setAfNotes( e.target.value )
									}
									className="w-full px-3 py-2.5 rounded-lg text-sm resize-none outline-none"
									rows={ 5 }
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${ M3.outlineVariant }`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
										lineHeight: 1.6,
									} }
								/>
							</div>

							{ /* Options */ }
							<div
								className="flex flex-col gap-4 pt-2"
								style={ {
									borderTop: `1px solid ${ M3.outlineVariant }`,
								} }
							>
								{ [
									{
										label: 'Auto-approve (skip review)',
										desc: 'Set status to Active immediately.',
										value: afAutoApprove,
										setter: setAfAutoApprove,
									},
									{
										label: 'Send welcome email',
										desc: 'Includes referral code and dashboard link.',
										value: afWelcome,
										setter: setAfWelcome,
									},
								].map( ( opt ) => (
									<div
										key={ opt.label }
										className="flex items-center justify-between gap-3"
									>
										<div>
											<div
												className="text-sm"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ opt.label }
											</div>
											<div
												className="text-xs"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ opt.desc }
											</div>
										</div>
										<Toggle
											on={ opt.value }
											onChange={ opt.setter }
										/>
									</div>
								) ) }
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
									className="flex items-center justify-between text-xs"
									style={ {
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									<span
										style={ { color: M3.onSurfaceVariant } }
									>
										Referral Code
									</span>
									<span
										className="font-medium"
										style={ {
											color: M3.primary,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ afName
											? afName
													.split( ' ' )
													.map( ( w ) => w[ 0 ] )
													.join( '' )
													.toUpperCase()
													.slice( 0, 5 ) + 'XX'
											: 'CODE_XX' }
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
										Commission
									</span>
									<span
										className="font-medium"
										style={ { color: M3.onSurface } }
									>
										{ afRate }%
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
										Initial Status
									</span>
									<span
										className="font-medium"
										style={ {
											color: afAutoApprove
												? M3.success
												: M3.warning,
										} }
									>
										{ afAutoApprove
											? 'Active'
											: 'Pending Review' }
									</span>
								</div>
							</div>
						</div>
					</div>

					<div
						className="flex items-center justify-end gap-2 px-6 py-4"
						style={ {
							borderTop: `1px solid ${ M3.outlineVariant }`,
							backgroundColor: M3.surfaceContainerLow,
						} }
					>
						<TextButton onClick={ () => setAddOpen( false ) }>
							Cancel
						</TextButton>
						<FilledButton small onClick={ handleAddAffiliate }>
							<UserPlus size={ 14 } /> Add Affiliate
						</FilledButton>
					</div>
				</Card>
			) }

			{ /* ── Edit Commission Rate panel ── */ }
			{ editRateRow && (
				<Card
					className="p-5 flex items-center gap-5"
					style={ { border: `2px solid ${ M3.secondary }` } }
				>
					<div
						className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
						style={ { backgroundColor: M3.secondaryContainer } }
					>
						<Edit3 size={ 18 } color={ M3.secondary } />
					</div>
					<div className="flex-1">
						<div
							className="text-sm font-medium"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Edit Commission Rate —{ ' ' }
							<span style={ { color: M3.secondary } }>
								{ editRateRow.name }
							</span>
						</div>
						<div
							className="text-xs mt-0.5"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Current rate: <strong>{ editRateRow.rate }</strong>{ ' ' }
							· Revenue generated: { editRateRow.revenue }
						</div>
					</div>
					<div className="flex items-center gap-3 flex-shrink-0">
						<div className="flex items-center gap-2">
							<input
								type="number"
								min={ 1 }
								max={ 50 }
								value={ editRateValue }
								onChange={ ( e ) =>
									setEditRateValue( e.target.value )
								}
								className="w-20 px-3 py-2 rounded-lg text-lg font-light outline-none text-center"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
									border: `1px solid ${ M3.secondary }`,
									color: M3.secondary,
									fontFamily: 'Roboto Mono, monospace',
								} }
							/>
							<span
								className="text-lg"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								%
							</span>
						</div>
						<div className="flex gap-1">
							{ [ '5', '10', '15', '20' ].map( ( p ) => (
								<button
									key={ p }
									onClick={ () => setEditRateValue( p ) }
									className="w-10 h-8 rounded-lg text-xs"
									style={ {
										backgroundColor:
											editRateValue === p
												? M3.secondary
												: M3.surfaceContainerHigh,
										color:
											editRateValue === p
												? M3.onSecondary
												: M3.onSurfaceVariant,
										border: 'none',
										cursor: 'pointer',
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ p }%
								</button>
							) ) }
						</div>
					</div>
					<div className="flex gap-2 flex-shrink-0">
						<TextButton onClick={ () => setEditRateRow( null ) }>
							Cancel
						</TextButton>
						<TonalButton
							small
							onClick={ () => {
								updateRow( editRateRow.id, {
									rate: `${ editRateValue }%`,
								} );
								showToast(
									`Commission rate updated to ${ editRateValue }% for ${ editRateRow.name }`,
									'success'
								);
								setEditRateRow( null );
							} }
						>
							Save Rate
						</TonalButton>
					</div>
				</Card>
			) }

			{ /* ── Table ── */ }
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
									'Affiliate',
									'Ref. Code',
									'Clicks',
									'Conversions',
									'Revenue',
									'Commission',
									'Rate',
									'Status',
									'Paid Out',
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
										backgroundColor:
											editRateRow?.id === row.id
												? `${ M3.secondary }10`
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
											editRateRow?.id === row.id
												? `${ M3.secondary }10`
												: idx % 2 === 0
												? M3.surface
												: M3.surfaceContainerLow;
									} }
								>
									<td className="px-4 py-3">
										<button
											onClick={ () =>
												onViewDetail( row.id )
											}
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
												{ row.name }
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
									<td className="px-4 py-3">
										<div className="flex items-center gap-1">
											<span
												className="text-xs font-medium"
												style={ {
													fontFamily:
														'Roboto Mono, monospace',
													color: M3.primary,
												} }
											>
												{ row.code }
											</span>
											<button
												onClick={ () => {
													navigator.clipboard?.writeText(
														`https://example.com/?ref=${ row.code }`
													);
													showToast(
														'Referral link copied',
														'info'
													);
												} }
												style={ {
													background: 'none',
													border: 'none',
													cursor: 'pointer',
													padding: 0,
													opacity: 0.5,
												} }
											>
												<Copy
													size={ 11 }
													color={
														M3.onSurfaceVariant
													}
												/>
											</button>
										</div>
									</td>
									<td
										className="px-4 py-3 text-sm font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.clicks.toLocaleString() }
									</td>
									<td
										className="px-4 py-3 text-sm font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.conversions }
									</td>
									<td
										className="px-4 py-3 text-sm font-medium"
										style={ {
											color: M3.success,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.revenue }
									</td>
									<td
										className="px-4 py-3 text-sm font-medium"
										style={ {
											color: M3.primary,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.commission }
									</td>
									<td className="px-4 py-3">
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
											{ row.rate }
										</span>
									</td>
									<td className="px-4 py-3">
										<span
											className="text-xs px-2 py-0.5 rounded-full capitalize"
											style={ {
												backgroundColor:
													statusStyle[ row.status ]
														?.bg,
												color: statusStyle[ row.status ]
													?.text,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.status }
										</span>
									</td>
									<td
										className="px-4 py-3 text-xs font-medium"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.paid }
									</td>
									<td
										className="px-4 py-3"
										style={ { overflow: 'visible' } }
									>
										<ActionDropdown
											actions={ rowActions( row ) }
											hint={ `${ row.name } · ${ row.code }` }
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
						affiliates
						{ tableData.filter( ( r ) => r.status === 'pending' )
							.length > 0 && (
							<span
								className="ml-3 font-medium"
								style={ { color: M3.warning } }
							>
								·{ ' ' }
								{
									tableData.filter(
										( r ) => r.status === 'pending'
									).length
								}{ ' ' }
								pending approval
							</span>
						) }
					</span>
				</div>
			</Card>

			{ /* ── Conversion History modal ── */ }
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
						className="rounded-3xl overflow-hidden"
						style={ {
							width: 560,
							backgroundColor: M3.surfaceContainer,
							boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
						} }
					>
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
									Conversion History
								</div>
								<div
									className="text-sm mt-0.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ historyRow.name } · Code:{ ' ' }
									<span
										style={ {
											fontFamily:
												'Roboto Mono, monospace',
											color: M3.primary,
										} }
									>
										{ historyRow.code }
									</span>
								</div>
							</div>
							<IconButton
								icon={ XCircle }
								onClick={ () => setHistoryRow( null ) }
							/>
						</div>

						{ /* Summary strip */ }
						<div
							className="grid grid-cols-3 gap-0"
							style={ {
								borderBottom: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							{ [
								{
									label: 'Total Clicks',
									value: historyRow.clicks.toLocaleString(),
								},
								{
									label: 'Conversions',
									value: String( historyRow.conversions ),
								},
								{
									label: 'Total Revenue',
									value: historyRow.revenue,
								},
							].map( ( s, i ) => (
								<div
									key={ s.label }
									className="p-4 text-center"
									style={ {
										borderRight:
											i < 2
												? `1px solid ${ M3.outlineVariant }`
												: 'none',
									} }
								>
									<div
										className="text-xl font-light"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ s.value }
									</div>
									<div
										className="text-xs mt-0.5"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ s.label }
									</div>
								</div>
							) ) }
						</div>

						{ /* Recent conversions */ }
						<div
							className="p-5 flex flex-col gap-1"
							style={ { maxHeight: 320, overflowY: 'auto' } }
						>
							<div
								className="text-xs font-medium mb-2"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								} }
							>
								Recent Conversions
							</div>
							{ [
								{
									customer: 'felix@wagner.de',
									product: 'Plugin Pro Annual',
									value: '$99',
									commission: `$${ Math.round(
										( 99 * parseInt( historyRow.rate ) ) /
											100
									) }`,
									date: '2025-01-10',
								},
								{
									customer: 'sophie@martin.fr',
									product: 'Theme Bundle',
									value: '$59',
									commission: `$${ Math.round(
										( 59 * parseInt( historyRow.rate ) ) /
											100
									) }`,
									date: '2025-01-08',
								},
								{
									customer: 'yuki@tanaka.jp',
									product: 'Plugin Pro Annual',
									value: '$99',
									commission: `$${ Math.round(
										( 99 * parseInt( historyRow.rate ) ) /
											100
									) }`,
									date: '2025-01-05',
								},
								{
									customer: 'peter@harris.com',
									product: 'SaaS Starter',
									value: '$49',
									commission: `$${ Math.round(
										( 49 * parseInt( historyRow.rate ) ) /
											100
									) }`,
									date: '2024-12-28',
								},
								{
									customer: 'anna@schmidt.de',
									product: 'Plugin Pro Monthly',
									value: '$9',
									commission: `$${ Math.round(
										( 9 * parseInt( historyRow.rate ) ) /
											100
									) }`,
									date: '2024-12-20',
								},
							].map( ( item, i ) => (
								<div
									key={ i }
									className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
									style={ {
										backgroundColor:
											i % 2 === 0
												? M3.surfaceContainerLow
												: 'transparent',
									} }
								>
									<div className="flex-1 min-w-0">
										<div
											className="text-sm"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ item.product }
										</div>
										<div
											className="text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ item.customer } · { item.date }
										</div>
									</div>
									<div className="text-right flex-shrink-0">
										<div
											className="text-sm font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ item.value }
										</div>
										<div
											className="text-xs"
											style={ {
												color: M3.success,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											+{ item.commission }
										</div>
									</div>
								</div>
							) ) }
						</div>

						<div
							className="flex justify-end px-6 py-4"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<OutlinedButton
								small
								onClick={ () =>
									showToast(
										'Conversion history exported',
										'success'
									)
								}
							>
								<DownloadIcon size={ 14 } /> Export CSV
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

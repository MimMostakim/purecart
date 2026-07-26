import { useState } from 'react';
import {
	Users,
	BarChart2,
	UserPlus,
	Mail,
	Send,
	RefreshCw,
	Repeat,
	Tag,
	CheckCircle,
	Ban,
	ShieldCheck,
	Trash2,
	Cloud,
	Clock,
	DollarSign,
	Search,
	Download as DownloadIcon,
	XCircle,
} from 'lucide-react';
import { M3, saasAccountsData, SAAS_PLANS } from '../../utils/static-data';
import {
	KpiCard,
	FilterChip,
	OutlinedButton,
	FilledButton,
	Card,
	IconButton,
	Toggle,
	TextButton,
	StatusBadge,
	ActionDropdown,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ActionItem, ToastProps } from '../ui';

export function SaasPage( {
	onViewDetail,
}: {
	onViewDetail: ( id: string ) => void;
} ) {
	const [ tableData, setTableData ] = useState( saasAccountsData );
	const [ search, setSearch ] = useState( '' );
	const [ filterPlan, setFilterPlan ] = useState( 'All' );
	const [ filterStatus, setFilterStatus ] = useState( 'All' );
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

	// New Account form
	const [ newOpen, setNewOpen ] = useState( false );
	const [ naName, setNaName ] = useState( '' );
	const [ naEmail, setNaEmail ] = useState( '' );
	const [ naWebsite, setNaWebsite ] = useState( '' );
	const [ naPlan, setNaPlan ] = useState( 0 );
	const [ naSeats, setNaSeats ] = useState( '5' );
	const [ naTrial, setNaTrial ] = useState( true );
	const [ naWelcome, setNaWelcome ] = useState( true );

	// Manage Seats modal
	const [ seatsRow, setSeatsRow ] = useState<
		( typeof tableData )[ 0 ] | null
	>( null );
	const [ seatsValue, setSeatsValue ] = useState( '' );

	// Change Plan modal
	const [ planRow, setPlanRow ] = useState<
		( typeof tableData )[ 0 ] | null
	>( null );
	const [ planIdx, setPlanIdx ] = useState( 0 );

	// Usage Report modal
	const [ usageRow, setUsageRow ] = useState<
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
			r.account.toLowerCase().includes( search.toLowerCase() ) ||
			r.owner.toLowerCase().includes( search.toLowerCase() ) ||
			r.plan.toLowerCase().includes( search.toLowerCase() );
		const matchPlan = filterPlan === 'All' || r.plan === filterPlan;
		const matchStatus =
			filterStatus === 'All' ||
			r.status === filterStatus.toLowerCase().replace( ' ', '-' );
		return matchSearch && matchPlan && matchStatus;
	} );

	const planColor: Record< string, { bg: string; text: string } > = {
		Starter: { bg: M3.surfaceContainerHigh, text: M3.onSurfaceVariant },
		Business: { bg: M3.secondaryContainer, text: M3.onSecondaryContainer },
		Enterprise: { bg: M3.primaryContainer, text: M3.onPrimaryContainer },
	};

	// ── Row actions ─────────────────────────────────────────────────────────────
	const rowActions = ( row: ( typeof tableData )[ 0 ] ): ActionItem[] => [
		// Navigation
		{
			label: 'View Account Details',
			icon: Users,
			onClick: () => onViewDetail( row.id ),
		},
		{
			label: 'View Usage Report',
			icon: BarChart2,
			onClick: () => setUsageRow( row ),
		},
		{
			label: 'Manage Seats',
			icon: UserPlus,
			onClick: () => {
				setSeatsValue( row.seats.split( '/' )[ 1 ] );
				setSeatsRow( row );
			},
		},

		// Billing
		{
			label: 'Send Invoice',
			icon: Mail,
			dividerBefore: true,
			onClick: () =>
				showToast( `Invoice sent to ${ row.owner }`, 'success' ),
		},
		{
			label: 'Send Welcome Email',
			icon: Send,
			onClick: () =>
				showToast( `Welcome email sent to ${ row.owner }`, 'success' ),
		},
		...( row.status === 'past-due'
			? [
					{
						label: 'Retry Payment',
						icon: RefreshCw,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: RefreshCw,
								title: 'Retry Payment?',
								body: (
									<span>
										Retry the outstanding payment for{ ' ' }
										<strong>{ row.account }</strong> (
										{ row.mrr })?
									</span>
								),
								confirmLabel: 'Retry Payment',
								onConfirm: () => {
									updateRow( row.id, {
										status: 'active',
										nextBilling: '2025-02-12',
									} );
									showToast(
										`Payment retried for ${ row.account }`,
										'success'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),

		// Plan management
		{
			label: 'Change Plan',
			icon: Repeat,
			dividerBefore: true,
			disabled: row.status === 'suspended',
			onClick: () => {
				const idx = SAAS_PLANS.findIndex(
					( p ) => p.label === row.plan
				);
				setPlanIdx( idx >= 0 ? idx : 0 );
				setPlanRow( row );
			},
		},
		{
			label: 'Apply Coupon',
			icon: Tag,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: Tag,
					title: 'Apply Coupon Code',
					body: (
						<div className="flex flex-col gap-3">
							<span>
								Enter a coupon code to apply to{ ' ' }
								<strong>{ row.account }</strong>'s next invoice.
							</span>
							<input
								type="text"
								placeholder="COUPON_CODE"
								className="w-full px-3 py-2.5 rounded-lg text-sm outline-none text-center uppercase tracking-widest"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
									border: `1px solid ${ M3.outline }`,
									color: M3.onSurface,
									fontFamily: 'Roboto Mono, monospace',
								} }
							/>
						</div>
					),
					confirmLabel: 'Apply Coupon',
					onConfirm: () => {
						showToast(
							`Coupon applied to ${ row.account }`,
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Transfer Ownership',
			icon: Users,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: Users,
					title: 'Transfer Account Ownership?',
					body: (
						<div className="flex flex-col gap-3">
							<span>
								Transfer <strong>{ row.account }</strong> to a
								new owner. Enter the new owner's email:
							</span>
							<input
								type="email"
								placeholder="newowner@company.com"
								className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
									border: `1px solid ${ M3.outline }`,
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							/>
						</div>
					),
					confirmLabel: 'Transfer Ownership',
					onConfirm: () => {
						showToast(
							`Ownership transfer initiated for ${ row.account }`,
							'success'
						);
						closeDialog();
					},
				} ),
		},

		// Destructive
		{
			label:
				row.status === 'suspended'
					? 'Reinstate Account'
					: 'Suspend Account',
			icon: row.status === 'suspended' ? CheckCircle : Ban,
			danger: row.status !== 'suspended',
			dividerBefore: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: row.status !== 'suspended',
					icon: row.status === 'suspended' ? CheckCircle : Ban,
					title:
						row.status === 'suspended'
							? 'Reinstate Account?'
							: 'Suspend Account?',
					body:
						row.status === 'suspended' ? (
							<span>
								Restore full access for{ ' ' }
								<strong>{ row.account }</strong>? All users will
								regain their seats immediately.
							</span>
						) : (
							<span>
								Suspend <strong>{ row.account }</strong>? All{ ' ' }
								<strong>
									{ row.seats.split( '/' )[ 0 ] } active users
								</strong>{ ' ' }
								will lose access immediately.
							</span>
						),
					confirmLabel:
						row.status === 'suspended'
							? 'Reinstate Account'
							: 'Suspend Account',
					onConfirm: () => {
						updateRow( row.id, {
							status:
								row.status === 'suspended'
									? 'active'
									: 'suspended',
						} );
						showToast(
							row.status === 'suspended'
								? `${ row.account } reinstated`
								: `${ row.account } suspended`,
							row.status === 'suspended' ? 'success' : 'error'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Force Logout All Users',
			icon: ShieldCheck,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: ShieldCheck,
					title: 'Force Logout All Users?',
					body: (
						<span>
							Invalidate all active sessions for{ ' ' }
							<strong>{ row.account }</strong>? All{ ' ' }
							<strong>
								{ row.seats.split( '/' )[ 0 ] } users
							</strong>{ ' ' }
							will be logged out immediately and must sign in
							again.
						</span>
					),
					confirmLabel: 'Force Logout',
					onConfirm: () => {
						showToast(
							`All sessions ended for ${ row.account }`,
							'warning'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Delete Account',
			icon: Trash2,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Trash2,
					title: 'Delete Account?',
					body: (
						<span>
							Permanently delete <strong>{ row.account }</strong>?
							All users, data, and billing history will be
							destroyed. This cannot be undone.
						</span>
					),
					confirmLabel: 'Delete Account',
					onConfirm: () => {
						deleteRow( row.id );
						showToast( `${ row.account } deleted`, 'error' );
						closeDialog();
					},
				} ),
		},
	];

	// ── New Account submit ──────────────────────────────────────────────────────
	const handleCreateAccount = () => {
		if ( ! naName.trim() || ! naEmail.trim() ) {
			showToast( 'Account name and email are required', 'error' );
			return;
		}
		const plan = SAAS_PLANS[ naPlan ];
		const newAcc = {
			id: `SAAS-${ String( tableData.length + 1 ).padStart( 3, '0' ) }`,
			account: naName.trim(),
			owner: naEmail.trim(),
			plan: plan.label,
			seats: `0/${ naSeats }`,
			mrr: plan.mrr,
			status: naTrial ? 'trialing' : 'active',
			created: new Date().toISOString().split( 'T' )[ 0 ],
			nextBilling: naTrial
				? new Date( Date.now() + 14 * 86400000 )
						.toISOString()
						.split( 'T' )[ 0 ]
				: new Date( Date.now() + 30 * 86400000 )
						.toISOString()
						.split( 'T' )[ 0 ],
		};
		setTableData( ( d ) => [ newAcc, ...d ] );
		if ( naWelcome )
			showToast(
				`Account created & welcome email sent to ${ naEmail }`,
				'success'
			);
		else showToast( `${ naName } account created`, 'success' );
		setNewOpen( false );
		setNaName( '' );
		setNaEmail( '' );
		setNaWebsite( '' );
		setNaPlan( 0 );
		setNaSeats( '5' );
		setNaTrial( true );
		setNaWelcome( true );
	};

	return (
		<div className="flex flex-col gap-5">
			{ /* ── KPI strip ── */ }
			<div className="grid grid-cols-4 gap-4">
				<KpiCard
					label="Total Accounts"
					value={ String( tableData.length ) }
					trend="▲ +3 this month"
					trendUp
					icon={ Cloud }
				/>
				<KpiCard
					label="Active"
					value={ String(
						tableData.filter( ( r ) => r.status === 'active' )
							.length
					) }
					trend="▲ +2"
					trendUp
					icon={ CheckCircle }
				/>
				<KpiCard
					label="Trialing"
					value={ String(
						tableData.filter( ( r ) => r.status === 'trialing' )
							.length
					) }
					trend="Converts in 12d"
					trendUp={ false }
					icon={ Clock }
				/>
				<KpiCard
					label="MRR from SaaS"
					value="$1,814"
					trend="▲ +6.1%"
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
						placeholder="Search accounts…"
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
					label="Plan"
					value={ filterPlan }
					options={ [ 'Starter', 'Business', 'Enterprise' ] }
					onChange={ setFilterPlan }
				/>
				<FilterChip
					label="Status"
					value={ filterStatus }
					options={ [
						'Active',
						'Trialing',
						'Suspended',
						'Past Due',
					] }
					onChange={ setFilterStatus }
				/>
				{ ( filterPlan !== 'All' || filterStatus !== 'All' ) && (
					<button
						onClick={ () => {
							setFilterPlan( 'All' );
							setFilterStatus( 'All' );
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
							showToast( 'Accounts exported as CSV', 'success' )
						}
					>
						<DownloadIcon size={ 14 } /> Export
					</OutlinedButton>
					<FilledButton small onClick={ () => setNewOpen( true ) }>
						<UserPlus size={ 14 } /> New Account
					</FilledButton>
				</div>
			</div>

			{ /* ── New Account form panel ── */ }
			{ newOpen && (
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
								<Cloud size={ 16 } color={ M3.onPrimary } />
							</div>
							<div>
								<div
									className="font-medium text-sm"
									style={ {
										color: M3.onPrimaryContainer,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Create New SaaS Account
								</div>
								<div
									className="text-xs"
									style={ {
										color: M3.onPrimaryContainer,
										opacity: 0.7,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									The account owner will receive a welcome
									email with login instructions.
								</div>
							</div>
						</div>
						<IconButton
							icon={ XCircle }
							onClick={ () => setNewOpen( false ) }
						/>
					</div>

					<div
						className="p-6 grid gap-5"
						style={ { gridTemplateColumns: '1fr 1fr' } }
					>
						{ /* Left column */ }
						<div className="flex flex-col gap-4">
							{ [
								{
									label: 'Company / Account Name *',
									value: naName,
									setter: setNaName,
									placeholder: 'Acme Corp',
									type: 'text',
								},
								{
									label: 'Owner Email *',
									value: naEmail,
									setter: setNaEmail,
									placeholder: 'owner@company.com',
									type: 'email',
								},
								{
									label: 'Website',
									value: naWebsite,
									setter: setNaWebsite,
									placeholder: 'https://company.com',
									type: 'url',
								},
								{
									label: 'Initial Seat Count',
									value: naSeats,
									setter: setNaSeats,
									placeholder: '5',
									type: 'number',
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
						</div>

						{ /* Right column */ }
						<div className="flex flex-col gap-4">
							{ /* Plan selection */ }
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
									Plan *
								</div>
								<div className="flex flex-col gap-2">
									{ SAAS_PLANS.map( ( plan, i ) => {
										const active = naPlan === i;
										const pc = planColor[ plan.label ];
										return (
											<button
												key={ plan.label }
												onClick={ () => {
													setNaPlan( i );
													setNaSeats(
														String( plan.seats )
													);
												} }
												className="flex items-center gap-3 p-3 rounded-xl text-left w-full transition-all"
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
													className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
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
															className="w-1.5 h-1.5 rounded-full"
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
															className="text-xs font-medium px-1.5 py-0.5 rounded-full"
															style={ {
																backgroundColor:
																	pc.bg,
																color: pc.text,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ plan.label }
														</span>
														<span
															className="text-xs"
															style={ {
																color: M3.onSurfaceVariant,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ plan.note }
														</span>
													</div>
												</div>
												<span
													className="text-sm font-semibold flex-shrink-0"
													style={ {
														color: active
															? M3.primary
															: M3.onSurface,
														fontFamily:
															'Roboto Mono, monospace',
													} }
												>
													{ plan.mrr }/mo
												</span>
											</button>
										);
									} ) }
								</div>
							</div>

							{ /* Options */ }
							<div
								className="flex flex-col gap-3 pt-2"
								style={ {
									borderTop: `1px solid ${ M3.outlineVariant }`,
								} }
							>
								{ [
									{
										label: 'Start with 14-day free trial',
										desc: 'No charge until trial ends.',
										value: naTrial,
										setter: setNaTrial,
									},
									{
										label: 'Send welcome email to owner',
										desc: 'Includes login link and onboarding.',
										value: naWelcome,
										setter: setNaWelcome,
									},
								].map( ( opt ) => (
									<div
										key={ opt.label }
										className="flex items-center justify-between gap-4"
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
						</div>
					</div>

					<div
						className="flex items-center justify-end gap-2 px-6 py-4"
						style={ {
							borderTop: `1px solid ${ M3.outlineVariant }`,
							backgroundColor: M3.surfaceContainerLow,
						} }
					>
						<TextButton onClick={ () => setNewOpen( false ) }>
							Cancel
						</TextButton>
						<FilledButton small onClick={ handleCreateAccount }>
							<Cloud size={ 14 } /> Create Account
						</FilledButton>
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
									'Account',
									'Plan',
									'Seats',
									'MRR',
									'Status',
									'Next Billing',
									'Created',
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
								const [ used, max ] = row.seats
									.split( '/' )
									.map( Number );
								const pct = Math.round( ( used / max ) * 100 );
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
											<div className="flex items-center gap-2.5">
												<div
													className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0"
													style={ {
														backgroundColor:
															M3.primaryContainer,
														color: M3.onPrimaryContainer,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ row.account
														.slice( 0, 2 )
														.toUpperCase() }
												</div>
												<div>
													<button
														onClick={ () =>
															onViewDetail(
																row.id
															)
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
															{ row.account }
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
														{ row.owner }
													</div>
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<span
												className="text-xs px-2 py-0.5 rounded-full"
												style={ {
													backgroundColor:
														planColor[ row.plan ]
															?.bg,
													color: planColor[ row.plan ]
														?.text,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ row.plan }
											</span>
										</td>
										<td className="px-4 py-3">
											<div
												className="text-xs mb-1"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto Mono, monospace',
												} }
											>
												{ row.seats }{ ' ' }
												<span
													style={ {
														color: M3.onSurfaceVariant,
													} }
												>
													({ pct }%)
												</span>
											</div>
											<div
												className="h-1 rounded-full"
												style={ {
													width: 64,
													backgroundColor:
														M3.outlineVariant,
												} }
											>
												<div
													className="h-full rounded-full"
													style={ {
														width: `${ pct }%`,
														backgroundColor:
															pct >= 90
																? M3.error
																: pct >= 70
																? M3.warning
																: M3.primary,
													} }
												/>
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
											{ row.mrr }
										</td>
										<td className="px-4 py-3">
											<StatusBadge
												status={ row.status }
											/>
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color:
													row.status === 'past-due'
														? M3.error
														: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.status === 'past-due' &&
												'⚠ ' }
											{ row.nextBilling }
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.created }
										</td>
										<td
											className="px-4 py-3"
											style={ { overflow: 'visible' } }
										>
											<ActionDropdown
												actions={ rowActions( row ) }
												hint={ row.account }
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
						accounts
					</span>
				</div>
			</Card>

			{ /* ── Manage Seats modal ── */ }
			{ seatsRow && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={ { backgroundColor: 'rgba(0,0,0,0.40)' } }
					onClick={ ( e ) => {
						if ( e.target === e.currentTarget ) setSeatsRow( null );
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
								className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
								style={ {
									backgroundColor: M3.primaryContainer,
								} }
							>
								<UserPlus size={ 22 } color={ M3.primary } />
							</div>
							<div
								className="font-semibold text-lg"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Manage Seats
							</div>
							<div
								className="text-sm mt-1"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ seatsRow.account } · currently{ ' ' }
								{ seatsRow.seats } seats used
							</div>
						</div>
						<div className="px-6 pb-4 flex flex-col gap-3">
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
									New Seat Limit
								</div>
								<input
									type="number"
									min={ 1 }
									max={ 200 }
									value={ seatsValue }
									onChange={ ( e ) =>
										setSeatsValue( e.target.value )
									}
									className="w-full px-3 py-2.5 rounded-lg text-2xl font-light outline-none text-center"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${ M3.primary }`,
										color: M3.primary,
										fontFamily: 'Roboto Mono, monospace',
									} }
								/>
							</div>
							<div className="flex gap-2">
								{ [ '5', '10', '25', '50', '100' ].map(
									( n ) => (
										<button
											key={ n }
											onClick={ () => setSeatsValue( n ) }
											className="flex-1 py-1.5 rounded-full text-xs transition-all"
											style={ {
												backgroundColor:
													seatsValue === n
														? M3.primary
														: M3.surfaceContainerHigh,
												color:
													seatsValue === n
														? M3.onPrimary
														: M3.onSurfaceVariant,
												border: 'none',
												cursor: 'pointer',
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ n }
										</button>
									)
								) }
							</div>
							<div
								className="text-xs px-3 py-2.5 rounded-xl"
								style={ {
									backgroundColor: M3.infoContainer,
									color: M3.info,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								ℹ Seat changes take effect immediately.
								Reducing seats below current usage will block
								new logins.
							</div>
						</div>
						<div
							className="flex items-center justify-end gap-2 px-6 py-4"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<TextButton onClick={ () => setSeatsRow( null ) }>
								Cancel
							</TextButton>
							<FilledButton
								small
								onClick={ () => {
									const used =
										seatsRow.seats.split( '/' )[ 0 ];
									updateRow( seatsRow.id, {
										seats: `${ used }/${ seatsValue }`,
									} );
									showToast(
										`${ seatsRow.account } seat limit updated to ${ seatsValue }`,
										'success'
									);
									setSeatsRow( null );
								} }
							>
								Update Seats
							</FilledButton>
						</div>
					</div>
				</div>
			) }

			{ /* ── Change Plan modal ── */ }
			{ planRow && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={ { backgroundColor: 'rgba(0,0,0,0.40)' } }
					onClick={ ( e ) => {
						if ( e.target === e.currentTarget ) setPlanRow( null );
					} }
				>
					<div
						className="rounded-3xl overflow-hidden"
						style={ {
							width: 460,
							backgroundColor: M3.surfaceContainer,
							boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
						} }
					>
						<div className="px-6 pt-6 pb-4 text-center">
							<div
								className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
								style={ {
									backgroundColor: M3.primaryContainer,
								} }
							>
								<Repeat size={ 22 } color={ M3.primary } />
							</div>
							<div
								className="font-semibold text-lg"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Change Plan
							</div>
							<div
								className="text-sm mt-1"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ planRow.account } · currently on{ ' ' }
								{ planRow.plan }
							</div>
						</div>
						<div className="px-6 pb-4 flex flex-col gap-2">
							{ SAAS_PLANS.map( ( plan, i ) => {
								const active = planIdx === i;
								const current = plan.label === planRow.plan;
								const pc = planColor[ plan.label ];
								return (
									<button
										key={ plan.label }
										onClick={ () => setPlanIdx( i ) }
										className="flex items-center gap-4 p-4 rounded-2xl text-left w-full transition-all"
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
											<div className="flex items-center gap-2 mb-0.5">
												<span
													className="text-xs font-medium px-1.5 py-0.5 rounded-full"
													style={ {
														backgroundColor: pc.bg,
														color: pc.text,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ plan.label }
												</span>
												{ current && (
													<span
														className="text-xs"
														style={ {
															color: M3.onSurfaceVariant,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														· Current
													</span>
												) }
											</div>
											<div
												className="text-xs"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ plan.note }
											</div>
										</div>
										<span
											className="text-sm font-semibold"
											style={ {
												color: active
													? M3.primary
													: M3.onSurface,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ plan.mrr }/mo
										</span>
									</button>
								);
							} ) }
						</div>
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
								disabled={
									SAAS_PLANS[ planIdx ].label === planRow.plan
								}
								onClick={ () => {
									const plan = SAAS_PLANS[ planIdx ];
									updateRow( planRow.id, {
										plan: plan.label,
										mrr: plan.mrr,
										seats: `${
											planRow.seats.split( '/' )[ 0 ]
										}/${ plan.seats }`,
									} );
									showToast(
										`${ planRow.account } moved to ${ plan.label } plan`,
										'success'
									);
									setPlanRow( null );
								} }
							>
								Confirm Plan Change
							</FilledButton>
						</div>
					</div>
				</div>
			) }

			{ /* ── Usage Report modal ── */ }
			{ usageRow && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={ { backgroundColor: 'rgba(0,0,0,0.40)' } }
					onClick={ ( e ) => {
						if ( e.target === e.currentTarget ) setUsageRow( null );
					} }
				>
					<div
						className="rounded-3xl overflow-hidden"
						style={ {
							width: 520,
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
									Usage Report
								</div>
								<div
									className="text-sm mt-0.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ usageRow.account } · { usageRow.plan }{ ' ' }
									plan
								</div>
							</div>
							<IconButton
								icon={ XCircle }
								onClick={ () => setUsageRow( null ) }
							/>
						</div>
						<div className="p-6 flex flex-col gap-4">
							{ [
								{
									label: 'Active Seats',
									value: usageRow.seats,
									max: usageRow.seats.split( '/' )[ 1 ],
									color: M3.primary,
								},
								{
									label: 'API Calls (30d)',
									value: '48,291',
									max: '100,000',
									color: M3.secondary,
								},
								{
									label: 'Storage Used',
									value: '2.4 GB',
									max: '10 GB',
									color: M3.info,
								},
								{
									label: 'Bandwidth (30d)',
									value: '18.7 GB',
									max: '100 GB',
									color: M3.success,
								},
							].map( ( item ) => {
								const [ used, max ] = [
									parseFloat( item.value ),
									parseFloat( item.max ),
								];
								const pct =
									max > 0
										? Math.min(
												100,
												Math.round(
													( used / max ) * 100
												)
										  )
										: 0;
								return (
									<div key={ item.label }>
										<div className="flex items-center justify-between mb-1.5">
											<span
												className="text-sm"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ item.label }
											</span>
											<span
												className="text-sm font-medium"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto Mono, monospace',
												} }
											>
												{ item.value } / { item.max }
											</span>
										</div>
										<div
											className="h-2 rounded-full overflow-hidden"
											style={ {
												backgroundColor:
													M3.surfaceContainerHigh,
											} }
										>
											<div
												className="h-full rounded-full"
												style={ {
													width: `${ pct || 48 }%`,
													backgroundColor:
														pct >= 90
															? M3.error
															: item.color,
												} }
											/>
										</div>
									</div>
								);
							} ) }
							<div
								className="grid grid-cols-3 gap-3 pt-2"
								style={ {
									borderTop: `1px solid ${ M3.outlineVariant }`,
								} }
							>
								{ [
									{ label: 'Logins (30d)', value: '1,284' },
									{
										label: 'Integrations',
										value: '3 active',
									},
									{ label: 'Last Active', value: '2h ago' },
								].map( ( s ) => (
									<div
										key={ s.label }
										className="p-3 rounded-xl text-center"
										style={ {
											backgroundColor:
												M3.surfaceContainerLow,
										} }
									>
										<div
											className="text-lg font-light"
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
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ s.label }
										</div>
									</div>
								) ) }
							</div>
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
										'Usage report exported',
										'success'
									)
								}
							>
								<DownloadIcon size={ 14 } /> Export Report
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

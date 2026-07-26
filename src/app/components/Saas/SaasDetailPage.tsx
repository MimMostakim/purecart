import { useState } from 'react';
import {
	Mail,
	Hash,
	Edit3,
	Copy,
	FileText,
	Send,
	Download as DownloadIcon,
	ShieldCheck,
	Calendar,
	Clock,
	CreditCard,
	Globe,
	Activity,
	Zap,
	Users,
	DollarSign,
	UserPlus,
	ArrowUpRight,
	Eye,
	Trash2,
} from 'lucide-react';
import {
	BarChart,
	Bar,
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import {
	M3,
	saasAccountsData,
	saasDetailUsers,
	saasBilling,
	saasActivity,
	saasUsageMetrics,
} from '../../utils/static-data';
import {
	TextButton,
	Card,
	StatusBadge,
	OutlinedButton,
	TonalButton,
	ActionDropdown,
	FilledButton,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ToastProps } from '../ui';

export function SaasDetailPage( {
	accountId,
	onBack,
}: {
	accountId: string;
	onBack: () => void;
} ) {
	const account =
		saasAccountsData.find( ( a ) => a.id === accountId ) ??
		saasAccountsData[ 0 ];
	const users = saasDetailUsers[ accountId ] ?? saasDetailUsers[ 'SAAS-001' ];
	const billing = saasBilling[ accountId ] ?? saasBilling[ 'SAAS-001' ];
	const activity = saasActivity[ accountId ] ?? saasActivity[ 'SAAS-001' ];
	const usage =
		saasUsageMetrics[ accountId ] ?? saasUsageMetrics[ 'SAAS-001' ];

	const [ tab, setTab ] = useState<
		'overview' | 'users' | 'usage' | 'billing' | 'activity'
	>( 'overview' );
	const [ userRows, setUserRows ] = useState( users );
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
	const [ inviteEmail, setInviteEmail ] = useState( '' );
	const [ inviteRole, setInviteRole ] = useState( 'Member' );
	const [ inviteOpen, setInviteOpen ] = useState( false );

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

	const [ used, max ] = account.seats.split( '/' ).map( Number );
	const seatPct = Math.round( ( used / max ) * 100 );
	const apiPct = Math.round( ( usage.apiCalls / usage.apiLimit ) * 100 );

	const planColor: Record< string, { bg: string; text: string } > = {
		Starter: { bg: M3.surfaceContainerHigh, text: M3.onSurfaceVariant },
		Business: { bg: M3.secondaryContainer, text: M3.onSecondaryContainer },
		Enterprise: { bg: M3.primaryContainer, text: M3.onPrimaryContainer },
	};

	const roleColor: Record< string, { bg: string; text: string } > = {
		Admin: { bg: M3.primaryContainer, text: M3.onPrimaryContainer },
		Member: { bg: M3.secondaryContainer, text: M3.onSecondaryContainer },
		Viewer: { bg: M3.surfaceContainerHigh, text: M3.onSurfaceVariant },
	};

	const tabs = [
		{ id: 'overview' as const, label: 'Overview' },
		{ id: 'users' as const, label: `Users (${ userRows.length })` },
		{ id: 'usage' as const, label: 'Usage' },
		{ id: 'billing' as const, label: `Billing (${ billing.length })` },
		{ id: 'activity' as const, label: 'Activity' },
	];

	return (
		<div className="flex flex-col gap-5">
			{ /* ── Sub-nav ── */ }
			<TextButton onClick={ onBack }>← Back to SaaS Accounts</TextButton>

			{ /* ── Hero card ── */ }
			<Card className="overflow-hidden">
				<div
					className="h-24 w-full"
					style={ {
						background: `linear-gradient(135deg, ${ M3.secondary } 0%, #9C82DB 100%)`,
					} }
				/>
				<div className="px-6 pb-6">
					<div
						className="flex items-end justify-between"
						style={ { marginTop: -36 } }
					>
						<div className="flex items-end gap-4">
							{ /* Avatar */ }
							<div
								className="flex items-center justify-center w-20 h-20 rounded-2xl text-2xl font-semibold border-4 border-white shadow-sm"
								style={ {
									backgroundColor: M3.primaryContainer,
									color: M3.onPrimaryContainer,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ account.account.slice( 0, 2 ).toUpperCase() }
							</div>
							<div className="pb-1">
								<div className="flex items-center gap-2">
									<h2
										className="text-xl font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ account.account }
									</h2>
									<span
										className="text-xs px-2 py-0.5 rounded-full"
										style={ {
											backgroundColor:
												planColor[ account.plan ]?.bg,
											color: planColor[ account.plan ]
												?.text,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ account.plan }
									</span>
									<StatusBadge status={ account.status } />
								</div>
								<div className="flex items-center gap-3 mt-0.5">
									<span
										className="text-sm flex items-center gap-1"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										<Mail size={ 12 } />
										{ account.owner }
									</span>
									<span
										className="text-sm flex items-center gap-1"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										<Hash size={ 12 } />
										{ account.id }
									</span>
								</div>
							</div>
						</div>

						{ /* Header actions */ }
						<div className="flex items-center gap-2 pb-1">
							<OutlinedButton
								small
								onClick={ () =>
									showToast(
										`Invoice sent to ${ account.owner }`,
										'success'
									)
								}
							>
								<Mail size={ 14 } /> Send Invoice
							</OutlinedButton>
							<TonalButton
								small
								onClick={ () =>
									showToast( 'Account editor opened', 'info' )
								}
							>
								<Edit3 size={ 14 } /> Edit Account
							</TonalButton>
							<ActionDropdown
								actions={ [
									{
										label: 'Copy Account ID',
										icon: Copy,
										onClick: () => {
											navigator.clipboard?.writeText(
												account.id
											);
											showToast(
												'Account ID copied',
												'info'
											);
										},
									},
									{
										label: 'View All Invoices',
										icon: FileText,
										onClick: () => setTab( 'billing' ),
									},
									{
										label: 'Send Welcome Email',
										icon: Send,
										onClick: () =>
											showToast(
												`Welcome email sent to ${ account.owner }`,
												'success'
											),
									},
									{
										label: 'Export Account Data',
										icon: DownloadIcon,
										onClick: () =>
											showToast(
												'Account data export queued',
												'success'
											),
										dividerBefore: true,
									},
									{
										label: 'Force Logout All Users',
										icon: ShieldCheck,
										danger: true,
										dividerBefore: true,
										onClick: () =>
											openDialog( {
												open: true,
												danger: true,
												icon: ShieldCheck,
												title: 'Force Logout All Users?',
												body: (
													<span>
														End all active sessions
														for{ ' ' }
														<strong>
															{ account.account }
														</strong>
														? All { used } users
														will be signed out
														immediately.
													</span>
												),
												confirmLabel: 'Force Logout',
												onConfirm: () => {
													showToast(
														`All sessions ended for ${ account.account }`,
														'warning'
													);
													closeDialog();
												},
											} ),
									},
								] }
							/>
						</div>
					</div>

					{ /* Meta strip */ }
					<div
						className="flex items-center gap-6 mt-4 pt-4"
						style={ {
							borderTop: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						{ [
							{
								icon: Calendar,
								label: 'Created',
								value: account.created,
							},
							{
								icon: Clock,
								label: 'Last Active',
								value: usage.lastActive,
							},
							{
								icon: CreditCard,
								label: 'MRR',
								value: account.mrr,
							},
							{
								icon: Globe,
								label: 'Next Billing',
								value: account.nextBilling,
							},
							{
								icon: Activity,
								label: 'Uptime (30d)',
								value: `${ usage.uptimePct }%`,
							},
							{
								icon: Zap,
								label: 'Integrations',
								value: String( usage.integrations ),
							},
						].map( ( m ) => (
							<div
								key={ m.label }
								className="flex items-center gap-1.5"
							>
								<m.icon
									size={ 13 }
									color={ M3.onSurfaceVariant }
								/>
								<div>
									<div
										className="text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ m.label }
									</div>
									<div
										className="text-xs font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ m.value }
									</div>
								</div>
							</div>
						) ) }
					</div>
				</div>
			</Card>

			{ /* ── KPI strip ── */ }
			<div className="grid grid-cols-4 gap-4">
				{ [
					{
						icon: Users,
						label: 'Seats Used',
						value: `${ used } / ${ max }`,
						sub: `${ seatPct }% capacity`,
						color:
							seatPct >= 90
								? M3.error
								: seatPct >= 70
								? M3.warning
								: M3.primary,
						bg:
							seatPct >= 90
								? '#FFDAD6'
								: seatPct >= 70
								? M3.warningContainer
								: M3.primaryContainer,
					},
					{
						icon: DollarSign,
						label: 'Monthly MRR',
						value: account.mrr,
						sub: 'Current plan',
						color: M3.success,
						bg: M3.successContainer,
					},
					{
						icon: Activity,
						label: 'API Calls (30d)',
						value: usage.apiCalls.toLocaleString(),
						sub: `of ${ ( usage.apiLimit / 1000 ).toFixed(
							0
						) }k limit`,
						color: M3.secondary,
						bg: M3.secondaryContainer,
					},
					{
						icon: Zap,
						label: 'Storage Used',
						value: usage.storage,
						sub: `of ${ usage.storageLimit }`,
						color: M3.info,
						bg: M3.infoContainer,
					},
				].map( ( s ) => (
					<Card
						key={ s.label }
						className="p-4 flex items-center gap-3"
					>
						<div
							className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
							style={ { backgroundColor: s.bg } }
						>
							<s.icon size={ 18 } color={ s.color } />
						</div>
						<div>
							<div
								className="text-2xl font-light"
								style={ {
									color: s.color,
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
							<div
								className="text-xs"
								style={ {
									color: M3.outlineVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ s.sub }
							</div>
						</div>
					</Card>
				) ) }
			</div>

			{ /* ── Tabbed panel ── */ }
			<Card className="flex flex-col" style={ { overflow: 'visible' } }>
				{ /* Tab bar */ }
				<div
					className="flex"
					style={ {
						borderBottom: `1px solid ${ M3.outlineVariant }`,
					} }
				>
					{ tabs.map( ( t ) => (
						<button
							key={ t.id }
							onClick={ () => setTab( t.id ) }
							className="px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all"
							style={ {
								color:
									tab === t.id
										? M3.primary
										: M3.onSurfaceVariant,
								borderBottom:
									tab === t.id
										? `2px solid ${ M3.primary }`
										: '2px solid transparent',
								background: 'none',
								border: 'none',
								borderBottom:
									tab === t.id
										? `2px solid ${ M3.primary }`
										: '2px solid transparent',
								cursor: 'pointer',
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							{ t.label }
						</button>
					) ) }
				</div>

				{ /* ════ OVERVIEW ════ */ }
				{ tab === 'overview' && (
					<div
						className="p-6 grid gap-6"
						style={ { gridTemplateColumns: '1fr 1fr' } }
					>
						{ /* Usage bars */ }
						<div>
							<div
								className="font-medium text-sm mb-4"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Resource Usage
							</div>
							<div className="flex flex-col gap-4">
								{ [
									{
										label: 'Seats',
										used: used,
										max,
										unit: 'seats',
										pct: seatPct,
									},
									{
										label: 'API Calls',
										used: usage.apiCalls,
										max: usage.apiLimit,
										unit: 'calls',
										pct: apiPct,
									},
									{
										label: 'Storage',
										used: 2.4,
										max: 10,
										unit: 'GB',
										pct: 24,
									},
									{
										label: 'Bandwidth',
										used: 18.7,
										max: 100,
										unit: 'GB',
										pct: 19,
									},
								].map( ( row ) => (
									<div key={ row.label }>
										<div
											className="flex items-center justify-between mb-1.5 text-xs"
											style={ {
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											<span
												style={ {
													color: M3.onSurface,
												} }
											>
												{ row.label }
											</span>
											<span
												style={ {
													color:
														row.pct >= 90
															? M3.error
															: M3.onSurfaceVariant,
												} }
											>
												{ typeof row.used ===
													'number' && row.used > 100
													? `${ row.used.toLocaleString() } / ${ (
															row.max as number
													   ).toLocaleString() } ${
															row.unit
													  }`
													: `${ row.used } / ${ row.max } ${ row.unit }` }
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
												className="h-full rounded-full transition-all"
												style={ {
													width: `${ row.pct }%`,
													backgroundColor:
														row.pct >= 90
															? M3.error
															: row.pct >= 70
															? M3.warning
															: M3.primary,
												} }
											/>
										</div>
									</div>
								) ) }
							</div>
						</div>

						{ /* Account summary */ }
						<div>
							<div
								className="font-medium text-sm mb-4"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Account Summary
							</div>
							<div
								className="rounded-xl p-4 flex flex-col gap-3"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
								} }
							>
								{ [
									{ label: 'Account ID', value: account.id },
									{ label: 'Plan', value: account.plan },
									{
										label: 'Status',
										value:
											account.status
												.charAt( 0 )
												.toUpperCase() +
											account.status.slice( 1 ),
									},
									{ label: 'Seats', value: account.seats },
									{ label: 'Owner', value: account.owner },
									{
										label: 'Created',
										value: account.created,
									},
									{
										label: 'Next Billing',
										value: account.nextBilling,
									},
									{
										label: 'Uptime (30d)',
										value: `${ usage.uptimePct }%`,
									},
								].map( ( row ) => (
									<div
										key={ row.label }
										className="flex items-center justify-between"
									>
										<span
											className="text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.label }
										</span>
										<span
											className="text-xs font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.value }
										</span>
									</div>
								) ) }
							</div>
						</div>

						{ /* API trend chart */ }
						<div className="col-span-2">
							<div
								className="font-medium text-sm mb-3"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								API Calls — Last 7 days
							</div>
							<ResponsiveContainer width="100%" height={ 160 }>
								<BarChart
									data={ usage.apiTrend }
									barCategoryGap="35%"
								>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={ M3.outlineVariant }
										vertical={ false }
									/>
									<XAxis
										dataKey="day"
										tick={ {
											fontSize: 11,
											fill: M3.onSurfaceVariant,
										} }
									/>
									<YAxis
										tick={ {
											fontSize: 11,
											fill: M3.onSurfaceVariant,
										} }
										tickFormatter={ ( v ) =>
											`${ ( v / 1000 ).toFixed( 0 ) }k`
										}
									/>
									<Tooltip
										formatter={ ( v: number ) =>
											v.toLocaleString()
										}
										contentStyle={ {
											borderRadius: 8,
											border: `1px solid ${ M3.outlineVariant }`,
											fontFamily: 'Roboto, sans-serif',
										} }
									/>
									<Bar
										dataKey="calls"
										name="API Calls"
										fill={ M3.primary }
										radius={ [ 4, 4, 0, 0 ] }
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
				) }

				{ /* ════ USERS ════ */ }
				{ tab === 'users' && (
					<div>
						<div
							className="flex items-center justify-between px-5 py-3"
							style={ {
								borderBottom: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<span
								className="text-sm font-medium"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{
									userRows.filter(
										( u ) => u.status === 'active'
									).length
								}{ ' ' }
								active ·{ ' ' }
								{
									userRows.filter(
										( u ) => u.status === 'invited'
									).length
								}{ ' ' }
								pending · { used }/{ max } seats used
							</span>
							<FilledButton
								small
								onClick={ () => setInviteOpen( ( o ) => ! o ) }
							>
								<UserPlus size={ 14 } /> Invite User
							</FilledButton>
						</div>

						{ /* Invite form */ }
						{ inviteOpen && (
							<div
								className="px-5 py-4 flex items-center gap-3"
								style={ {
									backgroundColor: M3.primaryContainer,
									borderBottom: `1px solid ${ M3.outlineVariant }`,
								} }
							>
								<input
									type="email"
									placeholder="user@company.com"
									value={ inviteEmail }
									onChange={ ( e ) =>
										setInviteEmail( e.target.value )
									}
									className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
									style={ {
										backgroundColor: M3.surface,
										border: `1px solid ${ M3.outline }`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								/>
								<select
									value={ inviteRole }
									onChange={ ( e ) =>
										setInviteRole( e.target.value )
									}
									className="px-3 py-2 rounded-lg text-sm outline-none"
									style={ {
										backgroundColor: M3.surface,
										border: `1px solid ${ M3.outline }`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ [ 'Admin', 'Member', 'Viewer' ].map(
										( r ) => (
											<option key={ r }>{ r }</option>
										)
									) }
								</select>
								<FilledButton
									small
									onClick={ () => {
										if ( ! inviteEmail.trim() ) {
											showToast(
												'Enter an email address',
												'error'
											);
											return;
										}
										setUserRows( ( u ) => [
											...u,
											{
												id: Date.now(),
												name: inviteEmail.split(
													'@'
												)[ 0 ],
												email: inviteEmail,
												role: inviteRole,
												lastLogin: 'Never',
												status: 'invited',
												avatar: inviteEmail
													.slice( 0, 2 )
													.toUpperCase(),
											},
										] );
										showToast(
											`Invite sent to ${ inviteEmail }`,
											'success'
										);
										setInviteEmail( '' );
										setInviteOpen( false );
									} }
								>
									Send Invite
								</FilledButton>
								<TextButton
									onClick={ () => setInviteOpen( false ) }
								>
									Cancel
								</TextButton>
							</div>
						) }

						<table className="w-full">
							<thead>
								<tr
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										'User',
										'Role',
										'Last Login',
										'Status',
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
												textTransform: 'uppercase',
											} }
										>
											{ h }
										</th>
									) ) }
								</tr>
							</thead>
							<tbody>
								{ userRows.map( ( u, i ) => (
									<tr
										key={ u.id }
										style={ {
											backgroundColor:
												i % 2 === 0
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
												i % 2 === 0
													? M3.surface
													: M3.surfaceContainerLow;
										} }
									>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2.5">
												<div
													className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
													style={ {
														backgroundColor:
															M3.primaryContainer,
														color: M3.onPrimaryContainer,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ u.avatar }
												</div>
												<div>
													<div
														className="text-sm font-medium"
														style={ {
															color: M3.onSurface,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ u.name }
													</div>
													<div
														className="text-xs"
														style={ {
															color: M3.onSurfaceVariant,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ u.email }
													</div>
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<span
												className="text-xs px-2 py-0.5 rounded-full"
												style={ {
													backgroundColor:
														roleColor[ u.role ]?.bg,
													color: roleColor[ u.role ]
														?.text,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ u.role }
											</span>
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ u.lastLogin }
										</td>
										<td className="px-4 py-3">
											<span
												className="text-xs px-2 py-0.5 rounded-full capitalize"
												style={ {
													backgroundColor:
														u.status === 'active'
															? M3.successContainer
															: M3.warningContainer,
													color:
														u.status === 'active'
															? M3.success
															: M3.warning,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ u.status }
											</span>
										</td>
										<td
											className="px-4 py-3"
											style={ { overflow: 'visible' } }
										>
											<ActionDropdown
												hint={ u.email }
												actions={ [
													{
														label: 'Change Role to Admin',
														icon: ArrowUpRight,
														disabled:
															u.role === 'Admin',
														onClick: () => {
															setUserRows(
																( rows ) =>
																	rows.map(
																		(
																			r
																		) =>
																			r.id ===
																			u.id
																				? {
																						...r,
																						role: 'Admin',
																				  }
																				: r
																	)
															);
															showToast(
																`${ u.name } is now Admin`,
																'success'
															);
														},
													},
													{
														label: 'Change Role to Member',
														icon: Users,
														disabled:
															u.role === 'Member',
														onClick: () => {
															setUserRows(
																( rows ) =>
																	rows.map(
																		(
																			r
																		) =>
																			r.id ===
																			u.id
																				? {
																						...r,
																						role: 'Member',
																				  }
																				: r
																	)
															);
															showToast(
																`${ u.name } is now Member`,
																'success'
															);
														},
													},
													{
														label: 'Change Role to Viewer',
														icon: Eye,
														disabled:
															u.role === 'Viewer',
														onClick: () => {
															setUserRows(
																( rows ) =>
																	rows.map(
																		(
																			r
																		) =>
																			r.id ===
																			u.id
																				? {
																						...r,
																						role: 'Viewer',
																				  }
																				: r
																	)
															);
															showToast(
																`${ u.name } is now Viewer`,
																'success'
															);
														},
													},
													...( u.status === 'invited'
														? [
																{
																	label: 'Resend Invite',
																	icon: Send,
																	onClick:
																		() =>
																			showToast(
																				`Invite resent to ${ u.email }`,
																				'success'
																			),
																},
														  ]
														: [] ),
													{
														label: 'Remove User',
														icon: Trash2,
														danger: true,
														dividerBefore: true,
														onClick: () =>
															openDialog( {
																open: true,
																danger: true,
																icon: Trash2,
																title: 'Remove User?',
																body: (
																	<span>
																		Remove{ ' ' }
																		<strong>
																			{
																				u.name
																			}
																		</strong>{ ' ' }
																		from{ ' ' }
																		<strong>
																			{
																				account.account
																			}
																		</strong>
																		? They
																		will
																		lose
																		access
																		immediately
																		and
																		their
																		seat
																		will be
																		freed.
																	</span>
																),
																confirmLabel:
																	'Remove User',
																onConfirm:
																	() => {
																		setUserRows(
																			(
																				rows
																			) =>
																				rows.filter(
																					(
																						r
																					) =>
																						r.id !==
																						u.id
																				)
																		);
																		showToast(
																			`${ u.name } removed`,
																			'error'
																		);
																		closeDialog();
																	},
															} ),
													},
												] }
											/>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ════ USAGE ════ */ }
				{ tab === 'usage' && (
					<div className="p-6 flex flex-col gap-5">
						{ /* Usage bars */ }
						<div
							className="grid gap-4"
							style={ { gridTemplateColumns: '1fr 1fr' } }
						>
							{ [
								{
									label: 'Seats Used',
									used: `${ used }`,
									total: `${ max }`,
									pct: seatPct,
									unit: 'seats',
								},
								{
									label: 'API Calls (30d)',
									used: usage.apiCalls.toLocaleString(),
									total:
										( usage.apiLimit / 1000 ).toFixed( 0 ) +
										'k',
									pct: apiPct,
									unit: 'calls',
								},
								{
									label: 'Storage',
									used: usage.storage,
									total: usage.storageLimit,
									pct: 24,
									unit: '',
								},
								{
									label: 'Bandwidth (30d)',
									used: usage.bandwidth,
									total: usage.bandwidthLimit,
									pct: 19,
									unit: '',
								},
							].map( ( m ) => (
								<Card key={ m.label } className="p-4">
									<div className="flex items-center justify-between mb-3">
										<span
											className="text-sm font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ m.label }
										</span>
										<span
											className="text-xs font-semibold px-2 py-0.5 rounded-full"
											style={ {
												backgroundColor:
													m.pct >= 90
														? '#FFDAD6'
														: m.pct >= 70
														? M3.warningContainer
														: M3.successContainer,
												color:
													m.pct >= 90
														? M3.error
														: m.pct >= 70
														? M3.warning
														: M3.success,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ m.pct }%
										</span>
									</div>
									<div
										className="h-3 rounded-full overflow-hidden mb-2"
										style={ {
											backgroundColor:
												M3.surfaceContainerHigh,
										} }
									>
										<div
											className="h-full rounded-full"
											style={ {
												width: `${ m.pct }%`,
												backgroundColor:
													m.pct >= 90
														? M3.error
														: m.pct >= 70
														? M3.warning
														: M3.primary,
											} }
										/>
									</div>
									<div
										className="flex justify-between text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										<span>{ m.used }</span>
										<span>{ m.total }</span>
									</div>
								</Card>
							) ) }
						</div>

						{ /* API trend */ }
						<Card className="p-5">
							<div
								className="font-medium text-sm mb-3"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								API Calls — Last 7 days
							</div>
							<ResponsiveContainer width="100%" height={ 200 }>
								<AreaChart data={ usage.apiTrend }>
									<defs>
										<linearGradient
											id="apiGrad"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor={ M3.primary }
												stopOpacity={ 0.18 }
											/>
											<stop
												offset="95%"
												stopColor={ M3.primary }
												stopOpacity={ 0 }
											/>
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={ M3.outlineVariant }
									/>
									<XAxis
										dataKey="day"
										tick={ {
											fontSize: 11,
											fill: M3.onSurfaceVariant,
										} }
									/>
									<YAxis
										tick={ {
											fontSize: 11,
											fill: M3.onSurfaceVariant,
										} }
										tickFormatter={ ( v ) =>
											`${ ( v / 1000 ).toFixed( 0 ) }k`
										}
									/>
									<Tooltip
										formatter={ ( v: number ) =>
											v.toLocaleString()
										}
										contentStyle={ {
											borderRadius: 8,
											border: `1px solid ${ M3.outlineVariant }`,
											fontFamily: 'Roboto, sans-serif',
										} }
									/>
									<Area
										type="monotone"
										dataKey="calls"
										name="API Calls"
										stroke={ M3.primary }
										fill="url(#apiGrad)"
										strokeWidth={ 2 }
									/>
								</AreaChart>
							</ResponsiveContainer>
						</Card>

						{ /* Stats grid */ }
						<div className="grid grid-cols-3 gap-3">
							{ [
								{ label: 'Total Logins (30d)', value: '1,284' },
								{
									label: 'Active Integrations',
									value: String( usage.integrations ),
								},
								{
									label: 'Uptime (30d)',
									value: `${ usage.uptimePct }%`,
								},
								{ label: 'Avg Session (min)', value: '24' },
								{ label: 'Failed Auth (30d)', value: '12' },
								{ label: 'Data Exports', value: '3' },
							].map( ( s ) => (
								<div
									key={ s.label }
									className="p-4 rounded-xl text-center"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									<div
										className="text-2xl font-light"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ s.value }
									</div>
									<div
										className="text-xs mt-1"
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
					</div>
				) }

				{ /* ════ BILLING ════ */ }
				{ tab === 'billing' && (
					<div>
						{ /* Current plan summary */ }
						<div
							className="px-5 py-4 flex items-center gap-4"
							style={ {
								borderBottom: `1px solid ${ M3.outlineVariant }`,
								backgroundColor: M3.surfaceContainerLow,
							} }
						>
							<div className="flex-1">
								<div
									className="text-xs font-medium mb-1"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Current Plan
								</div>
								<div className="flex items-center gap-2">
									<span
										className="text-sm font-semibold"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ account.plan } Plan
									</span>
									<span
										className="text-xs px-2 py-0.5 rounded-full"
										style={ {
											backgroundColor:
												planColor[ account.plan ]?.bg,
											color: planColor[ account.plan ]
												?.text,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ account.plan }
									</span>
								</div>
								<div
									className="text-xs mt-0.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ max } seats · { account.mrr }/month · Next
									billing: { account.nextBilling }
								</div>
							</div>
							<OutlinedButton
								small
								onClick={ () =>
									showToast(
										'Plan upgrade dialog opened',
										'info'
									)
								}
							>
								<ArrowUpRight size={ 14 } /> Change Plan
							</OutlinedButton>
						</div>

						{ /* Invoice table */ }
						<div
							className="flex items-center justify-between px-5 py-3"
							style={ {
								borderBottom: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<span
								className="text-sm font-medium"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Invoice History
							</span>
							<OutlinedButton
								small
								onClick={ () =>
									showToast(
										'Invoice history exported',
										'success'
									)
								}
							>
								<DownloadIcon size={ 14 } /> Export
							</OutlinedButton>
						</div>
						<table className="w-full">
							<thead>
								<tr
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										'Invoice',
										'Period',
										'Date',
										'Amount',
										'Status',
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
												textTransform: 'uppercase',
											} }
										>
											{ h }
										</th>
									) ) }
								</tr>
							</thead>
							<tbody>
								{ billing.map( ( inv, i ) => (
									<tr
										key={ inv.invoice }
										style={ {
											backgroundColor:
												i % 2 === 0
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
												i % 2 === 0
													? M3.surface
													: M3.surfaceContainerLow;
										} }
									>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.primary,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ inv.invoice }
										</td>
										<td
											className="px-4 py-3 text-sm"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ inv.period }
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ inv.date }
										</td>
										<td
											className="px-4 py-3 text-sm font-semibold"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ inv.amount }
										</td>
										<td className="px-4 py-3">
											<span
												className="text-xs px-2 py-0.5 rounded-full capitalize"
												style={ {
													backgroundColor:
														inv.status === 'paid'
															? M3.successContainer
															: inv.status ===
															  'pending'
															? M3.warningContainer
															: '#FFDAD6',
													color:
														inv.status === 'paid'
															? M3.success
															: inv.status ===
															  'pending'
															? M3.warning
															: M3.error,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ inv.status }
											</span>
										</td>
										<td className="px-4 py-3">
											{ inv.status === 'paid' && (
												<TextButton
													small
													onClick={ () =>
														showToast(
															`Invoice ${ inv.invoice } downloaded`,
															'info'
														)
													}
												>
													<DownloadIcon size={ 12 } />{ ' ' }
													PDF
												</TextButton>
											) }
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ════ ACTIVITY ════ */ }
				{ tab === 'activity' && (
					<div className="p-6">
						<div className="flex items-center justify-between mb-5">
							<div
								className="font-medium text-sm"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Account Event Log
							</div>
							<OutlinedButton
								small
								onClick={ () =>
									showToast(
										'Activity log exported',
										'success'
									)
								}
							>
								<DownloadIcon size={ 14 } /> Export
							</OutlinedButton>
						</div>
						<div className="flex flex-col">
							{ activity.map( ( evt, i ) => {
								const Icon = evt.icon;
								return (
									<div key={ i } className="flex gap-4">
										<div className="flex flex-col items-center flex-shrink-0">
											<div
												className="w-9 h-9 rounded-full flex items-center justify-center"
												style={ {
													backgroundColor: `${ evt.color }15`,
													border: `1.5px solid ${ evt.color }40`,
												} }
											>
												<Icon
													size={ 15 }
													color={ evt.color }
												/>
											</div>
											{ i < activity.length - 1 && (
												<div
													className="w-px flex-1 my-1.5"
													style={ {
														backgroundColor:
															M3.outlineVariant,
														minHeight: 16,
													} }
												/>
											) }
										</div>
										<div className="flex-1 pb-5 min-w-0">
											<div className="flex items-start justify-between gap-2">
												<div>
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
													<div className="flex items-center gap-2 mt-0.5">
														<span
															className="text-xs"
															style={ {
																color: M3.onSurfaceVariant,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ evt.time }
														</span>
														<span
															style={ {
																color: M3.outlineVariant,
															} }
														>
															·
														</span>
														<span
															className="text-xs font-medium"
															style={ {
																color:
																	evt.actor ===
																	'System'
																		? M3.secondary
																		: M3.primary,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ evt.actor }
														</span>
													</div>
												</div>
												{ evt.meta && (
													<span
														className="text-sm font-semibold flex-shrink-0"
														style={ {
															color: M3.success,
															fontFamily:
																'Roboto Mono, monospace',
														} }
													>
														{ evt.meta }
													</span>
												) }
											</div>
										</div>
									</div>
								);
							} ) }
						</div>
					</div>
				) }
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

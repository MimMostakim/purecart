import { useState } from 'react';
import {
	Copy,
	FileText,
	RotateCcw,
	DollarSign,
	Users,
	Download as DownloadIcon,
	Mail,
	MapPin,
	Edit3,
	Hash,
	Calendar,
	Clock,
	Globe,
	Phone,
	Tag,
	Key,
	Repeat,
	Download,
	Ban,
	ShieldCheck,
	Trash2,
	AlertCircle,
	XCircle,
	Check,
	ExternalLink,
	RefreshCw,
	PauseCircle,
	CheckCircle,
} from 'lucide-react';
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { M3, CUSTOMER_SARAH } from '../../utils/static-data';
import {
	Card,
	OutlinedButton,
	TonalButton,
	ActionDropdown,
	FilledButton,
	IconButton,
	Toggle,
	TextButton,
	StatusBadge,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ToastProps, ActionItem } from '../ui';

export function CustomerDetailPage( {
	onBack,
	onLicenseDetail,
}: {
	onBack: () => void;
	onLicenseDetail: () => void;
} ) {
	const c = CUSTOMER_SARAH;
	const [ tab, setTab ] = useState<
		'overview' | 'licenses' | 'subscriptions' | 'downloads' | 'activity'
	>( 'overview' );
	const [ copiedKey, setCopiedKey ] = useState< string | null >( null );
	const [ note, setNote ] = useState( c.notes );
	const [ editingNote, setEditingNote ] = useState( false );
	const [ customerStatus, setCustomerStatus ] = useState<
		'active' | 'suspended' | 'deleted'
	>( 'active' );
	const [ licenses, setLicenses ] = useState( c.licenses );
	const [ subs, setSubs ] = useState( c.subscriptions );
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
	const [ editOpen, setEditOpen ] = useState( false );
	const [ issueLicenseOpen, setIssueLicenseOpen ] = useState( false );

	// Issue New License form state
	const [ ilProduct, setIlProduct ] = useState( 'Plugin Pro' );
	const [ ilPlan, setIlPlan ] = useState< 'Annual' | 'Monthly' | 'Lifetime' >(
		'Annual'
	);
	const [ ilSites, setIlSites ] = useState( '1' );
	const [ ilExpiry, setIlExpiry ] = useState( '365' );
	const [ ilSendEmail, setIlSendEmail ] = useState( true );
	const [ ilNotes, setIlNotes ] = useState( '' );

	const ISSUE_PRODUCTS = [
		'Plugin Pro',
		'Theme Bundle',
		'SaaS Connector',
		'Security Module',
		'Analytics Add-on',
		'Update Manager',
	];
	const ISSUE_PLANS = [ 'Monthly', 'Annual', 'Lifetime' ] as const;
	const planDays: Record< string, string > = {
		Monthly: '30',
		Annual: '365',
		Lifetime: '',
	};

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
	const handleCopy = ( key: string ) => {
		setCopiedKey( key );
		navigator.clipboard?.writeText( key );
		setTimeout( () => setCopiedKey( null ), 1500 );
		showToast( 'License key copied', 'info' );
	};

	const moreMenuActions: ActionItem[] = [
		{
			label: 'Copy Customer ID',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( c.id );
				showToast( 'Customer ID copied', 'info' );
			},
		},
		{
			label: 'View All Orders',
			icon: FileText,
			onClick: () => showToast( 'Order history opened', 'info' ),
		},
		{
			label: 'Send Password Reset',
			icon: RotateCcw,
			onClick: () =>
				showToast(
					`Password reset email sent to ${ c.email }`,
					'success'
				),
		},
		{
			label: 'Apply Account Credit',
			icon: DollarSign,
			onClick: () => showToast( 'Credit applied to account', 'success' ),
			dividerBefore: true,
		},
		{
			label: 'Merge Customer Record',
			icon: Users,
			onClick: () => showToast( 'Merge dialog coming soon', 'info' ),
		},
		{
			label: 'Export Customer Data',
			icon: DownloadIcon,
			onClick: () => showToast( 'Customer data export queued', 'info' ),
			dividerBefore: true,
		},
	];

	const tabs = [
		{ id: 'overview' as const, label: 'Overview' },
		{ id: 'licenses' as const, label: `Licenses (${ c.licenses.length })` },
		{
			id: 'subscriptions' as const,
			label: `Subscriptions (${ c.subscriptions.length })`,
		},
		{
			id: 'downloads' as const,
			label: `Downloads (${ c.downloads.length })`,
		},
		{ id: 'activity' as const, label: 'Activity' },
	];

	return (
		<div className="flex flex-col gap-5">
			{ /* ── Hero header ── */ }
			<Card className="overflow-hidden">
				{ /* Purple band */ }
				<div
					className="h-24 w-full"
					style={ {
						background: `linear-gradient(135deg, ${ M3.primary } 0%, #9C82DB 100%)`,
					} }
				/>

				<div className="px-6 pb-6">
					{ /* Avatar row */ }
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
								{ c.avatar }
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
										{ c.name }
									</h2>
									<span
										className="text-xs px-2 py-0.5 rounded-full"
										style={ {
											backgroundColor:
												M3.successContainer,
											color: M3.success,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										Active
									</span>
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
										{ c.email }
									</span>
									<span
										className="text-sm flex items-center gap-1"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										<MapPin size={ 12 } />
										{ c.flag } { c.location }
									</span>
								</div>
							</div>
						</div>

						{ /* Actions */ }
						<div className="flex items-center gap-2 pb-1">
							<OutlinedButton
								small
								onClick={ () =>
									showToast(
										`Email composer opened for ${ c.email }`,
										'info'
									)
								}
							>
								<Mail size={ 14 } /> Send Email
							</OutlinedButton>
							<TonalButton
								small
								onClick={ () => setEditOpen( ( e ) => ! e ) }
							>
								<Edit3 size={ 14 } /> Edit Customer
							</TonalButton>
							<ActionDropdown actions={ moreMenuActions } />
						</div>
					</div>

					{ /* Meta row */ }
					<div
						className="flex items-center gap-6 mt-4 pt-4"
						style={ {
							borderTop: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						{ [
							{ icon: Hash, label: 'Customer ID', value: c.id },
							{
								icon: Calendar,
								label: 'Joined',
								value: c.joinDate,
							},
							{
								icon: Clock,
								label: 'Last Active',
								value: c.lastActive,
							},
							{ icon: Globe, label: 'Website', value: c.website },
							{ icon: Phone, label: 'Phone', value: c.phone },
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
						<div className="ml-auto flex items-center gap-2">
							{ c.tags.map( ( t ) => (
								<span
									key={ t }
									className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
									style={ {
										backgroundColor: M3.secondaryContainer,
										color: M3.onSecondaryContainer,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									<Tag size={ 10 } />
									{ t }
								</span>
							) ) }
						</div>
					</div>
				</div>
			</Card>

			{ /* ── KPI strip ── */ }
			<div className="grid grid-cols-4 gap-4">
				{ [
					{
						icon: DollarSign,
						label: 'Lifetime Value',
						value: c.ltv,
						color: M3.success,
						bg: M3.successContainer,
					},
					{
						icon: Key,
						label: 'Active Licenses',
						value: String(
							c.licenses.filter( ( l ) => l.status === 'active' )
								.length
						),
						color: M3.primary,
						bg: M3.primaryContainer,
					},
					{
						icon: Repeat,
						label: 'Active Subscriptions',
						value: String(
							c.subscriptions.filter(
								( s ) => s.status === 'active'
							).length
						),
						color: M3.info,
						bg: M3.infoContainer,
					},
					{
						icon: Download,
						label: 'Total Downloads',
						value: String( c.downloads.length ),
						color: M3.secondary,
						bg: M3.secondaryContainer,
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

			{ /* ── Tabs ── */ }
			<Card className="flex flex-col overflow-hidden">
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

				{ /* ── Overview tab ── */ }
				{ tab === 'overview' && (
					<div
						className="p-6 grid gap-5"
						style={ { gridTemplateColumns: '1fr 1fr' } }
					>
						{ /* Spend chart */ }
						<div>
							<div
								className="font-medium text-sm mb-3"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Spend History — 12 months
							</div>
							<ResponsiveContainer width="100%" height={ 160 }>
								<AreaChart data={ c.spendHistory }>
									<defs>
										<linearGradient
											id="spendGrad"
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
										dataKey="month"
										tick={ {
											fontSize: 10,
											fill: M3.onSurfaceVariant,
										} }
									/>
									<YAxis
										tick={ {
											fontSize: 10,
											fill: M3.onSurfaceVariant,
										} }
										tickFormatter={ ( v ) => `$${ v }` }
									/>
									<Tooltip
										formatter={ ( v: number ) => `$${ v }` }
										contentStyle={ {
											borderRadius: 8,
											border: `1px solid ${ M3.outlineVariant }`,
											fontFamily: 'Roboto, sans-serif',
											fontSize: 12,
										} }
									/>
									<Area
										type="monotone"
										dataKey="spend"
										name="Spend"
										stroke={ M3.primary }
										fill="url(#spendGrad)"
										strokeWidth={ 2 }
										dot={ ( props: any ) =>
											props.payload.spend > 0 ? (
												<circle
													cx={ props.cx }
													cy={ props.cy }
													r={ 3 }
													fill={ M3.primary }
												/>
											) : (
												<g />
											)
										}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>

						{ /* Quick facts */ }
						<div className="flex flex-col gap-3">
							<div
								className="font-medium text-sm"
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
									{
										label: 'Total Spent',
										value: c.totalSpent,
									},
									{
										label: 'Orders',
										value: String( c.ordersCount ),
									},
									{
										label: 'Avg Order Value',
										value: `$${ ( 842 / 9 ).toFixed( 2 ) }`,
									},
									{
										label: 'First Purchase',
										value: 'Jun 3, 2022',
									},
									{
										label: 'Last Purchase',
										value: 'Dec 30, 2024',
									},
									{
										label: 'Support Tickets',
										value: '2 (all resolved)',
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

						{ /* Internal note — full width */ }
						<div className="col-span-2">
							<div className="flex items-center justify-between mb-2">
								<div
									className="font-medium text-sm"
									style={ {
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Internal Note
								</div>
								<TextButton
									onClick={ () =>
										setEditingNote( ( e ) => ! e )
									}
								>
									<Edit3 size={ 12 } />{ ' ' }
									{ editingNote ? 'Save' : 'Edit' }
								</TextButton>
							</div>
							{ editingNote ? (
								<textarea
									value={ note }
									onChange={ ( e ) =>
										setNote( e.target.value )
									}
									className="w-full p-3 rounded-xl text-sm resize-none outline-none"
									rows={ 3 }
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${ M3.primary }`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
										boxSizing: 'border-box',
									} }
								/>
							) : (
								<div
									className="p-3 rounded-xl text-sm"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										color: note
											? M3.onSurface
											: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ note ||
										'No notes yet. Click Edit to add one.' }
								</div>
							) }
						</div>

						{ /* Danger zone */ }
						<div
							className="col-span-2 pt-2"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<div
								className="font-medium text-sm mb-3"
								style={ {
									color: M3.error,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Danger Zone
							</div>
							<div className="flex items-center gap-3">
								<OutlinedButton
									danger
									small
									onClick={ () =>
										openDialog( {
											open: true,
											danger: true,
											icon: Ban,
											title:
												customerStatus === 'suspended'
													? 'Reinstate Account?'
													: 'Suspend Account?',
											body:
												customerStatus ===
												'suspended' ? (
													<span>
														Restore full access for{ ' ' }
														<strong>
															{ c.name }
														</strong>
														?
													</span>
												) : (
													<span>
														Suspend{ ' ' }
														<strong>
															{ c.name }
														</strong>
														? They will lose access
														to all downloads and
														portal features
														immediately.
													</span>
												),
											confirmLabel:
												customerStatus === 'suspended'
													? 'Reinstate'
													: 'Suspend Account',
											onConfirm: () => {
												setCustomerStatus( ( s ) =>
													s === 'suspended'
														? 'active'
														: 'suspended'
												);
												showToast(
													customerStatus ===
														'suspended'
														? `${ c.name } reinstated`
														: `${ c.name } suspended`,
													customerStatus ===
														'suspended'
														? 'success'
														: 'warning'
												);
												closeDialog();
											},
										} )
									}
								>
									<Ban size={ 14 } />{ ' ' }
									{ customerStatus === 'suspended'
										? 'Reinstate Account'
										: 'Suspend Account' }
								</OutlinedButton>
								<OutlinedButton
									danger
									small
									onClick={ () =>
										openDialog( {
											open: true,
											danger: true,
											icon: ShieldCheck,
											title: 'Revoke All Licenses?',
											body: (
												<span>
													Revoke all{ ' ' }
													<strong>
														{
															licenses.filter(
																( l ) =>
																	l.status ===
																	'active'
															).length
														}{ ' ' }
														active licenses
													</strong>{ ' ' }
													for{ ' ' }
													<strong>{ c.name }</strong>?
													All site activations will be
													immediately invalidated.
												</span>
											),
											confirmLabel: 'Revoke All',
											onConfirm: () => {
												setLicenses( ( ls ) =>
													ls.map( ( l ) => ( {
														...l,
														status: 'revoked',
													} ) )
												);
												showToast(
													`All licenses revoked for ${ c.name }`,
													'error'
												);
												closeDialog();
											},
										} )
									}
								>
									<ShieldCheck size={ 14 } /> Revoke All
									Licenses
								</OutlinedButton>
								<OutlinedButton
									danger
									small
									onClick={ () =>
										openDialog( {
											open: true,
											danger: true,
											icon: Trash2,
											title: 'Delete Customer?',
											body: (
												<span>
													Permanently delete{ ' ' }
													<strong>{ c.name }</strong>{ ' ' }
													and all associated data?
													This cannot be undone. Their
													licenses will be revoked and
													subscriptions cancelled.
												</span>
											),
											confirmLabel: 'Delete Customer',
											onConfirm: () => {
												showToast(
													`${ c.name } deleted — redirecting…`,
													'error'
												);
												closeDialog();
												setTimeout( onBack, 1200 );
											},
										} )
									}
								>
									<Trash2 size={ 14 } /> Delete Customer
								</OutlinedButton>
							</div>
							{ customerStatus === 'suspended' && (
								<div
									className="mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
									style={ {
										backgroundColor: M3.warningContainer,
										color: M3.warning,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									<AlertCircle size={ 13 } /> This account is
									currently suspended.
								</div>
							) }
						</div>
					</div>
				) }

				{ /* ── Licenses tab ── */ }
				{ tab === 'licenses' && (
					<div>
						{ /* ── Licenses toolbar ── */ }
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
								All Licenses
								<span
									className="ml-2 text-xs font-normal"
									style={ { color: M3.onSurfaceVariant } }
								>
									{
										licenses.filter(
											( l ) => l.status === 'active'
										).length
									}{ ' ' }
									active / { licenses.length } total
								</span>
							</span>
							<FilledButton
								small
								onClick={ () =>
									setIssueLicenseOpen( ( o ) => ! o )
								}
							>
								<Key size={ 14 } /> Issue New License
							</FilledButton>
						</div>

						{ /* ── Issue New License form panel ── */ }
						{ issueLicenseOpen && (
							<div
								style={ {
									borderBottom: `2px solid ${ M3.primary }`,
								} }
							>
								{ /* Panel header */ }
								<div
									className="flex items-center justify-between px-6 py-4"
									style={ {
										backgroundColor: M3.primaryContainer,
									} }
								>
									<div className="flex items-center gap-3">
										<div
											className="w-8 h-8 rounded-lg flex items-center justify-center"
											style={ {
												backgroundColor: M3.primary,
											} }
										>
											<Key
												size={ 16 }
												color={ M3.onPrimary }
											/>
										</div>
										<div>
											<div
												className="font-medium text-sm"
												style={ {
													color: M3.onPrimaryContainer,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												Issue New License — { c.name }
											</div>
											<div
												className="text-xs"
												style={ {
													color: M3.onPrimaryContainer,
													opacity: 0.7,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												A unique license key is
												generated automatically. The
												customer will be notified if
												email is enabled.
											</div>
										</div>
									</div>
									<IconButton
										icon={ XCircle }
										onClick={ () =>
											setIssueLicenseOpen( false )
										}
									/>
								</div>

								{ /* Form body */ }
								<div
									className="p-6 grid gap-5"
									style={ { gridTemplateColumns: '1fr 1fr' } }
								>
									{ /* Left column */ }
									<div className="flex flex-col gap-4">
										{ /* Product */ }
										<div>
											<div
												className="text-xs font-medium mb-1.5"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
													textTransform: 'uppercase',
													letterSpacing: '0.5px',
												} }
											>
												Product *
											</div>
											<select
												value={ ilProduct }
												onChange={ ( e ) =>
													setIlProduct(
														e.target.value
													)
												}
												className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
												style={ {
													backgroundColor:
														M3.surfaceContainerLow,
													border: `1px solid ${ M3.outlineVariant }`,
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ ISSUE_PRODUCTS.map( ( p ) => (
													<option key={ p }>
														{ p }
													</option>
												) ) }
											</select>
										</div>

										{ /* Plan */ }
										<div>
											<div
												className="text-xs font-medium mb-1.5"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
													textTransform: 'uppercase',
													letterSpacing: '0.5px',
												} }
											>
												Plan / Billing Cycle *
											</div>
											<div className="flex gap-2">
												{ ISSUE_PLANS.map( ( p ) => (
													<button
														key={ p }
														onClick={ () => {
															setIlPlan( p );
															setIlExpiry(
																planDays[ p ]
															);
														} }
														className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
														style={ {
															backgroundColor:
																ilPlan === p
																	? M3.primary
																	: M3.surfaceContainerLow,
															color:
																ilPlan === p
																	? M3.onPrimary
																	: M3.onSurfaceVariant,
															border: `1.5px solid ${
																ilPlan === p
																	? M3.primary
																	: M3.outlineVariant
															}`,
															cursor: 'pointer',
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ p }
													</button>
												) ) }
											</div>
										</div>

										{ /* Site activations */ }
										<div>
											<div
												className="text-xs font-medium mb-1.5"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
													textTransform: 'uppercase',
													letterSpacing: '0.5px',
												} }
											>
												Max Site Activations
											</div>
											<div className="flex items-center gap-3">
												<input
													type="number"
													min={ 1 }
													max={ 100 }
													value={ ilSites }
													onChange={ ( e ) =>
														setIlSites(
															e.target.value
														)
													}
													className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none text-center"
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
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													site(s)
												</span>
											</div>
											<div className="flex gap-1.5 mt-2">
												{ [
													'1',
													'3',
													'5',
													'10',
													'25',
												].map( ( n ) => (
													<button
														key={ n }
														onClick={ () =>
															setIlSites( n )
														}
														className="flex-1 py-1 rounded-full text-xs transition-all"
														style={ {
															backgroundColor:
																ilSites === n
																	? M3.primary
																	: M3.surfaceContainerHigh,
															color:
																ilSites === n
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
												) ) }
											</div>
										</div>

										{ /* Expiry */ }
										<div>
											<div
												className="text-xs font-medium mb-1.5"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
													textTransform: 'uppercase',
													letterSpacing: '0.5px',
												} }
											>
												Validity (days){ ' ' }
												{ ilPlan === 'Lifetime' && (
													<span
														style={ {
															color: M3.success,
														} }
													>
														— Lifetime (no expiry)
													</span>
												) }
											</div>
											<input
												type="number"
												min={ 1 }
												value={
													ilPlan === 'Lifetime'
														? ''
														: ilExpiry
												}
												onChange={ ( e ) =>
													setIlExpiry(
														e.target.value
													)
												}
												disabled={
													ilPlan === 'Lifetime'
												}
												placeholder={
													ilPlan === 'Lifetime'
														? 'Lifetime'
														: 'e.g. 365'
												}
												className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
												style={ {
													backgroundColor:
														ilPlan === 'Lifetime'
															? M3.surfaceContainerHigh
															: M3.surfaceContainerLow,
													border: `1px solid ${ M3.outlineVariant }`,
													color:
														ilPlan === 'Lifetime'
															? M3.onSurfaceVariant
															: M3.onSurface,
													fontFamily:
														'Roboto Mono, monospace',
												} }
											/>
											{ ilPlan !== 'Lifetime' &&
												ilExpiry && (
													<div
														className="text-xs mt-1"
														style={ {
															color: M3.onSurfaceVariant,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														Expires:{ ' ' }
														{
															new Date(
																Date.now() +
																	parseInt(
																		ilExpiry
																	) *
																		86400000
															)
																.toISOString()
																.split(
																	'T'
																)[ 0 ]
														}
													</div>
												) }
										</div>
									</div>

									{ /* Right column */ }
									<div className="flex flex-col gap-4">
										{ /* Notes */ }
										<div className="flex-1">
											<div
												className="text-xs font-medium mb-1.5"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
													textTransform: 'uppercase',
													letterSpacing: '0.5px',
												} }
											>
												Internal Notes (optional)
											</div>
											<textarea
												value={ ilNotes }
												onChange={ ( e ) =>
													setIlNotes( e.target.value )
												}
												placeholder="e.g. Replacement for expired license, courtesy license for enterprise account…"
												rows={ 5 }
												className="w-full px-3 py-2.5 rounded-lg text-sm resize-none outline-none"
												style={ {
													backgroundColor:
														M3.surfaceContainerLow,
													border: `1px solid ${ M3.outlineVariant }`,
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
													lineHeight: 1.6,
												} }
											/>
										</div>

										{ /* Send email toggle */ }
										<div className="flex items-center justify-between gap-4">
											<div>
												<div
													className="text-sm"
													style={ {
														color: M3.onSurface,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													Email license to customer
												</div>
												<div
													className="text-xs"
													style={ {
														color: M3.onSurfaceVariant,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													Sends key + activation
													instructions to { c.email }
												</div>
											</div>
											<Toggle
												on={ ilSendEmail }
												onChange={ setIlSendEmail }
											/>
										</div>

										{ /* Preview card */ }
										<div
											className="p-4 rounded-xl flex flex-col gap-2"
											style={ {
												backgroundColor:
													M3.surfaceContainerLow,
												border: `1px solid ${ M3.outlineVariant }`,
											} }
										>
											<div
												className="text-xs font-medium"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												License Preview
											</div>
											<div
												className="flex items-center justify-between text-xs"
												style={ {
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												<span
													style={ {
														color: M3.onSurfaceVariant,
													} }
												>
													Customer
												</span>
												<span
													style={ {
														color: M3.onSurface,
														fontWeight: 500,
													} }
												>
													{ c.name }
												</span>
											</div>
											<div
												className="flex items-center justify-between text-xs"
												style={ {
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												<span
													style={ {
														color: M3.onSurfaceVariant,
													} }
												>
													Product
												</span>
												<span
													style={ {
														color: M3.onSurface,
														fontWeight: 500,
													} }
												>
													{ ilProduct }
												</span>
											</div>
											<div
												className="flex items-center justify-between text-xs"
												style={ {
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												<span
													style={ {
														color: M3.onSurfaceVariant,
													} }
												>
													Plan
												</span>
												<span
													style={ {
														color: M3.onSurface,
														fontWeight: 500,
													} }
												>
													{ ilPlan }
												</span>
											</div>
											<div
												className="flex items-center justify-between text-xs"
												style={ {
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												<span
													style={ {
														color: M3.onSurfaceVariant,
													} }
												>
													Sites
												</span>
												<span
													style={ {
														color: M3.onSurface,
														fontWeight: 500,
													} }
												>
													0 / { ilSites }
												</span>
											</div>
											<div
												className="flex items-center justify-between text-xs"
												style={ {
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												<span
													style={ {
														color: M3.onSurfaceVariant,
													} }
												>
													Expires
												</span>
												<span
													style={ {
														color:
															ilPlan ===
															'Lifetime'
																? M3.success
																: M3.onSurface,
														fontWeight: 500,
													} }
												>
													{ ilPlan === 'Lifetime'
														? 'Lifetime'
														: ilExpiry
														? new Date(
																Date.now() +
																	parseInt(
																		ilExpiry
																	) *
																		86400000
														  )
																.toISOString()
																.split(
																	'T'
																)[ 0 ]
														: '—' }
												</span>
											</div>
											<div
												className="pt-2 mt-1"
												style={ {
													borderTop: `1px solid ${ M3.outlineVariant }`,
												} }
											>
												<div
													className="text-xs"
													style={ {
														color: M3.onSurfaceVariant,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													License Key (auto-generated)
												</div>
												<div
													className="text-xs font-medium mt-0.5"
													style={ {
														color: M3.primary,
														fontFamily:
															'Roboto Mono, monospace',
													} }
												>
													WDD-XXXX-XXXX-XXXX
												</div>
											</div>
										</div>
									</div>
								</div>

								{ /* Panel footer */ }
								<div
									className="flex items-center justify-between px-6 py-4"
									style={ {
										borderTop: `1px solid ${ M3.outlineVariant }`,
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									<div
										className="text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ ilSendEmail ? (
											<span>
												✓ License key will be emailed to{ ' ' }
												<strong>{ c.email }</strong>
											</span>
										) : (
											<span>
												⚠ No email — customer must
												receive key manually
											</span>
										) }
									</div>
									<div className="flex items-center gap-2">
										<TextButton
											onClick={ () =>
												setIssueLicenseOpen( false )
											}
										>
											Cancel
										</TextButton>
										<TonalButton
											small
											onClick={ () => {
												if (
													! ilProduct ||
													! ilSites
												) {
													showToast(
														'Select a product and site count',
														'error'
													);
													return;
												}
												const key = `WDD-${ Math.random()
													.toString( 36 )
													.slice( 2, 6 )
													.toUpperCase() }-${ Math.random()
													.toString( 36 )
													.slice( 2, 6 )
													.toUpperCase() }-${ Math.random()
													.toString( 36 )
													.slice( 2, 6 )
													.toUpperCase() }`;
												const newLic = {
													id: Date.now(),
													key,
													product: ilProduct,
													plan: ilPlan,
													sites: `0/${ ilSites }`,
													status: 'active',
													expires:
														ilPlan === 'Lifetime'
															? 'Lifetime'
															: new Date(
																	Date.now() +
																		parseInt(
																			ilExpiry
																		) *
																			86400000
															  )
																	.toISOString()
																	.split(
																		'T'
																	)[ 0 ],
													created: new Date()
														.toISOString()
														.split( 'T' )[ 0 ],
												};
												setLicenses( ( ls ) => [
													newLic,
													...ls,
												] );
												if ( ilSendEmail )
													showToast(
														`License issued for ${ ilProduct } — key emailed to ${ c.email }`,
														'success'
													);
												else
													showToast(
														`License issued for ${ ilProduct } — key: ${ key }`,
														'success'
													);
												setIssueLicenseOpen( false );
												setIlProduct( 'Plugin Pro' );
												setIlPlan( 'Annual' );
												setIlSites( '1' );
												setIlExpiry( '365' );
												setIlNotes( '' );
												setIlSendEmail( true );
											} }
										>
											Issue License Only
										</TonalButton>
										<FilledButton
											small
											onClick={ () => {
												if (
													! ilProduct ||
													! ilSites
												) {
													showToast(
														'Select a product and site count',
														'error'
													);
													return;
												}
												const key = `WDD-${ Math.random()
													.toString( 36 )
													.slice( 2, 6 )
													.toUpperCase() }-${ Math.random()
													.toString( 36 )
													.slice( 2, 6 )
													.toUpperCase() }-${ Math.random()
													.toString( 36 )
													.slice( 2, 6 )
													.toUpperCase() }`;
												const newLic = {
													id: Date.now(),
													key,
													product: ilProduct,
													plan: ilPlan,
													sites: `0/${ ilSites }`,
													status: 'active',
													expires:
														ilPlan === 'Lifetime'
															? 'Lifetime'
															: new Date(
																	Date.now() +
																		parseInt(
																			ilExpiry
																		) *
																			86400000
															  )
																	.toISOString()
																	.split(
																		'T'
																	)[ 0 ],
													created: new Date()
														.toISOString()
														.split( 'T' )[ 0 ],
												};
												setLicenses( ( ls ) => [
													newLic,
													...ls,
												] );
												showToast(
													`License issued & ${
														ilSendEmail
															? 'email sent to ' +
															  c.email
															: 'ready to copy'
													}`,
													'success'
												);
												setIssueLicenseOpen( false );
												setIlProduct( 'Plugin Pro' );
												setIlPlan( 'Annual' );
												setIlSites( '1' );
												setIlExpiry( '365' );
												setIlNotes( '' );
												setIlSendEmail( true );
											} }
										>
											<Key size={ 14 } /> Issue &amp;{ ' ' }
											{ ilSendEmail
												? 'Email Customer'
												: 'Copy Key' }
										</FilledButton>
									</div>
								</div>
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
										'License Key',
										'Product',
										'Plan',
										'Sites',
										'Status',
										'Created',
										'Expires',
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
								{ licenses.map( ( lic, i ) => {
									const [ used, max ] = lic.sites
										.split( '/' )
										.map( Number );
									return (
										<tr
											key={ lic.id }
											style={ {
												backgroundColor:
													i % 2 === 0
														? M3.surface
														: M3.surfaceContainerLow,
												borderTop: `1px solid ${ M3.outlineVariant }`,
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
												<div className="flex items-center gap-1.5">
													<span
														className="text-xs"
														style={ {
															fontFamily:
																'Roboto Mono, monospace',
															color: M3.onSurface,
														} }
													>
														{ lic.key.substring(
															0,
															16
														) }
														…
													</span>
													<button
														onClick={ () =>
															handleCopy(
																lic.key
															)
														}
														style={ {
															background: 'none',
															border: 'none',
															cursor: 'pointer',
															padding: 0,
														} }
														className="opacity-40 hover:opacity-100 transition-opacity"
													>
														{ copiedKey ===
														lic.key ? (
															<Check
																size={ 12 }
																color={
																	M3.success
																}
															/>
														) : (
															<Copy
																size={ 12 }
																color={
																	M3.onSurfaceVariant
																}
															/>
														) }
													</button>
													<button
														onClick={
															onLicenseDetail
														}
														style={ {
															background: 'none',
															border: 'none',
															cursor: 'pointer',
															padding: 0,
														} }
														className="opacity-40 hover:opacity-100 transition-opacity"
														title="View license detail"
													>
														<ExternalLink
															size={ 12 }
															color={ M3.primary }
														/>
													</button>
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
												{ lic.product }
											</td>
											<td className="px-4 py-3">
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
													{ lic.plan }
												</span>
											</td>
											<td className="px-4 py-3">
												<div
													className="text-xs mb-0.5"
													style={ {
														color: M3.onSurface,
														fontFamily:
															'Roboto Mono, monospace',
													} }
												>
													{ lic.sites }
												</div>
												<div
													className="h-1 rounded-full"
													style={ {
														width: 40,
														backgroundColor:
															M3.outlineVariant,
													} }
												>
													<div
														className="h-full rounded-full"
														style={ {
															width: `${
																( used / max ) *
																100
															}%`,
															backgroundColor:
																lic.status ===
																'active'
																	? M3.primary
																	: M3.outlineVariant,
														} }
													/>
												</div>
											</td>
											<td className="px-4 py-3">
												<StatusBadge
													status={ lic.status }
												/>
											</td>
											<td
												className="px-4 py-3 text-xs"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ lic.created }
											</td>
											<td
												className="px-4 py-3 text-xs"
												style={ {
													color:
														lic.expires ===
														'Lifetime'
															? M3.success
															: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ lic.expires }
											</td>
											<td className="px-4 py-3">
												<div className="flex items-center gap-1">
													<TextButton
														small
														danger
														disabled={
															lic.status ===
															'revoked'
														}
														onClick={ () =>
															openDialog( {
																open: true,
																danger: true,
																icon: XCircle,
																title: 'Revoke License?',
																body: (
																	<span>
																		Revoke{ ' ' }
																		<strong
																			style={ {
																				fontFamily:
																					'Roboto Mono, monospace',
																			} }
																		>
																			{ lic.key.substring(
																				0,
																				16
																			) }
																			…
																		</strong>{ ' ' }
																		(
																		{
																			lic.product
																		}
																		)? This
																		cannot
																		be
																		undone.
																	</span>
																),
																confirmLabel:
																	'Revoke',
																onConfirm:
																	() => {
																		setLicenses(
																			(
																				ls
																			) =>
																				ls.map(
																					(
																						l
																					) =>
																						l.id ===
																						lic.id
																							? {
																									...l,
																									status: 'revoked',
																							  }
																							: l
																				)
																		);
																		showToast(
																			`${ lic.product } license revoked`,
																			'error'
																		);
																		closeDialog();
																	},
															} )
														}
													>
														<XCircle size={ 12 } />{ ' ' }
														Revoke
													</TextButton>
													<TextButton
														small
														disabled={
															lic.expires ===
																'Lifetime' ||
															lic.status ===
																'revoked'
														}
														onClick={ () =>
															openDialog( {
																open: true,
																danger: false,
																icon: Calendar,
																title: 'Extend Expiry?',
																body: (
																	<span>
																		Add 12
																		months
																		to{ ' ' }
																		<strong>
																			{
																				lic.product
																			}
																		</strong>
																		?
																	</span>
																),
																confirmLabel:
																	'Extend +12 months',
																onConfirm:
																	() => {
																		showToast(
																			`${ lic.product } expiry extended`,
																			'success'
																		);
																		closeDialog();
																	},
															} )
														}
													>
														<RefreshCw
															size={ 12 }
														/>{ ' ' }
														Extend
													</TextButton>
												</div>
											</td>
										</tr>
									);
								} ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ── Subscriptions tab ── */ }
				{ tab === 'subscriptions' && (
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
								Subscription History
							</span>
						</div>
						<table className="w-full">
							<thead>
								<tr
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										'ID',
										'Product',
										'Amount',
										'Billing Cycle',
										'Status',
										'Started',
										'Next Payment',
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
								{ c.subscriptions.map( ( sub, i ) => (
									<tr
										key={ sub.id }
										style={ {
											backgroundColor:
												i % 2 === 0
													? M3.surface
													: M3.surfaceContainerLow,
											borderTop: `1px solid ${ M3.outlineVariant }`,
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
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ sub.id }
										</td>
										<td
											className="px-4 py-3 text-sm font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ sub.product }
										</td>
										<td
											className="px-4 py-3 text-sm font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ sub.amount }
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
												{ sub.cycle }
											</span>
										</td>
										<td className="px-4 py-3">
											<StatusBadge
												status={ sub.status }
											/>
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ sub.started }
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ sub.nextPayment }
										</td>
										<td className="px-4 py-3">
											{ ( sub.status === 'active' ||
												sub.status === 'paused' ) && (
												<div className="flex items-center gap-1">
													{ sub.status ===
														'active' && (
														<TextButton
															small
															onClick={ () =>
																openDialog( {
																	open: true,
																	danger: false,
																	icon: PauseCircle,
																	title: 'Pause Subscription?',
																	body: (
																		<span>
																			Pause{ ' ' }
																			<strong>
																				{
																					sub.product
																				}
																			</strong>{ ' ' }
																			for{ ' ' }
																			{
																				c.name
																			}
																			?
																			Billing
																			stops
																			until
																			resumed.
																		</span>
																	),
																	confirmLabel:
																		'Pause',
																	onConfirm:
																		() => {
																			setSubs(
																				(
																					ss
																				) =>
																					ss.map(
																						(
																							s
																						) =>
																							s.id ===
																							sub.id
																								? {
																										...s,
																										status: 'paused',
																										nextPayment:
																											'—',
																								  }
																								: s
																					)
																			);
																			showToast(
																				`${ sub.product } paused`,
																				'warning'
																			);
																			closeDialog();
																		},
																} )
															}
														>
															<PauseCircle
																size={ 12 }
															/>{ ' ' }
															Pause
														</TextButton>
													) }
													{ sub.status ===
														'paused' && (
														<TextButton
															small
															onClick={ () => {
																setSubs(
																	( ss ) =>
																		ss.map(
																			(
																				s
																			) =>
																				s.id ===
																				sub.id
																					? {
																							...s,
																							status: 'active',
																							nextPayment:
																								'2025-02-15',
																					  }
																					: s
																		)
																);
																showToast(
																	`${ sub.product } resumed`,
																	'success'
																);
															} }
														>
															<CheckCircle
																size={ 12 }
															/>{ ' ' }
															Resume
														</TextButton>
													) }
													<TextButton
														small
														danger
														onClick={ () =>
															openDialog( {
																open: true,
																danger: true,
																icon: XCircle,
																title: 'Cancel Subscription?',
																body: (
																	<span>
																		Cancel{ ' ' }
																		<strong>
																			{
																				sub.product
																			}
																		</strong>{ ' ' }
																		(
																		{
																			sub.amount
																		}
																		) for{ ' ' }
																		<strong>
																			{
																				c.name
																			}
																		</strong>
																		?
																		Billing
																		will
																		stop
																		immediately.
																	</span>
																),
																confirmLabel:
																	'Cancel Subscription',
																onConfirm:
																	() => {
																		setSubs(
																			(
																				ss
																			) =>
																				ss.map(
																					(
																						s
																					) =>
																						s.id ===
																						sub.id
																							? {
																									...s,
																									status: 'cancelled',
																									nextPayment:
																										'—',
																							  }
																							: s
																				)
																		);
																		showToast(
																			`${ sub.product } cancelled`,
																			'error'
																		);
																		closeDialog();
																	},
															} )
														}
													>
														<XCircle size={ 12 } />{ ' ' }
														Cancel
													</TextButton>
												</div>
											) }
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ── Downloads tab ── */ }
				{ tab === 'downloads' && (
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
								Download History
							</span>
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
						<table className="w-full">
							<thead>
								<tr
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										'Product',
										'Version',
										'File Size',
										'IP Address',
										'Country',
										'Date',
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
								{ c.downloads.map( ( dl, i ) => (
									<tr
										key={ i }
										style={ {
											backgroundColor:
												i % 2 === 0
													? M3.surface
													: M3.surfaceContainerLow,
											borderTop: `1px solid ${ M3.outlineVariant }`,
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
											className="px-4 py-3 text-sm font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ dl.product }
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
												{ dl.version }
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
											{ dl.size }
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ dl.ip }
										</td>
										<td className="px-4 py-3 text-sm">
											<span className="flex items-center gap-1.5">
												<span>{ dl.flag }</span>
												<span
													className="text-xs"
													style={ {
														color: M3.onSurface,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ dl.country }
												</span>
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
											{ dl.date }
										</td>
										<td className="px-4 py-3">
											<span
												className="flex items-center gap-1 text-xs"
												style={ {
													color: M3.success,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												<CheckCircle size={ 12 } />{ ' ' }
												Verified
											</span>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ── Activity tab ── */ }
				{ tab === 'activity' && (
					<div className="p-6">
						<div
							className="font-medium text-sm mb-5"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Full Event Timeline
						</div>
						<div className="flex flex-col">
							{ c.events.map( ( evt, i ) => {
								const Icon = evt.icon;
								return (
									<div key={ i } className="flex gap-4">
										{ /* Spine */ }
										<div className="flex flex-col items-center flex-shrink-0">
											<div
												className="flex items-center justify-center w-8 h-8 rounded-full"
												style={ {
													backgroundColor: `${ evt.color }18`,
													border: `1.5px solid ${ evt.color }50`,
												} }
											>
												<Icon
													size={ 14 }
													color={ evt.color }
												/>
											</div>
											{ i < c.events.length - 1 && (
												<div
													className="w-px flex-1 my-1.5"
													style={ {
														backgroundColor:
															M3.outlineVariant,
														minHeight: 20,
													} }
												/>
											) }
										</div>

										{ /* Content */ }
										<div className="flex-1 pb-5 min-w-0">
											<div className="flex items-start justify-between gap-2">
												<div className="flex-1 min-w-0">
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

			{ /* Edit Customer slide-over panel */ }
			{ editOpen && (
				<Card
					className="p-6 flex flex-col gap-4"
					style={ { border: `2px solid ${ M3.primary }` } }
				>
					<div className="flex items-center justify-between">
						<div
							className="font-medium text-sm"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Edit Customer Details
						</div>
						<IconButton
							icon={ XCircle }
							onClick={ () => setEditOpen( false ) }
						/>
					</div>
					<div
						className="grid gap-4"
						style={ { gridTemplateColumns: '1fr 1fr' } }
					>
						{ [
							{ label: 'Full Name', defaultValue: c.name },
							{ label: 'Email', defaultValue: c.email },
							{ label: 'Phone', defaultValue: c.phone },
							{ label: 'Website', defaultValue: c.website },
							{ label: 'Location', defaultValue: c.location },
						].map( ( f ) => (
							<div key={ f.label }>
								<div
									className="text-xs font-medium mb-1"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ f.label }
								</div>
								<input
									defaultValue={ f.defaultValue }
									className="w-full px-3 py-2 rounded-lg text-sm outline-none"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${ M3.outlineVariant }`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
										boxSizing: 'border-box',
									} }
								/>
							</div>
						) ) }
					</div>
					<div className="flex items-center gap-2">
						<FilledButton
							small
							onClick={ () => {
								setEditOpen( false );
								showToast(
									'Customer details saved',
									'success'
								);
							} }
						>
							Save Changes
						</FilledButton>
						<TextButton onClick={ () => setEditOpen( false ) }>
							Cancel
						</TextButton>
					</div>
				</Card>
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

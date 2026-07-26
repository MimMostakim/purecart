import { useState } from 'react';
import {
	Mail,
	Globe,
	DollarSign,
	Copy,
	Edit3,
	FileText,
	Download as DownloadIcon,
	RefreshCw,
	Hash,
	Calendar,
	Tag,
	MousePointerClick,
	UserPlus,
	CheckCircle,
	ArrowUpRight,
	Trash2,
	CreditCard,
} from 'lucide-react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';
import {
	M3,
	affiliatesData,
	affiliateConversions,
	affiliatePayouts,
	affiliateLinks,
	affiliateClickTrend,
	affiliateTopProducts,
} from '../../utils/static-data';
import {
	TextButton,
	Card,
	OutlinedButton,
	TonalButton,
	ActionDropdown,
	FilledButton,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ToastProps } from '../ui';

export function AffiliateDetailPage( {
	affiliateId,
	onBack,
}: {
	affiliateId: string;
	onBack: () => void;
} ) {
	const aff =
		affiliatesData.find( ( a ) => a.id === affiliateId ) ??
		affiliatesData[ 0 ];
	const conversions =
		affiliateConversions[ affiliateId ] ??
		affiliateConversions[ 'AFF-001' ];
	const payouts =
		affiliatePayouts[ affiliateId ] ?? affiliatePayouts[ 'AFF-001' ];
	const links = affiliateLinks[ affiliateId ] ?? affiliateLinks[ 'AFF-001' ];
	const clickTrend =
		affiliateClickTrend[ affiliateId ] ?? affiliateClickTrend[ 'AFF-001' ];
	const topProds =
		affiliateTopProducts[ affiliateId ] ??
		affiliateTopProducts[ 'AFF-001' ];

	const [ tab, setTab ] = useState<
		'overview' | 'conversions' | 'links' | 'payouts' | 'activity'
	>( 'overview' );
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

	// Edit rate inline
	const [ editRate, setEditRate ] = useState( false );
	const [ rateValue, setRateValue ] = useState( aff.rate.replace( '%', '' ) );

	// New link form
	const [ addLinkOpen, setAddLinkOpen ] = useState( false );
	const [ linkLabel, setLinkLabel ] = useState( '' );
	const [ linkSource, setLinkSource ] = useState( 'blog' );
	const [ localLinks, setLocalLinks ] = useState( links );

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

	const convRate = Math.round(
		( aff.conversions / Math.max( aff.clicks, 1 ) ) * 100
	);

	const statusStyle: Record< string, { bg: string; text: string } > = {
		active: { bg: M3.successContainer, text: M3.success },
		pending: { bg: M3.warningContainer, text: M3.warning },
		suspended: { bg: '#FFDAD6', text: M3.error },
	};

	const convStatusStyle: Record< string, { bg: string; text: string } > = {
		approved: { bg: M3.successContainer, text: M3.success },
		pending: { bg: M3.warningContainer, text: M3.warning },
		refunded: { bg: M3.surfaceContainerHigh, text: M3.onSurfaceVariant },
	};

	const tabs = [
		{ id: 'overview' as const, label: 'Overview' },
		{
			id: 'conversions' as const,
			label: `Conversions (${ conversions.length })`,
		},
		{
			id: 'links' as const,
			label: `Referral Links (${ localLinks.length })`,
		},
		{ id: 'payouts' as const, label: `Payouts (${ payouts.length })` },
		{ id: 'activity' as const, label: 'Activity' },
	];

	return (
		<div className="flex flex-col gap-5">
			<TextButton onClick={ onBack }>← Back to Affiliates</TextButton>

			{ /* ── Hero card ── */ }
			<Card className="overflow-hidden">
				<div
					className="h-24 w-full"
					style={ {
						background: `linear-gradient(135deg, ${ M3.secondary } 0%, #7B6FA0 100%)`,
					} }
				/>
				<div className="px-6 pb-6">
					<div
						className="flex items-end justify-between"
						style={ { marginTop: -36 } }
					>
						<div className="flex items-end gap-4">
							<div
								className="flex items-center justify-center w-20 h-20 rounded-2xl text-2xl font-semibold border-4 border-white shadow-sm"
								style={ {
									backgroundColor: M3.secondaryContainer,
									color: M3.onSecondaryContainer,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ aff.name
									.split( ' ' )
									.map( ( w ) => w[ 0 ] )
									.join( '' )
									.slice( 0, 2 )
									.toUpperCase() }
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
										{ aff.name }
									</h2>
									<span
										className="text-xs px-2 py-0.5 rounded-full capitalize"
										style={ {
											backgroundColor:
												statusStyle[ aff.status ]?.bg,
											color: statusStyle[ aff.status ]
												?.text,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ aff.status }
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
										{ aff.email }
									</span>
									<span
										className="text-sm flex items-center gap-1"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										<Globe size={ 12 } />
										{ aff.email.split( '@' )[ 1 ] }
									</span>
								</div>
							</div>
						</div>

						{ /* Header actions */ }
						<div className="flex items-center gap-2 pb-1">
							<OutlinedButton
								small
								onClick={ () =>
									openDialog( {
										open: true,
										danger: false,
										icon: DollarSign,
										title: 'Send Commission Payment?',
										body: (
											<span>
												Pay{ ' ' }
												<strong>
													{ aff.commission }
												</strong>{ ' ' }
												owed commission to{ ' ' }
												<strong>{ aff.name }</strong>?
												Balance resets to $0.
											</span>
										),
										confirmLabel: 'Send Payment',
										onConfirm: () => {
											showToast(
												`${ aff.commission } paid to ${ aff.name }`,
												'success'
											);
											closeDialog();
										},
									} )
								}
							>
								<DollarSign size={ 14 } /> Pay Commission
							</OutlinedButton>
							<TonalButton
								small
								onClick={ () =>
									showToast(
										`Message sent to ${ aff.email }`,
										'success'
									)
								}
							>
								<Mail size={ 14 } /> Send Message
							</TonalButton>
							<ActionDropdown
								actions={ [
									{
										label: 'Copy Referral Code',
										icon: Copy,
										onClick: () => {
											navigator.clipboard?.writeText(
												aff.code
											);
											showToast(
												'Referral code copied',
												'info'
											);
										},
									},
									{
										label: 'Copy Referral Link',
										icon: Copy,
										onClick: () => {
											navigator.clipboard?.writeText(
												`https://example.com/?ref=${ aff.code }`
											);
											showToast(
												'Referral link copied',
												'info'
											);
										},
									},
									{
										label: 'Edit Commission Rate',
										icon: Edit3,
										onClick: () => setEditRate( true ),
									},
									{
										label: 'View All Payouts',
										icon: FileText,
										onClick: () => setTab( 'payouts' ),
									},
									{
										label: 'Export Affiliate Data',
										icon: DownloadIcon,
										onClick: () =>
											showToast(
												'Affiliate data exported',
												'success'
											),
										dividerBefore: true,
									},
									{
										label: 'Regenerate Referral Code',
										icon: RefreshCw,
										danger: true,
										dividerBefore: true,
										onClick: () =>
											openDialog( {
												open: true,
												danger: true,
												icon: RefreshCw,
												title: 'Regenerate Referral Code?',
												body: (
													<span>
														Replace code{ ' ' }
														<strong
															style={ {
																fontFamily:
																	'Roboto Mono, monospace',
															} }
														>
															{ aff.code }
														</strong>
														? All existing links
														using this code will
														immediately break.
													</span>
												),
												confirmLabel: 'Regenerate Code',
												onConfirm: () => {
													showToast(
														'New referral code generated',
														'success'
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
								icon: Hash,
								label: 'Affiliate ID',
								value: aff.id,
							},
							{
								icon: Calendar,
								label: 'Joined',
								value: aff.joined,
							},
							{
								icon: Tag,
								label: 'Commission Rate',
								value: aff.rate,
							},
							{
								icon: DollarSign,
								label: 'Total Paid Out',
								value: aff.paid,
							},
							{
								icon: MousePointerClick,
								label: 'Conv. Rate',
								value: `${ convRate }%`,
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
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ m.value }
									</div>
								</div>
							</div>
						) ) }

						{ /* Referral code badge */ }
						<div
							className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full"
							style={ {
								backgroundColor: M3.primaryContainer,
								border: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<span
								className="text-xs font-medium"
								style={ {
									color: M3.onPrimaryContainer,
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ aff.code }
							</span>
							<button
								onClick={ () => {
									navigator.clipboard?.writeText(
										`https://example.com/?ref=${ aff.code }`
									);
									showToast( 'Referral link copied', 'info' );
								} }
								style={ {
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									padding: 0,
									opacity: 0.7,
								} }
							>
								<Copy
									size={ 12 }
									color={ M3.onPrimaryContainer }
								/>
							</button>
						</div>
					</div>
				</div>
			</Card>

			{ /* ── KPI strip ── */ }
			<div className="grid grid-cols-4 gap-4">
				{ [
					{
						icon: MousePointerClick,
						label: 'Total Clicks',
						value: aff.clicks.toLocaleString(),
						sub: 'All time',
						color: M3.primary,
						bg: M3.primaryContainer,
					},
					{
						icon: UserPlus,
						label: 'Total Conversions',
						value: String( aff.conversions ),
						sub: `${ convRate }% conv. rate`,
						color: M3.success,
						bg: M3.successContainer,
					},
					{
						icon: DollarSign,
						label: 'Revenue Generated',
						value: aff.revenue,
						sub: 'All time',
						color: M3.secondary,
						bg: M3.secondaryContainer,
					},
					{
						icon: Tag,
						label: 'Commission Owed',
						value: aff.commission,
						sub: `${ aff.rate } rate`,
						color: M3.warning,
						bg: M3.warningContainer,
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

			{ /* ── Edit Rate inline card ── */ }
			{ editRate && (
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
								{ aff.name }
							</span>
						</div>
						<div
							className="text-xs mt-0.5"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Current: <strong>{ aff.rate }</strong> · Revenue
							generated: { aff.revenue }
						</div>
					</div>
					<div className="flex items-center gap-3 flex-shrink-0">
						<div className="flex items-center gap-2">
							<input
								type="number"
								min={ 1 }
								max={ 50 }
								value={ rateValue }
								onChange={ ( e ) =>
									setRateValue( e.target.value )
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
							{ [ '5', '10', '15', '20', '25' ].map( ( p ) => (
								<button
									key={ p }
									onClick={ () => setRateValue( p ) }
									className="w-10 h-8 rounded-lg text-xs"
									style={ {
										backgroundColor:
											rateValue === p
												? M3.secondary
												: M3.surfaceContainerHigh,
										color:
											rateValue === p
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
						<TextButton onClick={ () => setEditRate( false ) }>
							Cancel
						</TextButton>
						<TonalButton
							small
							onClick={ () => {
								showToast(
									`Commission rate updated to ${ rateValue }% for ${ aff.name }`,
									'success'
								);
								setEditRate( false );
							} }
						>
							Save Rate
						</TonalButton>
					</div>
				</Card>
			) }

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
					<div className="p-6 flex flex-col gap-6">
						{ /* Click & conversion trend */ }
						<div>
							<div
								className="font-medium text-sm mb-3"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Clicks &amp; Conversions — Last 6 months
							</div>
							<ResponsiveContainer width="100%" height={ 220 }>
								<LineChart data={ clickTrend }>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={ M3.outlineVariant }
									/>
									<XAxis
										dataKey="month"
										tick={ {
											fontSize: 11,
											fill: M3.onSurfaceVariant,
										} }
									/>
									<YAxis
										yAxisId="left"
										tick={ {
											fontSize: 11,
											fill: M3.onSurfaceVariant,
										} }
									/>
									<YAxis
										yAxisId="right"
										orientation="right"
										tick={ {
											fontSize: 11,
											fill: M3.onSurfaceVariant,
										} }
									/>
									<Tooltip
										contentStyle={ {
											borderRadius: 8,
											border: `1px solid ${ M3.outlineVariant }`,
											fontFamily: 'Roboto, sans-serif',
										} }
									/>
									<Legend
										wrapperStyle={ {
											fontSize: 11,
											fontFamily: 'Roboto, sans-serif',
										} }
									/>
									<Line
										yAxisId="left"
										type="monotone"
										dataKey="clicks"
										name="Clicks"
										stroke={ M3.primary }
										strokeWidth={ 2 }
										dot={ { r: 3 } }
									/>
									<Line
										yAxisId="right"
										type="monotone"
										dataKey="conversions"
										name="Conversions"
										stroke={ M3.success }
										strokeWidth={ 2 }
										dot={ { r: 3 } }
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>

						{ /* Top products + account summary side by side */ }
						<div
							className="grid gap-5"
							style={ { gridTemplateColumns: '3fr 2fr' } }
						>
							<div>
								<div
									className="font-medium text-sm mb-3"
									style={ {
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Top Products by Conversions
								</div>
								<div className="flex flex-col gap-3">
									{ topProds.map( ( p ) => (
										<div key={ p.product }>
											<div
												className="flex items-center justify-between mb-1 text-xs"
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
													{ p.product }
												</span>
												<div className="flex items-center gap-3">
													<span
														style={ {
															color: M3.success,
														} }
													>
														{ p.revenue }
													</span>
													<span
														style={ {
															color: M3.onSurfaceVariant,
														} }
													>
														{ p.conversions } conv.
													</span>
												</div>
											</div>
											<div
												className="h-1.5 rounded-full overflow-hidden"
												style={ {
													backgroundColor:
														M3.surfaceContainerHigh,
												} }
											>
												<div
													className="h-full rounded-full"
													style={ {
														width: `${ p.pct }%`,
														backgroundColor:
															M3.primary,
													} }
												/>
											</div>
										</div>
									) ) }
								</div>
							</div>

							<div>
								<div
									className="font-medium text-sm mb-3"
									style={ {
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Performance Summary
								</div>
								<div
									className="rounded-xl p-4 flex flex-col gap-3"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										{
											label: 'Affiliate ID',
											value: aff.id,
										},
										{
											label: 'Status',
											value:
												aff.status
													.charAt( 0 )
													.toUpperCase() +
												aff.status.slice( 1 ),
										},
										{
											label: 'Referral Code',
											value: aff.code,
										},
										{
											label: 'Commission Rate',
											value: aff.rate,
										},
										{ label: 'Joined', value: aff.joined },
										{
											label: 'Total Paid Out',
											value: aff.paid,
										},
										{
											label: 'Conv. Rate',
											value: `${ convRate }%`,
										},
										{
											label: 'Active Links',
											value: String( localLinks.length ),
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
														'Roboto Mono, monospace',
												} }
											>
												{ row.value }
											</span>
										</div>
									) ) }
								</div>
							</div>
						</div>
					</div>
				) }

				{ /* ════ CONVERSIONS ════ */ }
				{ tab === 'conversions' && (
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
									conversions.filter(
										( c ) => c.status === 'approved'
									).length
								}{ ' ' }
								approved ·{ ' ' }
								{
									conversions.filter(
										( c ) => c.status === 'pending'
									).length
								}{ ' ' }
								pending ·{ ' ' }
								{
									conversions.filter(
										( c ) => c.status === 'refunded'
									).length
								}{ ' ' }
								refunded
							</span>
							<OutlinedButton
								small
								onClick={ () =>
									showToast(
										'Conversions exported as CSV',
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
										'Order Ref',
										'Customer',
										'Product',
										'Sale Value',
										'Commission',
										'Date',
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
												whiteSpace: 'nowrap',
											} }
										>
											{ h }
										</th>
									) ) }
								</tr>
							</thead>
							<tbody>
								{ conversions.map( ( c, idx ) => (
									<tr
										key={ c.id }
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
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.primary,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ c.orderRef }
										</td>
										<td
											className="px-4 py-3 text-sm"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ c.customer }
										</td>
										<td
											className="px-4 py-3 text-sm"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ c.product }
										</td>
										<td
											className="px-4 py-3 text-sm font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ c.saleValue }
										</td>
										<td
											className="px-4 py-3 text-sm font-semibold"
											style={ {
												color: M3.success,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ c.commission }
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ c.date }
										</td>
										<td className="px-4 py-3">
											<span
												className="text-xs px-2 py-0.5 rounded-full capitalize"
												style={ {
													backgroundColor:
														convStatusStyle[
															c.status
														]?.bg,
													color: convStatusStyle[
														c.status
													]?.text,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ c.status }
											</span>
										</td>
										<td className="px-4 py-3">
											{ c.status === 'pending' && (
												<TextButton
													small
													onClick={ () =>
														openDialog( {
															open: true,
															danger: false,
															icon: CheckCircle,
															title: 'Approve Conversion?',
															body: (
																<span>
																	Approve
																	order{ ' ' }
																	<strong
																		style={ {
																			fontFamily:
																				'Roboto Mono, monospace',
																		} }
																	>
																		{
																			c.orderRef
																		}
																	</strong>{ ' ' }
																	(
																	{
																		c.saleValue
																	}
																	) and credit{ ' ' }
																	<strong>
																		{
																			c.commission
																		}
																	</strong>{ ' ' }
																	to{ ' ' }
																	{ aff.name }
																	?
																</span>
															),
															confirmLabel:
																'Approve',
															onConfirm: () => {
																showToast(
																	`${ c.orderRef } approved — ${ c.commission } credited`,
																	'success'
																);
																closeDialog();
															},
														} )
													}
												>
													Approve
												</TextButton>
											) }
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ════ REFERRAL LINKS ════ */ }
				{ tab === 'links' && (
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
								Tracking Links
							</span>
							<FilledButton
								small
								onClick={ () => setAddLinkOpen( ( o ) => ! o ) }
							>
								<ArrowUpRight size={ 14 } /> New Link
							</FilledButton>
						</div>

						{ /* New link form */ }
						{ addLinkOpen && (
							<div
								className="px-5 py-4 flex items-center gap-3"
								style={ {
									backgroundColor: M3.primaryContainer,
									borderBottom: `1px solid ${ M3.outlineVariant }`,
								} }
							>
								<input
									type="text"
									placeholder="Label (e.g. Email Newsletter)"
									value={ linkLabel }
									onChange={ ( e ) =>
										setLinkLabel( e.target.value )
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
									value={ linkSource }
									onChange={ ( e ) =>
										setLinkSource( e.target.value )
									}
									className="px-3 py-2 rounded-lg text-sm outline-none"
									style={ {
										backgroundColor: M3.surface,
										border: `1px solid ${ M3.outline }`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ [
										'blog',
										'email',
										'social',
										'youtube',
										'podcast',
										'banner',
										'review',
									].map( ( s ) => (
										<option key={ s }>{ s }</option>
									) ) }
								</select>
								<FilledButton
									small
									onClick={ () => {
										if ( ! linkLabel.trim() ) {
											showToast(
												'Enter a link label',
												'error'
											);
											return;
										}
										setLocalLinks( ( l ) => [
											...l,
											{
												id: Date.now(),
												label: linkLabel,
												url: `https://example.com/?ref=${ aff.code }&utm_source=${ linkSource }`,
												clicks: 0,
												conversions: 0,
												created: new Date()
													.toISOString()
													.split( 'T' )[ 0 ],
											},
										] );
										showToast(
											`New tracking link created`,
											'success'
										);
										setLinkLabel( '' );
										setAddLinkOpen( false );
									} }
								>
									Create Link
								</FilledButton>
								<TextButton
									onClick={ () => setAddLinkOpen( false ) }
								>
									Cancel
								</TextButton>
							</div>
						) }

						<div className="flex flex-col gap-0">
							{ localLinks.map( ( link, idx ) => (
								<div
									key={ link.id }
									className="flex items-start gap-4 px-5 py-4 transition-all"
									style={ {
										borderBottom: `1px solid ${ M3.outlineVariant }`,
										backgroundColor:
											idx % 2 === 0
												? M3.surface
												: M3.surfaceContainerLow,
									} }
								>
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
										style={ {
											backgroundColor:
												M3.primaryContainer,
										} }
									>
										<Globe
											size={ 15 }
											color={ M3.primary }
										/>
									</div>
									<div className="flex-1 min-w-0">
										<div
											className="text-sm font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ link.label }
										</div>
										<div
											className="text-xs mt-0.5 truncate"
											style={ {
												color: M3.primary,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ link.url }
										</div>
										<div className="flex items-center gap-4 mt-1.5">
											<span
												className="text-xs"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												<strong
													style={ {
														color: M3.onSurface,
													} }
												>
													{ link.clicks.toLocaleString() }
												</strong>{ ' ' }
												clicks
											</span>
											<span
												className="text-xs"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												<strong
													style={ {
														color: M3.onSurface,
													} }
												>
													{ link.conversions }
												</strong>{ ' ' }
												conversions
											</span>
											{ link.clicks > 0 && (
												<span
													className="text-xs"
													style={ {
														color: M3.onSurfaceVariant,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													<strong
														style={ {
															color: M3.success,
														} }
													>
														{ Math.round(
															( link.conversions /
																link.clicks ) *
																100
														) }
														%
													</strong>{ ' ' }
													conv. rate
												</span>
											) }
											<span
												className="text-xs"
												style={ {
													color: M3.outlineVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												Created { link.created }
											</span>
										</div>
									</div>
									<div className="flex items-center gap-1 flex-shrink-0">
										<button
											onClick={ () => {
												navigator.clipboard?.writeText(
													link.url
												);
												showToast(
													'Link copied to clipboard',
													'info'
												);
											} }
											className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all"
											style={ {
												backgroundColor:
													M3.surfaceContainerHigh,
												color: M3.onSurfaceVariant,
												border: 'none',
												cursor: 'pointer',
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											<Copy size={ 11 } /> Copy
										</button>
										<button
											onClick={ () =>
												openDialog( {
													open: true,
													danger: true,
													icon: Trash2,
													title: 'Delete Tracking Link?',
													body: (
														<span>
															Delete the tracking
															link{ ' ' }
															<strong>
																"{ link.label }"
															</strong>
															? Clicks and
															conversions history
															will be lost.
														</span>
													),
													confirmLabel: 'Delete Link',
													onConfirm: () => {
														setLocalLinks( ( l ) =>
															l.filter(
																( x ) =>
																	x.id !==
																	link.id
															)
														);
														showToast(
															'Link deleted',
															'error'
														);
														closeDialog();
													},
												} )
											}
											className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
											style={ {
												background: 'none',
												border: 'none',
												cursor: 'pointer',
												color: M3.error,
											} }
											onMouseEnter={ ( e ) => {
												(
													e.currentTarget as HTMLElement
												 ).style.backgroundColor =
													'#FFDAD6';
											} }
											onMouseLeave={ ( e ) => {
												(
													e.currentTarget as HTMLElement
												 ).style.backgroundColor =
													'transparent';
											} }
										>
											<Trash2 size={ 13 } />
										</button>
									</div>
								</div>
							) ) }
						</div>
					</div>
				) }

				{ /* ════ PAYOUTS ════ */ }
				{ tab === 'payouts' && (
					<div>
						{ /* Summary banner */ }
						<div
							className="flex items-center gap-6 px-5 py-4"
							style={ {
								backgroundColor: M3.surfaceContainerLow,
								borderBottom: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							{ [
								{
									label: 'Total Paid Out',
									value: aff.paid,
									color: M3.success,
								},
								{
									label: 'Commission Owed',
									value: aff.commission,
									color: M3.warning,
								},
								{
									label: 'Payout Count',
									value: String( payouts.length ),
									color: M3.onSurface,
								},
							].map( ( s ) => (
								<div key={ s.label }>
									<div
										className="text-xl font-light"
										style={ {
											color: s.color,
											fontFamily:
												'Roboto Mono, monospace',
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
							) ) }
							<div className="ml-auto">
								<FilledButton
									small
									onClick={ () =>
										openDialog( {
											open: true,
											danger: false,
											icon: DollarSign,
											title: 'Send Commission Payment?',
											body: (
												<span>
													Pay{ ' ' }
													<strong>
														{ aff.commission }
													</strong>{ ' ' }
													to{ ' ' }
													<strong>
														{ aff.name }
													</strong>{ ' ' }
													via their registered payment
													method?
												</span>
											),
											confirmLabel: 'Send Payment',
											onConfirm: () => {
												showToast(
													`${ aff.commission } paid to ${ aff.name }`,
													'success'
												);
												closeDialog();
											},
										} )
									}
								>
									<DollarSign size={ 14 } /> Pay Now (
									{ aff.commission })
								</FilledButton>
							</div>
						</div>

						<table className="w-full">
							<thead>
								<tr
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										'Payment ID',
										'Date',
										'Amount',
										'Method',
										'Reference',
										'Status',
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
												whiteSpace: 'nowrap',
											} }
										>
											{ h }
										</th>
									) ) }
								</tr>
							</thead>
							<tbody>
								{ payouts.map( ( p, idx ) => (
									<tr
										key={ p.id }
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
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.primary,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ p.id }
										</td>
										<td
											className="px-4 py-3 text-sm"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ p.date }
										</td>
										<td
											className="px-4 py-3 text-sm font-semibold"
											style={ {
												color: M3.success,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ p.amount }
										</td>
										<td
											className="px-4 py-3 text-sm"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ p.method }
										</td>
										<td
											className="px-4 py-3 text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ p.ref }
										</td>
										<td className="px-4 py-3">
											<span
												className="text-xs px-2 py-0.5 rounded-full capitalize"
												style={ {
													backgroundColor:
														p.status === 'paid'
															? M3.successContainer
															: M3.warningContainer,
													color:
														p.status === 'paid'
															? M3.success
															: M3.warning,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ p.status }
											</span>
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
								Affiliate Event Log
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
							{ [
								{
									icon: UserPlus,
									color: M3.success,
									desc: `${ aff.name } joined the affiliate program`,
									time: aff.joined + ' 10:00',
									actor: 'System',
								},
								{
									icon: CheckCircle,
									color: M3.success,
									desc: 'Application approved by admin',
									time: aff.joined + ' 10:05',
									actor: 'Admin',
								},
								{
									icon: Tag,
									color: M3.primary,
									desc: `Commission rate set to ${ aff.rate }`,
									time: aff.joined + ' 10:06',
									actor: 'Admin',
								},
								{
									icon: MousePointerClick,
									color: M3.info,
									desc: 'First referral click recorded',
									time: '2023-02-15 14:22',
									actor: 'System',
								},
								{
									icon: DollarSign,
									color: M3.success,
									desc: `First conversion — Plugin Pro Annual ($99)`,
									time: '2023-02-28 09:11',
									actor: 'System',
									meta: `+$${ Math.round(
										( 99 * parseInt( aff.rate ) ) / 100
									) }.00`,
								},
								{
									icon: CreditCard,
									color: M3.success,
									desc: `Commission payment sent — ${ aff.paid }`,
									time: '2025-01-01 00:00',
									actor: 'Admin',
									meta: aff.paid,
								},
								{
									icon: RefreshCw,
									color: M3.secondary,
									desc: 'Referral code refreshed by affiliate',
									time: '2024-06-01 11:30',
									actor: aff.email,
								},
							].map( ( evt, i ) => {
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
											{ i < 6 && (
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
												{ ( evt as any ).meta && (
													<span
														className="text-sm font-semibold flex-shrink-0"
														style={ {
															color: M3.success,
															fontFamily:
																'Roboto Mono, monospace',
														} }
													>
														{ ( evt as any ).meta }
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

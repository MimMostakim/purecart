import { useState } from 'react';
import {
	Repeat,
	Users,
	ShoppingCart,
	DollarSign,
	TrendingUp,
	Activity,
	CreditCard,
	TrendingDown,
	ArrowUpRight,
	Lock,
} from 'lucide-react';
import {
	AreaChart,
	Area,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';
import {
	M3,
	mrrData,
	analyticsBarData,
	topCountries,
	versionData,
} from '../../utils/static-data';
import type { Page } from '../../utils/static-data';
import { KpiCard, Card, SectionTitle } from '../ui';

export function AnalyticsPage( {
	onNav,
	enabledModules,
}: {
	onNav: ( p: Page ) => void;
	enabledModules: Set< string >;
} ) {
	const [ range, setRange ] = useState( '30d' );
	const ranges = [ '7d', '30d', '90d', '12m', 'Custom' ];

	const analyticsModules = [
		{
			key: 'Subscriptions',
			page: 'analytics-subscriptions' as Page,
			icon: Repeat,
			label: 'Subscription Analytics',
			desc: 'MRR trend, churn, plan mix, revenue by product',
		},
		{
			key: 'Affiliate Program',
			page: 'analytics-affiliates' as Page,
			icon: Users,
			label: 'Affiliate Analytics',
			desc: 'Clicks, conversions, top affiliates, funnel',
		},
		{
			key: 'Abandoned Cart',
			page: 'analytics-abandoned-cart' as Page,
			icon: ShoppingCart,
			label: 'Abandoned Cart Analytics',
			desc: 'Recovery rate, email sequence performance',
		},
	];

	return (
		<div className="flex flex-col gap-5">
			<div className="flex justify-end">
				<div
					className="flex rounded-full overflow-hidden"
					style={ { border: `1px solid ${ M3.outlineVariant }` } }
				>
					{ ranges.map( ( r ) => (
						<button
							key={ r }
							onClick={ () => setRange( r ) }
							className="px-4 py-2 text-sm transition-all"
							style={ {
								backgroundColor:
									range === r ? M3.primary : 'transparent',
								color:
									range === r
										? M3.onPrimary
										: M3.onSurfaceVariant,
								border: 'none',
								cursor: 'pointer',
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							{ r }
						</button>
					) ) }
				</div>
			</div>

			<div className="grid grid-cols-4 gap-4">
				<KpiCard
					label="MRR"
					value="$44,600"
					trend="▲ +8.3%"
					trendUp
					icon={ DollarSign }
				/>
				<KpiCard
					label="ARR"
					value="$535,200"
					trend="▲ +8.1%"
					trendUp
					icon={ TrendingUp }
				/>
				<KpiCard
					label="Churn Rate"
					value="2.4%"
					trend="▼ -0.3%"
					trendUp
					icon={ Activity }
				/>
				<KpiCard
					label="Avg LTV"
					value="$847"
					trend="▲ +$34"
					trendUp
					icon={ CreditCard }
				/>
			</div>

			<Card className="p-5">
				<SectionTitle>MRR Trend</SectionTitle>
				<ResponsiveContainer width="100%" height={ 240 }>
					<AreaChart data={ mrrData }>
						<defs>
							<linearGradient
								id="mrrGrad"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor={ M3.primary }
									stopOpacity={ 0.15 }
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
							tick={ { fontSize: 11, fill: M3.onSurfaceVariant } }
						/>
						<YAxis
							tick={ { fontSize: 11, fill: M3.onSurfaceVariant } }
							tickFormatter={ ( v ) =>
								`$${ ( v / 1000 ).toFixed( 0 ) }k`
							}
						/>
						<Tooltip
							formatter={ ( v: number ) =>
								`$${ v.toLocaleString() }`
							}
							contentStyle={ {
								borderRadius: 8,
								border: `1px solid ${ M3.outlineVariant }`,
								fontFamily: 'Roboto, sans-serif',
							} }
						/>
						<Area
							type="monotone"
							dataKey="mrr"
							name="MRR"
							stroke={ M3.primary }
							fill="url(#mrrGrad)"
							strokeWidth={ 2 }
						/>
					</AreaChart>
				</ResponsiveContainer>
			</Card>

			<div
				className="grid gap-4"
				style={ { gridTemplateColumns: '3fr 2fr' } }
			>
				<Card className="p-5">
					<SectionTitle>License Health by Month</SectionTitle>
					<ResponsiveContainer width="100%" height={ 220 }>
						<BarChart data={ analyticsBarData }>
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
							<Bar
								dataKey="active"
								name="Active"
								stackId="a"
								fill={ M3.success }
							/>
							<Bar
								dataKey="expired"
								name="Expired"
								stackId="a"
								fill={ M3.error }
							/>
							<Bar
								dataKey="suspended"
								name="Suspended"
								stackId="a"
								fill={ M3.warning }
							/>
							<Bar
								dataKey="revoked"
								name="Revoked"
								stackId="a"
								fill={ M3.onSurfaceVariant }
								radius={ [ 4, 4, 0, 0 ] }
							/>
						</BarChart>
					</ResponsiveContainer>
				</Card>

				<Card className="p-5">
					<SectionTitle>Top Countries by Downloads</SectionTitle>
					<div className="flex flex-col gap-2">
						{ topCountries.map( ( c ) => (
							<div
								key={ c.country }
								className="flex items-center gap-2"
							>
								<span className="text-base leading-none w-5">
									{ c.flag }
								</span>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between mb-0.5">
										<span
											className="text-xs truncate"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ c.country }
										</span>
										<span
											className="text-xs ml-2 flex-shrink-0"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ ( c.downloads / 1000 ).toFixed(
												1
											) }
											k
										</span>
									</div>
									<div
										className="h-1 rounded-full"
										style={ {
											backgroundColor: M3.outlineVariant,
										} }
									>
										<div
											className="h-full rounded-full"
											style={ {
												width: `${ c.pct }%`,
												backgroundColor: M3.primary,
											} }
										/>
									</div>
								</div>
							</div>
						) ) }
					</div>
				</Card>
			</div>

			<div
				className="grid gap-4"
				style={ { gridTemplateColumns: '2fr 3fr' } }
			>
				<Card className="p-5">
					<SectionTitle>Version Adoption</SectionTitle>
					<ResponsiveContainer width="100%" height={ 180 }>
						<PieChart>
							<Pie
								data={ versionData }
								cx="50%"
								cy="50%"
								innerRadius={ 45 }
								outerRadius={ 75 }
								dataKey="value"
								paddingAngle={ 2 }
							>
								{ versionData.map( ( entry, i ) => (
									<Cell key={ i } fill={ entry.color } />
								) ) }
							</Pie>
							<Tooltip
								formatter={ ( v: number ) => `${ v }%` }
								contentStyle={ {
									borderRadius: 8,
									border: `1px solid ${ M3.outlineVariant }`,
									fontFamily: 'Roboto, sans-serif',
								} }
							/>
						</PieChart>
					</ResponsiveContainer>
					<div className="flex flex-col gap-1 mt-2">
						{ versionData.map( ( d ) => (
							<div
								key={ d.name }
								className="flex items-center justify-between text-xs"
								style={ { fontFamily: 'Roboto, sans-serif' } }
							>
								<div className="flex items-center gap-2">
									<div
										className="w-2 h-2 rounded-full"
										style={ { backgroundColor: d.color } }
									/>
									<span
										style={ { color: M3.onSurfaceVariant } }
									>
										{ d.name }
									</span>
								</div>
								<span
									className="font-medium"
									style={ { color: M3.onSurface } }
								>
									{ d.value }%
								</span>
							</div>
						) ) }
					</div>
				</Card>

				<Card className="p-5">
					<SectionTitle>Product Downloads</SectionTitle>
					<table className="w-full">
						<thead>
							<tr>
								{ [
									'Product',
									'Version',
									'Downloads',
									'Trend',
								].map( ( h ) => (
									<th
										key={ h }
										className="text-left pb-2 text-xs font-medium"
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
							{ [
								{
									product: 'Plugin Pro',
									version: 'v2.4.1',
									downloads: '14,823',
									up: true,
								},
								{
									product: 'Theme Bundle',
									version: 'v1.8.0',
									downloads: '9,214',
									up: true,
								},
								{
									product: 'SaaS Connector',
									version: 'v3.1.0',
									downloads: '6,441',
									up: false,
								},
								{
									product: 'Security Module',
									version: 'v1.2.3',
									downloads: '4,892',
									up: true,
								},
								{
									product: 'Analytics Add-on',
									version: 'v2.0.1',
									downloads: '3,109',
									up: true,
								},
							].map( ( row, i ) => (
								<tr
									key={ i }
									style={ {
										borderTop: `1px solid ${ M3.outlineVariant }`,
									} }
								>
									<td
										className="py-2.5 text-sm"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.product }
									</td>
									<td
										className="py-2.5 text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.version }
									</td>
									<td
										className="py-2.5 text-sm font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.downloads }
									</td>
									<td className="py-2.5">
										{ row.up ? (
											<TrendingUp
												size={ 14 }
												color={ M3.success }
											/>
										) : (
											<TrendingDown
												size={ 14 }
												color={ M3.error }
											/>
										) }
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</Card>
			</div>

			{ /* Module-specific analytics cards */ }
			<div>
				<div
					className="font-medium text-sm mb-3"
					style={ {
						color: M3.onSurface,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					Module Analytics
				</div>
				<div className="grid grid-cols-3 gap-4">
					{ analyticsModules.map( ( m ) => {
						const active = enabledModules.has( m.key );
						const Icon = m.icon;
						return (
							<button
								key={ m.key }
								onClick={ () => active && onNav( m.page ) }
								disabled={ ! active }
								className="text-left rounded-xl p-5 flex flex-col gap-3 transition-all"
								style={ {
									backgroundColor: active
										? M3.surface
										: M3.surfaceContainerLow,
									boxShadow: active
										? '0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)'
										: 'none',
									opacity: active ? 1 : 0.5,
									border: `1px solid ${
										active
											? M3.outlineVariant
											: M3.outlineVariant
									}`,
									cursor: active ? 'pointer' : 'not-allowed',
								} }
								onMouseEnter={ ( e ) => {
									if ( active )
										(
											e.currentTarget as HTMLElement
										 ).style.boxShadow =
											'0 2px 8px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)';
								} }
								onMouseLeave={ ( e ) => {
									(
										e.currentTarget as HTMLElement
									 ).style.boxShadow = active
										? '0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)'
										: 'none';
								} }
							>
								<div className="flex items-center justify-between">
									<div
										className="w-9 h-9 rounded-xl flex items-center justify-center"
										style={ {
											backgroundColor: active
												? M3.primaryContainer
												: M3.surfaceContainerHigh,
										} }
									>
										<Icon
											size={ 18 }
											color={
												active
													? M3.primary
													: M3.onSurfaceVariant
											}
										/>
									</div>
									{ active ? (
										<ArrowUpRight
											size={ 16 }
											color={ M3.primary }
										/>
									) : (
										<Lock
											size={ 14 }
											color={ M3.onSurfaceVariant }
										/>
									) }
								</div>
								<div>
									<div
										className="text-sm font-medium mb-0.5"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ m.label }
									</div>
									<div
										className="text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ m.desc }
									</div>
								</div>
								{ ! active && (
									<span
										className="text-xs px-2 py-0.5 rounded-full self-start"
										style={ {
											backgroundColor:
												M3.surfaceContainerHigh,
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										Enable module in Settings
									</span>
								) }
							</button>
						);
					} ) }
				</div>
			</div>
		</div>
	);
}

import { useState } from 'react';
import {
	MousePointerClick,
	UserPlus,
	DollarSign,
	Activity,
	ChevronDown,
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
	affiliateTrendData,
	topAffiliates,
	affiliateConversionFunnel,
} from '../../utils/static-data';
import { TextButton, KpiCard, Card, SectionTitle } from '../ui';

export function AffiliateAnalyticsPage( { onBack }: { onBack: () => void } ) {
	const [ range, setRange ] = useState( '6m' );
	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center justify-between">
				<TextButton onClick={ onBack }>← Back to Analytics</TextButton>
				<div
					className="flex rounded-full overflow-hidden"
					style={ { border: `1px solid ${ M3.outlineVariant }` } }
				>
					{ [ '30d', '3m', '6m', '12m' ].map( ( r ) => (
						<button
							key={ r }
							onClick={ () => setRange( r ) }
							className="px-4 py-2 text-sm"
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

			{ /* KPIs */ }
			<div className="grid grid-cols-4 gap-4">
				<KpiCard
					label="Total Clicks"
					value="5,840"
					trend="▲ +12.3%"
					trendUp
					icon={ MousePointerClick }
				/>
				<KpiCard
					label="Conversions"
					value="712"
					trend="▲ +11.2%"
					trendUp
					icon={ UserPlus }
				/>
				<KpiCard
					label="Affiliate MRR"
					value="$9,600"
					trend="▲ +14.3%"
					trendUp
					icon={ DollarSign }
				/>
				<KpiCard
					label="Avg Conv. Rate"
					value="12.2%"
					trend="▲ +0.4%"
					trendUp
					icon={ Activity }
				/>
			</div>

			{ /* Click + conversion trend */ }
			<Card className="p-5">
				<SectionTitle>
					Clicks, Sign-ups &amp; Revenue — 6 months
				</SectionTitle>
				<ResponsiveContainer width="100%" height={ 260 }>
					<LineChart data={ affiliateTrendData }>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke={ M3.outlineVariant }
						/>
						<XAxis
							dataKey="month"
							tick={ { fontSize: 11, fill: M3.onSurfaceVariant } }
						/>
						<YAxis
							yAxisId="left"
							tick={ { fontSize: 11, fill: M3.onSurfaceVariant } }
						/>
						<YAxis
							yAxisId="right"
							orientation="right"
							tick={ { fontSize: 11, fill: M3.onSurfaceVariant } }
							tickFormatter={ ( v ) =>
								`$${ ( v / 1000 ).toFixed( 0 ) }k`
							}
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
							stroke={ M3.secondary }
							strokeWidth={ 2 }
							dot={ false }
						/>
						<Line
							yAxisId="left"
							type="monotone"
							dataKey="signups"
							name="Sign-ups"
							stroke={ M3.primary }
							strokeWidth={ 2 }
							dot={ false }
						/>
						<Line
							yAxisId="right"
							type="monotone"
							dataKey="revenue"
							name="Revenue"
							stroke={ M3.success }
							strokeWidth={ 2 }
							dot={ false }
							strokeDasharray="5 3"
						/>
					</LineChart>
				</ResponsiveContainer>
			</Card>

			<div
				className="grid gap-4"
				style={ { gridTemplateColumns: '3fr 2fr' } }
			>
				{ /* Top affiliates table */ }
				<Card className="p-5">
					<SectionTitle>Top Affiliates by Revenue</SectionTitle>
					<table className="w-full">
						<thead>
							<tr
								style={ {
									backgroundColor: M3.surfaceContainerLow,
								} }
							>
								{ [
									'Affiliate',
									'Clicks',
									'Conversions',
									'Revenue',
									'Conv. Rate',
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
							{ topAffiliates.map( ( row, i ) => (
								<tr
									key={ i }
									style={ {
										borderTop: `1px solid ${ M3.outlineVariant }`,
									} }
									onMouseEnter={ ( e ) => {
										(
											e.currentTarget as HTMLElement
										 ).style.backgroundColor =
											M3.surfaceContainerLow;
									} }
									onMouseLeave={ ( e ) => {
										(
											e.currentTarget as HTMLElement
										 ).style.backgroundColor =
											'transparent';
									} }
								>
									<td
										className="px-3 py-3 text-sm font-medium"
										style={ {
											color: M3.primary,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.name }
									</td>
									<td
										className="px-3 py-3 text-sm"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.clicks.toLocaleString() }
									</td>
									<td
										className="px-3 py-3 text-sm"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.conversions }
									</td>
									<td
										className="px-3 py-3 text-sm font-medium"
										style={ {
											color: M3.success,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.revenue }
									</td>
									<td className="px-3 py-3">
										<span
											className="text-xs px-2 py-0.5 rounded-full"
											style={ {
												backgroundColor:
													M3.successContainer,
												color: M3.success,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.rate }
										</span>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</Card>

				{ /* Conversion funnel */ }
				<Card className="p-5">
					<SectionTitle>Conversion Funnel</SectionTitle>
					<div className="flex flex-col gap-2 mt-2">
						{ affiliateConversionFunnel.map( ( step, i ) => {
							const pct = Math.round(
								( step.value /
									affiliateConversionFunnel[ 0 ].value ) *
									100
							);
							return (
								<div key={ step.name }>
									<div
										className="flex items-center justify-between text-xs mb-1"
										style={ {
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										<span
											style={ {
												color: M3.onSurfaceVariant,
											} }
										>
											{ step.name }
										</span>
										<span
											className="font-medium"
											style={ { color: M3.onSurface } }
										>
											{ step.value.toLocaleString() }{ ' ' }
											<span
												style={ {
													color: M3.onSurfaceVariant,
												} }
											>
												({ pct }%)
											</span>
										</span>
									</div>
									<div
										className="h-6 rounded-lg overflow-hidden"
										style={ {
											backgroundColor:
												M3.surfaceContainerHigh,
										} }
									>
										<div
											className="h-full rounded-lg flex items-center px-2 transition-all"
											style={ {
												width: `${ pct }%`,
												backgroundColor:
													i === 0
														? M3.primary
														: i === 1
														? M3.secondary
														: i === 2
														? M3.info
														: M3.success,
												minWidth: 32,
											} }
										>
											<span className="text-xs font-medium text-white">
												{ pct }%
											</span>
										</div>
									</div>
									{ i <
										affiliateConversionFunnel.length -
											1 && (
										<div className="flex justify-center my-0.5">
											<ChevronDown
												size={ 14 }
												color={ M3.outlineVariant }
											/>
										</div>
									) }
								</div>
							);
						} ) }
					</div>
				</Card>
			</div>
		</div>
	);
}

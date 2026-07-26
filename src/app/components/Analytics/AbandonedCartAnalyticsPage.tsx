import { useState } from 'react';
import {
	ShoppingCart,
	CheckCircle,
	Activity,
	DollarSign,
	Mail,
} from 'lucide-react';
import {
	BarChart,
	Bar,
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
	cartTrendData,
	topAbandonedProducts,
	emailSeqPerf,
} from '../../utils/static-data';
import { TextButton, KpiCard, Card, SectionTitle } from '../ui';

export function AbandonedCartAnalyticsPage( {
	onBack,
}: {
	onBack: () => void;
} ) {
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
					label="Abandoned Carts"
					value="1,340"
					trend="▲ +4.7%"
					trendUp={ false }
					icon={ ShoppingCart }
				/>
				<KpiCard
					label="Recovered"
					value="430"
					trend="▲ +10.3%"
					trendUp
					icon={ CheckCircle }
				/>
				<KpiCard
					label="Recovery Rate"
					value="32.1%"
					trend="▲ +1.8%"
					trendUp
					icon={ Activity }
				/>
				<KpiCard
					label="Recovered Revenue"
					value="$6,450"
					trend="▲ +10.3%"
					trendUp
					icon={ DollarSign }
				/>
			</div>

			{ /* Abandoned vs recovered trend */ }
			<Card className="p-5">
				<SectionTitle>
					Abandoned vs. Recovered Carts — 6 months
				</SectionTitle>
				<ResponsiveContainer width="100%" height={ 260 }>
					<BarChart data={ cartTrendData }>
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
						<Bar
							yAxisId="left"
							dataKey="abandoned"
							name="Abandoned"
							fill={ `${ M3.error }80` }
							radius={ [ 4, 4, 0, 0 ] }
						/>
						<Bar
							yAxisId="left"
							dataKey="recovered"
							name="Recovered"
							fill={ M3.success }
							radius={ [ 4, 4, 0, 0 ] }
						/>
						<Line
							yAxisId="right"
							type="monotone"
							dataKey="revenue"
							name="Revenue ($)"
							stroke={ M3.primary }
							strokeWidth={ 2 }
							dot={ false }
						/>
					</BarChart>
				</ResponsiveContainer>
			</Card>

			<div
				className="grid gap-4"
				style={ { gridTemplateColumns: '3fr 2fr' } }
			>
				{ /* Top abandoned products */ }
				<Card className="p-5">
					<SectionTitle>Top Abandoned Products</SectionTitle>
					<table className="w-full">
						<thead>
							<tr
								style={ {
									backgroundColor: M3.surfaceContainerLow,
								} }
							>
								{ [
									'Product',
									'Carts',
									'Cart Value',
									'Recovery Rate',
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
							{ topAbandonedProducts.map( ( row, i ) => (
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
										className="px-3 py-3 text-sm"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
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
										{ row.carts }
									</td>
									<td
										className="px-3 py-3 text-sm"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.value }
									</td>
									<td className="px-3 py-3">
										<div className="flex items-center gap-2">
											<div
												className="flex-1 h-1.5 rounded-full"
												style={ {
													backgroundColor:
														M3.outlineVariant,
													maxWidth: 60,
												} }
											>
												<div
													className="h-full rounded-full"
													style={ {
														width: row.recoveryRate,
														backgroundColor:
															M3.success,
													} }
												/>
											</div>
											<span
												className="text-xs font-medium"
												style={ {
													color: M3.success,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ row.recoveryRate }
											</span>
										</div>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</Card>

				{ /* Email sequence performance */ }
				<Card className="p-5">
					<SectionTitle>Email Sequence Performance</SectionTitle>
					<div className="flex flex-col gap-4">
						{ emailSeqPerf.map( ( seq, i ) => (
							<div
								key={ i }
								className="p-3 rounded-xl"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
								} }
							>
								<div className="flex items-center gap-2 mb-2">
									<Mail size={ 14 } color={ M3.primary } />
									<span
										className="text-xs font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ seq.seq }
									</span>
								</div>
								<div className="grid grid-cols-2 gap-x-4 gap-y-1">
									{ [
										{
											label: 'Sent',
											value: seq.sent,
											color: M3.onSurfaceVariant,
										},
										{
											label: 'Opened',
											value: seq.opened,
											color: M3.info,
										},
										{
											label: 'Clicked',
											value: seq.clicked,
											color: M3.primary,
										},
										{
											label: 'Recovered',
											value: seq.recovered,
											color: M3.success,
										},
									].map( ( stat ) => (
										<div
											key={ stat.label }
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
												{ stat.label }
											</span>
											<span
												className="text-xs font-medium"
												style={ {
													color: stat.color,
													fontFamily:
														'Roboto Mono, monospace',
												} }
											>
												{ stat.value.toLocaleString() }
											</span>
										</div>
									) ) }
								</div>
							</div>
						) ) }
					</div>
				</Card>
			</div>
		</div>
	);
}

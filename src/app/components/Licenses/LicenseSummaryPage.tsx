import { useState } from 'react';
import { Key } from 'lucide-react';
import {
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
	licensesByProduct,
	licenseIssuedTrend,
	licensesByPlan,
	activationRateByProduct,
	topCustomersByLicense,
	recentLicenseActivity,
} from '../../utils/static-data';
import { TextButton, FilledButton, Card, SectionTitle } from '../ui';

export function LicenseSummaryPage( {
	onBack,
	onViewAll,
}: {
	onBack: () => void;
	onViewAll: () => void;
} ) {
	const [ range, setRange ] = useState( '12m' );
	const ranges = [ '3m', '6m', '12m', 'All time' ];

	const totalActive = licensesByProduct.reduce( ( s, r ) => s + r.active, 0 );
	const totalExpired = licensesByProduct.reduce(
		( s, r ) => s + r.expired,
		0
	);
	const totalSuspended = licensesByProduct.reduce(
		( s, r ) => s + r.suspended,
		0
	);
	const totalRevoked = licensesByProduct.reduce(
		( s, r ) => s + r.revoked,
		0
	);
	const totalAll = totalActive + totalExpired + totalSuspended + totalRevoked;

	return (
		<div className="flex flex-col gap-5">
			{ /* ── Sub-nav ── */ }
			<div className="flex items-center justify-between">
				<TextButton onClick={ onBack }>← Back to Licenses</TextButton>
				<div className="flex items-center gap-2">
					<div
						className="flex rounded-full overflow-hidden"
						style={ { border: `1px solid ${ M3.outlineVariant }` } }
					>
						{ ranges.map( ( r ) => (
							<button
								key={ r }
								onClick={ () => setRange( r ) }
								className="px-4 py-1.5 text-sm transition-all"
								style={ {
									backgroundColor:
										range === r
											? M3.primary
											: 'transparent',
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
					<FilledButton small onClick={ onViewAll }>
						<Key size={ 14 } /> View All Licenses
					</FilledButton>
				</div>
			</div>

			{ /* ── KPI strip ── */ }
			<div className="grid grid-cols-6 gap-3">
				{ [
					{
						label: 'Total',
						value: totalAll.toLocaleString(),
						color: M3.onSurface,
						bg: M3.surfaceContainerHigh,
					},
					{
						label: 'Active',
						value: totalActive.toLocaleString(),
						color: M3.success,
						bg: M3.successContainer,
					},
					{
						label: 'Expired',
						value: totalExpired.toLocaleString(),
						color: M3.error,
						bg: '#FFDAD6',
					},
					{
						label: 'Suspended',
						value: totalSuspended.toLocaleString(),
						color: M3.warning,
						bg: M3.warningContainer,
					},
					{
						label: 'Revoked',
						value: totalRevoked.toLocaleString(),
						color: M3.onSurfaceVariant,
						bg: M3.surfaceContainerHigh,
					},
					{
						label: 'Expiring 30d',
						value: '187',
						color: M3.warning,
						bg: M3.warningContainer,
					},
				].map( ( s ) => (
					<Card
						key={ s.label }
						className="p-4 text-center flex flex-col items-center gap-1"
					>
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
							className="h-1 w-full rounded-full mt-1"
							style={ { backgroundColor: s.bg } }
						>
							<div
								className="h-full rounded-full"
								style={ {
									width: '100%',
									backgroundColor: s.color,
									opacity: 0.4,
								} }
							/>
						</div>
					</Card>
				) ) }
			</div>

			{ /* ── Trend chart + Plan mix ── */ }
			<div
				className="grid gap-4"
				style={ { gridTemplateColumns: '3fr 2fr' } }
			>
				<Card className="p-5">
					<SectionTitle>License Activity — { range }</SectionTitle>
					<ResponsiveContainer width="100%" height={ 220 }>
						<BarChart
							data={ licenseIssuedTrend }
							barCategoryGap="30%"
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke={ M3.outlineVariant }
								vertical={ false }
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
								dataKey="issued"
								name="Issued"
								fill={ M3.primary }
								radius={ [ 3, 3, 0, 0 ] }
							/>
							<Bar
								dataKey="renewed"
								name="Renewed"
								fill={ M3.success }
								radius={ [ 3, 3, 0, 0 ] }
							/>
							<Bar
								dataKey="revoked"
								name="Revoked"
								fill={ M3.error }
								radius={ [ 3, 3, 0, 0 ] }
							/>
						</BarChart>
					</ResponsiveContainer>
				</Card>

				<Card className="p-5">
					<SectionTitle>Plan Mix</SectionTitle>
					<ResponsiveContainer width="100%" height={ 160 }>
						<PieChart>
							<Pie
								data={ licensesByPlan }
								cx="50%"
								cy="50%"
								innerRadius={ 48 }
								outerRadius={ 72 }
								dataKey="value"
								paddingAngle={ 3 }
							>
								{ licensesByPlan.map( ( entry, i ) => (
									<Cell key={ i } fill={ entry.color } />
								) ) }
							</Pie>
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
						</PieChart>
					</ResponsiveContainer>
					<div className="flex flex-col gap-2 mt-1">
						{ licensesByPlan.map( ( d ) => {
							const pct = Math.round(
								( d.value /
									licensesByPlan.reduce(
										( s, x ) => s + x.value,
										0
									) ) *
									100
							);
							return (
								<div
									key={ d.name }
									className="flex items-center justify-between text-xs"
									style={ {
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									<div className="flex items-center gap-2">
										<div
											className="w-2.5 h-2.5 rounded-full"
											style={ {
												backgroundColor: d.color,
											} }
										/>
										<span
											style={ {
												color: M3.onSurfaceVariant,
											} }
										>
											{ d.name }
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span
											className="font-medium"
											style={ { color: M3.onSurface } }
										>
											{ d.value.toLocaleString() }
										</span>
										<span
											style={ {
												color: M3.outlineVariant,
											} }
										>
											·
										</span>
										<span
											style={ {
												color: M3.onSurfaceVariant,
											} }
										>
											{ pct }%
										</span>
									</div>
								</div>
							);
						} ) }
					</div>
				</Card>
			</div>

			{ /* ── By product ── */ }
			<Card className="p-5">
				<SectionTitle>Licenses by Product</SectionTitle>
				<table className="w-full">
					<thead>
						<tr>
							{ [
								'Product',
								'Active',
								'Expired',
								'Suspended',
								'Revoked',
								'Total',
								'Health',
							].map( ( h ) => (
								<th
									key={ h }
									className="text-left pb-3 text-xs font-medium"
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
						{ licensesByProduct.map( ( row, i ) => {
							const total =
								row.active +
								row.expired +
								row.suspended +
								row.revoked;
							const health = Math.round(
								( row.active / total ) * 100
							);
							return (
								<tr
									key={ row.product }
									style={ {
										borderTop: `1px solid ${ M3.outlineVariant }`,
									} }
								>
									<td
										className="py-3 text-sm font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.product }
									</td>
									<td
										className="py-3 text-sm font-semibold"
										style={ {
											color: M3.success,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.active.toLocaleString() }
									</td>
									<td
										className="py-3 text-sm"
										style={ {
											color: M3.error,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.expired.toLocaleString() }
									</td>
									<td
										className="py-3 text-sm"
										style={ {
											color: M3.warning,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.suspended.toLocaleString() }
									</td>
									<td
										className="py-3 text-sm"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.revoked.toLocaleString() }
									</td>
									<td
										className="py-3 text-sm font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ total.toLocaleString() }
									</td>
									<td className="py-3">
										<div className="flex items-center gap-2">
											<div
												className="h-1.5 rounded-full flex-1"
												style={ {
													maxWidth: 80,
													backgroundColor:
														M3.outlineVariant,
												} }
											>
												<div
													className="h-full rounded-full"
													style={ {
														width: `${ health }%`,
														backgroundColor:
															health >= 85
																? M3.success
																: health >= 65
																? M3.warning
																: M3.error,
													} }
												/>
											</div>
											<span
												className="text-xs font-medium"
												style={ {
													color:
														health >= 85
															? M3.success
															: health >= 65
															? M3.warning
															: M3.error,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ health }%
											</span>
										</div>
									</td>
								</tr>
							);
						} ) }
					</tbody>
				</table>
			</Card>

			{ /* ── Activation rate + Top customers ── */ }
			<div
				className="grid gap-4"
				style={ { gridTemplateColumns: '1fr 1fr' } }
			>
				<Card className="p-5">
					<SectionTitle>Activation Rate by Product</SectionTitle>
					<div className="flex flex-col gap-4">
						{ activationRateByProduct.map( ( row ) => (
							<div key={ row.product }>
								<div className="flex items-center justify-between mb-1.5">
									<span
										className="text-sm"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.product }
									</span>
									<div className="flex items-center gap-2">
										<span
											className="text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.total.toLocaleString() }{ ' ' }
											licenses
										</span>
										<span
											className="text-xs font-semibold px-2 py-0.5 rounded-full"
											style={ {
												backgroundColor:
													row.rate >= 85
														? M3.successContainer
														: row.rate >= 65
														? M3.warningContainer
														: '#FFDAD6',
												color:
													row.rate >= 85
														? M3.success
														: row.rate >= 65
														? M3.warning
														: M3.error,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.rate }%
										</span>
									</div>
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
											width: `${ row.rate }%`,
											backgroundColor:
												row.rate >= 85
													? M3.success
													: row.rate >= 65
													? M3.warning
													: M3.error,
										} }
									/>
								</div>
							</div>
						) ) }
					</div>
					<div
						className="mt-4 pt-3 flex items-center justify-between text-xs"
						style={ {
							borderTop: `1px solid ${ M3.outlineVariant }`,
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						<span>Overall average</span>
						<span
							className="font-semibold"
							style={ { color: M3.primary } }
						>
							{ Math.round(
								activationRateByProduct.reduce(
									( s, r ) => s + r.rate,
									0
								) / activationRateByProduct.length
							) }
							%
						</span>
					</div>
				</Card>

				<Card className="p-5">
					<SectionTitle>Top Customers by License Count</SectionTitle>
					<div className="flex flex-col gap-0">
						{ topCustomersByLicense.map( ( row, i ) => (
							<div
								key={ row.name }
								className="flex items-center gap-3 py-3 transition-all cursor-default"
								style={ {
									borderBottom:
										i < topCustomersByLicense.length - 1
											? `1px solid ${ M3.outlineVariant }`
											: 'none',
								} }
							>
								<div
									className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
									style={ {
										backgroundColor: M3.primaryContainer,
										color: M3.onPrimaryContainer,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ i + 1 }
								</div>
								<div className="flex-1 min-w-0">
									<div
										className="text-sm font-medium truncate"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.name }
									</div>
									<div
										className="text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										LTV { row.ltv }
									</div>
								</div>
								<div className="text-right flex-shrink-0">
									<div
										className="text-sm font-semibold"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.licenses }
									</div>
									<div
										className="text-xs"
										style={ {
											color:
												row.active === row.licenses
													? M3.success
													: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.active } active
									</div>
								</div>
							</div>
						) ) }
					</div>
				</Card>
			</div>

			{ /* ── Recent activity feed ── */ }
			<Card className="p-5">
				<div className="flex items-center justify-between mb-4">
					<SectionTitle>Recent License Activity</SectionTitle>
					<TextButton onClick={ onViewAll }>
						View all licenses →
					</TextButton>
				</div>
				<div
					className="grid gap-0"
					style={ { gridTemplateColumns: '1fr 1fr' } }
				>
					{ recentLicenseActivity.map( ( evt, i ) => {
						const Icon = evt.icon;
						const isLeft = i % 2 === 0;
						return (
							<div
								key={ i }
								className="flex items-center gap-3 py-3"
								style={ {
									borderBottom:
										i < recentLicenseActivity.length - 2
											? `1px solid ${ M3.outlineVariant }`
											: 'none',
									paddingLeft: isLeft ? 0 : 24,
									paddingRight: isLeft ? 24 : 0,
								} }
							>
								<div
									className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
									style={ {
										backgroundColor: `${ evt.color }18`,
									} }
								>
									<Icon size={ 14 } color={ evt.color } />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span
											className="text-xs font-medium capitalize px-1.5 py-0.5 rounded-full"
											style={ {
												backgroundColor: `${ evt.color }18`,
												color: evt.color,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ evt.type }
										</span>
										<span
											className="text-xs font-medium truncate"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ evt.customer }
										</span>
									</div>
									<div
										className="text-xs mt-0.5 truncate"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ evt.product } · { evt.plan } ·{ ' ' }
										{ evt.time }
									</div>
								</div>
							</div>
						);
					} ) }
				</div>
			</Card>
		</div>
	);
}

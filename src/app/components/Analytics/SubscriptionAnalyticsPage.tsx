import { useState } from 'react';
import { Repeat, UserPlus, TrendingDown, DollarSign } from 'lucide-react';
import {
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';
import {
	M3,
	subTrendData,
	subPlanMix,
	subRevenueByProduct,
} from '../../utils/static-data';
import {
	TextButton,
	KpiCard,
	Card,
	SectionTitle,
	StatusBadge,
	Toast,
} from '../ui';
import type { ToastProps } from '../ui';

export function SubscriptionAnalyticsPage( {
	onBack,
}: {
	onBack: () => void;
} ) {
	const [ range, setRange ] = useState( '6m' );
	const [ toast, setToast ] = useState< ToastProps >( {
		message: '',
		type: 'success',
		visible: false,
	} );
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
					label="Active Subs"
					value="5,241"
					trend="▲ +141 this mo"
					trendUp
					icon={ Repeat }
				/>
				<KpiCard
					label="New This Month"
					value="580"
					trend="▲ +5.1%"
					trendUp
					icon={ UserPlus }
				/>
				<KpiCard
					label="Churn Rate"
					value="2.4%"
					trend="▼ -0.3%"
					trendUp
					icon={ TrendingDown }
				/>
				<KpiCard
					label="Sub MRR"
					value="$38,200"
					trend="▲ +7.8%"
					trendUp
					icon={ DollarSign }
				/>
			</div>

			{ /* Active subs trend */ }
			<Card className="p-5">
				<SectionTitle>
					Subscription Trend — Active / New / Churned / Paused
				</SectionTitle>
				<ResponsiveContainer width="100%" height={ 260 }>
					<LineChart data={ subTrendData }>
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
							type="monotone"
							dataKey="active"
							name="Active"
							stroke={ M3.success }
							strokeWidth={ 2 }
							dot={ false }
						/>
						<Line
							type="monotone"
							dataKey="new"
							name="New"
							stroke={ M3.primary }
							strokeWidth={ 2 }
							dot={ false }
						/>
						<Line
							type="monotone"
							dataKey="churned"
							name="Churned"
							stroke={ M3.error }
							strokeWidth={ 2 }
							dot={ false }
							strokeDasharray="5 3"
						/>
						<Line
							type="monotone"
							dataKey="paused"
							name="Paused"
							stroke={ M3.info }
							strokeWidth={ 2 }
							dot={ false }
							strokeDasharray="3 2"
						/>
					</LineChart>
				</ResponsiveContainer>
			</Card>

			<div
				className="grid gap-4"
				style={ { gridTemplateColumns: '2fr 3fr' } }
			>
				{ /* Plan mix donut */ }
				<Card className="p-5">
					<SectionTitle>Plan Mix</SectionTitle>
					<ResponsiveContainer width="100%" height={ 180 }>
						<PieChart>
							<Pie
								data={ subPlanMix }
								cx="50%"
								cy="50%"
								innerRadius={ 48 }
								outerRadius={ 75 }
								dataKey="value"
								paddingAngle={ 3 }
							>
								{ subPlanMix.map( ( entry, i ) => (
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
					<div className="flex flex-col gap-1.5 mt-3">
						{ subPlanMix.map( ( d ) => (
							<div
								key={ d.name }
								className="flex items-center justify-between text-xs"
								style={ { fontFamily: 'Roboto, sans-serif' } }
							>
								<div className="flex items-center gap-2">
									<div
										className="w-2.5 h-2.5 rounded-full"
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

				{ /* Revenue by product bar */ }
				<Card className="p-5">
					<SectionTitle>Subscription Revenue by Product</SectionTitle>
					<ResponsiveContainer width="100%" height={ 220 }>
						<BarChart
							data={ subRevenueByProduct }
							layout="vertical"
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke={ M3.outlineVariant }
								horizontal={ false }
							/>
							<XAxis
								type="number"
								tick={ {
									fontSize: 11,
									fill: M3.onSurfaceVariant,
								} }
								tickFormatter={ ( v ) =>
									`$${ ( v / 1000 ).toFixed( 0 ) }k`
								}
							/>
							<YAxis
								type="category"
								dataKey="product"
								tick={ {
									fontSize: 11,
									fill: M3.onSurfaceVariant,
								} }
								width={ 100 }
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
							<Bar
								dataKey="revenue"
								name="Revenue"
								fill={ M3.primary }
								radius={ [ 0, 4, 4, 0 ] }
							/>
						</BarChart>
					</ResponsiveContainer>
				</Card>
			</div>

			{ /* Churn risk table */ }
			<Card className="p-5">
				<SectionTitle>
					Churn Risk — Past Due &amp; Expiring Soon
				</SectionTitle>
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
								'Plan',
								'Status',
								'Days Overdue / Left',
								'Action',
							].map( ( h ) => (
								<th
									key={ h }
									className="px-4 py-3 text-left text-xs font-medium"
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
								customer: 'Emily Davis',
								product: 'SaaS Starter',
								plan: 'Monthly',
								status: 'past-due',
								days: '8 days overdue',
							},
							{
								customer: 'Tom Baker',
								product: 'Plugin Pro',
								plan: 'Annual',
								status: 'expiring',
								days: '2 days left',
							},
							{
								customer: 'Nina Patel',
								product: 'Theme Bundle',
								plan: 'Annual',
								status: 'expiring',
								days: '5 days left',
							},
							{
								customer: 'Olivia Martinez',
								product: 'Theme Bundle',
								plan: 'Annual',
								status: 'suspended',
								days: 'Suspended',
							},
						].map( ( row, i ) => (
							<tr
								key={ i }
								style={ {
									borderTop: `1px solid ${ M3.outlineVariant }`,
								} }
							>
								<td
									className="px-4 py-3 text-sm font-medium"
									style={ {
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ row.customer }
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
												M3.secondaryContainer,
											color: M3.onSecondaryContainer,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.plan }
									</span>
								</td>
								<td className="px-4 py-3">
									<StatusBadge
										status={
											row.status === 'expiring'
												? 'pending'
												: row.status
										}
									/>
								</td>
								<td
									className="px-4 py-3 text-xs font-medium"
									style={ {
										color:
											row.status === 'past-due'
												? M3.error
												: M3.warning,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ row.days }
								</td>
								<td className="px-4 py-3">
									<TextButton
										small
										onClick={ () =>
											showToast(
												`Reminder sent to ${ row.customer }`,
												'success'
											)
										}
									>
										Send Reminder
									</TextButton>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			</Card>
			<Toast
				message={ toast.message }
				type={ toast.type }
				visible={ toast.visible }
			/>
		</div>
	);
}

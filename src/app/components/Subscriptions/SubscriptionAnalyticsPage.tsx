import {
	LineChart,
	Line,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from 'recharts';
import { M3, subTrendData, subPlanMix, subRevenueByProduct } from '../../utils/static-data';
import { OutlinedButton } from '../ui';
import { ArrowLeft } from 'lucide-react';

// ─── Section heading ───────────────────────────────────────────────────────────
function SectionHeading( { children }: { children: React.ReactNode } ) {
	return (
		<h3
			style={ {
				fontSize: 14,
				fontWeight: 600,
				color: M3.onSurface,
				fontFamily: 'Roboto, sans-serif',
				marginBottom: 12,
			} }
		>
			{ children }
		</h3>
	);
}

// ─── Chart card wrapper ────────────────────────────────────────────────────────
function ChartCard( {
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
} ) {
	return (
		<div
			style={ {
				backgroundColor: M3.surface,
				border: `1px solid ${ M3.outlineVariant }`,
				borderRadius: 20,
				padding: '24px 28px',
			} }
		>
			<SectionHeading>{ title }</SectionHeading>
			{ children }
		</div>
	);
}

/**
 * Subscription Analytics page.
 *
 * Displays trend, churn, plan-mix, and revenue charts using static sample data.
 * Will be wired to live REST data when the RevenueRepository REST endpoint lands.
 *
 * @since 1.0.0
 *
 * @param props.onBack  Callback to navigate back to the Subscriptions list.
 */
export function SubscriptionAnalyticsPage( {
	onBack,
}: {
	onBack?: () => void;
} ) {
	return (
		<div style={ { display: 'flex', flexDirection: 'column', gap: 24 } }>
			{ /* Back button */ }
			<div>
				<OutlinedButton
					label="Back to Subscriptions"
					icon={ ArrowLeft }
					onClick={ onBack }
				/>
			</div>

			{ /* Trend chart */ }
			<ChartCard title="Subscription Trend">
				<ResponsiveContainer width="100%" height={ 220 }>
					<LineChart data={ subTrendData }>
						<CartesianGrid strokeDasharray="3 3" stroke={ M3.outlineVariant } />
						<XAxis dataKey="month" tick={ { fontSize: 12, fill: M3.onSurfaceVariant } } />
						<YAxis tick={ { fontSize: 12, fill: M3.onSurfaceVariant } } />
						<Tooltip />
						<Legend />
						<Line type="monotone" dataKey="active"  stroke={ M3.primary }   strokeWidth={ 2 } dot={ false } name="Active" />
						<Line type="monotone" dataKey="new"     stroke={ M3.success }   strokeWidth={ 2 } dot={ false } name="New" />
						<Line type="monotone" dataKey="churned" stroke={ M3.error }     strokeWidth={ 2 } dot={ false } name="Churned" />
						<Line type="monotone" dataKey="paused"  stroke={ M3.secondary } strokeWidth={ 2 } dot={ false } name="Paused" />
					</LineChart>
				</ResponsiveContainer>
			</ChartCard>

			<div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 } }>
				{ /* Plan mix */ }
				<ChartCard title="Plan Mix">
					<ResponsiveContainer width="100%" height={ 200 }>
						<PieChart>
							<Pie
								data={ subPlanMix }
								dataKey="value"
								nameKey="name"
								cx="50%"
								cy="50%"
								outerRadius={ 75 }
								label={ ( { name, value } ) => `${ name } ${ value }%` }
								labelLine={ false }
							>
								{ subPlanMix.map( ( entry, index ) => (
									<Cell key={ index } fill={ entry.color } />
								) ) }
							</Pie>
							<Tooltip formatter={ ( v ) => `${ v }%` } />
						</PieChart>
					</ResponsiveContainer>
				</ChartCard>

				{ /* Revenue by product */ }
				<ChartCard title="Revenue by Product">
					<ResponsiveContainer width="100%" height={ 200 }>
						<BarChart data={ subRevenueByProduct } layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke={ M3.outlineVariant } horizontal={ false } />
							<XAxis type="number" tick={ { fontSize: 11, fill: M3.onSurfaceVariant } } tickFormatter={ ( v ) => `$${ ( v / 1000 ).toFixed( 0 ) }k` } />
							<YAxis type="category" dataKey="product" tick={ { fontSize: 11, fill: M3.onSurfaceVariant } } width={ 90 } />
							<Tooltip formatter={ ( v ) => `$${ v.toLocaleString() }` } />
							<Bar dataKey="revenue" fill={ M3.primary } radius={ [ 0, 6, 6, 0 ] } name="Revenue" />
						</BarChart>
					</ResponsiveContainer>
				</ChartCard>
			</div>
		</div>
	);
}

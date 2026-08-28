/**
 * SubscriptionAnalyticsPage - subscription analytics dashboard.
 *
 * Built from scratch (didn't exist anywhere in this repo before). KPI grid,
 * date-range toggle (only affects the MRR/ARR/NRR trend chart), 5 charts,
 * an extended churn risk table, and a read-only revenue goals widget.
 *
 * Most datasets here (trend/mix/revenue-by-type/dunning-funnel/churn-by-
 * reason) have no documented REST endpoint yet, so they're read directly
 * from static-data.tsx rather than through utils/api.ts - only
 * fetchRevenueGoals()/fetchChurnRisk() go through the dummy API layer,
 * since those two are the ones with real endpoints in the backend plan.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useState } from 'react';
import {
	LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users, UserPlus, TrendingDown, DollarSign, TrendingUp, Repeat, HeartPulse, AlertTriangle } from 'lucide-react';
import {
	M3,
	subMrrArrData,
	subTypeMix,
	subRevenueByType,
	dunningFunnelData,
	churnByReasonData,
} from '../../utils/static-data';
import { fetchRevenueGoals, fetchChurnRisk } from '../../api';
import { computeMRR, countNewThisMonth, computeChurnRatePct, computeAvgLtv, addBillingInterval } from '../Subscriptions/utils';
import { useAppSelector } from '../../store/hooks';
import { KpiCard } from '../ui/KpiCard';
import { OutlinedButton } from '../ui/OutlinedButton';
import { useSubscriptionActions } from '../Subscriptions/useSubscriptionActions';
import { ChurnRiskTable } from './ChurnRiskTable';
import { RevenueGoalsWidget } from './RevenueGoalsWidget';
import type { RevenueGoal, ChurnRiskEntry } from '../Subscriptions/types';

const RANGE_OPTIONS = [ '30d', '3m', '6m', '12m' ] as const;
type Range = ( typeof RANGE_OPTIONS )[ number ];

/** Slices subMrrArrData per the selected date-range toggle. */
function sliceTrend( range: Range ) {
	if ( range === '30d' ) return subMrrArrData.slice( -1 );
	if ( range === '3m' ) return subMrrArrData.slice( -3 );
	if ( range === '6m' ) return subMrrArrData.slice( -6 );
	return subMrrArrData;
}

/**
 * Renders the Subscription Analytics page.
 *
 * @since 1.0.0
 *
 * @return {JSX.Element} The analytics page.
 */
export function SubscriptionAnalyticsPage() {
	const navigate = useNavigate();
	const subscriptions = useAppSelector( ( s ) => s.subscriptions.items );
	const [ range, setRange ] = useState< Range >( '6m' );
	const [ goals, setGoals ] = useState< RevenueGoal[] >( [] );
	const [ churnRisk, setChurnRisk ] = useState< ChurnRiskEntry[] >( [] );
	const { showToast, openDialog, closeDialog, openBulkDiscount, updateRow, modals } = useSubscriptionActions();

	useEffect( () => {
		fetchRevenueGoals().then( setGoals );
		fetchChurnRisk().then( setChurnRisk );
	}, [] );

	const mrr = computeMRR( subscriptions );
	const arr = mrr * 12;
	const nrr = subMrrArrData[ subMrrArrData.length - 1 ]?.nrr ?? 0;
	const activeSubs = subscriptions.filter( ( r ) => r.status === 'active' ).length;
	const newThisMonth = countNewThisMonth( subscriptions );
	const churnRatePct = computeChurnRatePct( subscriptions );
	const avgLtv = computeAvgLtv( subscriptions );
	const atRiskCount = subscriptions.filter( ( r ) => r.churnRiskScore > 50 ).length;

	const trendData = sliceTrend( range );

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1">
					{ RANGE_OPTIONS.map( ( r ) => (
						<button
							key={ r }
							onClick={ () => setRange( r ) }
							className="px-3 py-1.5 rounded-full text-xs"
							style={ {
								backgroundColor: range === r ? M3.primary : M3.surfaceContainerHigh,
								color: range === r ? M3.onPrimary : M3.onSurfaceVariant,
								border: 'none',
								cursor: 'pointer',
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							{ r }
						</button>
					) ) }
				</div>
				<OutlinedButton small onClick={ () => navigate( -1 ) }>← Back</OutlinedButton>
			</div>

			{ /* ── KPI grid ─────────────────────────────────────────────────────── */ }
			<div className="grid grid-cols-4 gap-4">
				<KpiCard label="Active Subs" value={ String( activeSubs ) } trend="live" trendUp icon={ Users } />
				<KpiCard label="New This Month" value={ String( newThisMonth ) } trend="live" trendUp icon={ UserPlus } />
				<KpiCard label="Churn Rate" value={ `${ churnRatePct.toFixed( 1 ) }%` } trend="live" trendUp={ false } icon={ TrendingDown } />
				<KpiCard label="Sub MRR" value={ `$${ Math.round( mrr ).toLocaleString() }` } trend="live" trendUp icon={ DollarSign } />
				<KpiCard label="ARR" value={ `$${ Math.round( arr ).toLocaleString() }` } trend="live" trendUp icon={ TrendingUp } />
				<KpiCard label="Net Revenue Retention" value={ `${ nrr }%` } trend="from trend data" trendUp icon={ Repeat } />
				<KpiCard label="Avg LTV" value={ `$${ Math.round( avgLtv ).toLocaleString() }` } trend="live" trendUp icon={ HeartPulse } />
				<KpiCard label="At-Risk Subs" value={ String( atRiskCount ) } trend="live" trendUp={ false } icon={ AlertTriangle } />
			</div>

			{ /* ── Charts ───────────────────────────────────────────────────────── */ }
			<div className="grid grid-cols-2 gap-5">
				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						MRR / ARR / NRR Trend
					</div>
					<ResponsiveContainer width="100%" height={ 240 }>
						<LineChart data={ trendData }>
							<CartesianGrid strokeDasharray="3 3" stroke={ M3.outlineVariant } />
							<XAxis dataKey="month" tick={ { fontSize: 11 } } />
							<YAxis yAxisId="left" tick={ { fontSize: 11 } } />
							<YAxis yAxisId="right" orientation="right" tick={ { fontSize: 11 } } />
							<Tooltip />
							<Legend />
							<Line yAxisId="left" type="monotone" dataKey="mrr" stroke={ M3.primary } name="MRR" />
							<Line yAxisId="left" type="monotone" dataKey="arr" stroke={ M3.secondary } name="ARR" />
							<Line yAxisId="right" type="monotone" dataKey="nrr" stroke={ M3.info } strokeDasharray="4 4" name="NRR %" />
						</LineChart>
					</ResponsiveContainer>
				</div>

				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Subscription Mix by Type
					</div>
					<ResponsiveContainer width="100%" height={ 240 }>
						<PieChart>
							<Pie data={ subTypeMix } dataKey="value" nameKey="name" outerRadius={ 90 } label>
								{ subTypeMix.map( ( d, i ) => <Cell key={ i } fill={ d.color } /> ) }
							</Pie>
							<Tooltip />
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>

				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Revenue by Type
					</div>
					<ResponsiveContainer width="100%" height={ 240 }>
						<BarChart data={ subRevenueByType } layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke={ M3.outlineVariant } />
							<XAxis type="number" tick={ { fontSize: 11 } } />
							<YAxis type="category" dataKey="type" tick={ { fontSize: 11 } } width={ 80 } />
							<Tooltip />
							<Bar dataKey="revenue" fill={ M3.primary } />
						</BarChart>
					</ResponsiveContainer>
				</div>

				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Dunning Funnel
					</div>
					<ResponsiveContainer width="100%" height={ 240 }>
						<BarChart data={ dunningFunnelData }>
							<CartesianGrid strokeDasharray="3 3" stroke={ M3.outlineVariant } />
							<XAxis dataKey="attempt" tick={ { fontSize: 11 } } />
							<YAxis tick={ { fontSize: 11 } } />
							<Tooltip />
							<Bar dataKey="recovered" fill={ M3.warning } />
						</BarChart>
					</ResponsiveContainer>
				</div>

				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Churn by Reason
					</div>
					<ResponsiveContainer width="100%" height={ 240 }>
						<PieChart>
							<Pie data={ churnByReasonData } dataKey="count" nameKey="label" outerRadius={ 90 } label>
								{ churnByReasonData.map( ( _, i ) => (
									<Cell key={ i } fill={ [ M3.primary, M3.secondary, M3.info, M3.warning, M3.onSurfaceVariant ][ i % 5 ] } />
								) ) }
							</Pie>
							<Tooltip />
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>

				<RevenueGoalsWidget goals={ goals } />
			</div>

			<ChurnRiskTable
				entries={ churnRisk }
				onSendReminder={ ( e ) => showToast( `Renewal reminder sent to ${ e.customer }`, 'success' ) }
				onApplyDiscount={ ( e ) => {
					const record = subscriptions.find( ( r ) => r.id === e.subscriptionId );
					if ( record ) openBulkDiscount( [ record ] );
				} }
				onRetryPayment={ ( e ) => {
					const record = subscriptions.find( ( r ) => r.id === e.subscriptionId );
					if ( ! record ) return;
					openDialog( {
						danger: false, icon: RefreshCw, title: 'Retry Payment?',
						body: `Attempt to charge ${ record.amount } from ${ record.customer }'s payment method on file immediately?`,
						confirmLabel: 'Retry Payment',
						onConfirm: () => {
							updateRow( record.id, { status: 'active', nextPayment: addBillingInterval( null, record.billing ) } );
							showToast( `Payment retried successfully for ${ record.customer }`, 'success' );
							closeDialog();
						},
					} );
				} }
			/>

			{ modals }
		</div>
	);
}

/**
 * LicenseSummaryPage - aggregate analytics for the Licenses module.
 *
 * Every dataset comes from GET /reports/licenses/summary
 * (API\Licenses::get_report_summary()) — issued-over-time, plan mix, and
 * top products are all real aggregate queries, not sample data.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
	XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
	ArrowLeft, Key, CheckCircle, Calendar, XCircle,
	RefreshCw, Ban, PauseCircle,
} from 'lucide-react';
import { __, sprintf } from '@wordpress/i18n';
import { M3 } from '@/theme';
import { OutlinedButton } from '@/shared/ui/OutlinedButton';
import { FilledButton } from '@/shared/ui/FilledButton';
import { TextButton } from '@/shared/ui/TextButton';
import { KpiCard } from '@/shared/ui/KpiCard';
import { planLabel } from '../constants';
import { fetchLicenseReportSummary } from '../api';
import { PAGE_PATHS } from '@/app/router';
import type {
	LicenseReportSummary,
	LicenseActivityType,
} from '../types';

const STATUS_COLORS: Record<string, string> = {
	active:    M3.success,
	expired:   M3.onSurfaceVariant,
	suspended: '#5C4200',
	revoked:   M3.error,
};

const PLAN_COLORS = [ M3.primary, M3.secondary, M3.info, M3.success ];

const ACTIVITY_META: Record<LicenseActivityType, { Icon: React.ElementType; color: string }> = {
	issued:    { Icon: Key,         color: M3.primary  },
	renewed:   { Icon: RefreshCw,   color: M3.success  },
	expired:   { Icon: XCircle,     color: M3.error    },
	revoked:   { Icon: Ban,         color: M3.error    },
	suspended: { Icon: PauseCircle, color: M3.warning  },
};

/** Display label for a license status, used only by this page's status-distribution chart. */
function statusLabel( status: string ): string {
	switch ( status ) {
		case 'active':    return __( 'Active',    'purecart' );
		case 'expired':   return __( 'Expired',   'purecart' );
		case 'suspended': return __( 'Suspended', 'purecart' );
		case 'revoked':   return __( 'Revoked',   'purecart' );
		default: return status.charAt( 0 ).toUpperCase() + status.slice( 1 );
	}
}

function timeAgo( isoDate: string ): string {
	const diff    = Date.now() - new Date( isoDate ).getTime();
	const minutes = Math.floor( diff / 60_000 );
	if ( minutes < 60 )  return sprintf( __( '%dm ago', 'purecart' ), minutes );
	const hours = Math.floor( minutes / 60 );
	if ( hours < 24 )    return sprintf( __( '%dh ago', 'purecart' ), hours );
	return sprintf( __( '%dd ago', 'purecart' ), Math.floor( hours / 24 ) );
}

const EMPTY_SUMMARY: LicenseReportSummary = {
	stats:      { total: 0, active: 0, expiring_30d: 0, revoked: 0 },
	issuedByDay: [],
	byPlan:     [],
	byStatus:   [],
	topProducts: [],
};

/**
 * Renders the License Summary analytics page.
 *
 * @since 1.0.0
 */
export function LicenseSummaryPage() {
	const navigate = useNavigate();
	const ranges   = [ '3m', '6m', '12m', 'All time' ];
	const [ range, setRange ]     = useState( '12m' );
	const [ summary, setSummary ] = useState< LicenseReportSummary >( EMPTY_SUMMARY );

	useEffect( () => {
		fetchLicenseReportSummary( { range } ).then( setSummary );
	}, [ range ] );

	const activePct = summary.stats.total > 0
		? Math.round( ( summary.stats.active / summary.stats.total ) * 100 )
		: 0;

	const trendData = summary.issuedByDay.map( ( d ) => ( {
		date:  new Date( d.date ).toLocaleDateString( 'en-US', { month: 'short', day: 'numeric' } ),
		count: d.count,
	} ) );

	const planData = summary.byPlan.map( ( p ) => ( { plan: planLabel( p.plan ), count: p.count } ) );

	const statusData = summary.byStatus.map( ( s ) => ( {
		name:  statusLabel( s.status ),
		value: s.count,
		color: STATUS_COLORS[ s.status ] ?? M3.onSurfaceVariant,
	} ) );

	// Optional extended data
	const byProduct    = summary.byProduct    ?? [];
	const topCustomers = summary.topCustomers ?? [];
	const recentActivity = summary.recentActivity ?? [];

	return (
		<div className="flex flex-col gap-5">

			{/* ── Header ──────────────────────────────────────────────────── */}
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div className="flex items-center gap-3">
					<OutlinedButton small onClick={ () => navigate( PAGE_PATHS.licenses ) }>
						<ArrowLeft size={ 14 } /> { __( 'Back', 'purecart' ) }
					</OutlinedButton>
					<h1 style={ { margin: 0, fontSize: '20px', fontWeight: 700, color: M3.onSurface } }>
						{ __( 'License Summary', 'purecart' ) }
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<div
						className="flex overflow-hidden"
						style={ { border: `1px solid ${ M3.outlineVariant }`, borderRadius: '999px' } }
					>
						{ ranges.map( ( r ) => (
							<button
								key={ r }
								onClick={ () => setRange( r ) }
								className="px-4 py-1.5 text-sm transition-all"
								style={ {
									backgroundColor: range === r ? M3.primary   : 'transparent',
									color:           range === r ? M3.onPrimary : M3.onSurfaceVariant,
									border:          'none',
									cursor:          'pointer',
									fontFamily:      'Roboto, sans-serif',
								} }
							>
								{ r }
							</button>
						) ) }
					</div>
					<FilledButton small onClick={ () => navigate( PAGE_PATHS.licenses ) }>
						<Key size={ 14 } /> { __( 'View All Licenses', 'purecart' ) }
					</FilledButton>
				</div>
			</div>

			{/* ── KPI strip ───────────────────────────────────────────────── */}
			<div className="grid grid-cols-4 gap-4">
				<KpiCard
					label={ __( 'Total Licenses', 'purecart' ) }
					value={ String( summary.stats.total ) }
					trend={ __( 'All time', 'purecart' ) }
					trendUp
					icon={ Key }
				/>
				<KpiCard
					label={ __( 'Active', 'purecart' ) }
					value={ String( summary.stats.active ) }
					/* translators: %d: percentage of licenses that are active */
					trend={ sprintf( __( '%d%% of total', 'purecart' ), activePct ) }
					trendUp={ summary.stats.active > 0 }
					icon={ CheckCircle }
				/>
				<KpiCard
					label={ __( 'Expiring (30d)', 'purecart' ) }
					value={ String( summary.stats.expiring_30d ) }
					trend={
						summary.stats.expiring_30d > 0
							? __( 'Needs attention', 'purecart' )
							: __( 'All clear', 'purecart' )
					}
					trendUp={ summary.stats.expiring_30d === 0 }
					icon={ Calendar }
				/>
				<KpiCard
					label={ __( 'Revoked', 'purecart' ) }
					value={ String( summary.stats.revoked ) }
					trend={ __( 'All time', 'purecart' ) }
					trendUp={ false }
					icon={ XCircle }
				/>
			</div>

			{/* ── Original 2×2 charts ─────────────────────────────────────── */}
			<div className="grid grid-cols-2 gap-5">
				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						{ __( 'Licenses Issued (Last 30 Days)', 'purecart' ) }
					</div>
					<ResponsiveContainer width="100%" height={ 240 }>
						<AreaChart data={ trendData }>
							<CartesianGrid strokeDasharray="3 3" stroke={ M3.outlineVariant } />
							<XAxis dataKey="date" tick={ { fontSize: 11 } } />
							<YAxis tick={ { fontSize: 11 } } allowDecimals={ false } />
							<Tooltip />
							<Area type="monotone" dataKey="count" stroke={ M3.primary } fill={ `${ M3.primary }33` } name={ __( 'Issued', 'purecart' ) } />
						</AreaChart>
					</ResponsiveContainer>
				</div>

				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						{ __( 'Licenses by Plan Type', 'purecart' ) }
					</div>
					<ResponsiveContainer width="100%" height={ 240 }>
						<BarChart data={ planData }>
							<CartesianGrid strokeDasharray="3 3" stroke={ M3.outlineVariant } />
							<XAxis dataKey="plan" tick={ { fontSize: 11 } } />
							<YAxis tick={ { fontSize: 11 } } allowDecimals={ false } />
							<Tooltip />
							<Bar dataKey="count" fill={ M3.secondary } />
						</BarChart>
					</ResponsiveContainer>
				</div>

				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						{ __( 'Top Products by License Count', 'purecart' ) }
					</div>
					<ResponsiveContainer width="100%" height={ 240 }>
						<BarChart data={ summary.topProducts } layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke={ M3.outlineVariant } />
							<XAxis type="number" tick={ { fontSize: 11 } } allowDecimals={ false } />
							<YAxis type="category" dataKey="productName" tick={ { fontSize: 11 } } width={ 120 } />
							<Tooltip />
							<Bar dataKey="count" fill={ M3.primary } />
						</BarChart>
					</ResponsiveContainer>
				</div>

				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-3" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						{ __( 'Status Distribution', 'purecart' ) }
					</div>
					<ResponsiveContainer width="100%" height={ 240 }>
						<PieChart>
							<Pie data={ statusData } dataKey="value" nameKey="name" outerRadius={ 90 } label>
								{ statusData.map( ( d, i ) => <Cell key={ i } fill={ d.color } /> ) }
							</Pie>
							<Tooltip />
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* ── Top Customers + Recent Activity (50 / 50) ───────────────── */}
			{ ( topCustomers.length > 0 || recentActivity.length > 0 ) && (
				<div className="grid grid-cols-2 gap-5">

					{ topCustomers.length > 0 && (
						<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
							<div className="text-sm font-semibold mb-4" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
								{ __( 'Top Customers by License Count', 'purecart' ) }
							</div>
							<div className="flex flex-col gap-0">
								{ topCustomers.map( ( row, i ) => (
									<div
										key={ row.userId }
										className="flex items-center gap-3 py-3"
										style={ { borderBottom: i < topCustomers.length - 1 ? `1px solid ${ M3.outlineVariant }` : 'none' } }
									>
										<div
											className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
											style={ { backgroundColor: M3.primaryContainer, color: M3.onPrimaryContainer, fontFamily: 'Roboto, sans-serif' } }
										>
											{ i + 1 }
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm font-medium truncate" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
												{ row.customerName }
											</div>
										</div>
										<div className="text-right shrink-0">
											<div className="text-sm font-semibold" style={ { color: M3.onSurface, fontFamily: 'Roboto Mono, monospace' } }>
												{ row.totalLicenses }
											</div>
											<div
												className="text-xs"
												style={ {
													color:      row.activeLicenses === row.totalLicenses ? M3.success : M3.onSurfaceVariant,
													fontFamily: 'Roboto, sans-serif',
												} }
											>
												{ /* translators: %d: number of active licenses for this customer */ }
												{ sprintf( __( '%d active', 'purecart' ), row.activeLicenses ) }
											</div>
										</div>
									</div>
								) ) }
							</div>
						</div>
					) }

					{ recentActivity.length > 0 && (
						<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
							<div className="flex items-center justify-between mb-4">
								<div className="text-sm font-semibold" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
									{ __( 'Recent License Activity', 'purecart' ) }
								</div>
								<TextButton onClick={ () => navigate( PAGE_PATHS.licenses ) }>
									{ __( 'View all licenses →', 'purecart' ) }
								</TextButton>
							</div>
							<div className="flex flex-col gap-0">
								{ recentActivity.map( ( evt, i ) => {
									const meta  = ACTIVITY_META[ evt.type ] ?? ACTIVITY_META.issued;
									const Icon  = meta.Icon;
									const color = meta.color;
									return (
										<div
											key={ i }
											className="flex items-center gap-3 py-3"
											style={ { borderBottom: i < recentActivity.length - 1 ? `1px solid ${ M3.outlineVariant }` : 'none' } }
										>
											<div
												className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
												style={ { backgroundColor: `${ color }18` } }
											>
												<Icon size={ 14 } color={ color } />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-1.5 flex-wrap">
													<span
														className="text-xs font-medium capitalize px-1.5 py-0.5 rounded-full"
														style={ { backgroundColor: `${ color }18`, color, fontFamily: 'Roboto, sans-serif' } }
													>
														{ evt.type }
													</span>
													<span className="text-xs font-medium truncate" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
														{ evt.customerName }
													</span>
												</div>
												<div className="text-xs mt-0.5 truncate" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
													{ evt.productName } · { planLabel( evt.planType ) } · { timeAgo( evt.createdAt ) }
												</div>
											</div>
										</div>
									);
								} ) }
							</div>
						</div>
					) }

				</div>
			) }

			{/* ── Licenses by Product — bottom ────────────────────────────── */}
			{ byProduct.length > 0 && (
				<div className="p-5 rounded-xl" style={ { backgroundColor: M3.surface } }>
					<div className="text-sm font-semibold mb-4" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						{ __( 'Licenses by Product', 'purecart' ) }
					</div>
					<table className="w-full">
						<thead>
							<tr>
								{ [
									__( 'Product',   'purecart' ),
									__( 'Active',    'purecart' ),
									__( 'Expired',   'purecart' ),
									__( 'Suspended', 'purecart' ),
									__( 'Revoked',   'purecart' ),
									__( 'Total',     'purecart' ),
									__( 'Health',    'purecart' ),
								].map( ( h ) => (
									<th
										key={ h }
										className="text-left pb-3 text-xs font-medium"
										style={ {
											color:         M3.onSurfaceVariant,
											fontFamily:    'Roboto, sans-serif',
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
							{ byProduct.map( ( row ) => {
								const rowTotal    = row.active + row.expired + row.suspended + row.revoked;
								const health      = rowTotal > 0 ? Math.round( ( row.active / rowTotal ) * 100 ) : 0;
								const healthColor = health >= 85 ? M3.success : health >= 65 ? M3.warning : M3.error;
								return (
									<tr key={ row.productId } style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }>
										<td className="py-3 text-sm font-medium"   style={ { color: M3.onSurface,        fontFamily: 'Roboto, sans-serif'     } }>{ row.productName }</td>
										<td className="py-3 text-sm font-semibold" style={ { color: M3.success,          fontFamily: 'Roboto Mono, monospace' } }>{ row.active.toLocaleString() }</td>
										<td className="py-3 text-sm"               style={ { color: M3.error,            fontFamily: 'Roboto Mono, monospace' } }>{ row.expired.toLocaleString() }</td>
										<td className="py-3 text-sm"               style={ { color: M3.warning,          fontFamily: 'Roboto Mono, monospace' } }>{ row.suspended.toLocaleString() }</td>
										<td className="py-3 text-sm"               style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto Mono, monospace' } }>{ row.revoked.toLocaleString() }</td>
										<td className="py-3 text-sm font-medium"   style={ { color: M3.onSurface,        fontFamily: 'Roboto Mono, monospace' } }>{ rowTotal.toLocaleString() }</td>
										<td className="py-3">
											<div className="flex items-center gap-2">
												<div className="h-1.5 rounded-full flex-1" style={ { maxWidth: 80, backgroundColor: M3.outlineVariant } }>
													<div className="h-full rounded-full" style={ { width: `${ health }%`, backgroundColor: healthColor } } />
												</div>
												<span className="text-xs font-medium" style={ { color: healthColor, fontFamily: 'Roboto, sans-serif' } }>
													{ health }%
												</span>
											</div>
										</td>
									</tr>
								);
							} ) }
						</tbody>
					</table>
				</div>
			) }

		</div>
	);
}

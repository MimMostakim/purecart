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
import { ArrowLeft, Key, CheckCircle, Calendar, XCircle } from 'lucide-react';
import { __, sprintf } from '@wordpress/i18n';
import { M3 } from '@/theme';
import { OutlinedButton } from '@/shared/ui/OutlinedButton';
import { KpiCard } from '@/shared/ui/KpiCard';
import { planLabel } from '../constants';
import { fetchLicenseReportSummary } from '../api';
import { PAGE_PATHS } from '@/app/router';
import type { LicenseReportSummary } from '../types';

const STATUS_COLORS: Record<string, string> = {
	active: M3.success,
	expired: M3.onSurfaceVariant,
	suspended: '#5C4200',
	revoked: M3.error,
};

/** Display label for a license status, used only by this page's status-distribution chart. */
function statusLabel( status: string ): string {
	switch ( status ) {
		case 'active': return __( 'Active', 'purecart' );
		case 'expired': return __( 'Expired', 'purecart' );
		case 'suspended': return __( 'Suspended', 'purecart' );
		case 'revoked': return __( 'Revoked', 'purecart' );
		default: return status.charAt( 0 ).toUpperCase() + status.slice( 1 );
	}
}

const EMPTY_SUMMARY: LicenseReportSummary = {
	stats: { total: 0, active: 0, expiring_30d: 0, revoked: 0 },
	issuedByDay: [],
	byPlan: [],
	byStatus: [],
	topProducts: [],
};

/**
 * Renders the License Summary analytics page.
 *
 * @since 1.0.0
 */
export function LicenseSummaryPage() {
	const navigate = useNavigate();
	const [ summary, setSummary ] = useState< LicenseReportSummary >( EMPTY_SUMMARY );

	useEffect( () => {
		fetchLicenseReportSummary().then( setSummary );
	}, [] );

	const activePct = summary.stats.total > 0
		? Math.round( ( summary.stats.active / summary.stats.total ) * 100 )
		: 0;

	const trendData = summary.issuedByDay.map( ( d ) => ( {
		date: new Date( d.date ).toLocaleDateString( 'en-US', { month: 'short', day: 'numeric' } ),
		count: d.count,
	} ) );

	const planData = summary.byPlan.map( ( p ) => ( { plan: planLabel( p.plan ), count: p.count } ) );

	const statusData = summary.byStatus.map( ( s ) => ( {
		name: statusLabel( s.status ),
		value: s.count,
		color: STATUS_COLORS[ s.status ] ?? M3.onSurfaceVariant,
	} ) );

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center gap-3">
				<OutlinedButton small onClick={ () => navigate( PAGE_PATHS.licenses ) }>
					<ArrowLeft size={ 14 } /> { __( 'Back', 'purecart' ) }
				</OutlinedButton>
				<h1 style={ { margin: 0, fontSize: '20px', fontWeight: 700, color: M3.onSurface } }>{ __( 'License Summary', 'purecart' ) }</h1>
			</div>

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
		</div>
	);
}

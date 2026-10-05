/**
 * UpdatesKpiStrip component.
 *
 * The 4-card KPI strip above the Software Updates table. Values come from
 * GET /updates/stats, which counts every package — so the numbers stay put
 * when the table below is filtered, same as the other module strips.
 *
 * @file
 * @since 1.0.0
 */
import { Package, CheckCircle2, FileClock, Download } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { KpiCard } from '@/shared/ui/KpiCard';
import type { UpdateStats } from '../types';

/**
 * Renders 4 stat cards summarizing the full software updates data set.
 *
 * @since 1.0.0
 *
 * @param {Object}      props       Component props.
 * @param {UpdateStats} props.stats Server-side counters for the whole data set.
 *
 * @return {JSX.Element} The KPI strip element.
 */
export function UpdatesKpiStrip( { stats }: { stats: UpdateStats } ) {
	return (
		<div className="grid grid-cols-4 gap-4">
			<KpiCard
				label={ __( 'Total Packages', 'purecart' ) }
				value={ String( stats.totalPackages ) }
				trend={ __( 'All time', 'purecart' ) }
				trendUp
				icon={ Package }
			/>
			<KpiCard
				label={ __( 'Active Releases', 'purecart' ) }
				value={ String( stats.latestReleases ) }
				trend={ __( 'Currently live', 'purecart' ) }
				trendUp={ stats.latestReleases > 0 }
				icon={ CheckCircle2 }
			/>
			<KpiCard
				label={ __( 'Pending Drafts', 'purecart' ) }
				value={ String( stats.pendingDrafts ) }
				trend={
					stats.pendingDrafts > 0
						? __( 'Awaiting review', 'purecart' )
						: __( 'Nothing pending', 'purecart' )
				}
				trendUp={ 0 === stats.pendingDrafts }
				icon={ FileClock }
			/>
			<KpiCard
				label={ __( 'Total Downloads', 'purecart' ) }
				value={ stats.totalDownloads.toLocaleString() }
				trend={ __( 'Across all versions', 'purecart' ) }
				trendUp={ stats.totalDownloads > 0 }
				icon={ Download }
			/>
		</div>
	);
}

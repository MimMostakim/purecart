/**
 * Shared subscription metric calculations.
 *
 * Kept separate from any one page so the List page's KPI strip and the
 * (future) Analytics page's KPIs compute MRR the same way instead of two
 * slightly different implementations drifting apart.
 *
 * @file
 * @since 1.0.0
 */
import type { SubscriptionRecord, BillingPeriod, BillingSchedule } from './subscription-types';

/** Multiplier to normalize one payment in this period to a monthly-equivalent rate. */
const PERIOD_TO_MONTHLY_MULTIPLIER: Record< BillingPeriod, number > = {
	day: 30.44,
	week: 4.33,
	month: 1,
	year: 1 / 12,
};

/**
 * Sums normalized monthly-equivalent recurring revenue across active
 * subscriptions - matches the backend's MRR formula (feature doc §8) so the
 * frontend and the real MRR agree once this reads from the live API.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionRecord[]} rows Subscriptions to sum.
 *
 * @return {number} Monthly recurring revenue.
 */
export function computeMRR( rows: SubscriptionRecord[] ): number {
	return rows
		.filter( ( r ) => r.status === 'active' )
		.reduce( ( sum, r ) => {
			const multiplier =
				PERIOD_TO_MONTHLY_MULTIPLIER[ r.billing.period ] / r.billing.interval;
			return sum + r.amountRaw * multiplier;
		}, 0 );
}

/**
 * Whether a subscription's cancellation date falls in the current calendar
 * month. Reuses `cancellationDate` for both its pending_cancel meaning
 * (future access-end date) and its cancelled meaning (date it was actually
 * cancelled) - a known simplification until a dedicated cancelledAt field
 * exists.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionRecord} row  Subscription to check.
 * @param {Date}                [now] Reference date, defaults to now - injectable for tests.
 *
 * @return {boolean} True when cancelled this calendar month.
 */
export function isCancelledThisMonth( row: SubscriptionRecord, now: Date = new Date() ): boolean {
	if ( row.status !== 'cancelled' || ! row.cancellationDate ) return false;
	const d = new Date( row.cancellationDate );
	return (
		d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
	);
}

/**
 * Advances a date by one billing interval - used by Early Renewal, Skip
 * Cycle, and Resume actions to compute the new next-payment date.
 *
 * @since 1.0.0
 *
 * @param {string|null}      dateStr Starting ISO date; defaults to today when null.
 * @param {BillingSchedule}  billing The subscription's billing schedule.
 *
 * @return {string} The resulting ISO date (YYYY-MM-DD).
 */
export function addBillingInterval( dateStr: string | null, billing: BillingSchedule ): string {
	const d = dateStr ? new Date( dateStr ) : new Date();
	switch ( billing.period ) {
		case 'day':
			d.setDate( d.getDate() + billing.interval );
			break;
		case 'week':
			d.setDate( d.getDate() + 7 * billing.interval );
			break;
		case 'month':
			d.setMonth( d.getMonth() + billing.interval );
			break;
		case 'year':
			d.setFullYear( d.getFullYear() + billing.interval );
			break;
	}
	return d.toISOString().slice( 0, 10 );
}

/**
 * Counts subscriptions started within the current calendar month.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionRecord[]} rows Subscriptions to check.
 * @param {Date}                 [now] Reference date, defaults to now.
 *
 * @return {number} Count of rows whose startDate falls in the current month.
 */
export function countNewThisMonth( rows: SubscriptionRecord[], now: Date = new Date() ): number {
	return rows.filter( ( r ) => {
		const d = new Date( r.startDate );
		return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
	} ).length;
}

/**
 * User churn rate — feature doc §8: (cancelled this month / active at month
 * start) × 100. "Active at month start" is approximated here as
 * (currently active + cancelled this month), since static sample data has
 * no historical snapshot to compute the real denominator from.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionRecord[]} rows Subscriptions to check.
 * @param {Date}                 [now] Reference date, defaults to now.
 *
 * @return {number} Churn rate as a percentage, e.g. 3.3.
 */
export function computeChurnRatePct( rows: SubscriptionRecord[], now: Date = new Date() ): number {
	const cancelledThisMonth = rows.filter( ( r ) => isCancelledThisMonth( r, now ) ).length;
	const activeAtMonthStart = rows.filter( ( r ) => r.status === 'active' ).length + cancelledThisMonth;
	if ( activeAtMonthStart === 0 ) return 0;
	return ( cancelledThisMonth / activeAtMonthStart ) * 100;
}

/**
 * Average projected customer LTV across all rows.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionRecord[]} rows Subscriptions to average.
 *
 * @return {number} Average LTV, 0 if the list is empty.
 */
export function computeAvgLtv( rows: SubscriptionRecord[] ): number {
	if ( rows.length === 0 ) return 0;
	return rows.reduce( ( sum, r ) => sum + r.customerLtv, 0 ) / rows.length;
}

/**
 * Formats a raw dollar amount as a rounded, comma-grouped currency string,
 * e.g. 2310.4 -> '$2,310'.
 *
 * @since 1.0.0
 *
 * @param {number} amount Raw amount.
 *
 * @return {string} Formatted currency string.
 */
export function formatCurrency( amount: number ): string {
	return `$${ Math.round( amount ).toLocaleString() }`;
}

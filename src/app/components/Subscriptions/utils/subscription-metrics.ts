/**
 * Shared subscription metric calculations.
 *
 * Provides standardized financial and operational metric calculations (MRR, Churn Rate,
 * LTV, Renewal Schedules) shared across the Subscriptions List KPI strip, Analytics page,
 * and lifecycle mutation handlers.
 *
 * @file
 * @since 1.0.0
 */

import type { SubscriptionRecord, BillingPeriod, BillingSchedule } from '../types';

/**
 * Multiplier table to normalize recurring payments of various billing periods
 * to their monthly-equivalent monetary rate.
 */
const PERIOD_TO_MONTHLY_MULTIPLIER: Record< BillingPeriod, number > = {
	day: 30.44,
	week: 4.33,
	month: 1,
	year: 1 / 12,
};

/**
 * Sums normalized monthly-equivalent recurring revenue (MRR) across all active subscriptions.
 *
 * @since 1.0.0
 *
 * @description
 * Filters for `status === 'active'` rows and normalizes their recurring prices into a 1-month
 * equivalent using `PERIOD_TO_MONTHLY_MULTIPLIER` divided by the billing interval. Non-active
 * subscriptions (cancelled, paused, expired) contribute $0 to MRR.
 *
 * @param {SubscriptionRecord[]} rows Array of subscription records to evaluate.
 *
 * @return {number} Total Monthly Recurring Revenue (MRR) as a floating point dollar amount.
 *
 * @example
 * // Input:
 * const rows = [
 *   { status: 'active', amountRaw: 120, billing: { interval: 1, period: 'year', displayLabel: 'Yearly' } },
 *   { status: 'active', amountRaw: 30,  billing: { interval: 1, period: 'month', displayLabel: 'Monthly' } },
 *   { status: 'cancelled', amountRaw: 50, billing: { interval: 1, period: 'month', displayLabel: 'Monthly' } }
 * ];
 *
 * // Calculation: (120 * 1/12) + (30 * 1) + 0 = 10 + 30 = 40
 * const mrr = computeMRR( rows );
 * // Output:
 * // 40
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
 * Determines whether a subscription was cancelled within the current calendar month.
 *
 * @since 1.0.0
 *
 * @description
 * Compares the year and month of a subscription's `cancellationDate` against the reference `now` date.
 * Returns `false` if the subscription is not in `cancelled` status or has no cancellation date recorded.
 *
 * @param {SubscriptionRecord} row            The subscription record to test.
 * @param {Date}               [now=new Date()] Reference date (defaults to current date/time; injectable for tests).
 *
 * @return {boolean} `true` if the subscription was cancelled in the reference month; otherwise `false`.
 *
 * @example
 * // Input:
 * const row = {
 *   id: 'SUB-001',
 *   status: 'cancelled',
 *   cancellationDate: '2026-08-15T10:00:00Z'
 * };
 * const now = new Date( '2026-08-24T00:00:00Z' );
 *
 * // Output:
 * isCancelledThisMonth( row, now );
 * // Returns: true
 */
export function isCancelledThisMonth( row: SubscriptionRecord, now: Date = new Date() ): boolean {
	if ( row.status !== 'cancelled' || ! row.cancellationDate ) return false;
	const d = new Date( row.cancellationDate );
	return (
		d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
	);
}

/**
 * Calculates a new future date advanced by one billing interval period.
 *
 * @since 1.0.0
 *
 * @description
 * Advances a starting date by the subscription schedule's interval (days, weeks, months, or years).
 * Used during Early Renewal, Skip Renewal, and Resume mutations to calculate the next scheduled billing date.
 *
 * @param {string|null}      dateStr Starting date as an ISO string (`YYYY-MM-DD` or ISO timestamp). Defaults to today if null.
 * @param {BillingSchedule}  billing The billing schedule configuration (`interval` and `period`).
 *
 * @return {string} The resulting target date in `YYYY-MM-DD` ISO format.
 *
 * @example
 * // Input:
 * const startingDate = '2026-08-24';
 * const schedule = { interval: 1, period: 'month', displayLabel: 'Monthly' };
 *
 * // Output:
 * addBillingInterval( startingDate, schedule );
 * // Returns: '2026-09-24'
 *
 * @example
 * // Input:
 * const startingDate = '2026-01-15';
 * const schedule = { interval: 1, period: 'year', displayLabel: 'Yearly' };
 *
 * // Output:
 * addBillingInterval( startingDate, schedule );
 * // Returns: '2027-01-15'
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
 * Counts the number of subscriptions that started within the reference calendar month.
 *
 * @since 1.0.0
 *
 * @description
 * Compares the year and month of each subscription's `startDate` against `now` to determine new customer acquisitions.
 *
 * @param {SubscriptionRecord[]} rows            List of subscription records to evaluate.
 * @param {Date}                 [now=new Date()] Reference date (defaults to current date/time).
 *
 * @return {number} Count of subscriptions whose start date is within the reference month.
 *
 * @example
 * // Input:
 * const rows = [
 *   { id: 'SUB-001', startDate: '2026-08-05T00:00:00Z' },
 *   { id: 'SUB-002', startDate: '2026-08-12T00:00:00Z' },
 *   { id: 'SUB-003', startDate: '2026-07-20T00:00:00Z' }
 * ];
 * const now = new Date( '2026-08-24T00:00:00Z' );
 *
 * // Output:
 * countNewThisMonth( rows, now );
 * // Returns: 2
 */
export function countNewThisMonth( rows: SubscriptionRecord[], now: Date = new Date() ): number {
	return rows.filter( ( r ) => {
		const d = new Date( r.startDate );
		return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
	} ).length;
}

/**
 * Computes the subscriber churn rate percentage for the current calendar month.
 *
 * @since 1.0.0
 *
 * @description
 * Applies the standard SaaS churn formula:
 * `(Cancelled Subscriptions This Month / Active Subscriptions at Start of Month) * 100`
 * Active subscriptions at start of month is calculated as `currently active + cancelled this month`.
 *
 * @param {SubscriptionRecord[]} rows            List of subscription records to evaluate.
 * @param {Date}                 [now=new Date()] Reference date (defaults to current date/time).
 *
 * @return {number} Churn percentage (e.g. `3.5` for 3.5%, `0` if denominator is 0).
 *
 * @example
 * // Input:
 * const rows = [
 *   { status: 'active' },
 *   { status: 'active' },
 *   { status: 'active' },
 *   { status: 'cancelled', cancellationDate: '2026-08-02' }
 * ];
 * const now = new Date( '2026-08-24' );
 *
 * // Calculation: (1 cancelled / (3 active + 1 cancelled)) * 100 = (1 / 4) * 100 = 25%
 * const churn = computeChurnRatePct( rows, now );
 * // Output:
 * // 25
 */
export function computeChurnRatePct( rows: SubscriptionRecord[], now: Date = new Date() ): number {
	const cancelledThisMonth = rows.filter( ( r ) => isCancelledThisMonth( r, now ) ).length;
	const activeAtMonthStart = rows.filter( ( r ) => r.status === 'active' ).length + cancelledThisMonth;
	if ( activeAtMonthStart === 0 ) return 0;
	return ( cancelledThisMonth / activeAtMonthStart ) * 100;
}

/**
 * Calculates the average customer lifetime value (LTV) across all subscriptions in the dataset.
 *
 * @since 1.0.0
 *
 * @description
 * Sums the `customerLtv` field across all subscription records and divides by total record count.
 * Returns `0` if the provided dataset is empty.
 *
 * @param {SubscriptionRecord[]} rows List of subscription records.
 *
 * @return {number} Mean customer lifetime value as a number.
 *
 * @example
 * // Input:
 * const rows = [
 *   { customerLtv: 100 },
 *   { customerLtv: 250 },
 *   { customerLtv: 400 }
 * ];
 *
 * // Calculation: (100 + 250 + 400) / 3 = 750 / 3 = 250
 * const avgLtv = computeAvgLtv( rows );
 * // Output:
 * // 250
 */
export function computeAvgLtv( rows: SubscriptionRecord[] ): number {
	if ( rows.length === 0 ) return 0;
	return rows.reduce( ( sum, r ) => sum + r.customerLtv, 0 ) / rows.length;
}

/**
 * Formats a raw numeric monetary amount into a rounded, comma-grouped currency string.
 *
 * @since 1.0.0
 *
 * @description
 * Rounds a floating point dollar amount to the nearest integer and formats with commas and dollar prefix.
 *
 * @param {number} amount Numerical dollar value (e.g. 1250.75).
 *
 * @return {string} Formatted string with dollar sign and commas (e.g. '$1,251').
 *
 * @example
 * // Input:
 * formatCurrency( 12450.60 );
 * // Output:
 * // '$12,451'
 *
 * @example
 * // Input:
 * formatCurrency( 99 );
 * // Output:
 * // '$99'
 */
export function formatCurrency( amount: number ): string {
	return `$${ Math.round( amount ).toLocaleString() }`;
}

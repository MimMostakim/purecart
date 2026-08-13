<?php
/**
 * Subscription analytics: MRR/ARR/ARPU, user & revenue churn, trial
 * conversion, churn-band distribution, LTV, and CSV export.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Implements the feature doc § 8 "Core analytics formulas" table verbatim:
 *
 *   MRR                 sum of monthly-equivalent recurring revenue, active subs
 *   ARR                 MRR x 12
 *   ARPU                MRR / active subscriber count
 *   User churn rate     (cancelled users / active at period start) x 100
 *   Revenue churn rate  (lost MRR / starting MRR) x 100
 *   LTV                 ARPU x avg customer lifespan (months)
 *
 * Two definitional choices the doc leaves open, resolved here and stated so
 * the numbers are reproducible rather than mysterious:
 *
 *  - **Trialing subscriptions are excluded from MRR.** They are contracted but
 *    not yet paying; counting them would inflate MRR by revenue that hasn't
 *    been recognized and that churns at a much higher rate. They're reported
 *    separately as `trialing_count`, so a caller that wants "committed MRR"
 *    can compute it. `past_due` is likewise excluded — that money is at risk
 *    of never arriving, and DunningManager may yet cancel the subscription.
 *  - **"Subscriber count" means distinct customers, not subscriptions.** One
 *    customer holding three subscriptions is one subscriber; ARPU
 *    ("average revenue per *user*") is meaningless otherwise.
 *
 * Read-only and hookless — this class registers nothing and mutates nothing.
 * Its callers (RestController's report endpoints) own permission checks; the
 * whole report is site-wide aggregate data and is admin-only there.
 *
 * @since 1.0.0
 */
class SubscriptionReport {

	/** Statuses whose recurring revenue counts toward MRR. */
	private const MRR_STATUSES = array( 'active' );

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/** @var SubscriptionLogRepository */
	private SubscriptionLogRepository $logs;

	/** @var RevenueRepository */
	private RevenueRepository $revenue;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->subscriptions = new SubscriptionRepository();
		$this->logs          = new SubscriptionLogRepository();
		$this->revenue       = new RevenueRepository();
	}

	// -----------------------------------------------------------------------
	// Summary
	// -----------------------------------------------------------------------

	/**
	 * The full dashboard summary.
	 *
	 * @since 1.0.0
	 * @param string|null $period_start Inclusive start for period-scoped metrics (MySQL datetime). Defaults to the start of the current calendar month.
	 * @param string|null $period_end   Inclusive end (MySQL datetime). Defaults to now.
	 * @return array<string, mixed>
	 */
	public function summary( ?string $period_start = null, ?string $period_end = null ): array {
		$now          = current_time( 'mysql' );
		$period_start = $period_start ?: BillingClock::now_dt()->modify( 'first day of this month' )->setTime( 0, 0, 0 )->format( 'Y-m-d H:i:s' );
		$period_end   = $period_end ?: $now;

		$counts     = $this->subscriptions->count_by_status();
		$mrr        = $this->mrr();
		$subscriber = $this->active_subscriber_count();
		$arpu       = $subscriber > 0 ? $mrr / $subscriber : 0.0;

		$user_churn    = $this->user_churn_rate( $period_start, $period_end );
		$revenue_churn = $this->revenue_churn_rate( $period_start, $period_end );

		return array(
			'generated_at'          => $now,
			'period_start'          => $period_start,
			'period_end'            => $period_end,

			'mrr'                   => round( $mrr, 2 ),
			'arr'                   => round( $mrr * 12, 2 ),
			'arpu'                  => round( $arpu, 2 ),
			'ltv'                   => round( $arpu * $this->avg_lifetime_months(), 2 ),

			'active_count'          => $counts['active'] ?? 0,
			'trialing_count'        => $counts['trialing'] ?? 0,
			'past_due_count'        => $counts['past_due'] ?? 0,
			'paused_count'          => $counts['paused'] ?? 0,
			'suspended_count'       => $counts['suspended'] ?? 0,
			'cancelled_count'       => $counts['cancelled'] ?? 0,
			'expired_count'         => $counts['expired'] ?? 0,
			'pending_cancel_count'  => $counts['pending_cancel'] ?? 0,
			'completed_count'       => $counts['completed'] ?? 0,
			'total_count'           => array_sum( $counts ),
			'subscriber_count'      => $subscriber,
			'counts_by_status'      => $counts,

			'user_churn_rate'       => round( $user_churn, 2 ),
			'revenue_churn_rate'    => round( $revenue_churn, 2 ),
			'trial_conversion_rate' => round( $this->trial_conversion_rate( $period_start, $period_end ), 2 ),

			'churn_bands'           => $this->churn_band_distribution(),
			'recognized_revenue'    => round( $this->revenue->total_between( substr( $period_start, 0, 10 ), substr( $period_end, 0, 10 ) ), 2 ),
			// 12 months back from the period end, for a dashboard trend chart.
			'revenue_by_month'      => $this->revenue->monthly_totals(
				BillingClock::to_dt( $period_end )->modify( '-11 months' )->format( 'Y-m-01' ),
				substr( $period_end, 0, 10 )
			),
			'currency'              => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'USD',
		);
	}

	// -----------------------------------------------------------------------
	// Individual metrics
	// -----------------------------------------------------------------------

	/**
	 * Monthly Recurring Revenue: every active subscription's recurring amount
	 * normalized to a monthly rate.
	 *
	 * Uses ChurnScorer's normalization (made shared in Step 15) so MRR and the
	 * per-subscription LTV figure can never disagree about what "$X every 3
	 * months" is worth per month.
	 *
	 * @since 1.0.0
	 * @return float
	 */
	public function mrr(): float {
		$mrr = 0.0;

		foreach ( self::MRR_STATUSES as $status ) {
			foreach ( $this->subscriptions->billing_rows_by_status( $status ) as $row ) {
				$mrr += ChurnScorer::to_monthly_equivalent(
					(float) $row->recurring_amount,
					(int) $row->billing_interval,
					(string) $row->billing_period
				);
			}
		}

		return $mrr;
	}

	/**
	 * Distinct customers holding at least one MRR-counting subscription.
	 *
	 * @since 1.0.0
	 * @return int
	 */
	public function active_subscriber_count(): int {
		$user_ids = array();

		foreach ( self::MRR_STATUSES as $status ) {
			foreach ( $this->subscriptions->billing_rows_by_status( $status ) as $row ) {
				$user_ids[ (int) $row->user_id ] = true;
			}
		}

		return count( $user_ids );
	}

	/**
	 * User churn rate: (subscriptions cancelled during the period / those
	 * active at the period's start) x 100.
	 *
	 * @since 1.0.0
	 * @param string $period_start Inclusive start (MySQL datetime).
	 * @param string $period_end   Inclusive end (MySQL datetime).
	 * @return float Percentage, 0 when nothing was active to churn from.
	 */
	public function user_churn_rate( string $period_start, string $period_end ): float {
		$active_at_start = count( $this->active_at( $period_start ) );
		if ( $active_at_start <= 0 ) {
			return 0.0;
		}

		$cancelled = $this->logs->count_transitions_to( 'cancelled', $period_start, $period_end );

		return ( $cancelled / $active_at_start ) * 100;
	}

	/**
	 * Revenue churn rate: (MRR lost to cancellations during the period /
	 * MRR at the period's start) x 100.
	 *
	 * @since 1.0.0
	 * @param string $period_start Inclusive start (MySQL datetime).
	 * @param string $period_end   Inclusive end (MySQL datetime).
	 * @return float Percentage, 0 when there was no starting MRR.
	 */
	public function revenue_churn_rate( string $period_start, string $period_end ): float {
		$active_at_start = $this->active_at( $period_start );
		if ( empty( $active_at_start ) ) {
			return 0.0;
		}

		$starting_mrr = 0.0;
		foreach ( $active_at_start as $row ) {
			$starting_mrr += ChurnScorer::to_monthly_equivalent(
				(float) $row->recurring_amount,
				(int) $row->billing_interval,
				(string) $row->billing_period
			);
		}

		if ( $starting_mrr <= 0 ) {
			return 0.0;
		}

		// Which of those specific subscriptions cancelled inside the window —
		// their own monthly-equivalent value is the MRR actually lost, rather
		// than an average applied to a count.
		$ended_by_end   = $this->logs->ended_before( $period_end );
		$ended_by_start = $this->logs->ended_before( $period_start );
		$churned_ids    = array_diff( $ended_by_end, $ended_by_start );

		$lost_mrr = 0.0;
		foreach ( $active_at_start as $row ) {
			if ( in_array( (int) $row->id, $churned_ids, true ) ) {
				$lost_mrr += ChurnScorer::to_monthly_equivalent(
					(float) $row->recurring_amount,
					(int) $row->billing_interval,
					(string) $row->billing_period
				);
			}
		}

		return ( $lost_mrr / $starting_mrr ) * 100;
	}

	/**
	 * Trial conversion rate: of the trials that started in the period, how
	 * many went on to convert to a paid cycle.
	 *
	 * Conversion is counted from the log's `trialing -> active` transition,
	 * which RenewalEngine has fired since Step 14's gap-fix. Trials started
	 * before that fix shipped have no such log row and will read as
	 * unconverted — worth knowing when looking at historical numbers on a
	 * site that ran an earlier build.
	 *
	 * @since 1.0.0
	 * @param string $period_start Inclusive start (MySQL datetime).
	 * @param string $period_end   Inclusive end (MySQL datetime).
	 * @return float Percentage, 0 when no trials started in the period.
	 */
	public function trial_conversion_rate( string $period_start, string $period_end ): float {
		$trials_started = $this->subscriptions->count_created_between( $period_start, $period_end, true );
		if ( $trials_started <= 0 ) {
			return 0.0;
		}

		$converted = $this->logs->count_transitions_to( 'active', $period_start, $period_end );

		// A conversion can only be counted against a trial that started in the
		// same window, so this can't exceed 100% even though the two queries
		// scope slightly differently (a trial started in the previous period
		// converting inside this one).
		return min( 100.0, ( $converted / $trials_started ) * 100 );
	}

	/**
	 * How many subscriptions sit in each churn-risk band (§ 9).
	 *
	 * @since 1.0.0
	 * @return array<string, int>
	 */
	public function churn_band_distribution(): array {
		$bands = array(
			'low'      => 0,
			'medium'   => 0,
			'high'     => 0,
			'critical' => 0,
		);

		foreach ( self::MRR_STATUSES as $status ) {
			foreach ( $this->subscriptions->find_by_status( $status ) as $subscription ) {
				++$bands[ ChurnScorer::band( (int) $subscription->churn_risk_score ) ];
			}
		}

		return $bands;
	}

	/**
	 * Subscriptions that had started, and had not yet ended, at a given moment.
	 *
	 * @since 1.0.0
	 * @param string $moment MySQL datetime.
	 * @return array<int, object>
	 */
	private function active_at( string $moment ): array {
		$ended = $this->logs->ended_before( $moment );

		return array_values(
			array_filter(
				$this->subscriptions->started_before( $moment ),
				static function ( $row ) use ( $ended ) {
					return ! in_array( (int) $row->id, $ended, true );
				}
			)
		);
	}

	/**
	 * @since 1.0.0
	 * @return int
	 */
	private function avg_lifetime_months(): int {
		return max( 1, (int) Settings::get( OptionKeys::SUB_AVG_LIFETIME_MONTHS, 24 ) );
	}

	// -----------------------------------------------------------------------
	// CSV export
	// -----------------------------------------------------------------------

	/**
	 * Column headers for the subscriptions CSV export.
	 *
	 * @since 1.0.0
	 * @return string[]
	 */
	public function csv_columns(): array {
		/**
		 * Filters the subscription CSV export columns.
		 *
		 * @since 1.0.0
		 * @param string[] $columns Column keys, used as both header labels and row keys.
		 */
		return apply_filters(
			'purecart_subscription_export_columns',
			array(
				'id',
				'user_id',
				'user_email',
				'product_id',
				'product_name',
				'order_id',
				'status',
				'delivery_type',
				'recurring_amount',
				'currency',
				'billing_interval',
				'billing_period',
				'monthly_equivalent',
				'signup_fee',
				'renewal_count',
				'skip_count',
				'retry_count',
				'churn_risk_score',
				'churn_band',
				'customer_ltv',
				'discount_percent',
				'trial_ends_at',
				'starts_at',
				'next_payment_at',
				'last_payment_at',
				'cancelled_at',
				'created_at',
			)
		);
	}

	/**
	 * Build the export as an array of rows (header row first), ready to be
	 * serialized by to_csv() or returned as JSON.
	 *
	 * @since 1.0.0
	 * @param string|null $status Optional status filter; null = every subscription.
	 * @return array<int, array<int, string>>
	 */
	public function export_rows( ?string $status = null ): array {
		$columns = $this->csv_columns();
		$rows    = array( $columns );

		foreach ( $this->subscriptions->find_all( $status ) as $subscription ) {
			$resolved = $this->export_row( $subscription );

			$row = array();
			foreach ( $columns as $column ) {
				$row[] = (string) ( $resolved[ $column ] ?? '' );
			}

			$rows[] = $row;
		}

		return $rows;
	}

	/**
	 * Flatten one subscription into its exportable values, including the few
	 * derived/joined fields that aren't columns on the row itself.
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return array<string, mixed>
	 */
	private function export_row( object $subscription ): array {
		$values = (array) $subscription;

		$values['monthly_equivalent'] = round(
			ChurnScorer::to_monthly_equivalent(
				(float) $subscription->recurring_amount,
				(int) $subscription->billing_interval,
				(string) $subscription->billing_period
			),
			2
		);

		$values['churn_band'] = ChurnScorer::band( (int) $subscription->churn_risk_score );

		$user                 = get_user_by( 'id', (int) $subscription->user_id );
		$values['user_email'] = $user ? $user->user_email : '';

		$product                = wc_get_product( (int) $subscription->product_id );
		$values['product_name'] = $product ? $product->get_name() : '';

		return $values;
	}

	/**
	 * Serialize the export to a CSV string.
	 *
	 * Written through PHP's own fputcsv() rather than by joining strings —
	 * it handles quoting, embedded commas/quotes/newlines, and is the only
	 * way a value like a product name containing a comma survives the round
	 * trip intact.
	 *
	 * @since 1.0.0
	 * @param string|null $status Optional status filter; null = every subscription.
	 * @return string
	 */
	public function to_csv( ?string $status = null ): string {
		$handle = fopen( 'php://temp', 'r+' );
		if ( false === $handle ) {
			return '';
		}

		foreach ( $this->export_rows( $status ) as $row ) {
			fputcsv( $handle, $row );
		}

		rewind( $handle );
		$csv = (string) stream_get_contents( $handle );
		fclose( $handle );

		return $csv;
	}
}

<?php
/**
 * All reads/writes for wp_purecart_subscription_revenue — the recognized-revenue
 * ledger (one row per completed billing period).
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Gap found during Step 15: `wp_purecart_subscription_revenue` has been
 * created by Schema.php since Step 1 and documented there as "Powers MRR/ARR/
 * churn reporting independent of WooCommerce's own order reports" — but
 * nothing in the entire module ever wrote a row to it. Every step since has
 * recorded money only into `wp_purecart_subscription_payments`, which is a
 * per-charge-*attempt* ledger (successes, failures, and refunds alike, stamped
 * with the wall-clock time of the attempt).
 *
 * The two are genuinely different things and both are needed:
 *  - payments answers "what did we try to charge, and did it work?"
 *  - revenue answers "which service period does this money belong to?"
 *    (period_start/period_end), which is what any trend/cohort report needs —
 *    a renewal charged three days late still belongs to its own cycle, not to
 *    the day the retry happened.
 *
 * Populated here by listening to the same `purecart_subscription_renewed`
 * event every other reporting-adjacent class already uses, so no earlier step
 * needed modifying to start filling it.
 *
 * @since 1.0.0
 */
class RevenueRepository {

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/** @var PaymentRepository */
	private PaymentRepository $payments;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->subscriptions = new SubscriptionRepository();
		$this->payments      = new PaymentRepository();

		add_action( 'purecart_subscription_renewed', array( $this, 'record_renewal_revenue' ), 10, 3 );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'purecart_subscription_revenue';
	}

	/**
	 * Record the revenue recognized by a successful renewal, attributing it to
	 * the billing period it actually covers rather than to "today".
	 *
	 * @since 1.0.0
	 * @param int         $subscription_id Subscription row ID.
	 * @param int|null    $order_id        Renewal order ID, or null for a zero-total renewal.
	 * @param string|null $next_payment_at The newly-computed next due date — i.e. the end of the period just paid for.
	 * @return void
	 */
	public function record_renewal_revenue( int $subscription_id, ?int $order_id = null, ?string $next_payment_at = null ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return;
		}

		// The charge that was just recorded for this renewal, if any — its
		// amount already reflects discounts (RetentionFlow/coupons), which
		// `recurring_amount` on the subscription row does not.
		$amount         = (float) $subscription->recurring_amount;
		$transaction_id = null;

		if ( $order_id ) {
			foreach ( $this->payments->find_by_subscription( $subscription_id ) as $payment ) {
				if ( (int) $payment->order_id === $order_id && 'succeeded' === $payment->status ) {
					$amount         = (float) $payment->amount;
					$transaction_id = (string) $payment->transaction_id;
					break;
				}
			}
		}

		// A zero-total renewal (trial conversion, 100%-off coupon) is a real
		// billing period with no revenue — recorded rather than skipped, so
		// period counts and revenue-per-period stay consistent.
		$period_end = $next_payment_at ?: $subscription->next_payment_at;

		// The period just paid for ends where the next one begins; it started
		// one interval earlier.
		$period_start = $period_end
			? BillingClock::add_interval( $period_end, -1 * max( 1, (int) $subscription->billing_interval ), (string) $subscription->billing_period )
			: current_time( 'mysql' );

		$this->record(
			array(
				'subscription_id' => $subscription_id,
				'amount'          => $amount,
				'currency'        => (string) ( $subscription->currency ?: get_woocommerce_currency() ),
				'billing_period'  => (string) $subscription->billing_period,
				'period_start'    => substr( (string) $period_start, 0, 10 ),
				'period_end'      => substr( (string) ( $period_end ?: $period_start ), 0, 10 ),
				'transaction_id'  => $transaction_id ?: ( 'sub_' . $subscription_id . '_cycle_' . (int) $subscription->renewal_count ),
				'gateway'         => (string) ( $subscription->gateway ?? '' ),
			)
		);
	}

	/**
	 * Insert a revenue row. Relies on the table's own `uniq_transaction`
	 * unique key to reject duplicates rather than checking first — same
	 * insert-and-catch approach (and same race-condition reasoning) as
	 * PaymentRepository::record().
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $data Revenue row data.
	 * @return bool Whether a new row was inserted.
	 */
	public function record( array $data ): bool {
		global $wpdb;

		foreach ( array( 'subscription_id', 'amount', 'period_start', 'period_end' ) as $required_field ) {
			if ( ! isset( $data[ $required_field ] ) ) {
				return false;
			}
		}

		$row = array(
			'subscription_id' => absint( $data['subscription_id'] ),
			'amount'          => (float) $data['amount'],
			'currency'        => sanitize_text_field( (string) ( $data['currency'] ?? 'USD' ) ),
			'billing_period'  => sanitize_text_field( (string) ( $data['billing_period'] ?? '' ) ),
			'period_start'    => sanitize_text_field( (string) $data['period_start'] ),
			'period_end'      => sanitize_text_field( (string) $data['period_end'] ),
			'transaction_id'  => sanitize_text_field( (string) ( $data['transaction_id'] ?? '' ) ),
			'gateway'         => sanitize_text_field( (string) ( $data['gateway'] ?? '' ) ),
			'created_at'      => current_time( 'mysql' ),
		);

		$wpdb->suppress_errors( true );
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available. A duplicate transaction_id is an expected, handled outcome (idempotency).
		$inserted = $wpdb->insert(
			$this->table(),
			$row,
			array( '%d', '%f', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
		$wpdb->suppress_errors( false );

		return (bool) $inserted;
	}

	/**
	 * Total recognized revenue whose billing period *started* within a date
	 * range. Anchored on period_start rather than created_at so a late-running
	 * renewal is still counted in the month it actually covers.
	 *
	 * @since 1.0.0
	 * @param string $start_date Inclusive range start (Y-m-d).
	 * @param string $end_date   Inclusive range end (Y-m-d).
	 * @return float
	 */
	public function total_between( string $start_date, string $end_date ): float {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reporting aggregate over a custom table; must reflect revenue recorded moments ago.
		return (float) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COALESCE( SUM( amount ), 0 ) FROM {$this->table()} WHERE period_start >= %s AND period_start <= %s",
				$start_date,
				$end_date
			)
		);
	}

	/**
	 * Recognized revenue grouped by calendar month, for trend charts.
	 *
	 * Groups on `SUBSTR(period_start, 1, 7)` rather than the more obvious
	 * `DATE_FORMAT(period_start, '%Y-%m')` — period_start is a DATE column, so
	 * both yield the identical 'YYYY-MM' string, but DATE_FORMAT is
	 * MySQL-specific. That difference is not academic here: it is what lets
	 * this method be covered by the module's own test suite (SQLite-backed)
	 * instead of shipping unverified. `SUBSTR` specifically, not the
	 * equally-standard-looking `SUBSTRING` — MySQL accepts both (SUBSTR is a
	 * documented synonym), SQLite only the former.
	 *
	 * @since 1.0.0
	 * @param string $start_date Inclusive range start (Y-m-d).
	 * @param string $end_date   Inclusive range end (Y-m-d).
	 * @return array<int, object> Rows of { month: 'YYYY-MM', total: float, periods: int }.
	 */
	public function monthly_totals( string $start_date, string $end_date ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reporting aggregate over a custom table.
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT SUBSTR( period_start, 1, 7 ) AS month,
                        COALESCE( SUM( amount ), 0 ) AS total,
                        COUNT( * ) AS periods
                   FROM {$this->table()}
                  WHERE period_start >= %s AND period_start <= %s
               GROUP BY month
               ORDER BY month ASC",
				$start_date,
				$end_date
			)
		) ?: array();
	}

	/**
	 * All revenue rows for one subscription, oldest period first.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return array<int, object>
	 */
	public function find_by_subscription( int $subscription_id ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Per-subscription revenue history.
		return $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM {$this->table()} WHERE subscription_id = %d ORDER BY period_start ASC", $subscription_id )
		) ?: array();
	}
}

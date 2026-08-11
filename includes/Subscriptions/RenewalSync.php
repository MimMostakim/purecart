<?php
/**
 * Calendar-date renewal sync: aligns a subscription's billing date to a fixed
 * day-of-month (feature doc "Renewal Sync"), with a correctly prorated first
 * charge for the partial period between signup and that date.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Site-wide toggle (`purecart_sub_renewal_sync` / `purecart_sub_renewal_sync_date`
 * — the Configuration Options table's naming, not the RND doc's per-product
 * `_purecart_sub_role_*`-style meta; same "options table wins" reconciliation
 * applied to every other naming conflict in this project). Only meaningful for
 * monthly-period, non-trial subscriptions — day/week/year periods pass through
 * unchanged, since "day of month" has no defined meaning for them and the
 * doc's own worked example is monthly-only; a trial's own end date is already
 * a natural first-charge date, so sync doesn't stretch/shrink a trial to also
 * land on the calendar day.
 *
 * Two integration points, both filters so this class stays entirely
 * self-contained (no other class needs to know it exists):
 *  - SubscriptionManager::create_from_order_item() applies
 *    'purecart_initial_next_payment_at' — this class hooks it to align the
 *    very first `next_payment_at` to the sync date.
 *  - SubscriptionProduct hooks `woocommerce_before_calculate_totals` and
 *    calls calculate_initial_price() below so the *checkout* charge matches
 *    that same partial period instead of a full cycle.
 *
 * @since 1.0.0
 */
class RenewalSync {

	/** Reference cycle length used for proration — matches the feature doc's own worked example (16/30 days). */
	private const REFERENCE_CYCLE_DAYS = 30;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		add_filter( 'purecart_initial_next_payment_at', array( $this, 'override_initial_next_payment_at' ), 10, 3 );
	}

	/**
	 * @since 1.0.0
	 * @return bool
	 */
	public static function is_enabled(): bool {
		return (bool) get_option( 'purecart_sub_renewal_sync', false );
	}

	/**
	 * @since 1.0.0
	 * @param string $default_next_payment_at Already-computed next_payment_at (trial end, or now + one interval).
	 * @param int    $product_id              Subscription product ID.
	 * @param string $now                     `current_time('mysql')` at creation time.
	 * @return string
	 */
	public function override_initial_next_payment_at( string $default_next_payment_at, int $product_id, string $now ): string {
		if ( ! self::is_enabled() || ! self::applies_to_product( $product_id ) ) {
			return $default_next_payment_at;
		}

		return self::next_sync_date( $now );
	}

	/**
	 * @since 1.0.0
	 * @param int $product_id Subscription product ID.
	 * @return bool
	 */
	public static function applies_to_product( int $product_id ): bool {
		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return false;
		}

		$period       = (string) ( $product->get_meta( '_purecart_sub_period' ) ?: 'month' );
		$trial_length = (int) $product->get_meta( '_purecart_sub_trial_length' );

		return 'month' === $period && $trial_length <= 0;
	}

	/**
	 * The next occurrence of the configured sync day-of-month, strictly after
	 * $from_datetime. Clamped to day 1-28 so every month actually has that
	 * day — a 29/30/31 anchor would silently skip short months.
	 *
	 * @since 1.0.0
	 * @param string $from_datetime A `current_time('mysql')`-style datetime string.
	 * @return string MySQL datetime string.
	 */
	public static function next_sync_date( string $from_datetime ): string {
		$sync_day = max( 1, min( 28, (int) get_option( 'purecart_sub_renewal_sync_date', 1 ) ) );
		$from     = BillingClock::to_dt( $from_datetime );

		$candidate = $from->setDate( (int) $from->format( 'Y' ), (int) $from->format( 'n' ), $sync_day )->setTime( 0, 0, 0 );

		if ( $candidate <= $from ) {
			$candidate = $candidate->modify( '+1 month' );
		}

		return $candidate->format( 'Y-m-d H:i:s' );
	}

	/**
	 * What the *initial* checkout charge should be for a subscription
	 * product, accounting for trial (recurring amount waived, sign-up fee
	 * still charged in full — standard "setup cost" convention, not stated
	 * either way by the docs, disclosed as an assumption), and renewal sync
	 * (recurring amount prorated for the partial period between now and the
	 * next sync date, sign-up fee unaffected either way).
	 *
	 * @since 1.0.0
	 * @param \WC_Product $product Subscription product.
	 * @return float
	 */
	public static function calculate_initial_price( \WC_Product $product ): float {
		$recurring    = (float) wc_format_decimal( $product->get_meta( '_purecart_sub_price' ) );
		$signup_fee   = (float) wc_format_decimal( $product->get_meta( '_purecart_sub_signup_fee' ) );
		$trial_length = (int) $product->get_meta( '_purecart_sub_trial_length' );

		if ( $trial_length > 0 ) {
			return round( $signup_fee, 2 );
		}

		if ( ! self::is_enabled() || ! self::applies_to_product( $product->get_id() ) ) {
			return round( $recurring + $signup_fee, 2 );
		}

		return round( self::prorate_for_sync( $recurring ) + $signup_fee, 2 );
	}

	/**
	 * Prorate one recurring amount for the partial period between now and the
	 * next sync date, against a fixed reference cycle length.
	 *
	 * @since 1.0.0
	 * @param float $recurring Full recurring amount.
	 * @return float
	 */
	private static function prorate_for_sync( float $recurring ): float {
		$now             = current_time( 'mysql' );
		$sync_date       = self::next_sync_date( $now );
		$days_until_sync = ( BillingClock::to_dt( $sync_date )->getTimestamp() - BillingClock::to_dt( $now )->getTimestamp() ) / DAY_IN_SECONDS;

		// Sync date is effectively "now" — charge the full cycle rather than ~$0.
		if ( $days_until_sync < 1 ) {
			return $recurring;
		}

		return round( $recurring * min( 1.0, $days_until_sync / self::REFERENCE_CYCLE_DAYS ), 2 );
	}
}

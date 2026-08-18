<?php
/**
 * Subscription plan upgrade/downgrade with 3 proration modes.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Feature doc § 3 / RND-subscriptions.md § 8:
 *
 *   prorate_immediately -> charge/credit the price difference prorated for
 *                          the days left in the cycle, reset the cycle from today
 *   apply_at_renewal    -> no charge today; takes effect at the next renewal (default)
 *   no_proration        -> switch immediately at full new price; first charge
 *                          at that price is whenever the next renewal was already due
 *
 * Worked example (feature doc § 3): upgrade $19/mo -> $49/mo with 15 days left
 * in a 30-day cycle -> charge = ($49-$19) x 15/30 = $15, charged immediately.
 *
 * `apply_at_renewal` is implemented by reusing the exact pending_switch_product/
 * pending_switch_type mechanism RetentionFlow's downgrade offer already uses
 * (Step 9) — RenewalEngine::maybe_apply_pending_switch() applies it, unchanged.
 *
 * @since 1.0.0
 */
class PlanUpgrade {

	public const MODE_PRORATE_IMMEDIATELY = 'prorate_immediately';
	public const MODE_APPLY_AT_RENEWAL    = 'apply_at_renewal';
	public const MODE_NO_PRORATION        = 'no_proration';

	private const VALID_MODES = array( self::MODE_PRORATE_IMMEDIATELY, self::MODE_APPLY_AT_RENEWAL, self::MODE_NO_PRORATION );

	/** Approximate days per billing period, matching the feature doc's own worked example (30-day month). */
	private const DAYS_PER_PERIOD = array(
		'day'   => 1,
		'week'  => 7,
		'month' => 30,
		'year'  => 365,
	);

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/** @var SubscriptionLogRepository */
	private SubscriptionLogRepository $logs;

	/** @var RenewalEngine */
	private RenewalEngine $renewal_engine;

	/**
	 * @since 1.0.0
	 * @param RenewalEngine $renewal_engine Shared instance from Module — reuses
	 *                                      its charge_one_off() rather than
	 *                                      duplicating gateway-charging logic.
	 */
	public function __construct( RenewalEngine $renewal_engine ) {
		$this->subscriptions  = new SubscriptionRepository();
		$this->logs           = new SubscriptionLogRepository();
		$this->renewal_engine = $renewal_engine;
	}

	/**
	 * Switch a subscription to a different subscription product.
	 *
	 * @since 1.0.0
	 * @param int         $subscription_id Subscription row ID.
	 * @param int         $new_product_id  Target subscription product ID.
	 * @param string|null $mode            One of the MODE_* constants; defaults to
	 *                                     `purecart_sub_proration_mode` (site default: apply_at_renewal).
	 * @return true|\WP_Error
	 */
	public function process( int $subscription_id, int $new_product_id, ?string $mode = null ) {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || ! in_array( $subscription->status, array( 'active', 'trialing' ), true ) ) {
			return new \WP_Error( 'purecart_not_active', __( 'Only active or trialing subscriptions can change plans.', 'purecart' ) );
		}

		$new_product = wc_get_product( $new_product_id );
		if ( ! $new_product || SubscriptionProduct::TYPE !== $new_product->get_type() ) {
			return new \WP_Error( 'purecart_invalid_product', __( 'The target product is not a valid subscription product.', 'purecart' ) );
		}

		$mode = $mode ?? (string) Settings::get( OptionKeys::SUB_PRORATION_MODE, self::MODE_APPLY_AT_RENEWAL );
		if ( ! in_array( $mode, self::VALID_MODES, true ) ) {
			$mode = self::MODE_APPLY_AT_RENEWAL;
		}

		$old_amount = (float) $subscription->recurring_amount;
		$new_amount = (float) wc_format_decimal( $new_product->get_meta( '_purecart_sub_price' ) );
		$direction  = $new_amount >= $old_amount ? 'upgrade' : 'downgrade';

		switch ( $mode ) {
			case self::MODE_PRORATE_IMMEDIATELY:
				return $this->prorate_immediately( $subscription, $new_product, $old_amount, $new_amount, $direction );
			case self::MODE_NO_PRORATION:
				return $this->no_proration( $subscription, $new_product, $new_amount, $direction );
			case self::MODE_APPLY_AT_RENEWAL:
			default:
				return $this->apply_at_renewal( $subscription, $new_product, $direction );
		}
	}

	/**
	 * Mode: apply_at_renewal (default) — no charge today; scheduled for the
	 * next renewal via the same pending_switch_* mechanism RetentionFlow
	 * already uses for its downgrade offer (Step 9).
	 *
	 * @since 1.0.0
	 * @param object      $subscription Subscription row.
	 * @param \WC_Product $new_product  Target product.
	 * @param string      $direction    'upgrade' or 'downgrade'.
	 * @return true
	 */
	private function apply_at_renewal( object $subscription, \WC_Product $new_product, string $direction ): bool {
		$this->subscriptions->update(
			(int) $subscription->id,
			array(
				'pending_switch_product' => $new_product->get_id(),
				'pending_switch_type'    => $direction,
			)
		);

		$this->logs->log(
			(int) $subscription->id,
			'plan_switch_scheduled',
			array( 'note' => "type={$direction}, product={$new_product->get_id()}, mode=apply_at_renewal" )
		);

		do_action( 'purecart_subscription_plan_switch_scheduled', (int) $subscription->id, $new_product->get_id(), $direction );

		return true;
	}

	/**
	 * Mode: no_proration — switch immediately, no charge/credit now. The
	 * customer's already-scheduled next_payment_at is left untouched, so the
	 * *next* renewal (whenever it was already due) charges the new full price.
	 *
	 * @since 1.0.0
	 * @param object      $subscription Subscription row.
	 * @param \WC_Product $new_product  Target product.
	 * @param float       $new_amount   Target product's recurring price.
	 * @param string      $direction    'upgrade' or 'downgrade'.
	 * @return true
	 */
	private function no_proration( object $subscription, \WC_Product $new_product, float $new_amount, string $direction ): bool {
		$this->subscriptions->update(
			(int) $subscription->id,
			array(
				'product_id'       => $new_product->get_id(),
				'recurring_amount' => $new_amount,
				'billing_interval' => max( 1, (int) $new_product->get_meta( '_purecart_sub_interval' ) ),
				'billing_period'   => $new_product->get_meta( '_purecart_sub_period' ) ?: $subscription->billing_period,
			)
		);

		$this->logs->log(
			(int) $subscription->id,
			'plan_switched',
			array( 'note' => "type={$direction}, product={$new_product->get_id()}, mode=no_proration" )
		);

		do_action( 'purecart_subscription_plan_changed', (int) $subscription->id );

		return true;
	}

	/**
	 * Mode: prorate_immediately — charge (upgrade) or credit (downgrade) the
	 * price difference prorated for the days left in the current cycle, then
	 * reset the cycle to start from today.
	 *
	 * @since 1.0.0
	 * @param object      $subscription Subscription row.
	 * @param \WC_Product $new_product  Target product.
	 * @param float       $old_amount   Current recurring price.
	 * @param float       $new_amount   Target product's recurring price.
	 * @param string      $direction    'upgrade' or 'downgrade'.
	 * @return true|\WP_Error
	 */
	private function prorate_immediately( object $subscription, \WC_Product $new_product, float $old_amount, float $new_amount, string $direction ) {
		$days_remaining = $this->days_remaining( $subscription );
		$days_in_cycle  = $this->days_in_cycle( $subscription );
		$ratio          = $days_in_cycle > 0 ? ( $days_remaining / $days_in_cycle ) : 0.0;
		$charge         = round( ( $new_amount - $old_amount ) * $ratio, 2 );

		$order_id = null;

		if ( $charge > 0 ) {
			$order = $this->renewal_engine->charge_one_off( $subscription, $charge, 'plan_upgrade_proration' );
			if ( is_wp_error( $order ) ) {
				return $order;
			}
			$order_id = $order->get_id();
		} elseif ( $charge < 0 ) {
			// "issue store credit for the difference" (RND § 8) — no generic
			// store-credit mechanism exists in this codebase yet (would need
			// its own feature: a WC coupon-based credit balance or similar).
			// Not charging is the safe default; the credit amount is logged
			// and filterable so a real implementation can hook in later
			// instead of this silently doing nothing.
			do_action( 'purecart_subscription_downgrade_credit_due', (int) $subscription->id, abs( $charge ) );
		}

		$now             = current_time( 'mysql' );
		$new_interval    = max( 1, (int) $new_product->get_meta( '_purecart_sub_interval' ) );
		$new_period      = $new_product->get_meta( '_purecart_sub_period' ) ?: $subscription->billing_period;
		$next_payment_at = BillingClock::add_interval( $now, $new_interval, $new_period ); // "reset cycle from today"

		$this->subscriptions->update(
			(int) $subscription->id,
			array(
				'product_id'       => $new_product->get_id(),
				'recurring_amount' => $new_amount,
				'billing_interval' => $new_interval,
				'billing_period'   => $new_period,
				'next_payment_at'  => $next_payment_at,
			)
		);

		$this->logs->log(
			(int) $subscription->id,
			'plan_switched',
			array(
				'amount'   => $charge,
				'order_id' => $order_id,
				'note'     => "type={$direction}, product={$new_product->get_id()}, mode=prorate_immediately, charge={$charge}",
			)
		);

		do_action( 'purecart_subscription_plan_changed', (int) $subscription->id );

		return true;
	}

	/**
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return float Days left until next_payment_at (0 if already due/past or unset).
	 */
	private function days_remaining( object $subscription ): float {
		if ( ! $subscription->next_payment_at ) {
			return 0.0;
		}

		$seconds = BillingClock::to_dt( $subscription->next_payment_at )->getTimestamp() - BillingClock::now_dt()->getTimestamp();

		return max( 0.0, $seconds / DAY_IN_SECONDS );
	}

	/**
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return float Approximate length of the current billing cycle, in days.
	 */
	private function days_in_cycle( object $subscription ): float {
		$days_per_unit = self::DAYS_PER_PERIOD[ $subscription->billing_period ] ?? 30;

		return max( 1, (int) $subscription->billing_interval ) * $days_per_unit;
	}
}

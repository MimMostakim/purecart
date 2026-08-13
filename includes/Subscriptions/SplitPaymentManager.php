<?php
/**
 * Split/installment payment model: N fixed installments instead of open-ended
 * recurring billing, with configurable access timing.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * RND-subscriptions.md "Split Payment / Installment Model":
 *
 *   Product: "PureCart Pro" — $300 total, paid as 3 x $100/month
 *     _purecart_payment_type  = 'split'
 *     _purecart_max_payments  = 3
 *     _purecart_sub_price     = 100  (per-installment amount — already
 *                                     `recurring_amount` on the subscription
 *                                     row; split payments reuse the same
 *                                     column, no schema change needed)
 *     _purecart_access_timing = 'immediate' | 'after_full_payment' | 'custom_duration'
 *
 *   On each renewal: renewal_count++; once renewal_count >= max_payments,
 *   status -> 'completed', no more renewals.
 *
 * Correction vs. the doc: it describes an interim status of 'pending_payment'
 * for `after_full_payment` before the final installment — that value isn't in
 * the reconciled schema's status ENUM (subscription-final-dev-plan.md § 2).
 * Status describes *billing* state, which is unaffected either way (it still
 * bills as 'active'); "access withheld" is instead just "DeliveryManager
 * never got called yet", achieved via the purecart_should_activate_delivery
 * filter below — no new status value needed.
 *
 * @since 1.0.0
 */
class SplitPaymentManager {

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/** @var SubscriptionLogRepository */
	private SubscriptionLogRepository $logs;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->subscriptions = new SubscriptionRepository();
		$this->logs          = new SubscriptionLogRepository();

		add_filter( 'purecart_should_activate_delivery', array( $this, 'maybe_withhold_initial_activation' ), 10, 2 );
		add_action( 'purecart_subscription_activated', array( $this, 'configure_split_payment' ) );
		add_action( 'purecart_subscription_renewed', array( $this, 'maybe_complete' ) );
	}

	/**
	 * Withhold initial delivery activation for `after_full_payment` split
	 * products (checklist: "access_timing = after_full_payment withholds
	 * provisioning until completion").
	 *
	 * @since 1.0.0
	 * @param bool                 $should_activate Whether to activate now.
	 * @param array<string, mixed> $activation_data Data SubscriptionManager would pass to DeliveryManager::activate().
	 * @return bool
	 */
	public function maybe_withhold_initial_activation( bool $should_activate, array $activation_data ): bool {
		if ( ! $should_activate ) {
			return false;
		}

		$product = wc_get_product( (int) ( $activation_data['product_id'] ?? 0 ) );
		if ( ! $product ) {
			return $should_activate;
		}

		$payment_type  = $product->get_meta( '_purecart_payment_type' ) ?: 'recurring';
		$access_timing = $product->get_meta( '_purecart_access_timing' ) ?: 'immediate';

		if ( 'split' === $payment_type && 'after_full_payment' === $access_timing ) {
			return false;
		}

		return $should_activate;
	}

	/**
	 * Right after a subscription activates, stamp it with the product's
	 * split-payment configuration (SubscriptionManager's create path never
	 * reads `_purecart_payment_type`/`_purecart_max_payments`/
	 * `_purecart_access_timing` itself — that's this class's job).
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function configure_split_payment( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return;
		}

		$product = wc_get_product( (int) $subscription->product_id );
		if ( ! $product || 'split' !== ( $product->get_meta( '_purecart_payment_type' ) ?: 'recurring' ) ) {
			return;
		}

		$access_timing = $this->one_of( (string) $product->get_meta( '_purecart_access_timing' ), array( 'immediate', 'after_full_payment', 'custom_duration' ), 'immediate' );

		$update = array(
			'payment_type'  => 'split',
			'max_payments'  => max( 1, (int) $product->get_meta( '_purecart_max_payments' ) ),
			'access_timing' => $access_timing,
			// RND: "renewal_count = 1 (first installment paid with order)" —
			// the initial order itself is installment #1, not a renewal yet to come.
			'renewal_count' => max( 1, (int) $subscription->renewal_count ),
		);

		if ( 'custom_duration' === $access_timing ) {
			$duration_value = (int) $product->get_meta( '_purecart_access_duration_value' );
			$duration_unit  = $this->one_of( (string) $product->get_meta( '_purecart_access_duration_unit' ), array( 'day', 'week', 'month', 'year' ), 'month' );

			$update['access_duration_value'] = $duration_value;
			$update['access_duration_unit']  = $duration_unit;

			if ( $duration_value > 0 ) {
				// Access expiry is computed and stored here; a scan that actually
				// *revokes* access once access_end_date passes is not part of this
				// step's checklist (only installment-tracking + after_full_payment
				// gating are) — left as a known gap, not silently unbuilt.
				$update['access_end_date'] = BillingClock::add_interval( $subscription->starts_at, $duration_value, $duration_unit );
			}
		}

		$this->subscriptions->update( $subscription_id, $update );

		// Handles the edge case of a misconfigured max_payments=1 "split"
		// product completing on the very first (and only) installment.
		$this->maybe_complete( $subscription_id );
	}

	/**
	 * After every successful renewal (including the configure_split_payment()
	 * call above, for the max_payments=1 edge case), check whether all
	 * installments are now paid.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function maybe_complete( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || 'split' !== $subscription->payment_type || 'completed' === $subscription->status ) {
			return;
		}

		if ( ! $subscription->max_payments || (int) $subscription->renewal_count < (int) $subscription->max_payments ) {
			return;
		}

		$old_status = $subscription->status;

		$this->subscriptions->update(
			$subscription_id,
			array(
				'status'          => 'completed',
				// No more charges due — matches find_due_renewals()'s own
				// `next_payment_at IS NOT NULL` exclusion, belt-and-suspenders
				// with the status no longer being 'active'/'trialing' either.
				'next_payment_at' => null,
			)
		);

		if ( 'after_full_payment' === $subscription->access_timing ) {
			$refreshed = $this->subscriptions->find( $subscription_id );
			$linked    = DeliveryManager::activate( (array) $refreshed );

			if ( ! empty( array_filter( $linked ) ) ) {
				$this->subscriptions->update( $subscription_id, $linked );
			}
		}

		$this->logs->log(
			$subscription_id,
			'split_payment_completed',
			array(
				'old_status' => $old_status,
				'new_status' => 'completed',
				'note'       => "all {$subscription->max_payments} installments paid",
			)
		);

		do_action( 'purecart_split_payment_completed', $subscription_id );
	}

	/**
	 * @since 1.0.0
	 * @param string   $value   Candidate value.
	 * @param string[] $allowed Allowed values.
	 * @param string   $default Fallback if $value isn't in $allowed.
	 * @return string
	 */
	private function one_of( string $value, array $allowed, string $default ): string {
		return in_array( $value, $allowed, true ) ? $value : $default;
	}
}

<?php
/**
 * Core subscription lifecycle: create-from-order, pause, resume, skip, cancel, expire, resubscribe.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Correction vs. subscription-final-dev-plan.md § 4: the doc lists
 * `woocommerce_payment_complete` / `woocommerce_order_status_processing` as the
 * checkout-to-subscription trigger. Checked against the real codebase —
 * `PureCart\Commerce\OrderHandler::on_order_complete()` (which does the
 * equivalent job for Licensing/SaaS) hooks `woocommerce_order_status_completed`
 * instead. Followed that existing convention here for consistency, rather than
 * introducing a second, different completion trigger.
 *
 * Every public lifecycle method here takes clean, already-validated arguments
 * (`int $subscription_id`, not a request array) — same layering as the
 * repositories. Nonce verification, capability checks, and "does this
 * subscription belong to the current user" ownership checks are the calling
 * layer's job (Step 12's RestController, Step 6's customer portal), not this
 * class's. This class never reads $_POST/$_GET directly.
 *
 * @since 1.0.0
 */
class SubscriptionManager {

	/** Statuses from which a subscription can still be paused. */
	private const PAUSABLE_STATUSES = array( 'active', 'trialing' );

	/** Statuses that count as "already ended" — cancel/resubscribe are no-ops from here without a fresh purchase. */
	private const ENDED_STATUSES = array( 'cancelled', 'expired' );

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

		add_action( 'woocommerce_order_status_completed', array( $this, 'maybe_create_from_order' ) );
		add_action( 'purecart_finalize_pending_cancellation', array( $this, 'finalize_pending_cancellation' ) );
	}

	// -----------------------------------------------------------------------
	// Create from order
	// -----------------------------------------------------------------------

	/**
	 * Create a subscription record for every subscription-type line item on
	 * a completed order. Safe to call more than once for the same order —
	 * each item is guarded independently via find_by_order_and_product().
	 *
	 * @since 1.0.0
	 * @param int $order_id WooCommerce order ID.
	 * @return void
	 */
	public function maybe_create_from_order( int $order_id ): void {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		foreach ( $order->get_items() as $item ) {
			/**
			 * @var \WC_Order_Item_Product $item
			 */
			$product = $item->get_product();
			if ( ! $product || SubscriptionProduct::TYPE !== $product->get_type() ) {
				continue;
			}

			$this->create_from_order_item( $order, $product );
		}
	}

	/**
	 * Create one subscription record from a single subscription-product line item.
	 *
	 * @since 1.0.0
	 * @param \WC_Order   $order   The completed order.
	 * @param \WC_Product $product The subscription product.
	 * @return object|null The created row, or null if it already existed / couldn't be created.
	 */
	private function create_from_order_item( \WC_Order $order, \WC_Product $product ): ?object {
		$order_id   = $order->get_id();
		$product_id = $product->get_id();

		// Idempotency — WooCommerce can fire the completed-status transition more
		// than once (manual admin re-save, a plugin re-triggering it, etc.).
		if ( $this->subscriptions->find_by_order_and_product( $order_id, $product_id ) ) {
			return null;
		}

		$user_id = (int) $order->get_customer_id();
		if ( $user_id <= 0 ) {
			// Guest checkout on a subscription product isn't supported yet — there's
			// no account to attach recurring billing/licenses/access to. Left an
			// order note rather than failing silently — this was previously a
			// silent no-op, which is exactly what made a real missing-customer
			// order look identical to a bug from the outside.
			$order->add_order_note(
				sprintf(
					/* translators: %s: product name */
					__( 'PureCart: no subscription was created for "%s" — this order has no registered customer account (guest checkout isn\'t supported for subscription products yet).', 'purecart' ),
					$product->get_name()
				)
			);
			return null;
		}

		$interval      = max( 1, (int) $product->get_meta( '_purecart_sub_interval' ) );
		$period        = $this->one_of( (string) $product->get_meta( '_purecart_sub_period' ), array( 'day', 'week', 'month', 'year' ), 'month' );
		$amount        = (float) wc_format_decimal( $product->get_meta( '_purecart_sub_price' ) );
		$signup_fee    = (float) wc_format_decimal( $product->get_meta( '_purecart_sub_signup_fee' ) );
		$length        = (int) $product->get_meta( '_purecart_sub_length' );
		$length_period = $this->one_of( (string) $product->get_meta( '_purecart_sub_length_period' ), array( 'month', 'year' ), 'month' );
		$delivery_type = (string) ( $product->get_meta( '_purecart_sub_delivery_type' ) ?: 'software' );

		$trial_length   = (int) $product->get_meta( '_purecart_sub_trial_length' );
		$trial_period   = $this->one_of( (string) $product->get_meta( '_purecart_sub_trial_period' ), array( 'day', 'week', 'month' ), 'day' );
		$trial_eligible = $trial_length > 0 && ! $this->has_used_trial( $user_id, $product_id );

		$now    = current_time( 'mysql' );
		$status = $trial_eligible ? 'trialing' : 'active';

		$trial_ends_at = $trial_eligible ? $this->add_interval( $now, $trial_length, $trial_period ) : null;

		$default_next_payment_at = $trial_eligible ? $trial_ends_at : $this->add_interval( $now, $interval, $period );

		/**
		 * The subscription's first `next_payment_at`. Default is the trial end
		 * date (if trialing) or now + one billing interval. Step 14's
		 * RenewalSync hooks this to align it to a fixed calendar day instead,
		 * when `purecart_sub_renewal_sync` is enabled — the same
		 * override-a-default-via-filter pattern as `purecart_should_activate_delivery`
		 * (Step 11) and `purecart_renewal_amount` (Step 9).
		 *
		 * @since 1.0.0
		 * @param string $default_next_payment_at Trial end date, or now + one interval.
		 * @param int    $product_id              Subscription product ID.
		 * @param string $now                      `current_time('mysql')` at creation time.
		 */
		$next_payment_at = apply_filters( 'purecart_initial_next_payment_at', $default_next_payment_at, $product_id, $now );
		$max_length_at   = $length > 0 ? $this->add_interval( $now, $length, $length_period ) : null;

		$subscription = $this->subscriptions->create(
			array(
				'user_id'          => $user_id,
				'product_id'       => $product_id,
				'order_id'         => $order_id,
				'delivery_type'    => $delivery_type,
				'status'           => $status,
				'billing_interval' => $interval,
				'billing_period'   => $period,
				'recurring_amount' => $amount,
				'currency'         => $order->get_currency(),
				'signup_fee'       => $signup_fee,
				'trial_ends_at'    => $trial_ends_at,
				'next_payment_at'  => $next_payment_at,
				'max_length_at'    => $max_length_at,
				'starts_at'        => $now,
			)
		);

		if ( ! $subscription ) {
			return null;
		}

		if ( $trial_eligible ) {
			update_user_meta( $user_id, '_purecart_trial_used_' . $product_id, 1 );
		}

		$activation_data = array(
			'order_id'      => $order_id,
			'user_id'       => $user_id,
			'product_id'    => $product_id,
			'delivery_type' => $delivery_type,
		);

		/**
		 * Whether to provision delivery access right now. Default true — Step 11's
		 * SplitPaymentManager returns false here when the product's
		 * `_purecart_access_timing` is `after_full_payment`, so a split-payment
		 * subscription doesn't get access until its final installment.
		 *
		 * @since 1.0.0
		 * @param bool                 $should_activate Whether to activate now. Default true.
		 * @param array<string, mixed> $activation_data Data that would be passed to DeliveryManager::activate().
		 */
		if ( apply_filters( 'purecart_should_activate_delivery', true, $activation_data ) ) {
			$linked = DeliveryManager::activate( $activation_data );

			if ( ! empty( array_filter( $linked ) ) ) {
				$this->subscriptions->update( (int) $subscription->id, $linked );
			}
		}

		$this->logs->log(
			(int) $subscription->id,
			'created',
			array(
				'new_status' => $status,
				'order_id'   => $order_id,
			)
		);

		do_action( 'purecart_subscription_activated', (int) $subscription->id );

		return $this->subscriptions->find( (int) $subscription->id );
	}

	/**
	 * Whether this customer has already used their one trial for a product.
	 *
	 * @since 1.0.0
	 * @param int $user_id    WordPress user ID.
	 * @param int $product_id WooCommerce product ID.
	 * @return bool
	 */
	private function has_used_trial( int $user_id, int $product_id ): bool {
		if ( ! (bool) Settings::get( OptionKeys::SUB_ONE_TRIAL_PER_CUSTOMER, true ) ) {
			return false;
		}

		return (bool) get_user_meta( $user_id, '_purecart_trial_used_' . $product_id, true );
	}

	// -----------------------------------------------------------------------
	// Pause / Resume
	// -----------------------------------------------------------------------

	/**
	 * Pause billing while keeping access. `next_payment_at` is advanced by
	 * exactly the pause duration on resume(), so the customer never loses
	 * time they already paid for.
	 *
	 * @since 1.0.0
	 * @param int         $subscription_id Subscription row ID.
	 * @param string|null $resume_at       Optional scheduled auto-resume date (MySQL datetime); null = indefinite, manual resume only.
	 * @return bool
	 */
	public function pause( int $subscription_id, ?string $resume_at = null ): bool {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || ! in_array( $subscription->status, self::PAUSABLE_STATUSES, true ) ) {
			return false;
		}

		$updated = $this->subscriptions->update(
			$subscription_id,
			array(
				'status'         => 'paused',
				'paused_at'      => current_time( 'mysql' ),
				'pause_end_date' => $resume_at,
			)
		);

		if ( $updated ) {
			$this->log_transition( $subscription_id, $subscription->status, 'paused', 'paused' );
		}

		return $updated;
	}

	/**
	 * Resume a paused subscription.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return bool
	 */
	public function resume( int $subscription_id ): bool {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || 'paused' !== $subscription->status ) {
			return false;
		}

		$now            = current_time( 'mysql' );
		$paused_seconds = $subscription->paused_at ? max( 0, $this->to_dt( $now )->getTimestamp() - $this->to_dt( $subscription->paused_at )->getTimestamp() ) : 0;

		$next_payment_at = $subscription->next_payment_at
			? $this->to_dt( $subscription->next_payment_at )->modify( "+{$paused_seconds} seconds" )->format( 'Y-m-d H:i:s' )
			: $now;

		$updated = $this->subscriptions->update(
			$subscription_id,
			array(
				'status'          => 'active',
				'paused_at'       => null,
				'pause_end_date'  => null,
				'next_payment_at' => $next_payment_at,
			)
		);

		if ( $updated ) {
			$this->log_transition( $subscription_id, 'paused', 'active', 'resumed' );
		}

		return $updated;
	}

	/**
	 * Skip the next renewal — jumps `next_payment_at` one billing interval
	 * ahead with no charge, per feature doc § 5 ("Skip next renewal").
	 *
	 * Gap found and filled during Step 8: `[RND]`'s class table (§1) lists
	 * `skip` as one of SubscriptionManager's responsibilities, but Step 5's
	 * own checklist didn't enumerate a test for it, so it never got built —
	 * only surfaced now because ChurnScorer's "+5 skip_next_cycle" signal
	 * needs a real event to hook into.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return bool
	 */
	public function skip( int $subscription_id ): bool {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || ! in_array( $subscription->status, array( 'active', 'trialing' ), true ) ) {
			return false;
		}

		// `purecart_sub_skip_limit` (default 1) is documented as a *per billing
		// year* cap — a true rolling 12-month window needs a dated log of past
		// skips to check against, which doesn't exist yet. Simplified here to a
		// lifetime cap on `skip_count` instead; noted rather than silently
		// built "wrong" — revisit if/when per-year enforcement is actually needed.
		$limit = (int) Settings::get( OptionKeys::SUB_SKIP_LIMIT, 1 );
		if ( $limit > 0 && (int) $subscription->skip_count >= $limit ) {
			return false;
		}

		$anchor          = $subscription->next_payment_at ?: current_time( 'mysql' );
		$next_payment_at = $this->add_interval( $anchor, (int) $subscription->billing_interval, $subscription->billing_period );

		$updated = $this->subscriptions->update(
			$subscription_id,
			array(
				'next_payment_at' => $next_payment_at,
				'skip_count'      => (int) $subscription->skip_count + 1,
			)
		);

		if ( $updated ) {
			$this->logs->log( $subscription_id, 'skipped', array( 'note' => 'next cycle skipped, no charge' ) );
			do_action( 'purecart_subscription_skipped', $subscription_id );
		}

		return $updated;
	}

	// -----------------------------------------------------------------------
	// Cancel
	// -----------------------------------------------------------------------

	/**
	 * Cancel a subscription, either immediately or at the end of the period
	 * already paid for.
	 *
	 * @since 1.0.0
	 * @param int         $subscription_id Subscription row ID.
	 * @param bool        $immediately     True = cancel now; false = pending_cancel until the current period ends.
	 * @param string|null $reason          Optional customer-supplied cancellation reason, stored on the log entry.
	 * @return bool
	 */
	public function cancel( int $subscription_id, bool $immediately = true, ?string $reason = null ): bool {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || in_array( $subscription->status, self::ENDED_STATUSES, true ) ) {
			return false;
		}

		if ( $immediately ) {
			$updated = $this->subscriptions->update(
				$subscription_id,
				array(
					'status'       => 'cancelled',
					'cancelled_at' => current_time( 'mysql' ),
				)
			);

			if ( $updated ) {
				DeliveryManager::deactivate( (array) $subscription, DeliveryManager::REASON_CANCELLED );
				$this->log_transition( $subscription_id, $subscription->status, 'cancelled', 'cancelled', $reason );
			}

			return $updated;
		}

		// Pending cancellation — access continues until the period already paid for ends.
		$cancellation_date = $subscription->next_payment_at ?: current_time( 'mysql' );

		$updated = $this->subscriptions->update(
			$subscription_id,
			array(
				'status'            => 'pending_cancel',
				'cancellation_date' => $cancellation_date,
			)
		);

		if ( $updated ) {
			as_schedule_single_action(
				$this->to_dt( $cancellation_date )->getTimestamp(),
				'purecart_finalize_pending_cancellation',
				array( $subscription_id ),
				'purecart'
			);

			$this->log_transition( $subscription_id, $subscription->status, 'pending_cancel', 'cancellation_scheduled', $reason );
		}

		return $updated;
	}

	/**
	 * Action Scheduler callback: turn a pending_cancel subscription into a
	 * hard cancellation once the paid-for period actually ends.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function finalize_pending_cancellation( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || 'pending_cancel' !== $subscription->status ) {
			return;
		}

		$updated = $this->subscriptions->update(
			$subscription_id,
			array(
				'status'       => 'cancelled',
				'cancelled_at' => current_time( 'mysql' ),
			)
		);

		if ( $updated ) {
			DeliveryManager::deactivate( (array) $subscription, DeliveryManager::REASON_CANCELLED );
			$this->log_transition( $subscription_id, 'pending_cancel', 'cancelled', 'cancelled' );
		}
	}

	// -----------------------------------------------------------------------
	// Expire
	// -----------------------------------------------------------------------

	/**
	 * Mark a fixed-length subscription as expired once it reaches its
	 * max_length_at. The scan that decides *when* to call this is
	 * RenewalEngine's job (Step 6) — this method just performs the transition.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return bool
	 */
	public function expire( int $subscription_id ): bool {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || in_array( $subscription->status, self::ENDED_STATUSES, true ) ) {
			return false;
		}

		$updated = $this->subscriptions->update( $subscription_id, array( 'status' => 'expired' ) );

		if ( $updated ) {
			DeliveryManager::deactivate( (array) $subscription, DeliveryManager::REASON_EXPIRED );
			$this->log_transition( $subscription_id, $subscription->status, 'expired', 'expired' );
		}

		return $updated;
	}

	// -----------------------------------------------------------------------
	// Resubscribe
	// -----------------------------------------------------------------------

	/**
	 * Resubscribe a cancelled/expired subscription.
	 *
	 * Two paths (feature doc § 5): within the admin-configured reactivation
	 * window, the *same* record is reactivated (payment history, event log,
	 * and LTV stay continuous). After the window, a *new* record is created
	 * and linked back via `previous_subscription_id`, with the trial
	 * eligibility check re-run.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return object|null The reactivated (or newly created) row, or null on failure.
	 */
	public function resubscribe( int $subscription_id ): ?object {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || ! in_array( $subscription->status, self::ENDED_STATUSES, true ) ) {
			return null;
		}

		// New option, not present in any prior R&D doc's Configuration Options
		// table — introduced here because the feature doc requires an
		// "admin-configurable" window but never names the option itself.
		$window_days = (int) Settings::get( OptionKeys::SUB_RESUBSCRIBE_WINDOW_DAYS, 30 );

		$now           = current_time( 'mysql' );
		$ended_at      = $subscription->cancelled_at ?: $subscription->updated_at;
		$within_window = $ended_at && ( $this->to_dt( $now )->getTimestamp() - $this->to_dt( $ended_at )->getTimestamp() ) <= $window_days * DAY_IN_SECONDS;

		$next_payment_at = $this->add_interval( $now, (int) $subscription->billing_interval, $subscription->billing_period );

		if ( $within_window ) {
			$updated = $this->subscriptions->update(
				$subscription_id,
				array(
					'status'            => 'active',
					'cancelled_at'      => null,
					'cancellation_date' => null,
					'next_payment_at'   => $next_payment_at,
				)
			);

			if ( ! $updated ) {
				return null;
			}

			DeliveryManager::reactivate( (array) $subscription );
			$this->log_transition( $subscription_id, $subscription->status, 'active', 'resubscribed', 'same_record' );
			do_action( 'purecart_subscription_resubscribed', $subscription_id );

			return $this->subscriptions->find( $subscription_id );
		}

		// After the window — new record, linked back, trial re-checked.
		$trial_eligible = ! $this->has_used_trial( (int) $subscription->user_id, (int) $subscription->product_id );

		$new = $this->subscriptions->create(
			array(
				'user_id'                  => $subscription->user_id,
				'product_id'               => $subscription->product_id,
				'order_id'                 => $subscription->order_id,
				'delivery_type'            => $subscription->delivery_type,
				'status'                   => $trial_eligible ? 'trialing' : 'active',
				'billing_interval'         => $subscription->billing_interval,
				'billing_period'           => $subscription->billing_period,
				'recurring_amount'         => $subscription->recurring_amount,
				'currency'                 => $subscription->currency,
				'next_payment_at'          => $next_payment_at,
				'starts_at'                => $now,
				'previous_subscription_id' => $subscription->id,
			)
		);

		if ( ! $new ) {
			return null;
		}

		// New record = new provisioning (new license key / new SaaS account),
		// same reasoning as create_from_order_item() — not reactivate().
		DeliveryManager::activate( (array) $new );
		$this->logs->log(
			(int) $new->id,
			'resubscribed',
			array( 'note' => 'New record linked via previous_subscription_id=' . $subscription->id )
		);
		do_action( 'purecart_subscription_activated', (int) $new->id );
		// New in Step 13 — SubscriptionEmail's "Resubscription Confirmed" listens
		// here rather than on purecart_subscription_activated, so it doesn't also
		// fire (incorrectly) for every brand-new, never-cancelled subscription.
		do_action( 'purecart_subscription_resubscribed', (int) $new->id );

		return $this->subscriptions->find( (int) $new->id );
	}

	// -----------------------------------------------------------------------
	// Shared helpers
	// -----------------------------------------------------------------------

	/**
	 * Log a status transition and fire the standard status-changed hook.
	 * Every dispatch passes `subscription_id` only (§ 3's "consistent event
	 * payload" rule) so listeners always load fresh state.
	 *
	 * @since 1.0.0
	 * @param int         $subscription_id Subscription row ID.
	 * @param string      $old_status      Status before the transition.
	 * @param string      $new_status      Status after the transition.
	 * @param string      $event           Log event slug.
	 * @param string|null $note            Optional note (e.g. a cancellation reason).
	 * @return void
	 */
	private function log_transition( int $subscription_id, string $old_status, string $new_status, string $event, ?string $note = null ): void {
		$this->logs->log(
			$subscription_id,
			$event,
			array(
				'old_status' => $old_status,
				'new_status' => $new_status,
				'note'       => $note,
			)
		);

		do_action( 'purecart_subscription_status_changed', $subscription_id, $old_status, $new_status );
	}

	/**
	 * Return $value if it's one of $allowed, otherwise $default. Used to keep
	 * product-meta-driven period/unit strings from ever reaching date math
	 * or the DB with an unexpected value.
	 *
	 * @since 1.0.0
	 * @param string   $value   Candidate value.
	 * @param string[] $allowed Allowed values.
	 * @param string   $default Fallback if $value isn't in $allowed.
	 * @return string
	 */
	private function one_of( string $value, array $allowed, string $default ): string {
		return in_array( $value, $allowed, true ) ? $value : $default;
	}

	/**
	 * Parse a `current_time('mysql')`-style datetime string, timezone-safe.
	 * Thin delegation to BillingClock — see that class for why this can't
	 * just be `strtotime()`. Extracted there in Step 6 so RenewalEngine
	 * shares the exact same logic instead of risking a second, subtly
	 * different copy of the same date math.
	 *
	 * @since 1.0.0
	 * @param string $mysql_datetime A `current_time('mysql')`-style datetime string.
	 * @return \DateTimeImmutable
	 */
	private function to_dt( string $mysql_datetime ): \DateTimeImmutable {
		return BillingClock::to_dt( $mysql_datetime );
	}

	/**
	 * Add a billing interval to a MySQL datetime string. Thin delegation to
	 * BillingClock — see that class for the month-overflow-clamping logic.
	 *
	 * @since 1.0.0
	 * @param string $datetime A `current_time('mysql')`-style datetime string.
	 * @param int    $count    Number of periods to add.
	 * @param string $unit     One of 'day', 'week', 'month', 'year'.
	 * @return string MySQL datetime string.
	 */
	private function add_interval( string $datetime, int $count, string $unit ): string {
		return BillingClock::add_interval( $datetime, $count, $unit );
	}
}

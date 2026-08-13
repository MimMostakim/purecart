<?php
/**
 * Action Scheduler-driven renewal loop: scan for due subscriptions, charge them,
 * advance their schedule. Idempotency guard, zero-total handling, staging block,
 * gateway-scheduled-payment detection, stepped pricing, external renewal recording.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Scope note: this class creates the renewal WC_Order and drives the charge
 * through whatever WooCommerce payment gateway the customer's saved token
 * belongs to (`WC_Payment_Gateway::process_payment()`, the same mechanism WC
 * checkout itself uses) — it does not implement a specific gateway's API.
 * That's the correct boundary per subscription-final-dev-plan.md's 16-step
 * plan: no step is titled "Stripe/PayPal integration"; RenewalEngine's job
 * ends at invoking the gateway's own off-session charge path. On failure,
 * this only sets `past_due` and logs — the actual grace-period/retry-interval
 * schedule is DunningManager's job (Step 7), deliberately not duplicated here.
 *
 * @since 1.0.0
 */
class RenewalEngine {

	/** Action Scheduler group for all Subscriptions module jobs. */
	private const AS_GROUP = 'purecart';

	/** Recurring job: scans for due subscriptions and queues a process job for each. */
	private const SCAN_HOOK = 'purecart_scan_due_renewals';

	/** Per-subscription job: actually attempts the renewal. */
	private const PROCESS_HOOK = 'purecart_process_renewal';

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/** @var SubscriptionLogRepository */
	private SubscriptionLogRepository $logs;

	/** @var PaymentRepository */
	private PaymentRepository $payments;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->subscriptions = new SubscriptionRepository();
		$this->logs          = new SubscriptionLogRepository();
		$this->payments      = new PaymentRepository();

		add_action( self::SCAN_HOOK, array( $this, 'scan_due_renewals' ) );
		add_action( self::PROCESS_HOOK, array( $this, 'process_renewal' ) );
		add_action( 'init', array( $this, 'maybe_schedule_recurring_scan' ) );
	}

	/**
	 * Ensure the hourly scan job is scheduled. Safe to call on every request —
	 * as_next_scheduled_action() makes this a cheap no-op once it's already set up.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function maybe_schedule_recurring_scan(): void {
		if ( false === as_next_scheduled_action( self::SCAN_HOOK, array(), self::AS_GROUP ) ) {
			as_schedule_recurring_action( time(), HOUR_IN_SECONDS, self::SCAN_HOOK, array(), self::AS_GROUP );
		}
	}

	// -----------------------------------------------------------------------
	// Scan
	// -----------------------------------------------------------------------

	/**
	 * Hourly Action Scheduler job: find every trialing/active subscription
	 * whose next_payment_at has arrived and queue a process job for each.
	 * Queued as separate single actions (rather than processed inline here)
	 * so one slow/failing renewal can't block the rest of the batch, and so
	 * Action Scheduler's own per-action retry/logging applies individually.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function scan_due_renewals(): void {
		foreach ( $this->subscriptions->find_due_renewals() as $subscription ) {
			$subscription_id = (int) $subscription->id;

			// Don't queue a second process job if one for this subscription is
			// already pending — the scan runs hourly and a slow-to-process
			// subscription could otherwise get queued repeatedly.
			if ( as_next_scheduled_action( self::PROCESS_HOOK, array( $subscription_id ), self::AS_GROUP ) ) {
				continue;
			}

			as_schedule_single_action( time(), self::PROCESS_HOOK, array( $subscription_id ), self::AS_GROUP );
		}

		$this->resume_expired_pauses();
	}

	/**
	 * Auto-resume paused subscriptions whose pause_end_date has arrived.
	 *
	 * Gap found during Step 9 (RetentionFlow's "pause" offer would otherwise
	 * pause a subscription forever, since RND's "Auto-Resume" flow was never
	 * built back in Step 5) — piggybacked on this class's existing hourly
	 * scan rather than adding a third recurring job.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function resume_expired_pauses(): void {
		$manager = new SubscriptionManager();

		foreach ( $this->subscriptions->find_expired_pauses() as $subscription ) {
			$manager->resume( (int) $subscription->id );
		}
	}

	// -----------------------------------------------------------------------
	// Process
	// -----------------------------------------------------------------------

	/**
	 * Attempt to renew one subscription. Every early-return below is a
	 * deliberate guard from subscription-final-dev-plan.md § 9 Step 6 / the
	 * RND doc's "Renewal Engine — Idempotency & Safety" section.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function process_renewal( int $subscription_id ): void {
		/**
		 * Staging/dev safety valve. Return false (e.g. by checking the site
		 * URL against a configured staging-domain list) to block all renewal
		 * charges — prevents a copied/staging site from billing real cards.
		 *
		 * Named `purecart_allow_renewal`, deliberately NOT `purecart_process_renewal`
		 * — that string is also this class's Action Scheduler hook (self::PROCESS_HOOK),
		 * registered via `add_action()`. WordPress's action/filter registry is the
		 * same underlying store, so reusing the name here would make this exact
		 * `apply_filters()` call re-invoke process_renewal() itself as a filter
		 * callback — confirmed by testing: it does, and crashes immediately
		 * (`process_renewal( true, $subscription_id )`, a type error). Caught by
		 * the functional test for this class before this ever shipped.
		 *
		 * @since 1.0.0
		 * @param bool $allow           Whether to proceed. Default true.
		 * @param int  $subscription_id Subscription row ID.
		 */
		if ( ! apply_filters( 'purecart_allow_renewal', true, $subscription_id ) ) {
			return;
		}

		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return;
		}

		if ( 'pending_cancel' === $subscription->status ) {
			// Safety net only — SubscriptionManager::cancel()'s own scheduled
			// single action normally finalizes this already. Reaching here means
			// that action was missed (deactivated plugin, cleared AS queue, etc.).
			( new SubscriptionManager() )->finalize_pending_cancellation( $subscription_id );
			return;
		}

		if ( ! in_array( $subscription->status, array( 'active', 'trialing' ), true ) ) {
			return;
		}

		if ( $this->already_renewed_this_cycle( $subscription ) ) {
			return;
		}

		if ( $this->gateway_manages_schedule( $subscription ) ) {
			// Some gateways (Stripe Billing, WooPayments' own schedules, ...) run
			// their own billing clock. PureCart skips creating its own charge and
			// waits for that gateway's webhook to call record_external_renewal().
			return;
		}

		// Apply any pending plan switch (RetentionFlow's downgrade offer, Step 9)
		// *before* computing the charge, so this cycle bills at the new plan's
		// rate. This is a minimal preview of Step 10's PlanUpgrade scope — just
		// enough to satisfy this step's own checklist ("accepted downgrade
		// applies at next renewal") — not the full 3-mode proration system.
		$subscription = $this->maybe_apply_pending_switch( $subscription );

		$amount = $this->renewal_amount( $subscription );

		if ( $amount <= 0.0 ) {
			$this->complete_renewal( $subscription, null, 'zero_total' );
			return;
		}

		$this->charge_renewal( $subscription, $amount );
	}

	/**
	 * Retry a charge for a subscription that's already `past_due` or
	 * `suspended` — DunningManager's (Step 7) entry point, called from a
	 * scheduled retry or a card-update magic link. Deliberately separate
	 * from process_renewal(): that method only ever handles a *fresh* due
	 * cycle (`active`/`trialing`) and would reject these statuses outright.
	 *
	 * Reuses this class's own charge_renewal()/complete_renewal() so there's
	 * exactly one implementation of "how to charge a renewal" — a scheduled
	 * due-cycle charge and a dunning retry charge are the same operation,
	 * just triggered from different callers.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return bool Whether the retry succeeded.
	 */
	public function retry_renewal( int $subscription_id ): bool {
		if ( ! apply_filters( 'purecart_allow_renewal', true, $subscription_id ) ) {
			return false;
		}

		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || ! in_array( $subscription->status, array( 'past_due', 'suspended' ), true ) ) {
			return false;
		}

		$was_suspended = 'suspended' === $subscription->status;
		$amount        = $this->renewal_amount( $subscription );

		if ( $amount <= 0.0 ) {
			$this->complete_renewal( $subscription, null, 'zero_total_retry' );
			$success = true;
		} else {
			$success = $this->charge_renewal( $subscription, $amount );
		}

		if ( $success && $was_suspended ) {
			// complete_renewal() dispatches DeliveryManager::renew(), which
			// deliberately skips software/saas (§ 3 — that's Step 16's job).
			// A recovery from `suspended` needs the access itself *restored*,
			// which is exactly what reactivate() does (e.g. un-suspending the
			// SaaS account) — renew() alone wouldn't do that here.
			DeliveryManager::reactivate( (array) $subscription );
			do_action( 'purecart_subscription_reactivated', $subscription_id );
		}

		return $success;
	}

	/**
	 * Idempotency guard: has a successful payment already been recorded for
	 * this subscription at/after its current due date? If so, a previous run
	 * already renewed this cycle and next_payment_at just hasn't caught up
	 * yet (e.g. the process crashed between charging and advancing the row) —
	 * skip re-charging instead of double-billing.
	 *
	 * Deliberately checks the payments ledger (§ 2's `wp_purecart_subscription_payments`)
	 * rather than a single `_purecart_current_renewal_order_id`-style field on
	 * the subscription row (RND's original approach) — the reconciled schema
	 * in subscription-final-dev-plan.md § 2 adopted the ledger specifically
	 * because a single field can't tell "already charged" from "never tried".
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return bool
	 */
	private function already_renewed_this_cycle( object $subscription ): bool {
		if ( ! $subscription->next_payment_at ) {
			return false;
		}

		$due_at = BillingClock::to_dt( $subscription->next_payment_at )->getTimestamp();

		foreach ( $this->payments->find_by_subscription( (int) $subscription->id ) as $payment ) {
			if ( 'succeeded' === $payment->status && BillingClock::to_dt( $payment->created_at )->getTimestamp() >= $due_at ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Whether this subscription's gateway manages its own renewal schedule.
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return bool
	 */
	private function gateway_manages_schedule( object $subscription ): bool {
		/**
		 * Filters whether a subscription's gateway handles its own scheduled
		 * billing (in which case PureCart must not also charge it).
		 *
		 * @since 1.0.0
		 * @param bool   $gateway_scheduled Default false.
		 * @param object $subscription      Subscription row.
		 */
		return (bool) apply_filters( 'purecart_gateway_manages_schedule', false, $subscription );
	}

	/**
	 * The amount due this cycle, applying stepped pricing if configured and
	 * reached, then letting other modules adjust it (RetentionFlow's active
	 * discount, Step 9).
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return float
	 */
	private function renewal_amount( object $subscription ): float {
		$amount = (float) $subscription->recurring_amount;

		if ( $subscription->step_price && $subscription->step_after && (int) $subscription->renewal_count >= (int) $subscription->step_after ) {
			$amount = (float) $subscription->step_price;
		}

		/**
		 * Filters the computed renewal amount before it's charged — e.g.
		 * RetentionFlow (Step 9) reduces it while an accepted discount offer's
		 * `discount_renewals_remaining` counter hasn't yet run out.
		 *
		 * @since 1.0.0
		 * @param float  $amount       Amount computed so far.
		 * @param object $subscription Subscription row.
		 */
		return (float) apply_filters( 'purecart_renewal_amount', $amount, $subscription );
	}

	/**
	 * Apply a scheduled plan switch (RetentionFlow's downgrade-as-retention-offer,
	 * § 6) if one is pending, before this cycle's charge is computed.
	 *
	 * Minimal on purpose: swaps product_id/recurring_amount/billing_interval/
	 * billing_period to the new product's configuration with no proration —
	 * correct for the downgrade-offer flow specifically, since that flow is
	 * documented as "no immediate change, applies fully at next renewal" (i.e.
	 * inherently the `apply_at_renewal` mode). The full 3-mode proration system
	 * (`prorate_immediately` / `apply_at_renewal` / `no_proration`, for
	 * customer-initiated upgrades/downgrades generally) is Step 10's job.
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return object The subscription row, refreshed if a switch was applied.
	 */
	private function maybe_apply_pending_switch( object $subscription ): object {
		if ( empty( $subscription->pending_switch_product ) ) {
			return $subscription;
		}

		$new_product = wc_get_product( (int) $subscription->pending_switch_product );

		if ( ! $new_product ) {
			// Configured product no longer exists — clear the pending switch
			// rather than trying (and failing) to apply it every cycle forever.
			$this->subscriptions->update( (int) $subscription->id, array( 'pending_switch_product' => null, 'pending_switch_type' => null ) );
			return $this->subscriptions->find( (int) $subscription->id ) ?? $subscription;
		}

		$switch_type = (string) $subscription->pending_switch_type;

		$this->subscriptions->update(
			(int) $subscription->id,
			array(
				'product_id'             => $new_product->get_id(),
				'recurring_amount'       => (float) wc_format_decimal( $new_product->get_meta( '_purecart_sub_price' ) ),
				'billing_interval'       => max( 1, (int) $new_product->get_meta( '_purecart_sub_interval' ) ),
				'billing_period'         => $new_product->get_meta( '_purecart_sub_period' ) ?: $subscription->billing_period,
				'pending_switch_product' => null,
				'pending_switch_type'    => null,
			)
		);

		$this->logs->log(
			(int) $subscription->id,
			'plan_switched',
			array( 'note' => "switched to product {$new_product->get_id()} ({$switch_type})" )
		);

		do_action( 'purecart_subscription_plan_changed', (int) $subscription->id );

		return $this->subscriptions->find( (int) $subscription->id ) ?? $subscription;
	}

	// -----------------------------------------------------------------------
	// Charging
	// -----------------------------------------------------------------------

	/**
	 * Build the renewal order and attempt the charge via the customer's
	 * saved payment token / gateway.
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @param float  $amount       Amount to charge.
	 * @return bool Whether the charge succeeded. Used by retry_renewal() (Step 7 —
	 *              DunningManager needs to know the outcome to decide whether to
	 *              schedule another retry or restore access).
	 */
	private function charge_renewal( object $subscription, float $amount ): bool {
		$order = $this->create_renewal_order( $subscription, $amount );
		if ( ! $order ) {
			return false;
		}

		$attempt = $this->attempt_gateway_charge( $subscription, $order );

		if ( $attempt['success'] ) {
			$this->complete_renewal( $subscription, $order, 'charged' );
			return true;
		}

		$this->mark_failed( $subscription, $order, $attempt['reason'] );
		return false;
	}

	/**
	 * Charge an arbitrary one-off amount via the subscription's saved payment
	 * token — PlanUpgrade's (Step 10) entry point for a prorated
	 * upgrade/downgrade charge. Deliberately separate from charge_renewal():
	 * a proration charge is NOT a renewal — it must not advance
	 * next_payment_at/renewal_count the way complete_renewal() does, since
	 * PlanUpgrade sets the resulting subscription state itself (proration
	 * mode decides whether the cycle resets or stays put).
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @param float  $amount       Amount to charge (must be > 0).
	 * @param string $context      Stored as `_purecart_charge_context` order meta, for audit purposes.
	 * @return \WC_Order|\WP_Error The paid order, or a WP_Error describing the failure.
	 */
	public function charge_one_off( object $subscription, float $amount, string $context = '' ): \WC_Order|\WP_Error {
		if ( $amount <= 0 ) {
			return new \WP_Error( 'purecart_invalid_amount', __( 'Amount must be greater than zero.', 'purecart' ) );
		}

		$order = $this->create_renewal_order( $subscription, $amount );
		if ( ! $order ) {
			return new \WP_Error( 'purecart_order_failed', __( 'Could not create the charge order.', 'purecart' ) );
		}

		if ( '' !== $context ) {
			$order->update_meta_data( '_purecart_charge_context', $context );
			$order->save();
		}

		$attempt = $this->attempt_gateway_charge( $subscription, $order );

		if ( ! $attempt['success'] ) {
			return new \WP_Error( 'purecart_charge_failed', $attempt['reason'] );
		}

		$order->payment_complete();

		$this->payments->record(
			array(
				'subscription_id' => $subscription->id,
				'order_id'        => $order->get_id(),
				'transaction_id'  => $order->get_transaction_id() ?: ( 'order_' . $order->get_id() ),
				'amount'          => $amount,
				'currency'        => $order->get_currency(),
				'status'          => 'succeeded',
			)
		);

		return $order;
	}

	/**
	 * Attach the subscription's saved payment token to $order and attempt
	 * the charge. Shared by charge_renewal() (regular due-cycle renewals) and
	 * charge_one_off() (PlanUpgrade's prorated charges) — both need "find
	 * token, find gateway, call process_payment()"; they differ only in what
	 * happens next on success/failure, which stays in each caller.
	 *
	 * @since 1.0.0
	 * @param object    $subscription Subscription row.
	 * @param \WC_Order $order        Order to charge.
	 * @return array{success: bool, reason: string}
	 */
	private function attempt_gateway_charge( object $subscription, \WC_Order $order ): array {
		if ( empty( $subscription->payment_token_id ) || ! class_exists( '\WC_Payment_Tokens' ) ) {
			return array(
				'success' => false,
				'reason'  => 'no_payment_token',
			);
		}

		$token = \WC_Payment_Tokens::get( (int) $subscription->payment_token_id );
		if ( ! $token ) {
			return array(
				'success' => false,
				'reason'  => 'invalid_payment_token',
			);
		}

		$gateways = WC()->payment_gateways()->payment_gateways();
		$gateway  = $gateways[ $token->get_gateway_id() ] ?? null;

		if ( ! $gateway ) {
			return array(
				'success' => false,
				'reason'  => 'gateway_unavailable',
			);
		}

		$order->add_payment_token( $token );
		$order->set_payment_method( $gateway );
		$order->save();

		try {
			// The gateway's own process_payment() — the same off-session charge
			// path WC checkout itself uses for a saved token. Any gateway that
			// supports WC_Payment_Tokens plugs into this unmodified.
			$result = $gateway->process_payment( $order->get_id() );
		} catch ( \Throwable $e ) {
			return array(
				'success' => false,
				'reason'  => 'gateway_exception: ' . $e->getMessage(),
			);
		}

		if ( isset( $result['result'] ) && 'success' === $result['result'] ) {
			return array(
				'success' => true,
				'reason'  => '',
			);
		}

		/**
		 * The specific decline reason, for DunningManager's hard/soft-decline
		 * targeting (Step 7). No WC payment gateway returns a standardized
		 * decline code from process_payment() itself — gateways that expose one
		 * (e.g. via order meta) should filter this to the real code; defaults
		 * to a generic string so dunning still falls back to "always retry".
		 *
		 * @since 1.0.0
		 * @param string    $reason Default decline reason.
		 * @param \WC_Order $order  The order that failed to charge.
		 * @param mixed     $result The gateway's process_payment() return value.
		 */
		$reason = apply_filters( 'purecart_renewal_decline_reason', 'gateway_declined', $order, $result );

		return array(
			'success' => false,
			'reason'  => $reason,
		);
	}

	/**
	 * Create the renewal WC_Order for a subscription, mirroring its product/price.
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @param float  $amount       Amount to charge.
	 * @return \WC_Order|null
	 */
	private function create_renewal_order( object $subscription, float $amount ): ?\WC_Order {
		$product = wc_get_product( (int) $subscription->product_id );
		if ( ! $product ) {
			return null;
		}

		$order = wc_create_order(
			array(
				'customer_id' => (int) $subscription->user_id,
				'status'      => 'pending',
			)
		);

		if ( is_wp_error( $order ) ) {
			return null;
		}

		$order->add_product( $product, 1, array(
			'subtotal' => $amount,
			'total'    => $amount,
		) );

		if ( ! empty( $subscription->billing_address ) ) {
			$address = json_decode( (string) $subscription->billing_address, true );
			if ( is_array( $address ) ) {
				$order->set_address( $address, 'billing' );
			}
		}

		if ( 'yes' === $product->get_meta( '_purecart_sub_include_shipping' ) && (float) $subscription->shipping_amount > 0 ) {
			$shipping = new \WC_Order_Item_Shipping();
			$shipping->set_method_title( (string) ( $subscription->shipping_method ?: __( 'Shipping', 'purecart' ) ) );
			$shipping->set_total( (float) $subscription->shipping_amount );
			$order->add_item( $shipping );
		}

		$order->set_currency( $subscription->currency ?: get_woocommerce_currency() );
		$order->update_meta_data( '_purecart_renewal_for', $subscription->id );
		$order->update_meta_data( '_purecart_renewal_order', 'yes' );

		/**
		 * Gateway meta keys copied from the customer's account/original order
		 * onto the renewal order so gateways can process an off-session charge.
		 * Filterable so a gateway PureCart doesn't know about can add its own keys.
		 *
		 * @since 1.0.0
		 * @param string[] $keys Meta keys to copy.
		 */
		$gateway_meta_keys = apply_filters(
			'purecart_gateway_meta_keys',
			array( '_stripe_customer_id', '_stripe_source_id', '_stripe_card_id', '_stripe_upe_payment_type', '_paypal_subscription_id', '_ppcp_billing_agreement_id' )
		);

		foreach ( (array) $gateway_meta_keys as $meta_key ) {
			$value = get_user_meta( (int) $subscription->user_id, $meta_key, true );
			if ( '' !== $value ) {
				$order->update_meta_data( $meta_key, $value );
			}
		}

		$order->calculate_totals();
		$order->save();

		do_action( 'purecart_renewal_order_created', $order, (int) $subscription->id );

		return $order;
	}

	/**
	 * Advance the subscription's schedule, record the payment, and dispatch
	 * post-renewal side effects (license/SaaS extension, etc.) on success.
	 *
	 * @since 1.0.0
	 * @param object        $subscription Subscription row.
	 * @param \WC_Order|null $order       The renewal order, or null for a zero-total renewal.
	 * @param string        $note         Log note.
	 * @return void
	 */
	private function complete_renewal( object $subscription, ?\WC_Order $order, string $note ): void {
		if ( $order ) {
			$order->payment_complete();
		}

		$amount = $this->renewal_amount( $subscription );
		$now    = current_time( 'mysql' );

		// Anchor the next due date to the cycle that was *just paid for*
		// (the subscription's own next_payment_at), not to "now" — if this
		// ever ran late (server downtime, a busy Action Scheduler queue,
		// $now instead of the anchor), the billing date would creep forward
		// a little more every cycle, forever. Falls back to $now only for a
		// subscription that somehow has no next_payment_at at all.
		$anchor          = $subscription->next_payment_at ?: $now;
		$next_payment_at = BillingClock::add_interval( $anchor, (int) $subscription->billing_interval, $subscription->billing_period );

		$this->subscriptions->update(
			(int) $subscription->id,
			array(
				'status'          => 'active',
				'last_payment_at' => $now,
				'next_payment_at' => $next_payment_at,
				'renewal_count'   => (int) $subscription->renewal_count + 1,
				'retry_count'     => 0,
			)
		);

		if ( $order ) {
			$this->payments->record(
				array(
					'subscription_id' => $subscription->id,
					'order_id'        => $order->get_id(),
					'transaction_id'  => $order->get_transaction_id() ?: ( 'order_' . $order->get_id() ),
					'amount'          => $amount,
					'currency'        => $order->get_currency(),
					'status'          => 'succeeded',
				)
			);
		}

		$this->logs->log(
			(int) $subscription->id,
			'renewed',
			array(
				'old_status' => $subscription->status,
				'new_status' => 'active',
				'amount'     => $amount,
				'order_id'   => $order ? $order->get_id() : null,
				'note'       => $note,
			)
		);

		DeliveryManager::renew( (array) $subscription );

		// Gap found during Step 14: this method changes `status` (trialing/
		// past_due -> active on a subscription's first successful charge after
		// a trial or a dunning retry) but, unlike SubscriptionManager's own
		// pause()/cancel()/expire(), never fired the generic status-changed
		// hook — only DunningManager's suspend()/hard_cancel() did. RoleManager
		// (Step 14) needs this to swap the trial role for the active role on
		// trial conversion, so it's added here rather than worked around.
		if ( 'active' !== $subscription->status ) {
			do_action( 'purecart_subscription_status_changed', (int) $subscription->id, $subscription->status, 'active' );
		}

		do_action( 'purecart_subscription_renewed', (int) $subscription->id, $order ? $order->get_id() : null, $next_payment_at );
	}

	/**
	 * Record a failed renewal attempt. Deliberately minimal — the actual
	 * grace-period/retry-interval schedule belongs to DunningManager (Step 7),
	 * not duplicated here. This just gets the subscription into `past_due`
	 * and leaves an auditable trail for that step to pick up.
	 *
	 * @since 1.0.0
	 * @param object    $subscription Subscription row.
	 * @param \WC_Order $order        The failed renewal order.
	 * @param string    $reason       Failure reason, stored on the log entry.
	 * @return void
	 */
	private function mark_failed( object $subscription, \WC_Order $order, string $reason ): void {
		$this->subscriptions->update(
			(int) $subscription->id,
			array(
				'status'      => 'past_due',
				'retry_count' => (int) $subscription->retry_count + 1,
			)
		);

		$this->payments->record(
			array(
				'subscription_id' => $subscription->id,
				'order_id'        => $order->get_id(),
				// Failed attempts don't have a real gateway transaction ID; unique
				// per attempt so this never collides with (or blocks) a later
				// successful charge's uniq_transaction entry.
				'transaction_id'  => 'failed_' . $order->get_id() . '_' . time(),
				'amount'          => $this->renewal_amount( $subscription ),
				'currency'        => $order->get_currency(),
				'status'          => 'failed',
			)
		);

		$this->logs->log(
			(int) $subscription->id,
			'payment_failed',
			array(
				'old_status' => $subscription->status,
				'new_status' => 'past_due',
				'order_id'   => $order->get_id(),
				'note'       => $reason,
			)
		);

		if ( 'past_due' !== $subscription->status ) {
			do_action( 'purecart_subscription_status_changed', (int) $subscription->id, $subscription->status, 'past_due' );
		}

		do_action( 'purecart_subscription_payment_failed', (int) $subscription->id, $order->get_id(), $reason );
	}

	// -----------------------------------------------------------------------
	// Early renewal (customer-initiated, before the due date)
	// -----------------------------------------------------------------------

	/**
	 * Renew a subscription immediately, before its next_payment_at is due —
	 * feature doc § 5 ("Early renewal"), Step 12's REST endpoint for it.
	 *
	 * Deliberately simpler than RND-subscriptions.md's version, which routes
	 * through a WooCommerce checkout redirect — this codebase already charges
	 * renewals off-session via the customer's saved payment token (this exact
	 * class), so an early renewal just charges that same way right now instead
	 * of waiting for the scan to notice next_payment_at is due. No separate
	 * checkout flow needed.
	 *
	 * Fires the same `purecart_subscription_renewed` action a scheduled
	 * renewal does, so ChurnScorer/RetentionFlow/SplitPaymentManager all react
	 * identically without needing to know this was "early".
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return true|\WP_Error
	 */
	public function early_renewal( int $subscription_id ): true|\WP_Error {
		if ( ! apply_filters( 'purecart_allow_renewal', true, $subscription_id ) ) {
			return new \WP_Error( 'purecart_renewals_blocked', __( 'Renewals are currently blocked on this site.', 'purecart' ) );
		}

		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || ! in_array( $subscription->status, array( 'active', 'trialing' ), true ) ) {
			return new \WP_Error( 'purecart_not_active', __( 'Only active or trialing subscriptions can be renewed early.', 'purecart' ) );
		}

		$amount = $this->renewal_amount( $subscription );
		$order  = null;

		if ( $amount > 0.0 ) {
			$order = $this->charge_one_off( $subscription, $amount, 'early_renewal' );
			if ( is_wp_error( $order ) ) {
				return $order;
			}
		}

		$now             = current_time( 'mysql' );
		$anchor          = $subscription->next_payment_at ?: $now;
		$next_payment_at = BillingClock::add_interval( $anchor, (int) $subscription->billing_interval, $subscription->billing_period );

		$this->subscriptions->update(
			(int) $subscription->id,
			array(
				'last_payment_at' => $now,
				'next_payment_at' => $next_payment_at,
				'renewal_count'   => (int) $subscription->renewal_count + 1,
			)
		);

		$this->logs->log(
			(int) $subscription->id,
			'early_renewal',
			array(
				'amount'   => $amount,
				'order_id' => $order ? $order->get_id() : null,
				'note'     => 'customer-initiated early renewal',
			)
		);

		DeliveryManager::renew( (array) $subscription );

		do_action( 'purecart_subscription_renewed', (int) $subscription->id, $order ? $order->get_id() : null, $next_payment_at );

		return true;
	}

	// -----------------------------------------------------------------------
	// External (gateway-scheduled) renewals
	// -----------------------------------------------------------------------

	/**
	 * Record a renewal that a gateway billed and scheduled on its own side
	 * (§ "Renewal Methods" — gateway-scheduled payments), reported to us via
	 * that gateway's webhook rather than initiated by process_renewal().
	 *
	 * @since 1.0.0
	 * @param int                  $subscription_id Subscription row ID.
	 * @param array{transaction_id: string, amount?: float} $data Renewal data from the webhook.
	 * @return bool True if recorded, false if the subscription/transaction was invalid or already recorded.
	 */
	public function record_external_renewal( int $subscription_id, array $data ): bool {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return false;
		}

		$transaction_id = isset( $data['transaction_id'] ) ? sanitize_text_field( (string) $data['transaction_id'] ) : '';
		if ( '' === $transaction_id ) {
			return false;
		}

		// Idempotency backstop — uniq_transaction on wp_purecart_subscription_payments
		// rejects a duplicate transaction_id outright (PaymentRepository::record()).
		if ( $this->payments->find_by_transaction( $transaction_id ) ) {
			return false;
		}

		$amount = isset( $data['amount'] ) ? (float) $data['amount'] : $this->renewal_amount( $subscription );
		$now    = current_time( 'mysql' );

		$this->payments->record(
			array(
				'subscription_id' => $subscription_id,
				'order_id'        => 0,
				'transaction_id'  => $transaction_id,
				'amount'          => $amount,
				'currency'        => $subscription->currency,
				'status'          => 'succeeded',
			)
		);

		// Same anchoring rule as complete_renewal() — see that method's comment.
		$anchor          = $subscription->next_payment_at ?: $now;
		$next_payment_at = BillingClock::add_interval( $anchor, (int) $subscription->billing_interval, $subscription->billing_period );

		$this->subscriptions->update(
			$subscription_id,
			array(
				'status'          => 'active',
				'last_payment_at' => $now,
				'next_payment_at' => $next_payment_at,
				'renewal_count'   => (int) $subscription->renewal_count + 1,
				'retry_count'     => 0,
			)
		);

		$this->logs->log(
			$subscription_id,
			'renewed',
			array(
				'old_status' => $subscription->status,
				'new_status' => 'active',
				'amount'     => $amount,
				'note'       => 'external (gateway-scheduled)',
			)
		);

		DeliveryManager::renew( (array) $subscription );

		do_action( 'purecart_external_renewal_recorded', $subscription_id, $next_payment_at );

		return true;
	}
}

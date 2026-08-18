<?php
/**
 * Failed-payment recovery: retry scheduling, hard/soft decline targeting,
 * grace-period suspend/cancel transitions, and the no-login card-update magic link.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Grace-period flow (feature doc § 7):
 *
 *   Day 0:    Charge fails -> 'past_due' (RenewalEngine, already done before
 *             this class ever runs). Retries scheduled per purecart_sub_retry_intervals.
 *   Day N:    Retry. Success -> back to 'active'. Failure -> next scheduled retry.
 *   Day X:    purecart_sub_active_grace_days exhausted -> 'suspended'.
 *   Day X+N:  Retries continue during suspended grace.
 *   Day X+Y:  purecart_sub_suspended_grace_days exhausted -> 'cancelled'.
 *
 * Deliberately reuses the *existing* `purecart_process_dunning` Action
 * Scheduler job (already scheduled every 12h by \PureCart\Activator — see
 * its schedule_jobs(), currently only consumed by a no-op stub in
 * \PureCart\Commerce\OrderHandler::run_dunning()) for the grace-period scan,
 * instead of registering a second recurring job. Per-subscription retry
 * timing still needs its own single-action schedule, since retries land on
 * subscription-specific days, not a fixed site-wide interval.
 *
 * @since 1.0.0
 */
class DunningManager {

	/** Action Scheduler group for all Subscriptions module jobs. */
	private const AS_GROUP = 'purecart';

	/** Per-subscription single-action job: retry one charge attempt. */
	private const RETRY_HOOK = 'purecart_dunning_retry';

	/**
	 * Gateway decline reasons that will never succeed no matter how many
	 * times retried — matching any of these skips retry scheduling entirely
	 * (checklist: "Hard-decline reason codes skip retry scheduling entirely").
	 * Grace-period suspension/cancellation still proceeds on schedule; only
	 * the *automatic retry attempts* are skipped, since the customer may
	 * still fix it themselves (new card) before the grace period runs out.
	 *
	 * Matched as a case-insensitive substring against whatever decline
	 * reason a gateway integration provides via the
	 * `purecart_renewal_decline_reason` filter (RenewalEngine, Step 6) —
	 * without a real gateway wired up, this reason is always the generic
	 * fallback ('gateway_declined'), which correctly falls through to "soft"
	 * (keep retrying) until a real integration supplies actual codes.
	 *
	 * @var string[]
	 */
	private const HARD_DECLINE_REASONS = array(
		'stolen_card',
		'lost_card',
		'pickup_card',
		'restricted_card',
		'security_violation',
		'invalid_account',
		'card_not_supported',
		'currency_not_supported',
		'fraudulent',
		'no_payment_token',
		'invalid_payment_token',
	);

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/** @var SubscriptionLogRepository */
	private SubscriptionLogRepository $logs;

	/** @var RenewalEngine */
	private RenewalEngine $renewal_engine;

	/**
	 * @since 1.0.0
	 * @param RenewalEngine $renewal_engine Shared instance from Module — NOT a fresh
	 *                                      `new RenewalEngine()` here, which would
	 *                                      register its scan/process hooks a second
	 *                                      time and double-run every renewal.
	 */
	public function __construct( RenewalEngine $renewal_engine ) {
		$this->subscriptions  = new SubscriptionRepository();
		$this->logs           = new SubscriptionLogRepository();
		$this->renewal_engine = $renewal_engine;

		add_action( 'purecart_subscription_payment_failed', array( $this, 'on_payment_failed' ), 10, 3 );
		add_action( self::RETRY_HOOK, array( $this, 'run_retry' ), 10, 2 );
		add_action( 'purecart_process_dunning', array( $this, 'check_grace_periods' ) );
	}

	// -----------------------------------------------------------------------
	// Retry scheduling
	// -----------------------------------------------------------------------

	/**
	 * Fired by RenewalEngine::mark_failed() right after a renewal charge fails.
	 *
	 * @since 1.0.0
	 * @param int    $subscription_id Subscription row ID.
	 * @param int    $order_id        The failed renewal order ID.
	 * @param string $reason          Decline reason (see purecart_renewal_decline_reason).
	 * @return void
	 */
	public function on_payment_failed( int $subscription_id, int $order_id, string $reason ): void {
		if ( $this->is_hard_decline( $reason ) ) {
			$this->logs->log(
				$subscription_id,
				'dunning_retry_skipped',
				array( 'note' => "hard decline ({$reason}) — no automatic retry scheduled" )
			);
			return;
		}

		$this->schedule_next_retry( $subscription_id, 0 );
	}

	/**
	 * @since 1.0.0
	 * @param string $reason Decline reason string.
	 * @return bool
	 */
	private function is_hard_decline( string $reason ): bool {
		foreach ( self::HARD_DECLINE_REASONS as $code ) {
			if ( false !== stripos( $reason, $code ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Schedule the next retry attempt, per `purecart_sub_retry_intervals`
	 * (default [1, 3, 5] days). No more attempts left simply means no action
	 * is scheduled — check_grace_periods() takes over from there.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @param int $attempt_index   0-based index into the configured interval list.
	 * @return void
	 */
	private function schedule_next_retry( int $subscription_id, int $attempt_index ): void {
		$intervals    = (array) Settings::get( OptionKeys::SUB_RETRY_INTERVALS, array( 1, 3, 5 ) );
		$max_attempts = (int) Settings::get( OptionKeys::SUB_RETRY_ATTEMPTS, 3 );

		if ( $attempt_index >= $max_attempts || ! isset( $intervals[ $attempt_index ] ) ) {
			return;
		}

		$days = max( 0, (int) $intervals[ $attempt_index ] );

		// A pure epoch-to-epoch offset for Action Scheduler's timestamp param
		// (itself a UTC epoch value) — not a wall-clock string, so none of
		// BillingClock's wp_timezone()-anchoring applies or is needed here.
		$timestamp = time() + ( $days * DAY_IN_SECONDS );

		as_schedule_single_action( $timestamp, self::RETRY_HOOK, array( $subscription_id, $attempt_index ), self::AS_GROUP );

		// New in Step 13 — SubscriptionEmail's "Payment Retry Scheduled" listens here.
		do_action( 'purecart_dunning_retry_scheduled', $subscription_id, $timestamp );
	}

	/**
	 * Action Scheduler callback: attempt one retry, then schedule the next
	 * one on failure (or stop, once attempts are exhausted).
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @param int $attempt_index   0-based attempt number that just ran.
	 * @return void
	 */
	public function run_retry( int $subscription_id, int $attempt_index ): void {
		$succeeded = $this->renewal_engine->retry_renewal( $subscription_id );

		if ( $succeeded ) {
			$this->logs->log( $subscription_id, 'dunning_retry_succeeded', array( 'note' => 'attempt ' . ( $attempt_index + 1 ) ) );
			return;
		}

		$this->logs->log( $subscription_id, 'dunning_retry_failed', array( 'note' => 'attempt ' . ( $attempt_index + 1 ) ) );

		// New in Step 13 — SubscriptionEmail's "Overdue Notice" listens here
		// (RND: "Day N: Retry ... Failure -> Send overdue reminder email").
		do_action( 'purecart_dunning_retry_failed', $subscription_id, $attempt_index );

		$this->schedule_next_retry( $subscription_id, $attempt_index + 1 );
	}

	// -----------------------------------------------------------------------
	// Grace-period scan
	// -----------------------------------------------------------------------

	/**
	 * Hooked to the existing `purecart_process_dunning` job (every 12h). Twice
	 * a day is more than enough precision for grace periods measured in days.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function check_grace_periods(): void {
		$this->check_active_grace();
		$this->check_suspended_grace();
	}

	/**
	 * past_due -> suspended once purecart_sub_active_grace_days has elapsed
	 * since the cycle's due date. `next_payment_at` doesn't move while a
	 * subscription sits in past_due, so it doubles as "the date this grace
	 * period started" without needing a dedicated column for it.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function check_active_grace(): void {
		$grace_days = (int) Settings::get( OptionKeys::SUB_ACTIVE_GRACE_DAYS, 7 );

		foreach ( $this->subscriptions->find_by_status( 'past_due' ) as $subscription ) {
			if ( ! $subscription->next_payment_at ) {
				continue;
			}

			$elapsed = BillingClock::now_dt()->getTimestamp() - BillingClock::to_dt( $subscription->next_payment_at )->getTimestamp();

			if ( $elapsed >= $grace_days * DAY_IN_SECONDS ) {
				$this->suspend( $subscription );
			}
		}
	}

	/**
	 * suspended -> cancelled once purecart_sub_suspended_grace_days has
	 * elapsed since suspended_at.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function check_suspended_grace(): void {
		$grace_days = (int) Settings::get( OptionKeys::SUB_SUSPENDED_GRACE_DAYS, 7 );

		foreach ( $this->subscriptions->find_by_status( 'suspended' ) as $subscription ) {
			if ( ! $subscription->suspended_at ) {
				continue;
			}

			$elapsed = BillingClock::now_dt()->getTimestamp() - BillingClock::to_dt( $subscription->suspended_at )->getTimestamp();

			if ( $elapsed >= $grace_days * DAY_IN_SECONDS ) {
				$this->hard_cancel( $subscription );
			}
		}
	}

	/**
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return void
	 */
	private function suspend( object $subscription ): void {
		$this->subscriptions->update(
			(int) $subscription->id,
			array(
				'status'       => 'suspended',
				'suspended_at' => current_time( 'mysql' ),
			)
		);

		DeliveryManager::deactivate( (array) $subscription, DeliveryManager::REASON_SUSPENDED );

		$this->logs->log(
			(int) $subscription->id,
			'suspended',
			array(
				'old_status' => $subscription->status,
				'new_status' => 'suspended',
				'note'       => 'active grace period exhausted',
			)
		);

		do_action( 'purecart_subscription_status_changed', (int) $subscription->id, $subscription->status, 'suspended' );
		do_action( 'purecart_subscription_suspended', (int) $subscription->id );
	}

	/**
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return void
	 */
	private function hard_cancel( object $subscription ): void {
		$this->subscriptions->update(
			(int) $subscription->id,
			array(
				'status'       => 'cancelled',
				'cancelled_at' => current_time( 'mysql' ),
			)
		);

		// REASON_CANCELLED, not REASON_SUSPENDED: suspend() already ran for this
		// subscription and left the license/account suspended, so access is
		// already off. This transition only makes that terminal — it must not
		// additionally claw back the period the customer *did* pay for before
		// they stopped paying, which is exactly what REASON_CANCELLED preserves.
		DeliveryManager::deactivate( (array) $subscription, DeliveryManager::REASON_CANCELLED );

		$this->logs->log(
			(int) $subscription->id,
			'cancelled',
			array(
				'old_status' => 'suspended',
				'new_status' => 'cancelled',
				'note'       => 'suspended grace period exhausted',
			)
		);

		do_action( 'purecart_subscription_status_changed', (int) $subscription->id, 'suspended', 'cancelled' );
	}

	// -----------------------------------------------------------------------
	// No-login card-update magic link
	// -----------------------------------------------------------------------

	/**
	 * Generate a signed, time-limited (14 days) token that lets a customer
	 * update their card without logging in.
	 *
	 * The actual no-login landing page (a mini "add payment method" flow) is
	 * Customer Portal / Step 12 territory — this class only owns the token
	 * primitives: generate, verify, and what happens once a new card is saved.
	 * `hash_equals()` is used on the verify side for timing-safe comparison,
	 * matching this module's nonce/token-verification discipline elsewhere.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return string Empty string if the subscription doesn't exist.
	 */
	public function generate_card_update_token( int $subscription_id ): string {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return '';
		}

		$expires   = time() + ( 14 * DAY_IN_SECONDS );
		$signature = $this->sign_card_update_token( $subscription_id, (int) $subscription->user_id, $expires );

		return $expires . '.' . $signature;
	}

	/**
	 * Verify a card-update token generated by generate_card_update_token().
	 *
	 * @since 1.0.0
	 * @param int    $subscription_id Subscription row ID.
	 * @param string $token           Token from the magic link.
	 * @return bool
	 */
	public function verify_card_update_token( int $subscription_id, string $token ): bool {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return false;
		}

		$parts = explode( '.', $token, 2 );
		if ( 2 !== count( $parts ) ) {
			return false;
		}

		list( $expires_raw, $signature ) = $parts;
		$expires                         = absint( $expires_raw );

		if ( $expires < time() ) {
			return false;
		}

		$expected = $this->sign_card_update_token( $subscription_id, (int) $subscription->user_id, $expires );

		return hash_equals( $expected, $signature );
	}

	/**
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @param int $user_id         WordPress user ID (bound into the signature so a
	 *                             token can't be replayed against a different user's subscription).
	 * @param int $expires         Unix timestamp the token expires at.
	 * @return string
	 */
	private function sign_card_update_token( int $subscription_id, int $user_id, int $expires ): string {
		$payload = $subscription_id . '|' . $user_id . '|' . $expires;
		return hash_hmac( 'sha256', $payload, wp_salt( 'auth' ) );
	}

	/**
	 * Call once a customer has saved a new payment method via the magic link
	 * (or any other update-card path) — attaches it and immediately retries,
	 * per the checklist ("successful card save triggers an immediate auto-retry").
	 *
	 * @since 1.0.0
	 * @param int $subscription_id  Subscription row ID.
	 * @param int $payment_token_id New WC_Payment_Token ID.
	 * @return bool Whether the immediate retry succeeded.
	 */
	public function handle_card_updated( int $subscription_id, int $payment_token_id ): bool {
		if ( ! $this->subscriptions->find( $subscription_id ) ) {
			return false;
		}

		$this->subscriptions->update( $subscription_id, array( 'payment_token_id' => $payment_token_id ) );

		$this->logs->log( $subscription_id, 'card_updated', array( 'note' => 'via magic link, no login' ) );

		return $this->renewal_engine->retry_renewal( $subscription_id );
	}
}

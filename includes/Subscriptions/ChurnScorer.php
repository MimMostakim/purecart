<?php
/**
 * Computes and updates the churn risk score (0-100) and projected customer
 * LTV on subscription lifecycle/payment events.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Score deltas and bands from feature doc § 9:
 *
 *   Increases: payment_failed (+20 first failure, +10/retry) ·
 *              customer_initiated_cancel (+30) · skip_next_cycle (+5) · pause (+10)
 *   Decreases: payment_success (-15, floor 0) · every 12 renewals (-5)
 *   Bands:     0-25 Low · 26-50 Medium · 51-75 High · 76-100 Critical
 *
 * LTV formula ([RND]'s projected version, canonical for MVP — [nym-RND]'s
 * paid-history blend is a v2 refinement, not implemented here):
 *   monthly_equivalent = billing_amount normalized to a monthly rate
 *   ltv = monthly_equivalent x purecart_sub_avg_lifetime_months (default 24)
 *
 * Simplification, disclosed rather than hidden: the doc's delta list
 * specifically says "customer_initiated_cancel" — but no hook in this
 * codebase yet carries *who* triggered a cancellation (Step 12's REST layer,
 * not built yet, is what will know customer vs. admin). Until that exists,
 * the +30 delta applies to any cancellation this class observes, regardless
 * of actor. Revisit once Step 12 threads actor context through.
 *
 * @since 1.0.0
 */
class ChurnScorer {

	/** Band upper boundaries — checklist requires these exact numbers. */
	private const BAND_LOW    = 25;
	private const BAND_MEDIUM = 50;
	private const BAND_HIGH   = 75;

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

		add_action( 'purecart_subscription_activated', array( $this, 'on_activated' ) );
		add_action( 'purecart_subscription_renewed', array( $this, 'on_payment_success' ) );
		add_action( 'purecart_subscription_payment_failed', array( $this, 'on_payment_failed' ) );
		add_action( 'purecart_subscription_status_changed', array( $this, 'on_status_changed' ), 10, 3 );
		add_action( 'purecart_subscription_skipped', array( $this, 'on_skipped' ) );

		// Forward-looking — no code fires this yet. PlanUpgrade (Step 10) will
		// need to call `do_action( 'purecart_subscription_plan_changed', $subscription_id )`
		// after updating recurring_amount, so LTV recalculates ("LTV recalculates
		// on plan change" is this step's own checklist item, but the feature it
		// depends on doesn't exist until Step 10 — the listener is ready now so
		// nothing has to touch ChurnScorer again once PlanUpgrade lands).
		add_action( 'purecart_subscription_plan_changed', array( $this, 'on_plan_changed' ) );
	}

	// -----------------------------------------------------------------------
	// Event handlers
	// -----------------------------------------------------------------------

	/**
	 * Seed the initial LTV projection when a subscription first activates —
	 * the RND flow diagram includes `customer_ltv` in the very first INSERT,
	 * but that logic didn't exist yet when SubscriptionManager (Step 5) was
	 * built. Filled here rather than back in Step 5, since this is where the
	 * LTV formula now actually lives.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function on_activated( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( $subscription ) {
			$this->recalculate_ltv( $subscription );
		}
	}

	/**
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function on_payment_success( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return;
		}

		$delta = -15;

		// "every 12 renewals" — renewal_count was already incremented by
		// RenewalEngine::complete_renewal() before this hook fires, so a
		// fresh multiple of 12 here means the 12th/24th/36th/... renewal just happened.
		if ( (int) $subscription->renewal_count > 0 && 0 === (int) $subscription->renewal_count % 12 ) {
			$delta -= 5;
		}

		$this->adjust( $subscription, $delta, 'payment_success' );
		$this->recalculate_ltv( $subscription );
	}

	/**
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function on_payment_failed( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return;
		}

		// retry_count was already incremented (by RenewalEngine::mark_failed())
		// before this hook fires: 1 means this was the first failure this
		// cycle, anything higher means it's a dunning retry that also failed.
		$delta = (int) $subscription->retry_count > 1 ? 10 : 20;

		$this->adjust( $subscription, $delta, 'payment_failed' );
	}

	/**
	 * @since 1.0.0
	 * @param int         $subscription_id Subscription row ID.
	 * @param string|null $old_status      Status before the transition.
	 * @param string      $new_status      Status after the transition.
	 * @return void
	 */
	public function on_status_changed( int $subscription_id, ?string $old_status, string $new_status ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return;
		}

		if ( 'paused' === $new_status ) {
			$this->adjust( $subscription, 10, 'paused' );
			return;
		}

		// pending_cancel -> cancelled is the scheduled *finalization* of an
		// already-scored cancellation intent (scored when it first went to
		// pending_cancel) — don't double-count it as a second cancellation.
		if ( 'pending_cancel' === $new_status || ( 'cancelled' === $new_status && 'pending_cancel' !== $old_status ) ) {
			$this->adjust( $subscription, 30, 'cancelled' );
		}
	}

	/**
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function on_skipped( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( $subscription ) {
			$this->adjust( $subscription, 5, 'skip_next_cycle' );
		}
	}

	/**
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function on_plan_changed( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( $subscription ) {
			$this->recalculate_ltv( $subscription );
		}
	}

	// -----------------------------------------------------------------------
	// Scoring
	// -----------------------------------------------------------------------

	/**
	 * Apply a score delta, clamped to [0, 100], and log the change.
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @param int    $delta        Signed score change.
	 * @param string $reason       Reason slug, stored on the log entry.
	 * @return void
	 */
	private function adjust( object $subscription, int $delta, string $reason ): void {
		$before = (int) $subscription->churn_risk_score;
		$after  = max( 0, min( 100, $before + $delta ) );

		if ( $after === $before ) {
			return;
		}

		$this->subscriptions->update( (int) $subscription->id, array( 'churn_risk_score' => $after ) );

		$this->logs->log(
			(int) $subscription->id,
			'churn_score_updated',
			array( 'note' => "{$reason}: {$before} -> {$after} ({$delta}, band: " . self::band( $after ) . ')' )
		);
	}

	/**
	 * Map a churn risk score to its band. Boundaries (25/50/75) are exact
	 * per this step's checklist — must match whatever color-codes the same
	 * bands in the admin list (Frontend Phase 1/4, not built yet).
	 *
	 * @since 1.0.0
	 * @param int $score Churn risk score, 0-100.
	 * @return string One of 'low', 'medium', 'high', 'critical'.
	 */
	public static function band( int $score ): string {
		if ( $score <= self::BAND_LOW ) {
			return 'low';
		}
		if ( $score <= self::BAND_MEDIUM ) {
			return 'medium';
		}
		if ( $score <= self::BAND_HIGH ) {
			return 'high';
		}
		return 'critical';
	}

	// -----------------------------------------------------------------------
	// LTV
	// -----------------------------------------------------------------------

	/**
	 * Recalculate and persist the projected customer LTV.
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return void
	 */
	private function recalculate_ltv( object $subscription ): void {
		$monthly_equivalent = self::to_monthly_equivalent(
			(float) $subscription->recurring_amount,
			(int) $subscription->billing_interval,
			(string) $subscription->billing_period
		);

		$avg_lifetime_months = (int) get_option( 'purecart_sub_avg_lifetime_months', 24 );
		$ltv                 = $monthly_equivalent * $avg_lifetime_months;

		$this->subscriptions->update( (int) $subscription->id, array( 'customer_ltv' => round( $ltv, 2 ) ) );
	}

	/**
	 * Normalize a recurring amount to its monthly-equivalent rate.
	 *
	 * Public static as of Step 15: SubscriptionReport's MRR figure is defined
	 * (feature doc § 8) as "sum of normalized monthly-equivalent recurring
	 * revenue across active subs" — the exact same normalization this class
	 * already does for LTV. Shared rather than reimplemented so MRR and LTV
	 * can never drift apart, same reasoning as BillingClock's extraction in
	 * Step 6.
	 *
	 * @since 1.0.0
	 * @param float  $amount   Recurring amount per billing_interval.
	 * @param int    $interval Billing interval count.
	 * @param string $period   One of 'day', 'week', 'month', 'year'.
	 * @return float
	 */
	public static function to_monthly_equivalent( float $amount, int $interval, string $period ): float {
		$interval = max( 1, $interval );

		switch ( $period ) {
			case 'day':
				return $amount / $interval * ( 365 / 12 );
			case 'week':
				return $amount / $interval * ( 52 / 12 );
			case 'year':
				return $amount / ( $interval * 12 );
			case 'month':
			default:
				return $amount / $interval;
		}
	}
}

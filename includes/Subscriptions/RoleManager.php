<?php
/**
 * WP role assignment/removal across subscription lifecycle transitions
 * (feature doc "Role Mapping").
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Correction vs. RND-subscriptions.md's "Role Mapping" section (lines
 * 997-1008): that doc names per-product meta keys (`_purecart_sub_role_trial`,
 * etc.), but the project's own Configuration Options table — already
 * established as authoritative for every prior naming conflict in this
 * project — defines these as *global* WP options instead:
 * `purecart_sub_trial_role`, `purecart_sub_active_role`,
 * `purecart_sub_cancelled_role` (all default `''`, meaning "don't touch
 * roles"). Followed the options table here for the same reason as every
 * earlier reconciliation: one role scheme site-wide, not per-product UI that
 * was never built (Step 3 never added product fields for this).
 *
 * A customer can hold more than one subscription at once (to different
 * products). Since roles here are global, not per-product, removing a role
 * because *one* subscription ended must not strip access still earned by
 * *another* still-open subscription for the same customer — guarded by
 * user_still_needs_role() below.
 *
 * @since 1.0.0
 */
class RoleManager {

	/** Statuses that still justify holding the active role. */
	private const OPEN_STATUSES = array( 'active', 'trialing', 'past_due', 'paused', 'pending_cancel' );

	/** Statuses that end a subscription's role claim entirely. */
	private const ENDED_STATUSES = array( 'suspended', 'cancelled', 'expired' );

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->subscriptions = new SubscriptionRepository();

		add_action( 'purecart_subscription_activated', array( $this, 'on_activated' ) );
		add_action( 'purecart_subscription_status_changed', array( $this, 'on_status_changed' ), 10, 3 );
		add_action( 'purecart_subscription_resubscribed', array( $this, 'on_resubscribed' ) );
	}

	/**
	 * A brand-new subscription record — assign whichever role matches its
	 * starting status (trial role if it started trialing, active role if it
	 * started active with no trial).
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function on_activated( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return;
		}

		if ( 'trialing' === $subscription->status ) {
			$this->add_role( (int) $subscription->user_id, self::trial_role() );
		} elseif ( 'active' === $subscription->status ) {
			$this->add_role( (int) $subscription->user_id, self::active_role() );
		}
	}

	/**
	 * Every other transition (trial converts, suspend, cancel, expire, and —
	 * since RenewalEngine now fires this hook too, Step 14 gap-fill —
	 * past_due) runs through here.
	 *
	 * @since 1.0.0
	 * @param int    $subscription_id Subscription row ID.
	 * @param string $old_status      Status before the transition.
	 * @param string $new_status      Status after the transition.
	 * @return void
	 */
	public function on_status_changed( int $subscription_id, string $old_status, string $new_status ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return;
		}

		$user_id = (int) $subscription->user_id;

		// Trial converts to a real subscription.
		if ( 'trialing' === $old_status && 'active' === $new_status ) {
			$this->remove_role_if_unneeded( $user_id, self::trial_role(), $subscription_id );
			$this->add_role( $user_id, self::active_role() );
			return;
		}

		// Subscription ends outright — release trial/active, grant cancelled_role.
		if ( in_array( $new_status, self::ENDED_STATUSES, true ) ) {
			$this->remove_role_if_unneeded( $user_id, self::trial_role(), $subscription_id );
			$this->remove_role_if_unneeded( $user_id, self::active_role(), $subscription_id );
			$this->add_role( $user_id, self::cancelled_role() );
			return;
		}

		// Any other transition among "still open" statuses (e.g. past_due,
		// paused, pending_cancel) keeps whatever role the customer already
		// holds — the doc's table only calls out trial-conversion and the
		// three end states, nothing else changes roles.
	}

	/**
	 * Resubscribing (same-record or new-record path) re-grants the active
	 * role and clears the cancelled one.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function on_resubscribed( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return;
		}

		$user_id = (int) $subscription->user_id;

		$this->remove_role_if_unneeded( $user_id, self::cancelled_role(), $subscription_id );
		$this->add_role( $user_id, self::active_role() );
	}

	// -----------------------------------------------------------------------
	// Role helpers
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private static function trial_role(): string {
		return (string) get_option( 'purecart_sub_trial_role', '' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private static function active_role(): string {
		return (string) get_option( 'purecart_sub_active_role', '' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private static function cancelled_role(): string {
		return (string) get_option( 'purecart_sub_cancelled_role', '' );
	}

	/**
	 * @since 1.0.0
	 * @param int    $user_id WordPress user ID.
	 * @param string $role    Role slug; a blank string (unconfigured) is a no-op.
	 * @return void
	 */
	private function add_role( int $user_id, string $role ): void {
		if ( '' === $role || $user_id <= 0 ) {
			return;
		}

		$user = get_user_by( 'id', $user_id );
		if ( $user && ! $user->has_cap( $role ) ) {
			$user->add_role( $role );
		}
	}

	/**
	 * Remove $role from $user_id unless another still-open subscription
	 * (other than $excluding_subscription_id) would also claim it — e.g. a
	 * customer with two active subscriptions shouldn't lose the active role
	 * just because one of them was cancelled.
	 *
	 * @since 1.0.0
	 * @param int    $user_id                  WordPress user ID.
	 * @param string $role                     Role slug; a blank string (unconfigured) is a no-op.
	 * @param int    $excluding_subscription_id The subscription that just transitioned — never counts toward "still needs it".
	 * @return void
	 */
	private function remove_role_if_unneeded( int $user_id, string $role, int $excluding_subscription_id ): void {
		if ( '' === $role || $user_id <= 0 ) {
			return;
		}

		if ( $this->user_still_needs_role( $user_id, $role, $excluding_subscription_id ) ) {
			return;
		}

		$user = get_user_by( 'id', $user_id );
		if ( $user ) {
			$user->remove_role( $role );
		}
	}

	/**
	 * @since 1.0.0
	 * @param int    $user_id                  WordPress user ID.
	 * @param string $role                     Role slug being considered for removal.
	 * @param int    $excluding_subscription_id Subscription row ID to ignore when checking.
	 * @return bool
	 */
	private function user_still_needs_role( int $user_id, string $role, int $excluding_subscription_id ): bool {
		foreach ( $this->subscriptions->find_by_user( $user_id ) as $subscription ) {
			if ( (int) $subscription->id === $excluding_subscription_id ) {
				continue;
			}

			if ( 'trialing' === $subscription->status && $role === self::trial_role() ) {
				return true;
			}

			if ( in_array( $subscription->status, self::OPEN_STATUSES, true ) && $role === self::active_role() ) {
				return true;
			}
		}

		return false;
	}
}

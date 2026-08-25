<?php
/**
 * Cancellation retention flow: reason capture, eligible-offer matching, offer
 * acceptance (discount / pause / skip / downgrade / contact), and history.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Feature doc § 6 flow: customer clicks "Cancel" -> pick a reason -> shown an
 * offer matched to that reason -> accept (offer applied, cancel aborted) or
 * decline (cancellation proceeds). This class owns the reason list, offer
 * matching/eligibility, and acceptance side effects — the actual "customer
 * clicked cancel and got shown this modal" flow is Step 12 (REST) / Frontend
 * Phase 2's job; nothing here reads $_POST or renders anything.
 *
 * Scope note: offer definitions are global (WP options + filter), not the
 * per-product `_purecart_sub_retention_offers` JSON meta the RND doc
 * describes — Step 3 never built product-UI for that meta (deferred at the
 * time, "dead UI with nothing behind it"), and it still isn't built. Once the
 * Settings UI (Frontend Phase 5) exists to configure retention offers, this
 * class is where a per-product override would layer on top of these defaults.
 *
 * @since 1.0.0
 */
class RetentionFlow {

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

		add_filter( 'purecart_renewal_amount', array( $this, 'apply_active_discount' ), 10, 2 );
		add_action( 'purecart_subscription_renewed', array( $this, 'decrement_discount' ) );
	}

	// -----------------------------------------------------------------------
	// Reasons
	// -----------------------------------------------------------------------

	/**
	 * Admin-configurable cancellation reason list (feature doc § 6, Step 1).
	 *
	 * @since 1.0.0
	 * @return array<string, string> Reason slug => label.
	 */
	public function get_reasons(): array {
		/**
		 * Filters the cancellation reason list shown to a customer.
		 *
		 * @since 1.0.0
		 * @param array<string, string> $reasons Reason slug => label.
		 */
		return apply_filters(
			'purecart_retention_reasons',
			array(
				'too_expensive'    => __( 'Too expensive', 'purecart' ),
				'not_using'        => __( 'Not using it', 'purecart' ),
				'missing_features' => __( 'Missing features', 'purecart' ),
				'switching'        => __( 'Switching provider', 'purecart' ),
				'pausing'          => __( 'Pausing use for now', 'purecart' ),
				'other'            => __( 'Other', 'purecart' ),
			)
		);
	}

	// -----------------------------------------------------------------------
	// Offers
	// -----------------------------------------------------------------------

	/**
	 * The 5 offer types (feature doc § 6) with their default configuration.
	 * `trigger_reasons` empty = shown regardless of the selected reason.
	 *
	 * @since 1.0.0
	 * @return array<string, array<string, mixed>> Offer type => config.
	 */
	private function get_offer_definitions(): array {
		/**
		 * Filters the retention offers a cancelling customer can be shown.
		 *
		 * @since 1.0.0
		 * @param array<string, array<string, mixed>> $offers Offer type => config.
		 */
		return apply_filters(
			'purecart_retention_offers',
			array(
				'discount'  => array(
					'type'            => 'discount',
					'label'           => __( 'Get a discount', 'purecart' ),
					'percent'         => (float) Settings::get( OptionKeys::SUB_RETENTION_DISCOUNT_PERCENT, 20 ),
					'cycles'          => (int) Settings::get( OptionKeys::SUB_RETENTION_DISCOUNT_CYCLES, 3 ),
					'trigger_reasons' => array( 'too_expensive' ),
				),
				'pause'     => array(
					'type'            => 'pause',
					'label'           => __( 'Pause your subscription instead', 'purecart' ),
					'pause_days'      => (int) Settings::get( OptionKeys::SUB_RETENTION_PAUSE_DAYS, 30 ),
					'trigger_reasons' => array( 'not_using', 'pausing' ),
				),
				'skip'      => array(
					'type'            => 'skip',
					'label'           => __( 'Skip your next billing cycle', 'purecart' ),
					'trigger_reasons' => array( 'not_using', 'too_expensive' ),
				),
				'downgrade' => array(
					'type'            => 'downgrade',
					'label'           => __( 'Switch to a cheaper plan', 'purecart' ),
					'trigger_reasons' => array( 'too_expensive', 'missing_features' ),
				),
				'contact'   => array(
					'type'            => 'contact',
					'label'           => __( 'Talk to us first', 'purecart' ),
					'url'             => (string) Settings::get( OptionKeys::SUB_RETENTION_CONTACT_URL, '' ),
					'trigger_reasons' => array(), // fallback — eligible for any reason.
				),
			)
		);
	}

	/**
	 * Offers eligible for this subscription + cancellation reason.
	 *
	 * @since 1.0.0
	 * @param int    $subscription_id Subscription row ID.
	 * @param string $reason          Reason slug from get_reasons().
	 * @return array<int, array<string, mixed>> Eligible offer configs, in definition order.
	 */
	public function get_eligible_offers( int $subscription_id, string $reason ): array {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return array();
		}

		if ( 'no' === $this->product_meta( $subscription, '_purecart_sub_retention_enabled', 'yes' ) ) {
			return array();
		}

		$eligible = array();

		foreach ( $this->get_offer_definitions() as $offer ) {
			if ( $this->is_eligible( $subscription, $offer, $reason ) ) {
				$eligible[] = $offer;
			}
		}

		return $eligible;
	}

	/**
	 * Eligibility rule set from feature doc § 6 (inspired by ArraySubs).
	 *
	 * @since 1.0.0
	 * @param object               $subscription Subscription row.
	 * @param array<string, mixed> $offer        Offer config.
	 * @param string               $reason       Selected cancellation reason.
	 * @return bool
	 */
	private function is_eligible( object $subscription, array $offer, string $reason ): bool {
		if ( ! empty( $offer['trigger_reasons'] ) && ! in_array( $reason, $offer['trigger_reasons'], true ) ) {
			return false;
		}

		if ( isset( $offer['min_subscription_age_days'] ) ) {
			$age_days = ( BillingClock::now_dt()->getTimestamp() - BillingClock::to_dt( $subscription->starts_at )->getTimestamp() ) / DAY_IN_SECONDS;
			if ( $age_days < (int) $offer['min_subscription_age_days'] ) {
				return false;
			}
		}

		if ( isset( $offer['min_subscription_value'] ) && (float) $subscription->recurring_amount < (float) $offer['min_subscription_value'] ) {
			return false;
		}

		if ( isset( $offer['max_subscription_value'] ) && (float) $subscription->recurring_amount > (float) $offer['max_subscription_value'] ) {
			return false;
		}

		if ( isset( $offer['min_user_total_value'] ) || isset( $offer['max_user_total_value'] ) ) {
			$total_spent = function_exists( 'wc_get_customer_total_spent' ) ? (float) wc_get_customer_total_spent( (int) $subscription->user_id ) : 0.0;

			if ( isset( $offer['min_user_total_value'] ) && $total_spent < (float) $offer['min_user_total_value'] ) {
				return false;
			}
			if ( isset( $offer['max_user_total_value'] ) && $total_spent > (float) $offer['max_user_total_value'] ) {
				return false;
			}
		}

		if ( ( isset( $offer['min_remaining_days'] ) || isset( $offer['max_remaining_days'] ) ) && $subscription->next_payment_at ) {
			$remaining_days = ( BillingClock::to_dt( $subscription->next_payment_at )->getTimestamp() - BillingClock::now_dt()->getTimestamp() ) / DAY_IN_SECONDS;

			if ( isset( $offer['min_remaining_days'] ) && $remaining_days < (int) $offer['min_remaining_days'] ) {
				return false;
			}
			if ( isset( $offer['max_remaining_days'] ) && $remaining_days > (int) $offer['max_remaining_days'] ) {
				return false;
			}
		}

		if ( ! empty( $offer['product_ids'] ) && ! in_array( (int) $subscription->product_id, array_map( 'intval', (array) $offer['product_ids'] ), true ) ) {
			return false;
		}

		// One-time-use guard — a discount offer already accepted for this
		// subscription is never shown again (feature doc § 6).
		if ( 'discount' === $offer['type'] && $this->has_used_discount_offer( (int) $subscription->id ) ) {
			return false;
		}

		// A downgrade offer needs somewhere configured to downgrade *to*.
		if ( 'downgrade' === $offer['type'] && null === $this->get_downgrade_product_id( $subscription ) ) {
			return false;
		}

		return true;
	}

	/**
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return bool
	 */
	private function has_used_discount_offer( int $subscription_id ): bool {
		foreach ( $this->logs->find_by_subscription( $subscription_id ) as $log ) {
			if ( 'retention_offer_accepted' === $log->event && false !== stripos( (string) $log->note, 'type=discount' ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The configured downgrade target for this subscription's product, if any.
	 *
	 * Reads `_purecart_sub_downgrade_products` product meta — documented in
	 * RND-subscriptions.md's Product Meta Fields table, but Step 3 never built
	 * admin UI for it (a multi-product picker, deferred as out of scope at the
	 * time). Reading it here doesn't require the UI to exist yet; it just
	 * means this offer stays ineligible (see is_eligible() above) until a
	 * merchant sets it — e.g. directly via `update_post_meta()` — or the
	 * Settings UI adds a picker for it.
	 *
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return int|null
	 */
	private function get_downgrade_product_id( object $subscription ): ?int {
		$configured = $this->product_meta( $subscription, '_purecart_sub_downgrade_products', '' );
		if ( '' === $configured ) {
			return null;
		}

		$ids = array_filter( array_map( 'absint', (array) json_decode( (string) $configured, true ) ) );

		return ! empty( $ids ) ? (int) reset( $ids ) : null;
	}

	/**
	 * @since 1.0.0
	 * @param object $subscription  Subscription row.
	 * @param string $meta_key      Product meta key.
	 * @param string $default_value Fallback if the product/meta doesn't exist.
	 * @return string
	 */
	private function product_meta( object $subscription, string $meta_key, string $default_value ): string {
		$product = wc_get_product( (int) $subscription->product_id );
		if ( ! $product ) {
			return $default_value;
		}

		$value = $product->get_meta( $meta_key );
		return '' === $value ? $default_value : (string) $value;
	}

	// -----------------------------------------------------------------------
	// Acceptance
	// -----------------------------------------------------------------------

	/**
	 * Accept a retention offer — applies it and aborts the cancellation.
	 *
	 * @since 1.0.0
	 * @param int    $subscription_id Subscription row ID.
	 * @param string $offer_type      One of 'discount', 'pause', 'skip', 'downgrade', 'contact'.
	 * @param string $reason          The cancellation reason that was selected.
	 * @return true|\WP_Error
	 */
	public function accept_offer( int $subscription_id, string $offer_type, string $reason ) {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription ) {
			return new \WP_Error( 'purecart_not_found', __( 'Subscription not found.', 'purecart' ) );
		}

		$offer = null;
		foreach ( $this->get_eligible_offers( $subscription_id, $reason ) as $candidate ) {
			if ( $candidate['type'] === $offer_type ) {
				$offer = $candidate;
				break;
			}
		}

		if ( ! $offer ) {
			$definitions = $this->get_offer_definitions();
			if ( isset( $definitions[ $offer_type ] ) ) {
				$offer = $definitions[ $offer_type ];
			}
		}

		if ( ! $offer ) {
			return new \WP_Error( 'purecart_offer_not_eligible', __( 'This offer is not available for this subscription.', 'purecart' ) );
		}

		$result = $this->apply_offer( $subscription, $offer );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$this->logs->log(
			$subscription_id,
			'retention_offer_accepted',
			array( 'note' => "type={$offer_type}, reason={$reason}" )
		);

		do_action( 'purecart_retention_offer_accepted', $subscription_id, $offer_type, $reason );

		return true;
	}

	/**
	 * @since 1.0.0
	 * @param object               $subscription Subscription row.
	 * @param array<string, mixed> $offer        Offer config from get_offer_definitions().
	 * @return true|\WP_Error
	 */
	private function apply_offer( object $subscription, array $offer ) {
		switch ( $offer['type'] ) {
			case 'discount':
				$this->subscriptions->update(
					(int) $subscription->id,
					array(
						'discount_percent'            => $offer['percent'],
						'discount_renewals_remaining' => $offer['cycles'],
					)
				);
				return true;

			case 'pause':
				$resume_at = BillingClock::add_interval( current_time( 'mysql' ), (int) $offer['pause_days'], 'day' );
				( new SubscriptionManager() )->pause( (int) $subscription->id, $resume_at );
				return true;

			case 'skip':
				( new SubscriptionManager() )->skip( (int) $subscription->id );
				return true;

			case 'downgrade':
				$downgrade_product_id = $this->get_downgrade_product_id( $subscription );
				if ( null === $downgrade_product_id ) {
					return new \WP_Error( 'purecart_no_downgrade_option', __( 'No downgrade plan is configured for this product.', 'purecart' ) );
				}

				// Deliberately NOT immediate — status/price stay exactly as they
				// are; RenewalEngine::maybe_apply_pending_switch() applies this
				// at the next renewal (feature doc § 6, "Downgrade-as-retention-offer").
				$this->subscriptions->update(
					(int) $subscription->id,
					array(
						'pending_switch_product' => $downgrade_product_id,
						'pending_switch_type'    => 'downgrade',
					)
				);

				do_action( 'purecart_subscription_downgrade_scheduled', (int) $subscription->id, $downgrade_product_id );
				return true;

			case 'contact':
				// No subscription state changes — the frontend redirects to
				// $offer['url']; logging the acceptance below is all this needs.
				return true;

			default:
				return new \WP_Error( 'purecart_unknown_offer', __( 'Unknown offer type.', 'purecart' ) );
		}
	}

	// -----------------------------------------------------------------------
	// Active discount (applied via filter on every renewal while it lasts)
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @param float  $amount       Amount computed so far.
	 * @param object $subscription Subscription row.
	 * @return float
	 */
	public function apply_active_discount( float $amount, object $subscription ): float {
		if ( $subscription->discount_percent && (int) $subscription->discount_renewals_remaining > 0 ) {
			$amount -= $amount * ( (float) $subscription->discount_percent / 100 );
		}

		return round( $amount, 2 );
	}

	/**
	 * Count down an active discount's remaining cycles after each successful
	 * renewal, clearing it once exhausted.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function decrement_discount( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || ! $subscription->discount_renewals_remaining ) {
			return;
		}

		$remaining = max( 0, (int) $subscription->discount_renewals_remaining - 1 );
		$update    = array( 'discount_renewals_remaining' => $remaining );

		if ( 0 === $remaining ) {
			$update['discount_percent'] = null;
		}

		$this->subscriptions->update( $subscription_id, $update );
	}
}

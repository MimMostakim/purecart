<?php
/**
 * Subscription-scoped coupons: sign-up-fee-only discount + recurring-fee
 * discount for the first N renewals (or forever) — feature doc § 3/§ 20.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Correction vs. the plan's literal wording ("custom WC coupon discount
 * types"): WooCommerce's real discount engine (`WC_Discounts::apply_coupon()`,
 * checked against the installed WooCommerce version) switches strictly on
 * `percent` / `fixed_product` / `fixed_cart` — an unrecognized custom
 * `discount_type` value is never routed to any calculation method at all, so
 * registering brand-new discount type slugs (via `woocommerce_coupon_discount_types`
 * alone) would silently produce a coupon that always discounts $0. Built
 * instead as a *scope* on top of an ordinary native coupon type: the admin
 * still picks percent/fixed_product/fixed_cart as usual, and additionally
 * flags the coupon (on its own "Usage restriction" panel) as one of
 * PureCart's two subscription scopes. That flag is read by:
 *  - `cap_signup_fee_discount()`, hooked to `woocommerce_coupon_get_discount_amount`
 *    (confirmed to fire from all three native calculation paths) — caps the
 *    coupon's normal discount to the item's sign-up-fee component.
 *  - `apply_recurring_coupon_from_order()`, hooked to
 *    `purecart_subscription_activated` — for the recurring-fee scope, stores
 *    an equivalent `discount_percent`/`discount_renewals_remaining` pair on
 *    the new subscription record, reusing the exact mechanism RetentionFlow
 *    (Step 9) already established for the `purecart_renewal_amount` filter.
 *    The coupon's *own* native discount already correctly reduced the
 *    initial order total — nothing extra needed there.
 *
 * @since 1.0.0
 */
class SubscriptionCoupon {

	/** Coupon meta value: discounts only the sign-up fee portion, initial order only. */
	public const SCOPE_SIGNUP_FEE = 'signup_fee';

	/** Coupon meta value: discounts the recurring amount for N renewals (or forever). */
	public const SCOPE_RECURRING_FEE = 'recurring_fee';

	/** Sentinel stored in `discount_renewals_remaining` for "forever" — that column has no separate boolean for it (Schema.php, Step 1/9) and adding one for a single coupon feature wasn't judged worth a schema change. SMALLINT UNSIGNED max is 65535, so this is nowhere near overflowing. */
	private const FOREVER_SENTINEL = 32000;

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

		add_action( 'woocommerce_coupon_options_usage_restriction', array( $this, 'render_scope_fields' ), 10, 2 );
		add_action( 'woocommerce_coupon_options_save', array( $this, 'save_scope_fields' ), 10, 2 );
		add_filter( 'woocommerce_coupon_get_discount_amount', array( $this, 'cap_signup_fee_discount' ), 10, 5 );
		add_action( 'purecart_subscription_activated', array( $this, 'apply_recurring_coupon_from_order' ) );
	}

	// -----------------------------------------------------------------------
	// Coupon edit screen — scope + cycles fields
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @param int        $coupon_id Coupon post ID.
	 * @param \WC_Coupon $coupon    Coupon object.
	 * @return void
	 */
	public function render_scope_fields( int $coupon_id, \WC_Coupon $coupon ): void {
		echo '<div class="options_group">';

		woocommerce_wp_select(
			array(
				'id'          => 'purecart_coupon_scope',
				'label'       => __( 'PureCart subscription scope', 'purecart' ),
				'value'       => get_post_meta( $coupon_id, '_purecart_coupon_scope', true ) ?: '',
				'options'     => array(
					''                        => __( 'Not a subscription coupon (normal behaviour)', 'purecart' ),
					self::SCOPE_SIGNUP_FEE    => __( 'Sign-up fee only (first order)', 'purecart' ),
					self::SCOPE_RECURRING_FEE => __( 'Recurring fee (renewals)', 'purecart' ),
				),
				'description' => __( 'Only applies to PureCart subscription products; ignored on any other product.', 'purecart' ),
				'desc_tip'    => true,
			)
		);

		woocommerce_wp_text_input(
			array(
				'id'                => 'purecart_coupon_cycles',
				'label'             => __( 'Applies for how many renewals', 'purecart' ),
				'type'              => 'number',
				'custom_attributes' => array(
					'min'  => '0',
					'step' => '1',
				),
				'value'             => get_post_meta( $coupon_id, '_purecart_coupon_cycles', true ) ?: '0',
				'description'       => __( 'Only used for the "Recurring fee" scope. 0 = applies forever.', 'purecart' ),
				'desc_tip'          => true,
			)
		);

		echo '</div>';
	}

	/**
	 * @since 1.0.0
	 * @param int        $post_id Coupon post ID.
	 * @param \WC_Coupon $coupon  Coupon object.
	 * @return void
	 */
	public function save_scope_fields( int $post_id, \WC_Coupon $coupon ): void {
		// Defense-in-depth, matching SubscriptionProduct::save_meta(). Verified
		// against the installed WooCommerce: `woocommerce_coupon_options_save`
		// is dispatched by WC_Meta_Box_Coupon_Data::save(), reachable only via
		// WC_Admin_Meta_Boxes::save_meta_boxes(), which checks the
		// `woocommerce_save_data` nonce and `current_user_can( 'edit_post' )`
		// first — so this cannot currently be reached without both. Re-checked
		// here so the method doesn't silently become an unauthenticated write
		// if it's ever hooked somewhere else.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		if ( isset( $_POST['purecart_coupon_scope'] ) ) {
			$scope = sanitize_text_field( wp_unslash( $_POST['purecart_coupon_scope'] ) );
			$scope = in_array( $scope, array( self::SCOPE_SIGNUP_FEE, self::SCOPE_RECURRING_FEE ), true ) ? $scope : '';
			update_post_meta( $post_id, '_purecart_coupon_scope', $scope );
		}

		if ( isset( $_POST['purecart_coupon_cycles'] ) ) {
			update_post_meta( $post_id, '_purecart_coupon_cycles', absint( wp_unslash( $_POST['purecart_coupon_cycles'] ) ) );
		}
	}

	// -----------------------------------------------------------------------
	// Sign-up-fee scope — cap the coupon's own discount at checkout
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @param float      $discount           Discount computed so far by WC's native percent/fixed logic.
	 * @param float      $discounting_amount Price being discounted.
	 * @param mixed      $cart_item          Cart item array (`['data' => WC_Product, ...]`) or order item object, depending on context.
	 * @param bool       $single             Whether this is a single-item calculation.
	 * @param \WC_Coupon $coupon             The coupon being applied.
	 * @return float
	 */
	public function cap_signup_fee_discount( float $discount, float $discounting_amount, $cart_item, bool $single, \WC_Coupon $coupon ): float {
		if ( self::SCOPE_SIGNUP_FEE !== get_post_meta( $coupon->get_id(), '_purecart_coupon_scope', true ) ) {
			return $discount;
		}

		$product = $this->product_from_item( $cart_item );
		if ( ! $product || SubscriptionProduct::TYPE !== $product->get_type() ) {
			// This coupon scope only ever discounts subscription products —
			// applying it to anything else would discount an unrelated item
			// by a "sign-up fee" that doesn't exist on it.
			return 0.0;
		}

		$signup_fee = (float) wc_format_decimal( $product->get_meta( '_purecart_sub_signup_fee' ) );

		return min( $discount, $signup_fee );
	}

	/**
	 * @since 1.0.0
	 * @param mixed $item Cart item array or order item object.
	 * @return \WC_Product|null
	 */
	private function product_from_item( $item ): ?\WC_Product {
		if ( is_array( $item ) && isset( $item['data'] ) && $item['data'] instanceof \WC_Product ) {
			return $item['data'];
		}

		if ( is_object( $item ) && method_exists( $item, 'get_product' ) ) {
			$product = $item->get_product();
			return $product instanceof \WC_Product ? $product : null;
		}

		return null;
	}

	// -----------------------------------------------------------------------
	// Recurring-fee scope — carry the discount forward onto future renewals
	// -----------------------------------------------------------------------

	/**
	 * On a brand-new subscription, check whether its originating order used a
	 * recurring-fee-scoped coupon and, if so, seed `discount_percent` /
	 * `discount_renewals_remaining` so RenewalEngine's `purecart_renewal_amount`
	 * filter (via RetentionFlow's existing listener, Step 9) discounts the
	 * next N renewals automatically. Only one discount "slot" exists per
	 * subscription — if a retention offer later grants its own discount, that
	 * overwrites this one; an acceptable, disclosed simplification rather
	 * than adding a second schema column for a rarely-overlapping case.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	public function apply_recurring_coupon_from_order( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || ! $subscription->order_id ) {
			return;
		}

		$order = wc_get_order( (int) $subscription->order_id );
		if ( ! $order ) {
			return;
		}

		foreach ( $order->get_coupon_codes() as $code ) {
			$coupon = new \WC_Coupon( $code );

			if ( self::SCOPE_RECURRING_FEE !== get_post_meta( $coupon->get_id(), '_purecart_coupon_scope', true ) ) {
				continue;
			}

			$percent_off = $this->coupon_amount_as_percent( $coupon, (float) $subscription->recurring_amount );
			if ( $percent_off <= 0.0 ) {
				continue;
			}

			$cycles = $this->coupon_cycles( $coupon );

			$this->subscriptions->update(
				$subscription_id,
				array(
					'discount_percent'            => $percent_off,
					'discount_renewals_remaining' => $cycles,
				)
			);

			$this->logs->log(
				$subscription_id,
				'coupon_applied',
				array( 'note' => "recurring_fee coupon '{$code}' applied: {$percent_off}% off for " . ( $cycles >= self::FOREVER_SENTINEL ? 'all future renewals' : "{$cycles} renewal(s)" ) )
			);

			// Only one recurring-fee coupon is meaningful per subscription —
			// stop at the first one found rather than letting a later coupon
			// silently overwrite it within the same order.
			break;
		}
	}

	/**
	 * Converts a coupon's native amount (a flat currency value for
	 * fixed_product/fixed_cart, or already a percent for `percent`) into the
	 * equivalent percent-off, since that's what the shared
	 * discount_percent/renewal_amount mechanism (Step 9) expects.
	 *
	 * @since 1.0.0
	 * @param \WC_Coupon $coupon           The coupon.
	 * @param float      $recurring_amount The subscription's recurring amount.
	 * @return float
	 */
	private function coupon_amount_as_percent( \WC_Coupon $coupon, float $recurring_amount ): float {
		if ( $recurring_amount <= 0 ) {
			return 0.0;
		}

		if ( 'percent' === $coupon->get_discount_type() ) {
			return round( min( 100, (float) $coupon->get_amount() ), 2 );
		}

		return round( min( 100, ( (float) $coupon->get_amount() / $recurring_amount ) * 100 ), 2 );
	}

	/**
	 * @since 1.0.0
	 * @param \WC_Coupon $coupon The coupon.
	 * @return int
	 */
	private function coupon_cycles( \WC_Coupon $coupon ): int {
		$configured = (int) get_post_meta( $coupon->get_id(), '_purecart_coupon_cycles', true );
		return $configured > 0 ? $configured : self::FOREVER_SENTINEL;
	}
}

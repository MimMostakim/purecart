<?php
/**
 * WC_Product subclass for the "PureCart – Subscription" product type.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Fixes a real bug found via live testing: `SubscriptionProduct` used to map
 * `purecart_subscription` products to plain `\WC_Product_Simple` (mirroring
 * `PureCart\Commerce\ProductTypes`' existing pattern for License/SaaS/Bundle).
 * That doesn't work for type detection — `WC_Product_Simple::get_type()` is
 * hardcoded to always return `'simple'`, regardless of the actual
 * `product_type` taxonomy term. Every `$product->get_type() === '...'` check
 * elsewhere in this module (SubscriptionManager::maybe_create_from_order(),
 * for one) would silently never match.
 *
 * Extending `WC_Product_Simple` and overriding just `get_type()` is the
 * standard WooCommerce pattern for this (WooCommerce Subscriptions itself
 * does the same thing for its own `WC_Product_Subscription` class) — keeps
 * every other Simple-product behavior (stock, pricing display, purchasability)
 * while making the type self-report correctly.
 *
 * @since 1.0.0
 */
class SubscriptionProductType extends \WC_Product_Simple {

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_type() {
		return SubscriptionProduct::TYPE;
	}
}

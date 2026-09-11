<?php
/**
 * WC_Product subclass for the "PureCart – Plugin" product type.
 *
 * @package PureCart\Commerce
 */

declare( strict_types=1 );

namespace PureCart\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * Fixes the same bug `Subscriptions\SubscriptionProductType` documents:
 * mapping `purecart_plugin` products to plain `\WC_Product_Simple` doesn't
 * work for type detection — `WC_Product_Simple::get_type()` is hardcoded to
 * always return `'simple'`, and WooCommerce re-derives and rewrites the
 * `product_type` taxonomy term from `$product->get_type()` on every save.
 * The taxonomy term set when the dropdown says "PureCart – Plugin" was
 * silently overwritten back to `simple` on the very next save, so every
 * `$product->get_type() === 'purecart_plugin'` check in OrderHandler,
 * ProductUpdatesTab, etc. would never match.
 *
 * Extending `WC_Product_Simple` and overriding just `get_type()` keeps
 * every other Simple-product behavior (stock, pricing, purchasability)
 * while making the type self-report correctly — the standard WooCommerce
 * pattern (WooCommerce Subscriptions does the same for its own product class).
 *
 * @since 1.0.0
 */
class PluginProductType extends \WC_Product_Simple {

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_type() {
		return ProductTypes::TYPE_PLUGIN;
	}
}

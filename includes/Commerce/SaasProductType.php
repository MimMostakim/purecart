<?php
/**
 * WC_Product subclass for the "PureCart – SaaS" product type.
 *
 * @package PureCart\Commerce
 */

declare( strict_types=1 );

namespace PureCart\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * See PluginProductType's docblock for the bug this fixes — same root
 * cause, confirmed live for this type specifically: a `purecart_saas`
 * order never reached `AccountProvisioner::provision_for_order_item()`
 * because `$product->get_type()` reported `'simple'`, not `'purecart_saas'`,
 * once the product had been saved through the (buggy) shared
 * `WC_Product_Simple` mapping.
 *
 * @since 1.0.0
 */
class SaasProductType extends \WC_Product_Simple {

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_type() {
		return ProductTypes::TYPE_SAAS;
	}
}

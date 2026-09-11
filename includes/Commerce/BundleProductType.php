<?php
/**
 * WC_Product subclass for the "PureCart – Bundle" product type.
 *
 * @package PureCart\Commerce
 */

declare( strict_types=1 );

namespace PureCart\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * See PluginProductType's docblock for the bug this fixes.
 *
 * @since 1.0.0
 */
class BundleProductType extends \WC_Product_Simple {

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_type() {
		return ProductTypes::TYPE_BUNDLE;
	}
}

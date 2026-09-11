<?php
/**
 * Registers PureCart WooCommerce product types.
 *
 * Slugs: purecart_plugin | purecart_saas | purecart_bundle
 *
 * @package PureCart\Commerce
 */

declare( strict_types=1 );

namespace PureCart\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * Registers three custom WooCommerce product types.
 */
class ProductTypes {

	public const TYPE_PLUGIN = 'purecart_plugin';
	public const TYPE_SAAS   = 'purecart_saas';
	public const TYPE_BUNDLE = 'purecart_bundle';

	/**
	 * Register product type hooks.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_filter( 'product_type_selector', array( $this, 'add_types' ) );
		add_action( 'woocommerce_product_class', array( $this, 'product_class' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_type_js' ) );
	}

	/**
	 * Add PureCart product types to the WooCommerce product type selector.
	 *
	 * @since  1.0.0
	 * @param  array<string,string> $types Existing product type slug => label pairs.
	 * @return array<string,string>
	 */
	public function add_types( array $types ): array {
		$types[ self::TYPE_PLUGIN ] = __( 'PureCart – Plugin', 'purecart' );
		$types[ self::TYPE_SAAS ]   = __( 'PureCart – SaaS', 'purecart' );
		$types[ self::TYPE_BUNDLE ] = __( 'PureCart – Bundle', 'purecart' );
		return $types;
	}

	/**
	 * Map each PureCart product type to its own WC_Product_Simple subclass.
	 *
	 * Not the literal `WC_Product_Simple::class` for all three — see
	 * PluginProductType's docblock. `WC_Product_Simple::get_type()` is
	 * hardcoded to always return 'simple', and WooCommerce re-derives and
	 * rewrites the `product_type` taxonomy term from `$product->get_type()`
	 * on every save, so mapping to the shared class silently reverted every
	 * PureCart product to a plain "simple" product on its next save —
	 * confirmed live: `purecart_saas` orders never reached
	 * `AccountProvisioner::provision_for_order_item()` because of this.
	 *
	 * @since  1.0.0
	 * @param  string $classname    The default WooCommerce product class name.
	 * @param  string $product_type The product type slug.
	 * @return string
	 */
	public function product_class( string $classname, string $product_type ): string {
		return match ( $product_type ) {
			self::TYPE_PLUGIN => PluginProductType::class,
			self::TYPE_SAAS   => SaasProductType::class,
			self::TYPE_BUNDLE => BundleProductType::class,
			default           => $classname,
		};
	}

	/**
	 * Inline JS on the product edit screen to hide the Shipping tab and show
	 * pricing fields for PureCart types.
	 *
	 * WooCommerce's own show_if_simple / show_if_variable etc. field
	 * toggling only recognizes the literal value of the #product-type
	 * select — it doesn't know product_class() mapped our custom types to
	 * WC_Product_Simple under the hood, so it leaves every `.show_if_simple`
	 * field (Regular price, Sale price, tax status/class) hidden for
	 * purecart_plugin/purecart_saas/purecart_bundle. This forces those
	 * fields visible again after WooCommerce's own handler runs, the same
	 * way it already forces the Shipping tab hidden.
	 *
	 * @since  1.0.0
	 * @param  string $hook Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_type_js( string $hook ): void {
		if ( 'post.php' !== $hook && 'post-new.php' !== $hook ) {
			return;
		}

		global $post;
		if ( ! $post || 'product' !== $post->post_type ) {
			return;
		}

		$purecart_types = wp_json_encode( array( self::TYPE_PLUGIN, self::TYPE_SAAS, self::TYPE_BUNDLE ) );

		wp_add_inline_script(
			'woocommerce_admin',
			sprintf(
				'(function($){
                    var purecartTypes = %s;
                    function purecartToggle(type) {
                        if (purecartTypes.indexOf(type) > -1) {
                            $(".shipping_tab").hide();
                            $(".show_if_simple").show();
                            // WooCommerce own change handler runs first (bound
                            // before this one) and, seeing every .options_group in
                            // the General panel hidden at that moment, hides the
                            // General tab list item itself via its hide-empty-
                            // tabs pass, before the .show() above ever runs.
                            // Un-hiding the pricing fields alone does not bring
                            // the tab link back, so force it visible here too.
                            $(".general_tab").show();
                        } else {
                            $(".shipping_tab").show();
                        }
                    }
                    $("select#product-type").on("change", function(){
                        purecartToggle($(this).val());
                    });
                    purecartToggle($("select#product-type").val());
                })(jQuery);',
				$purecart_types
			)
		);
	}
}

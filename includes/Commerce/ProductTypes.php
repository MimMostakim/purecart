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
		add_filter( 'product_type_options', array( $this, 'type_options' ) );
		add_filter( 'woocommerce_product_data_tabs', array( $this, 'data_tabs' ) );
		add_action( 'woocommerce_product_class', array( $this, 'product_class' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_type_js' ) );
	}

	/**
	 * Show WooCommerce's General tab for PureCart product types.
	 *
	 * The tab holds the price fields and the Downloadable files repeater, so
	 * without it a PureCart product cannot be priced or given a file. Its own
	 * class list carries no `show_if_*` rule that matches a custom type, and
	 * WooCommerce's toggle script only reveals what matches
	 * `.show_if_{product_type}` — so the type's class has to be added here.
	 *
	 * @since  1.0.0
	 * @param  array<string, array<string, mixed>> $tabs Registered product data tabs.
	 * @return array<string, array<string, mixed>>
	 */
	public function data_tabs( array $tabs ): array {
		if ( ! isset( $tabs['general'] ) ) {
			return $tabs;
		}

		$classes = isset( $tabs['general']['class'] ) ? (array) $tabs['general']['class'] : array();

		foreach ( array( self::TYPE_PLUGIN, self::TYPE_SAAS, self::TYPE_BUNDLE ) as $type ) {
			$classes[] = 'show_if_' . $type;
		}

		$tabs['general']['class'] = array_values( array_unique( $classes ) );

		return $tabs;
	}

	/**
	 * Show the Virtual and Downloadable checkboxes for PureCart product types.
	 *
	 * WooCommerce ships both checkboxes wrapped in `show_if_simple`, so
	 * selecting any custom product type hides them — and with the Downloadable
	 * checkbox hidden there is no way to attach files, which leaves a PureCart
	 * plugin product with nothing for the Secure Downloads module to protect.
	 * Adding the type's own `show_if_*` class puts them back; the "Downloadable
	 * files" panel then follows WooCommerce's own checkbox-driven toggle.
	 *
	 * @since  1.0.0
	 * @param  array<string, array<string, mixed>> $options WooCommerce product type option rows.
	 * @return array<string, array<string, mixed>>
	 */
	public function type_options( array $options ): array {
		$extra = ' show_if_' . self::TYPE_PLUGIN . ' show_if_' . self::TYPE_BUNDLE;

		foreach ( array( 'virtual', 'downloadable' ) as $key ) {
			if ( ! isset( $options[ $key ] ) ) {
				continue;
			}

			$options[ $key ]['wrapper_class'] = trim( (string) ( $options[ $key ]['wrapper_class'] ?? '' ) . $extra );
		}

		return $options;
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
	 * Map PureCart product types to WC_Product_Simple so WooCommerce handles them correctly.
	 *
	 * @since  1.0.0
	 * @param  string $classname    The default WooCommerce product class name.
	 * @param  string $product_type The product type slug.
	 * @return string
	 */
	public function product_class( string $classname, string $product_type ): string {
		if ( in_array( $product_type, array( self::TYPE_PLUGIN, self::TYPE_SAAS, self::TYPE_BUNDLE ), true ) ) {
			return \WC_Product_Simple::class;
		}
		return $classname;
	}

	/**
	 * Register the product-type toggle script for product edit screens only.
	 *
	 * Printed in the footer rather than attached with `wp_add_inline_script(
	 * 'woocommerce_admin', ... )`: that handle has to already be registered
	 * when this hook fires, and every other inline script queued against it
	 * gets concatenated into the same block, so one unrelated error takes the
	 * whole thing down. A footer-printed, jQuery-ready-wrapped script depends
	 * only on jQuery, which the admin always loads. Same reasoning as
	 * {@see \PureCart\Subscriptions\SubscriptionProduct::enqueue_toggle_script()}.
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

		add_action( 'admin_footer', array( $this, 'print_type_script' ) );
	}

	/**
	 * Print the product-type toggle script.
	 *
	 * Two adjustments WooCommerce's own markup cannot express for a custom
	 * product type: the Shipping tab is meaningless for digital goods, and the
	 * pricing group is hard-coded to `show_if_simple show_if_external`, which
	 * would leave a PureCart product with no price field at all.
	 *
	 * Bound to `woocommerce-product-type-change`, which WooCommerce fires
	 * *after* its own show/hide pass, so these overrides land last. Nothing is
	 * forced back on for non-PureCart types — WooCommerce's own pass already
	 * restores them, and second-guessing it here would wrongly reveal shipping
	 * on a virtual product.
	 *
	 * The type list is the only interpolated value and comes from class
	 * constants, so there is no user-supplied data in this output.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function print_type_script(): void {
		$purecart_types = wp_json_encode( array( self::TYPE_PLUGIN, self::TYPE_SAAS, self::TYPE_BUNDLE ) );
		?>
		<script>
		jQuery( function ( $ ) {
			var purecartTypes = <?php echo $purecart_types; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode() of a fixed array of class constants. ?>;

			function purecartToggle() {
				var type = $( 'select#product-type' ).val();

				if ( purecartTypes.indexOf( type ) === -1 ) {
					return;
				}

				$( '.shipping_tab' ).hide();
				$( '.options_group.pricing' ).removeClass( 'hidden' ).show();
			}

			$( document.body ).on( 'woocommerce-product-type-change', purecartToggle );
			purecartToggle();
		} );
		</script>
		<?php
	}
}

<?php
/**
 * Registers the "PureCart – Subscription" WooCommerce product type.
 *
 * Mirrors PureCart\Commerce\ProductTypes' pattern (product_type_selector +
 * woocommerce_product_class), but uses WooCommerce's native product-data-tab
 * system for its own fields instead of the flat classic meta box that
 * PureCart\Admin\Admin uses for License/SaaS fields — a tab is the correct
 * fit here since WC auto show/hides it (`show_if_purecart_subscription`)
 * based on the selected product type, no custom JS required for that part.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Product type registration, data tab, and meta save for subscription products.
 *
 * Only the core billing fields + delivery type are implemented here (Step 3
 * scope). Deferred to the steps that actually consume them: stepped pricing UI
 * (RenewalEngine, Step 6), retention config (RetentionFlow, Step 9), split
 * payment fields (SplitPaymentManager, Step 11), Subscribe & Save / downgrade
 * product picker (also Step 9). Adding empty settings for those now would be
 * dead UI with nothing behind it.
 *
 * @since 1.0.0
 */
class SubscriptionProduct {

	/** The WooCommerce product type slug. */
	public const TYPE = 'purecart_subscription';

	/** Delivery types handled directly by DeliveryManager, not the registry. */
	private const COMPANION_TYPES = array( 'software', 'saas' );

	/**
	 * Register product type + data tab hooks.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_filter( 'product_type_selector', array( $this, 'add_type' ) );
		add_action( 'woocommerce_product_class', array( $this, 'product_class' ), 10, 2 );
		add_filter( 'woocommerce_product_data_tabs', array( $this, 'add_data_tab' ) );
		add_action( 'woocommerce_product_data_panels', array( $this, 'render_data_panel' ) );
		add_action( 'woocommerce_process_product_meta', array( $this, 'save_meta' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_toggle_script' ) );
	}

	/**
	 * Add "PureCart – Subscription" to the WC product type dropdown.
	 *
	 * @since  1.0.0
	 * @param  array<string,string> $types Existing product type slug => label pairs.
	 * @return array<string,string>
	 */
	public function add_type( array $types ): array {
		$types[ self::TYPE ] = __( 'PureCart – Subscription', 'purecart' );
		return $types;
	}

	/**
	 * Map the subscription product type to its own class.
	 *
	 * Correction vs. an earlier version of this method (and vs.
	 * PureCart\Commerce\ProductTypes' pattern for License/SaaS/Bundle, found
	 * to have the same issue): mapping to plain `\WC_Product_Simple` doesn't
	 * work for type detection, since that class hardcodes `get_type()` to
	 * always return `'simple'`. `SubscriptionProductType` fixes that — see
	 * its docblock.
	 *
	 * @since  1.0.0
	 * @param  string $classname    The default WooCommerce product class name.
	 * @param  string $product_type The product type slug.
	 * @return string
	 */
	public function product_class( string $classname, string $product_type ): string {
		if ( self::TYPE === $product_type ) {
			return SubscriptionProductType::class;
		}
		return $classname;
	}

	/**
	 * Add the "Subscription" tab to the product data metabox.
	 *
	 * The `show_if_purecart_subscription` class is WooCommerce's own
	 * convention — its core JS toggles tabs/panels with that class based on
	 * the `#product-type` select value, no extra JS needed for this part.
	 *
	 * @since  1.0.0
	 * @param  array<string, array<string, mixed>> $tabs Existing product data tabs.
	 * @return array<string, array<string, mixed>>
	 */
	public function add_data_tab( array $tabs ): array {
		$tabs['purecart_subscription'] = array(
			'label'    => __( 'Subscription', 'purecart' ),
			'target'   => 'purecart_subscription_data',
			'class'    => array( 'show_if_' . self::TYPE ),
			'priority' => 21,
		);
		return $tabs;
	}

	/**
	 * All delivery type options for the dropdown: the two companion types
	 * (software/saas) plus whatever's registered in DeliveryHandlerRegistry.
	 *
	 * @since  1.0.0
	 * @return array<string,string>
	 */
	private function delivery_type_options(): array {
		$options = array(
			'software' => __( 'Software / Plugin (license)', 'purecart' ),
			'saas'     => __( 'SaaS Platform (account)', 'purecart' ),
		);

		$labels = array(
			'membership' => __( 'Membership', 'purecart' ),
			'download'   => __( 'Digital Downloads', 'purecart' ),
			'course'     => __( 'Learning / Course', 'purecart' ),
			'service'    => __( 'Service / Retainer', 'purecart' ),
		);

		foreach ( DeliveryHandlerRegistry::get_registered_types() as $type ) {
			$options[ $type ] = $labels[ $type ] ?? ucfirst( $type );
		}

		return $options;
	}

	/**
	 * Render the "Subscription" panel — core billing fields + delivery type
	 * (with its type-specific sub-fields toggled by enqueue_toggle_script()).
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function render_data_panel(): void {
		global $post;

		$product = wc_get_product( $post->ID );
		$meta    = static function ( string $key, $default = '' ) use ( $product ) {
			if ( ! $product ) {
				return $default;
			}
			$value = $product->get_meta( $key );
			return '' === $value ? $default : $value;
		};

		$delivery_type = $meta( '_purecart_sub_delivery_type', 'software' );
		?>
		<div id="purecart_subscription_data" class="panel woocommerce_options_panel">
			<div class="options_group">
				<?php
				woocommerce_wp_text_input(
					array(
						'id'                => '_purecart_sub_price',
						'label'             => __( 'Recurring price', 'purecart' ) . ' (' . get_woocommerce_currency_symbol() . ')',
						'data_type'         => 'price',
						'value'             => $meta( '_purecart_sub_price' ),
					)
				);
				woocommerce_wp_text_input(
					array(
						'id'          => '_purecart_sub_interval',
						'label'       => __( 'Billing interval', 'purecart' ),
						'type'        => 'number',
						'custom_attributes' => array( 'min' => '1', 'step' => '1' ),
						'value'       => $meta( '_purecart_sub_interval', 1 ),
						'description' => __( 'Bill every N periods, e.g. 3 + Month(s) = every 3 months.', 'purecart' ),
						'desc_tip'    => true,
					)
				);
				woocommerce_wp_select(
					array(
						'id'      => '_purecart_sub_period',
						'label'   => __( 'Billing period', 'purecart' ),
						'value'   => $meta( '_purecart_sub_period', 'month' ),
						'options' => array(
							'day'   => __( 'Day(s)', 'purecart' ),
							'week'  => __( 'Week(s)', 'purecart' ),
							'month' => __( 'Month(s)', 'purecart' ),
							'year'  => __( 'Year(s)', 'purecart' ),
						),
					)
				);
				woocommerce_wp_text_input(
					array(
						'id'                => '_purecart_sub_signup_fee',
						'label'             => __( 'Sign-up fee', 'purecart' ) . ' (' . get_woocommerce_currency_symbol() . ')',
						'data_type'         => 'price',
						'value'             => $meta( '_purecart_sub_signup_fee' ),
						'description'       => __( 'One-time fee on the first payment only. Leave blank for none.', 'purecart' ),
						'desc_tip'          => true,
					)
				);
				?>
			</div>

			<div class="options_group">
				<p class="form-field"><strong><?php esc_html_e( 'Free trial', 'purecart' ); ?></strong></p>
				<?php
				woocommerce_wp_text_input(
					array(
						'id'                => '_purecart_sub_trial_length',
						'label'             => __( 'Trial length', 'purecart' ),
						'type'              => 'number',
						'custom_attributes' => array( 'min' => '0', 'step' => '1' ),
						'value'             => $meta( '_purecart_sub_trial_length', 0 ),
						'description'       => __( '0 = no trial.', 'purecart' ),
						'desc_tip'          => true,
					)
				);
				woocommerce_wp_select(
					array(
						'id'      => '_purecart_sub_trial_period',
						'label'   => __( 'Trial period', 'purecart' ),
						'value'   => $meta( '_purecart_sub_trial_period', 'day' ),
						'options' => array(
							'day'   => __( 'Day(s)', 'purecart' ),
							'week'  => __( 'Week(s)', 'purecart' ),
							'month' => __( 'Month(s)', 'purecart' ),
						),
					)
				);
				?>
			</div>

			<div class="options_group">
				<p class="form-field"><strong><?php esc_html_e( 'Subscription length', 'purecart' ); ?></strong></p>
				<?php
				woocommerce_wp_text_input(
					array(
						'id'                => '_purecart_sub_length',
						'label'             => __( 'Length', 'purecart' ),
						'type'              => 'number',
						'custom_attributes' => array( 'min' => '0', 'step' => '1' ),
						'value'             => $meta( '_purecart_sub_length', 0 ),
						'description'       => __( '0 = runs indefinitely until cancelled.', 'purecart' ),
						'desc_tip'          => true,
					)
				);
				woocommerce_wp_select(
					array(
						'id'      => '_purecart_sub_length_period',
						'label'   => __( 'Length period', 'purecart' ),
						'value'   => $meta( '_purecart_sub_length_period', 'month' ),
						'options' => array(
							'month' => __( 'Month(s)', 'purecart' ),
							'year'  => __( 'Year(s)', 'purecart' ),
						),
					)
				);
				woocommerce_wp_text_input(
					array(
						'id'                => '_purecart_sub_limit',
						'label'             => __( 'Max active subscriptions per customer', 'purecart' ),
						'type'              => 'number',
						'custom_attributes' => array( 'min' => '0', 'step' => '1' ),
						'value'             => $meta( '_purecart_sub_limit', 0 ),
						'description'       => __( '0 = unlimited.', 'purecart' ),
						'desc_tip'          => true,
					)
				);
				?>
			</div>

			<div class="options_group">
				<?php
				woocommerce_wp_select(
					array(
						'id'      => '_purecart_sub_proration',
						'label'   => __( 'Upgrade/downgrade proration', 'purecart' ),
						'value'   => $meta( '_purecart_sub_proration', 'apply_at_renewal' ),
						'options' => array(
							'prorate_immediately' => __( 'Prorate immediately', 'purecart' ),
							'apply_at_renewal'    => __( 'Apply at next renewal (default)', 'purecart' ),
							'no_proration'        => __( 'No proration', 'purecart' ),
						),
					)
				);
				woocommerce_wp_checkbox(
					array(
						'id'    => '_purecart_sub_include_shipping',
						'label' => __( 'Include shipping in renewals', 'purecart' ),
						'value' => $meta( '_purecart_sub_include_shipping', 'no' ),
					)
				);
				woocommerce_wp_checkbox(
					array(
						'id'    => '_purecart_sub_include_tax',
						'label' => __( 'Include tax in renewals', 'purecart' ),
						'value' => $meta( '_purecart_sub_include_tax', 'yes' ),
					)
				);
				?>
			</div>

			<div class="options_group">
				<?php
				woocommerce_wp_select(
					array(
						'id'      => '_purecart_sub_delivery_type',
						'label'   => __( 'Delivery type', 'purecart' ),
						'value'   => $delivery_type,
						'options' => $this->delivery_type_options(),
						'description' => __( 'What gets provisioned when this subscription activates.', 'purecart' ),
						'desc_tip'    => true,
					)
				);
				?>
				<div class="purecart-delivery-fields" data-delivery-type="membership">
					<?php
					woocommerce_wp_text_input(
						array(
							'id'    => '_purecart_sub_membership_tier',
							'label' => __( 'Membership tier', 'purecart' ),
							'value' => $meta( '_purecart_sub_membership_tier' ),
							'description' => __( 'e.g. Gold, Silver, Bronze.', 'purecart' ),
							'desc_tip'    => true,
						)
					);
					?>
				</div>
				<div class="purecart-delivery-fields" data-delivery-type="download">
					<?php
					woocommerce_wp_text_input(
						array(
							'id'                => '_purecart_sub_download_limit',
							'label'             => __( 'Downloads per billing cycle', 'purecart' ),
							'type'              => 'number',
							'custom_attributes' => array( 'min' => '0', 'step' => '1' ),
							'value'             => $meta( '_purecart_sub_download_limit', 0 ),
							'description'       => __( '0 = unlimited.', 'purecart' ),
							'desc_tip'          => true,
						)
					);
					?>
				</div>
				<div class="purecart-delivery-fields" data-delivery-type="course">
					<?php
					$course_ids = $meta( '_purecart_sub_lms_course_ids' );
					$course_ids = $course_ids ? implode( ', ', (array) json_decode( (string) $course_ids, true ) ) : '';
					woocommerce_wp_text_input(
						array(
							'id'          => '_purecart_sub_lms_course_ids_display',
							'label'       => __( 'LMS course IDs', 'purecart' ),
							'value'       => $course_ids,
							'description' => __( 'Comma-separated course post IDs to enroll on activation.', 'purecart' ),
							'desc_tip'    => true,
						)
					);
					?>
				</div>
				<div class="purecart-delivery-fields" data-delivery-type="service">
					<?php
					woocommerce_wp_textarea_input(
						array(
							'id'          => '_purecart_sub_deliverable_notes',
							'label'       => __( 'Deliverable notes template', 'purecart' ),
							'value'       => $meta( '_purecart_sub_deliverable_notes' ),
							'description' => __( 'Shown to the admin on each renewal as a reminder of what to deliver.', 'purecart' ),
							'desc_tip'    => true,
						)
					);
					?>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Save subscription meta on product save.
	 *
	 * WooCommerce's own meta box already verifies the `woocommerce_save_data`
	 * nonce before firing this action, so no extra nonce check is needed here
	 * (unlike PureCart\Admin\Admin::save_product_meta(), which hooks the plain
	 * `save_post_product` action and has to check its own nonce).
	 *
	 * @since 1.0.0
	 * @param int $post_id The product post ID being saved.
	 * @return void
	 */
	public function save_meta( int $post_id ): void {
		$product_type = isset( $_POST['product-type'] ) ? sanitize_text_field( wp_unslash( $_POST['product-type'] ) ) : '';

		if ( self::TYPE !== $product_type ) {
			return;
		}

		// Defense-in-depth. WooCommerce's own meta box save flow
		// (WC_Admin_Meta_Boxes::save_meta_boxes(), verified against the installed
		// WooCommerce version) already checks the `woocommerce_save_data` nonce and
		// `current_user_can( 'edit_post', $post_id )` before `woocommerce_process_product_meta`
		// ever fires — so this can't currently be reached without both. Checking again here
		// costs nothing and stops this method from becoming a silent gap if it's ever hooked
		// to something else later.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		// Free-text / numeric fields — sanitizer alone is sufficient (no fixed value set to
		// validate against). absint() also blocks anything non-numeric from reaching the DB.
		$text_fields = array(
			'_purecart_sub_price'            => 'wc_format_decimal',
			'_purecart_sub_interval'         => 'absint',
			'_purecart_sub_signup_fee'       => 'wc_format_decimal',
			'_purecart_sub_trial_length'     => 'absint',
			'_purecart_sub_length'           => 'absint',
			'_purecart_sub_limit'            => 'absint',
			'_purecart_sub_membership_tier'  => 'sanitize_text_field',
			'_purecart_sub_download_limit'   => 'absint',
			'_purecart_sub_deliverable_notes' => 'sanitize_textarea_field',
		);

		foreach ( $text_fields as $meta_key => $sanitizer ) {
			if ( ! isset( $_POST[ $meta_key ] ) ) {
				continue;
			}
			$raw = wp_unslash( $_POST[ $meta_key ] );
			update_post_meta( $post_id, $meta_key, $sanitizer( $raw ) );
		}

		// <select> fields — sanitize_text_field() only strips tags/newlines, it doesn't
		// validate the *value*. These all render from a fixed option list, so anything
		// outside that list (tampered POST, stale cached form, bad third-party filter)
		// is rejected and the field falls back to its own default instead of persisting
		// an out-of-range value that later business logic (RenewalEngine, DeliveryManager)
		// would have to treat as untrusted input all over again.
		$enum_fields = array(
			'_purecart_sub_period'        => array( array( 'day', 'week', 'month', 'year' ), 'month' ),
			'_purecart_sub_trial_period'  => array( array( 'day', 'week', 'month' ), 'day' ),
			'_purecart_sub_length_period' => array( array( 'month', 'year' ), 'month' ),
			'_purecart_sub_proration'     => array( array( 'prorate_immediately', 'apply_at_renewal', 'no_proration' ), 'apply_at_renewal' ),
			'_purecart_sub_delivery_type' => array( array_keys( $this->delivery_type_options() ), 'software' ),
		);

		foreach ( $enum_fields as $meta_key => list( $allowed, $default ) ) {
			if ( ! isset( $_POST[ $meta_key ] ) ) {
				continue;
			}
			$value = sanitize_text_field( wp_unslash( $_POST[ $meta_key ] ) );
			update_post_meta( $post_id, $meta_key, in_array( $value, $allowed, true ) ? $value : $default );
		}

		foreach ( array( '_purecart_sub_include_shipping', '_purecart_sub_include_tax' ) as $checkbox_key ) {
			update_post_meta( $post_id, $checkbox_key, isset( $_POST[ $checkbox_key ] ) ? 'yes' : 'no' );
		}

		if ( isset( $_POST['_purecart_sub_lms_course_ids_display'] ) ) {
			$ids = array_filter( array_map( 'absint', explode( ',', wp_unslash( $_POST['_purecart_sub_lms_course_ids_display'] ) ) ) );
			update_post_meta( $post_id, '_purecart_sub_lms_course_ids', wp_json_encode( array_values( $ids ) ) );
		}
	}

	/**
	 * Register the delivery-type toggle script for product edit screens only.
	 *
	 * Needed because WooCommerce's built-in show_if/hide_if only toggles on
	 * the top-level product type, not on a nested custom select's value.
	 *
	 * Prints directly via admin_footer rather than `wp_add_inline_script(
	 * 'woocommerce_admin', ... )` — the inline-script approach depends on the
	 * 'woocommerce_admin' handle already being registered by the time this
	 * hook fires, and on every other `wp_add_inline_script()` call targeting
	 * that same handle (WooCommerce core's own, and any other plugin's)
	 * being free of errors, since WordPress concatenates them all into one
	 * `<script>` block. A plain footer-printed, jQuery-ready-wrapped script
	 * has no such dependency — it only needs jQuery itself, which WordPress
	 * guarantees is loaded on every admin screen.
	 *
	 * @since 1.0.0
	 * @param string $hook Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_toggle_script( string $hook ): void {
		if ( 'post.php' !== $hook && 'post-new.php' !== $hook ) {
			return;
		}

		global $post;
		if ( ! $post || 'product' !== $post->post_type ) {
			return;
		}

		add_action( 'admin_footer', array( $this, 'print_toggle_script' ) );
	}

	/**
	 * Print the delivery-type toggle script. No dynamic/user-supplied data is
	 * interpolated into this output — it's a fixed script body — so there's
	 * no escaping surface here.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function print_toggle_script(): void {
		?>
		<script>
		jQuery( function ( $ ) {
			function purecartToggleDelivery() {
				var type = $( '#_purecart_sub_delivery_type' ).val();
				$( '.purecart-delivery-fields' ).hide();
				$( '.purecart-delivery-fields[data-delivery-type="' + type + '"]' ).show();
			}
			$( document.body ).on( 'change', '#_purecart_sub_delivery_type', purecartToggleDelivery );
			$( document.body ).on( 'woocommerce-product-type-change', purecartToggleDelivery );
			purecartToggleDelivery();
		} );
		</script>
		<?php
	}
}

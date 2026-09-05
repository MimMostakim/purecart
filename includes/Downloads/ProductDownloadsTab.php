<?php
/**
 * "Secure Downloads" product data tab: per-product limit, expiry, licence gate.
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Per-product overrides for the store-wide download settings.
 *
 * Uses WooCommerce's native product-data-tab system, like
 * `Updates\ProductUpdatesTab` and `Subscriptions\SubscriptionProduct`, rather
 * than a React panel: this sits inside WooCommerce's own product form and has
 * to save with it.
 *
 * Every field is an override, so every field may be left blank — blank means
 * "use the store setting", which is why the placeholders show what that
 * setting currently is instead of a generic hint.
 *
 * @since 1.0.0
 */
class ProductDownloadsTab {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		add_filter( 'woocommerce_product_data_tabs', array( $this, 'add_tab' ) );
		add_action( 'woocommerce_product_data_panels', array( $this, 'render_panel' ) );
		add_action( 'woocommerce_process_product_meta', array( $this, 'save' ) );
	}

	/**
	 * Add the tab, shown only for products that actually carry files.
	 *
	 * `show_if_downloadable` is WooCommerce's own class: its script reveals
	 * anything carrying it the moment the Downloadable box is ticked, so the
	 * tab follows the checkbox with no script of ours.
	 *
	 * @since  1.0.0
	 * @param  array<string, array<string, mixed>> $tabs Existing tabs.
	 * @return array<string, array<string, mixed>>
	 */
	public function add_tab( array $tabs ): array {
		$tabs['purecart_downloads'] = array(
			'label'    => __( 'Secure Downloads', 'purecart' ),
			'target'   => 'purecart_downloads_data',
			'class'    => array( 'show_if_downloadable' ),
			'priority' => 23,
		);

		return $tabs;
	}

	/**
	 * Render the panel.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function render_panel(): void {
		global $post;

		$product_id = (int) $post->ID;

		$store_limit  = (int) Settings::get( OptionKeys::DOWNLOAD_MAX_COUNT, 0 );
		$store_expiry = (int) Settings::get( OptionKeys::DOWNLOAD_EXPIRY_DAYS, 0 );
		$store_gate   = (bool) Settings::get( OptionKeys::DOWNLOAD_LICENSE_GATE, true );
		?>
		<div id="purecart_downloads_data" class="panel woocommerce_options_panel">
			<div class="options_group">
				<p class="form-field">
					<?php
					esc_html_e(
						'These override the store-wide Secure Downloads settings for this product. Leave a field blank to use the store setting.',
						'purecart'
					);
					?>
				</p>

				<?php
				woocommerce_wp_text_input(
					array(
						'id'                => '_purecart_download_limit',
						'label'             => __( 'Download limit', 'purecart' ),
						'value'             => $this->number_value( $product_id, '_purecart_download_limit' ),
						'type'              => 'number',
						'custom_attributes' => array(
							'min'         => '0',
							'step'        => '1',
							'placeholder' => $this->limit_placeholder( $store_limit ),
						),
						'description'       => __( 'How many times each file may be downloaded per order. 0 means unlimited. This is PureCart\'s own counter — WooCommerce\'s "Download limit" field above does not apply to these links.', 'purecart' ),
						'desc_tip'          => true,
					)
				);

				woocommerce_wp_text_input(
					array(
						'id'                => '_purecart_download_expiry_days',
						'label'             => __( 'Link expiry (days)', 'purecart' ),
						'value'             => $this->number_value( $product_id, '_purecart_download_expiry_days' ),
						'type'              => 'number',
						'custom_attributes' => array(
							'min'         => '0',
							'step'        => '1',
							'placeholder' => $this->expiry_placeholder( $store_expiry ),
						),
						'description'       => __( 'Days from the order being provisioned until the download links stop working. 0 means they never expire. Only affects links issued from now on — links already sent keep the expiry they were given.', 'purecart' ),
						'desc_tip'          => true,
					)
				);

				woocommerce_wp_select(
					array(
						'id'          => '_purecart_download_license_gate',
						'label'       => __( 'Require an active licence', 'purecart' ),
						'value'       => $this->gate_value( $product_id ),
						'options'     => array(
							''    => sprintf(
								/* translators: %s: the store-wide setting, already translated. */
								__( 'Use store setting (%s)', 'purecart' ),
								$store_gate ? __( 'required', 'purecart' ) : __( 'not required', 'purecart' )
							),
							'yes' => __( 'Required', 'purecart' ),
							'no'  => __( 'Not required', 'purecart' ),
						),
						'description' => __( 'When required, a file is refused if the licence issued with the order is no longer active — so revoking a licence also cuts off the downloads. Has no effect on products sold without a licence.', 'purecart' ),
						'desc_tip'    => true,
					)
				);
				?>
			</div>
		</div>
		<?php
	}

	/**
	 * Save the panel's fields.
	 *
	 * Runs inside WooCommerce's own product save, which has already verified
	 * its nonce; the capability check mirrors `Updates\ProductUpdatesTab`.
	 *
	 * @since  1.0.0
	 * @param  int $product_id Product being saved.
	 * @return void
	 */
	public function save( int $product_id ): void {
		if ( ! current_user_can( 'edit_post', $product_id ) ) {
			return;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- Verified by WC_Meta_Box_Product_Data::save() before this hook fires.
		foreach ( array( '_purecart_download_limit', '_purecart_download_expiry_days' ) as $key ) {
			if ( ! isset( $_POST[ $key ] ) ) {
				continue;
			}

			$raw = trim( sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) );

			// Blank is meaningful: it clears the override so the store setting
			// applies again. Storing '' would be indistinguishable from 0,
			// which means unlimited — a very different thing — so the meta is
			// deleted instead.
			if ( '' === $raw ) {
				delete_post_meta( $product_id, $key );
				continue;
			}

			update_post_meta( $product_id, $key, max( 0, (int) $raw ) );
		}

		if ( isset( $_POST['_purecart_download_license_gate'] ) ) {
			$gate = sanitize_text_field( wp_unslash( $_POST['_purecart_download_license_gate'] ) );

			if ( in_array( $gate, array( 'yes', 'no' ), true ) ) {
				update_post_meta( $product_id, '_purecart_download_license_gate', $gate );
			} else {
				delete_post_meta( $product_id, '_purecart_download_license_gate' );
			}
		}
		// phpcs:enable WordPress.Security.NonceVerification.Missing
	}

	// -----------------------------------------------------------------------
	// Internals
	// -----------------------------------------------------------------------

	/**
	 * A numeric override's stored value, or '' when there is no override.
	 *
	 * @since  1.0.0
	 * @param  int    $product_id Product ID.
	 * @param  string $key        Meta key.
	 * @return string
	 */
	private function number_value( int $product_id, string $key ): string {
		$meta = get_post_meta( $product_id, $key, true );

		return '' === $meta || null === $meta ? '' : (string) (int) $meta;
	}

	/**
	 * The licence-gate override: 'yes', 'no', or '' for "use store setting".
	 *
	 * @since  1.0.0
	 * @param  int $product_id Product ID.
	 * @return string
	 */
	private function gate_value( int $product_id ): string {
		$meta = get_post_meta( $product_id, '_purecart_download_license_gate', true );

		return in_array( $meta, array( 'yes', 'no' ), true ) ? (string) $meta : '';
	}

	/**
	 * @since  1.0.0
	 * @param  int $store_limit Store-wide download limit.
	 * @return string
	 */
	private function limit_placeholder( int $store_limit ): string {
		return $store_limit > 0
			/* translators: %d: the store-wide download limit. */
			? sprintf( __( 'Store setting (%d)', 'purecart' ), $store_limit )
			: __( 'Store setting (unlimited)', 'purecart' );
	}

	/**
	 * @since  1.0.0
	 * @param  int $store_expiry Store-wide expiry in days.
	 * @return string
	 */
	private function expiry_placeholder( int $store_expiry ): string {
		return $store_expiry > 0
			/* translators: %d: the store-wide expiry in days. */
			? sprintf( __( 'Store setting (%d days)', 'purecart' ), $store_expiry )
			: __( 'Store setting (never)', 'purecart' );
	}
}

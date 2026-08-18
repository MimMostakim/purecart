<?php
/**
 * Merges PureCart's own token-based downloads into WooCommerce's native
 * My Account → Downloads list.
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

defined( 'ABSPATH' ) || exit;

/**
 * PureCart used to register its own separate "Downloads" tab on the My
 * Account page (see {@see \PureCart\CustomerDashboard\Dashboard}, which
 * has since had that tab removed) — but WooCommerce already has a native
 * "Downloads" tab of its own, built from `wc_get_customer_available_downloads()`.
 * Running both side by side meant an account with any regular WooCommerce
 * downloadable-product purchase saw two tabs labeled "Downloads" at once.
 *
 * Instead of maintaining a second, separate tab, this class hooks the same
 * filter that function already runs through
 * ({@see wc_get_customer_available_downloads()}'s own
 * `woocommerce_customer_available_downloads` filter) and appends PureCart's
 * own rows, reshaped to look exactly like a native WooCommerce download row.
 * WooCommerce's own `templates/order/order-downloads.php` (used by both the
 * My Account Downloads tab and a Thank You/order page's own downloads
 * section) then renders every row — native and PureCart's — through the
 * exact same table, with no PureCart-specific template of its own needed.
 */
class AccountDownloadsMerger {

	/**
	 * Hooks the merge into WooCommerce's own download-list filter.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_filter( 'woocommerce_customer_available_downloads', array( $this, 'merge' ), 10, 2 );
	}

	/**
	 * Appends every PureCart download token belonging to this customer,
	 * reshaped to WooCommerce's own native row shape, onto whatever
	 * WooCommerce's own downloadable-product system already found.
	 *
	 * @since  1.0.0
	 * @param  array<int, array<string, mixed>> $downloads   WooCommerce's own native download rows.
	 * @param  int                               $customer_id WordPress user ID whose downloads are being listed.
	 * @return array<int, array<string, mixed>>
	 */
	public function merge( array $downloads, int $customer_id ): array {
		if ( $customer_id <= 0 ) {
			return $downloads;
		}

		foreach ( ( new TokenManager() )->get_by_user( $customer_id ) as $download ) {
			$downloads[] = $this->to_native_shape( $download );
		}

		return $downloads;
	}

	/**
	 * Reshapes one row from the `purecart_downloads` table into the exact
	 * associative-array shape {@see wc_get_customer_available_downloads()}
	 * produces for a native row (see that function's own source for the
	 * canonical key list), so every piece of WooCommerce core or any other
	 * extension that reads this array — the Downloads tab template, order
	 * emails, REST responses — treats a PureCart download identically to a
	 * native one.
	 *
	 * The one deliberate difference is `download_url`: it still points at
	 * PureCart's own signed-token endpoint ({@see DownloadDispatcher}, the
	 * `purecart/{token}` rewrite) rather than WooCommerce's native
	 * `?download_file=` handler, since the underlying file was never
	 * registered as a WooCommerce downloadable product file — it's tracked
	 * in PureCart's own `purecart_downloads` table instead. Clicking the
	 * link still goes through {@see TokenManager::validate_token()}'s own
	 * expiry/download-limit check, exactly as it did when this same row was
	 * rendered by PureCart's now-removed standalone Downloads tab — only
	 * where it's displayed has changed, not how the file is actually
	 * protected or served.
	 *
	 * @param  object $download One row from {@see TokenManager::get_by_user()}
	 *                          (joined with the product's post title as `product_name`).
	 * @return array<string, mixed>
	 */
	private function to_native_shape( object $download ): array {
		$remaining    = max( 0, (int) $download->max_downloads - (int) $download->download_count );
		$product_name = (string) ( $download->product_name ?? '' );

		return array(
			'download_url'        => home_url( 'purecart/' . $download->token ),
			'download_id'         => 'purecart-' . (int) $download->id,
			'product_id'          => (int) $download->product_id,
			'product_name'        => $product_name,
			'product_url'         => (string) ( get_permalink( (int) $download->product_id ) ?: '' ),
			'download_name'       => $product_name,
			'order_id'            => (int) $download->order_id,
			'order_key'           => '',
			'downloads_remaining' => $remaining,
			'access_expires'      => $download->expires_at,
			'file'                => array(
				'name' => $product_name,
				'file' => '',
			),
		);
	}
}

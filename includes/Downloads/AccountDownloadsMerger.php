<?php
/**
 * Puts PureCart's token URLs behind WooCommerce's own download lists.
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

defined( 'ABSPATH' ) || exit;

/**
 * Rewrites the download rows WooCommerce hands to My Account and order emails.
 *
 * PureCart used to register its own separate "Downloads" tab on the My Account
 * page (see {@see \PureCart\CustomerDashboard\Dashboard}, which has since had
 * that tab removed) — but WooCommerce already has a native Downloads tab of
 * its own. Rather than maintain a second tab, this class hooks the two filters
 * WooCommerce builds those lists through, so its own
 * `templates/order/order-downloads.php` and `templates/emails/email-downloads.php`
 * render everything, with no PureCart template needed.
 *
 * Rewriting, not just appending. A WooCommerce downloadable product grants its
 * own permission row for every file at the same moment PureCart issues a
 * token, so simply adding PureCart's rows showed the customer each file twice:
 * once behind a counted, expiring, revocable token, and once behind
 * WooCommerce's plain `?download_file=` handler that honours none of that.
 * Anyone who clicked the second copy bypassed the entire module — including
 * after a refund. So a native row that PureCart has a token for is replaced
 * with the token URL, a native row whose token has been revoked is dropped
 * outright, and only tokens with no native counterpart are appended.
 *
 * @since 1.0.0
 */
class AccountDownloadsMerger {

	/**
	 * Hooks both of WooCommerce's download-list filters.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_filter( 'woocommerce_customer_available_downloads', array( $this, 'merge' ), 10, 2 );
		add_filter( 'woocommerce_order_get_downloadable_items', array( $this, 'merge_order_items' ), 10, 2 );
	}

	/**
	 * Rewrite the My Account → Downloads list for one customer.
	 *
	 * @since  1.0.0
	 * @param  array<int, array<string, mixed>> $downloads   WooCommerce's own native download rows.
	 * @param  int                              $customer_id WordPress user ID whose downloads are being listed.
	 * @return array<int, array<string, mixed>>
	 */
	public function merge( array $downloads, int $customer_id ): array {
		if ( $customer_id <= 0 ) {
			return $downloads;
		}

		$tokens = $this->index( ( new TokenManager() )->get_by_user( $customer_id, true ) );

		return $this->apply( $downloads, $tokens );
	}

	/**
	 * Rewrite the download rows of a single order — the list order emails and
	 * the order-received page are built from.
	 *
	 * Without this the "completed order" email, the one customers actually
	 * click, would still hand out unprotected WooCommerce URLs.
	 *
	 * @since  1.0.0
	 * @param  array<int, array<string, mixed>> $downloads Native download rows for the order.
	 * @param  \WC_Order                        $order     The order being rendered.
	 * @return array<int, array<string, mixed>>
	 */
	public function merge_order_items( array $downloads, \WC_Order $order ): array {
		$tokens = $this->index( ( new TokenManager() )->get_by_order( (int) $order->get_id(), true ) );

		return $this->apply( $downloads, $tokens );
	}

	// -----------------------------------------------------------------------
	// Internals
	// -----------------------------------------------------------------------

	/**
	 * Key token rows by the triple a native download row can be matched on.
	 *
	 * @since  1.0.0
	 * @param  array<int, object> $rows Token rows.
	 * @return array<string, object>
	 */
	private function index( array $rows ): array {
		$map = array();

		foreach ( $rows as $row ) {
			$map[ $this->key( (int) $row->order_id, (int) $row->product_id, (string) $row->file_id ) ] = $row;
		}

		return $map;
	}

	/**
	 * Build the lookup key for one file of one product in one order.
	 *
	 * @since  1.0.0
	 * @param  int    $order_id   WooCommerce order ID.
	 * @param  int    $product_id WooCommerce product ID.
	 * @param  string $file_id    WooCommerce file key.
	 * @return string
	 */
	private function key( int $order_id, int $product_id, string $file_id ): string {
		return $order_id . ':' . $product_id . ':' . $file_id;
	}

	/**
	 * Replace, drop, or keep each native row, then append unmatched tokens.
	 *
	 * @since  1.0.0
	 * @param  array<int, array<string, mixed>> $downloads Native download rows.
	 * @param  array<string, object>            $tokens    Token rows keyed by {@see self::key()}.
	 * @return array<int, array<string, mixed>>
	 */
	private function apply( array $downloads, array $tokens ): array {
		$merged = array();

		foreach ( $downloads as $row ) {
			$key = $this->key(
				(int) ( $row['order_id'] ?? 0 ),
				(int) ( $row['product_id'] ?? 0 ),
				(string) ( $row['download_id'] ?? '' )
			);

			if ( ! isset( $tokens[ $key ] ) ) {
				// A downloadable product PureCart never issued a token for —
				// leave WooCommerce to handle its own.
				$merged[] = $row;
				continue;
			}

			$token = $tokens[ $key ];
			unset( $tokens[ $key ] );

			// Revoked: the order was refunded or cancelled. Dropping the row
			// is the point — leaving it would hand back the native URL and
			// undo the revocation.
			if ( 'active' !== $token->status ) {
				continue;
			}

			$row['download_url']        = DownloadDispatcher::url( (string) $token->token );
			$row['downloads_remaining'] = $this->remaining( $token );
			$row['access_expires']      = $token->expires_at;

			$merged[] = $row;
		}

		// Tokens with no native row: a product WooCommerce granted no
		// permission for, or a permission an admin deleted by hand.
		foreach ( $tokens as $token ) {
			if ( 'active' !== $token->status ) {
				continue;
			}

			$merged[] = $this->to_native_shape( $token );
		}

		return $merged;
	}

	/**
	 * Downloads left on a token, in WooCommerce's own vocabulary.
	 *
	 * WooCommerce reads an empty string as "unlimited" and renders it as ∞;
	 * returning 0 for an unlimited token would tell the customer they had run
	 * out.
	 *
	 * @since  1.0.0
	 * @param  object $token A purecart_downloads row.
	 * @return string|int
	 */
	private function remaining( object $token ) {
		if ( (int) $token->max_downloads <= 0 ) {
			return '';
		}

		return max( 0, (int) $token->max_downloads - (int) $token->download_count );
	}

	/**
	 * Reshape a token row into the array shape
	 * {@see wc_get_customer_available_downloads()} produces for a native row,
	 * so core and any other extension reading the list treats it identically.
	 *
	 * @since  1.0.0
	 * @param  object $token One row from {@see TokenManager::get_by_user()}.
	 * @return array<string, mixed>
	 */
	private function to_native_shape( object $token ): array {
		$product_name = (string) ( $token->product_name ?? '' );
		$file_name    = (string) ( $token->file_name ?? $product_name );

		return array(
			'download_url'        => DownloadDispatcher::url( (string) $token->token ),
			'download_id'         => (string) $token->file_id,
			'product_id'          => (int) $token->product_id,
			'product_name'        => $product_name,
			'product_url'         => (string) ( get_permalink( (int) $token->product_id ) ?: '' ),
			'download_name'       => $file_name,
			'order_id'            => (int) $token->order_id,
			'order_key'           => '',
			'downloads_remaining' => $this->remaining( $token ),
			'access_expires'      => $token->expires_at,
			'file'                => array(
				'name' => $file_name,
				'file' => '',
			),
		);
	}
}

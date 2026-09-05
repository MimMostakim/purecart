<?php
/**
 * Creates and validates signed, expiring download tokens.
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

use PureCart\Licensing\LicenseGenerator;
use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Manages the purecart_downloads table.
 *
 * One token per file per order item. WooCommerce already models a product's
 * files as a keyed list (`WC_Product::get_downloads()`, keyed by an MD5 hash),
 * and this class mirrors that list rather than inventing a parallel one — so a
 * three-file bundle yields three independently limited, independently expiring
 * tokens, and exhausting one leaves the other two usable.
 *
 * @since 1.0.0
 */
class TokenManager {

	/**
	 * Order-item meta holding a `file_key => download_id` map of the tokens
	 * already issued for that item.
	 *
	 * This map is what makes token creation idempotent. With
	 * OptionKeys::DOWNLOAD_TRIGGER_STATUS set to 'both', provisioning runs on
	 * the processing *and* the completed transition; without the map the second
	 * pass would hand the customer a second set of links, each with its own
	 * fresh download counter — effectively doubling the purchased limit.
	 *
	 * @var string
	 */
	private const TOKEN_MAP_META = '_purecart_download_tokens';

	/**
	 * Issue one download token per downloadable file on an order item.
	 *
	 * Safe to call repeatedly for the same item: files that already have a
	 * token are skipped, and only genuinely new ones are inserted.
	 *
	 * @since  1.0.0
	 * @param  \WC_Order_Item_Product $item The purchased order line.
	 * @return array<int, object>           Rows inserted by this call (empty when nothing was new).
	 */
	public function create_for_order_item( \WC_Order_Item_Product $item ): array {
		$product = $item->get_product();
		if ( ! $product ) {
			return array();
		}

		$files = $product->get_downloads();
		if ( empty( $files ) ) {
			return array();
		}

		$order = $item->get_order();
		if ( ! $order ) {
			return array();
		}

		$order_id   = (int) $order->get_id();
		$user_id    = (int) $order->get_customer_id();
		$product_id = (int) $product->get_id();
		$license_id = (int) $item->get_meta( '_purecart_license_id', true );

		$issued = $item->get_meta( self::TOKEN_MAP_META, true );
		$issued = is_array( $issued ) ? $issued : array();

		$limit      = $this->resolve_limit( $product_id, $order_id );
		$expires_at = $this->resolve_expiry( $product_id, $order_id );
		$created    = array();

		foreach ( $files as $file_key => $file ) {
			$file_key = (string) $file_key;

			if ( isset( $issued[ $file_key ] ) ) {
				continue;
			}

			$row = $this->insert(
				array(
					'order_id'      => $order_id,
					'order_item_id' => (int) $item->get_id(),
					'user_id'       => $user_id,
					'product_id'    => $product_id,
					'license_id'    => $license_id,
					'file_id'       => $file_key,
					'max_downloads' => $limit,
					'expires_at'    => $expires_at,
				)
			);

			if ( ! $row ) {
				continue;
			}

			$issued[ $file_key ] = (int) $row->id;
			$created[]           = $row;

			/**
			 * Fires after a download token row has been created.
			 *
			 * @since 1.0.0
			 * @param int $download_id The purecart_downloads row ID.
			 * @param int $order_id    WooCommerce order ID.
			 * @param int $product_id  WooCommerce product ID.
			 */
			do_action( 'purecart_download_token_created', (int) $row->id, $order_id, $product_id );
		}

		if ( $created ) {
			$item->update_meta_data( self::TOKEN_MAP_META, $issued );
			$item->save_meta_data();
		}

		return $created;
	}

	/**
	 * Create a signed, expiring download token for a product in an order.
	 *
	 * @deprecated 1.0.0 Use create_for_order_item(), which covers every file on
	 *                   the item instead of a single one. Kept as a thin
	 *                   forwarder so third-party callers do not fatal; it
	 *                   deliberately does not emit a deprecation notice, since
	 *                   PureCart's own remaining caller is replaced in the next
	 *                   step and the notice would only pollute debug logs.
	 *
	 * @since  1.0.0
	 * @param  int $order_id   WooCommerce order ID.
	 * @param  int $user_id    Unused — the customer is read from the order.
	 * @param  int $product_id WooCommerce product ID.
	 * @return object|null     The first inserted download row, or null on failure.
	 */
	public function create_token( int $order_id, int $user_id, int $product_id ): ?object {
		unset( $user_id );

		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return null;
		}

		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof \WC_Order_Item_Product ) {
				continue;
			}

			if ( (int) $item->get_product_id() !== $product_id ) {
				continue;
			}

			$rows = $this->create_for_order_item( $item );

			return $rows[0] ?? null;
		}

		return null;
	}

	/**
	 * Validate a download token, reporting *why* it was refused.
	 *
	 * The reason is the whole point of the return type. A bare null told the
	 * customer "invalid or expired" for every case at once, which is exactly
	 * the message that generates a support ticket: an exhausted limit, a
	 * refunded order and a revoked licence each need a different answer, and
	 * the log needs to record which one actually happened.
	 *
	 * @since  1.0.0
	 * @param  string $token The hex download token.
	 * @return object|\WP_Error The download row, or an error whose code is one
	 *                          of: invalid, revoked, expired, limit_reached,
	 *                          license_inactive.
	 */
	public function validate( string $token ) {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Token validation is time-sensitive; caching could allow replays of expired/exhausted tokens.
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}purecart_downloads WHERE token = %s LIMIT 1",
				$token
			)
		);

		if ( ! $row ) {
			return new \WP_Error(
				'invalid',
				__( 'This download link is not valid.', 'purecart' )
			);
		}

		if ( 'active' !== $row->status ) {
			return new \WP_Error(
				'revoked',
				__( 'This download link has been revoked. If you believe this is a mistake, please contact support.', 'purecart' ),
				array( 'download_id' => (int) $row->id )
			);
		}

		// A NULL expires_at is the "never expires" case, not a date in 1970.
		if ( ! empty( $row->expires_at ) && strtotime( (string) $row->expires_at ) < time() ) {
			return new \WP_Error(
				'expired',
				__( 'This download link has expired.', 'purecart' ),
				array( 'download_id' => (int) $row->id )
			);
		}

		// max_downloads 0 means unlimited.
		if ( (int) $row->max_downloads > 0 && (int) $row->download_count >= (int) $row->max_downloads ) {
			return new \WP_Error(
				'limit_reached',
				__( 'You have reached the download limit for this file.', 'purecart' ),
				array( 'download_id' => (int) $row->id )
			);
		}

		if ( ! $this->license_allows( $row ) ) {
			return new \WP_Error(
				'license_inactive',
				__( 'The licence for this product is no longer active.', 'purecart' ),
				array( 'download_id' => (int) $row->id )
			);
		}

		return $row;
	}

	/**
	 * Validate a download token — returns the row only if it is still usable.
	 *
	 * @deprecated 1.0.0 Use validate(), which reports the reason for a refusal.
	 *
	 * @since  1.0.0
	 * @param  string $token The hex download token.
	 * @return object|null   The download row, or null if it cannot be used.
	 */
	public function validate_token( string $token ): ?object {
		$result = $this->validate( $token );

		return is_wp_error( $result ) ? null : $result;
	}

	/**
	 * Whether the licence gate lets this download through.
	 *
	 * Closes the gap between owning a link and being entitled to use it: a
	 * customer who bought, downloaded, then had their licence revoked for
	 * abuse would otherwise keep every link they had already been sent.
	 *
	 * The gate is skipped entirely when the token carries no licence, so a
	 * store selling plain files is unaffected by it.
	 *
	 * @since  1.0.0
	 * @param  object $row A purecart_downloads row.
	 * @return bool
	 */
	private function license_allows( object $row ): bool {
		$license_id = (int) $row->license_id;

		if ( $license_id <= 0 ) {
			return true;
		}

		$meta    = get_post_meta( (int) $row->product_id, '_purecart_download_license_gate', true );
		$enabled = ( '' === $meta || null === $meta )
			? (bool) Settings::get( OptionKeys::DOWNLOAD_LICENSE_GATE, true )
			: (bool) $meta;

		if ( ! $enabled ) {
			return true;
		}

		$license = ( new LicenseGenerator() )->get_by_id( $license_id );

		// A licence row that has gone missing is not treated as a refusal:
		// the customer paid, and an admin deleting a licence record should not
		// silently confiscate the files they already bought.
		if ( ! $license ) {
			return true;
		}

		return 'active' === $license->status;
	}

	/**
	 * Resolve the WooCommerce file a download row points at.
	 *
	 * @since  1.0.0
	 * @param  object $download A purecart_downloads row.
	 * @return \WC_Product_Download|null
	 */
	public function file_for( object $download ): ?\WC_Product_Download {
		$product = wc_get_product( (int) $download->product_id );
		if ( ! $product ) {
			return null;
		}

		$files    = $product->get_downloads();
		$file_key = (string) $download->file_id;

		return $files[ $file_key ] ?? null;
	}

	/**
	 * Increment a download's use counter.
	 *
	 * Recording *that* the download happened belongs to
	 * {@see DownloadLogger::record()} — this method owns the counter the limit
	 * is checked against, nothing else.
	 *
	 * @since  1.0.0
	 * @param  int $download_id The purecart_downloads row ID.
	 * @return void
	 */
	public function increment_count( int $download_id ): void {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Atomic counter increment on custom table.
		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}purecart_downloads
                    SET download_count = download_count + 1
                  WHERE id = %d",
				$download_id
			)
		);
	}

	/**
	 * Revoke a single download token.
	 *
	 * Rows are flagged, never deleted — the audit log references them, and an
	 * admin investigating a refund needs to see that the link existed.
	 *
	 * @since  1.0.0
	 * @param  int $download_id The purecart_downloads row ID.
	 * @return bool             True when a row changed.
	 */
	public function revoke( int $download_id ): bool {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table UPDATE; no WP API available.
		$updated = $wpdb->update(
			$wpdb->prefix . 'purecart_downloads',
			array( 'status' => 'revoked' ),
			array( 'id' => $download_id ),
			array( '%s' ),
			array( '%d' )
		);

		return (bool) $updated;
	}

	/**
	 * Revoke every still-active token issued for an order.
	 *
	 * @since  1.0.0
	 * @param  int $order_id WooCommerce order ID.
	 * @return int           Number of tokens revoked.
	 */
	public function revoke_by_order( int $order_id ): int {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table bulk UPDATE; no WP API available.
		$updated = $wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}purecart_downloads
                    SET status = 'revoked'
                  WHERE order_id = %d
                    AND status = 'active'",
				$order_id
			)
		);

		return (int) $updated;
	}

	/**
	 * Issue a fresh token for an existing download row: new secret, counter
	 * back to zero, expiry recalculated from the current product and store
	 * settings. The old token stops working immediately.
	 *
	 * @since  1.0.0
	 * @param  int $download_id The purecart_downloads row ID.
	 * @return object|null      The updated row, or null when it no longer exists.
	 */
	public function regenerate( int $download_id ): ?object {
		global $wpdb;

		$row = $this->get( $download_id );
		if ( ! $row ) {
			return null;
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table UPDATE; no WP API available.
		$wpdb->update(
			$wpdb->prefix . 'purecart_downloads',
			array(
				'token'          => $this->generate_token(),
				'download_count' => 0,
				'status'         => 'active',
				'expires_at'     => $this->resolve_expiry( (int) $row->product_id, (int) $row->order_id ),
			),
			array( 'id' => $download_id ),
			array( '%s', '%d', '%s', '%s' ),
			array( '%d' )
		);

		return $this->get( $download_id );
	}

	/**
	 * Adjust an existing token's limit and expiry.
	 *
	 * The support-desk operation: a customer who genuinely lost their file to
	 * a dead disk needs one more download, not a fresh token that resets the
	 * counter and invalidates the link already in their inbox.
	 *
	 * @since  1.0.0
	 * @param  int         $download_id   The purecart_downloads row ID.
	 * @param  int|null    $max_downloads New limit, 0 for unlimited, null to leave alone.
	 * @param  string|null $expires_at    New expiry as a MySQL datetime, '' for never, null to leave alone.
	 * @return object|null                The updated row, or null when it does not exist.
	 */
	public function update_limits( int $download_id, ?int $max_downloads = null, ?string $expires_at = null ): ?object {
		global $wpdb;

		if ( ! $this->get( $download_id ) ) {
			return null;
		}

		$data    = array();
		$formats = array();

		if ( null !== $max_downloads ) {
			$data['max_downloads'] = max( 0, $max_downloads );
			$formats[]             = '%d';
		}

		if ( null !== $expires_at ) {
			$data['expires_at'] = '' === $expires_at ? null : $expires_at;
			$formats[]          = '%s';
		}

		if ( ! $data ) {
			return $this->get( $download_id );
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table UPDATE; no WP API available.
		$wpdb->update(
			$wpdb->prefix . 'purecart_downloads',
			$data,
			array( 'id' => $download_id ),
			$formats,
			array( '%d' )
		);

		return $this->get( $download_id );
	}

	/**
	 * Fetch a single download row by ID.
	 *
	 * @since  1.0.0
	 * @param  int $download_id The purecart_downloads row ID.
	 * @return object|null
	 */
	public function get( int $download_id ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table SELECT; counters change on every download, so a persistent cache would go stale immediately.
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}purecart_downloads WHERE id = %d",
				$download_id
			)
		);

		return $row ?: null;
	}

	/**
	 * Retrieve a customer's download tokens, newest first.
	 *
	 * Revoked rows are excluded by default — they are what a refunded or
	 * cancelled order leaves behind, and listing one would put a button in
	 * front of the customer that can only ever answer 403. A caller that has
	 * to *account* for them rather than display them (see
	 * {@see AccountDownloadsMerger}, which uses a revoked token to suppress
	 * WooCommerce's own unprotected row) asks for them explicitly.
	 *
	 * @since  1.0.0
	 * @param  int  $user_id         WordPress user ID.
	 * @param  bool $include_revoked Whether to return revoked rows too.
	 * @return array<int, object>    Rows, each carrying `product_name` and `file_name`.
	 */
	public function get_by_user( int $user_id, bool $include_revoked = false ): array {
		global $wpdb;

		$status_clause = $include_revoked ? '' : " AND d.status = 'active'";

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Custom table; $status_clause is one of two fixed literals, and the user ID is a placeholder. Results change on every download, so persistent caching would go stale.
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT d.*, p.post_title AS product_name
                   FROM {$wpdb->prefix}purecart_downloads d
                   LEFT JOIN {$wpdb->posts} p ON p.ID = d.product_id
                  WHERE d.user_id = %d {$status_clause}
                  ORDER BY d.created_at DESC",
				$user_id
			)
		);

		return $this->with_file_names( $rows ?: array() );
	}

	/**
	 * Retrieve the download tokens issued for one order.
	 *
	 * @since  1.0.0
	 * @param  int  $order_id        WooCommerce order ID.
	 * @param  bool $include_revoked Whether to return revoked rows too.
	 * @return array<int, object>    Rows, each carrying `product_name` and `file_name`.
	 */
	public function get_by_order( int $order_id, bool $include_revoked = false ): array {
		global $wpdb;

		$status_clause = $include_revoked ? '' : " AND d.status = 'active'";

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Custom table; $status_clause is one of two fixed literals, and the order ID is a placeholder. Results change on every download, so persistent caching would go stale.
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT d.*, p.post_title AS product_name
                   FROM {$wpdb->prefix}purecart_downloads d
                   LEFT JOIN {$wpdb->posts} p ON p.ID = d.product_id
                  WHERE d.order_id = %d {$status_clause}
                  ORDER BY d.created_at DESC",
				$order_id
			)
		);

		return $this->with_file_names( $rows ?: array() );
	}

	/**
	 * Attach each row's WooCommerce file name, falling back to the product's.
	 *
	 * @since  1.0.0
	 * @param  array<int, object> $rows Token rows.
	 * @return array<int, object>
	 */
	private function with_file_names( array $rows ): array {
		foreach ( $rows as $row ) {
			$file           = $this->file_for( $row );
			$row->file_name = $file ? $file->get_name() : (string) ( $row->product_name ?? '' );
		}

		return $rows;
	}

	// -----------------------------------------------------------------------
	// Internals
	// -----------------------------------------------------------------------

	/**
	 * Insert one download row and return it.
	 *
	 * @since  1.0.0
	 * @param  array<string, mixed> $data Column values (token and created_at are added here).
	 * @return object|null
	 */
	private function insert( array $data ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available.
		$inserted = $wpdb->insert(
			$wpdb->prefix . 'purecart_downloads',
			array(
				'order_id'       => (int) $data['order_id'],
				'order_item_id'  => (int) $data['order_item_id'],
				'user_id'        => (int) $data['user_id'],
				'product_id'     => (int) $data['product_id'],
				'license_id'     => (int) $data['license_id'],
				'file_id'        => (string) $data['file_id'],
				'token'          => $this->generate_token(),
				'status'         => 'active',
				'download_count' => 0,
				'max_downloads'  => (int) $data['max_downloads'],
				'expires_at'     => $data['expires_at'],
				'ip_address'     => '',
				'country_code'   => '',
				'created_at'     => current_time( 'mysql' ),
			),
			array( '%d', '%d', '%d', '%d', '%d', '%s', '%s', '%s', '%d', '%d', '%s', '%s', '%s', '%s' )
		);

		if ( ! $inserted ) {
			return null;
		}

		return $this->get( (int) $wpdb->insert_id );
	}

	/**
	 * Generate a 64-character hex token.
	 *
	 * The length is not incidental: the canonical rewrite rule in
	 * {@see DownloadDispatcher::add_rewrite()} matches exactly 64 hex
	 * characters, so anything shorter would never route.
	 *
	 * @since  1.0.0
	 * @return string
	 */
	private function generate_token(): string {
		return bin2hex( random_bytes( 32 ) );
	}

	/**
	 * Resolve the download limit for a product: per-product meta, else the
	 * store default, else whatever a filter decides. 0 means unlimited.
	 *
	 * @since  1.0.0
	 * @param  int $product_id WooCommerce product ID.
	 * @param  int $order_id   WooCommerce order ID.
	 * @return int
	 */
	private function resolve_limit( int $product_id, int $order_id ): int {
		$meta  = get_post_meta( $product_id, '_purecart_download_limit', true );
		$limit = ( '' === $meta || null === $meta )
			? (int) Settings::get( OptionKeys::DOWNLOAD_MAX_COUNT, 0 )
			: (int) $meta;

		/**
		 * Filters the number of times a download token may be used.
		 *
		 * @since 1.0.0
		 * @param int $limit      Download limit; 0 means unlimited.
		 * @param int $order_id   WooCommerce order ID.
		 * @param int $product_id WooCommerce product ID.
		 */
		$limit = (int) apply_filters( 'purecart_download_max_count', $limit, $order_id, $product_id );

		return max( 0, $limit );
	}

	/**
	 * Resolve a token's expiry timestamp, or null when it should never expire.
	 *
	 * @since  1.0.0
	 * @param  int $product_id WooCommerce product ID.
	 * @param  int $order_id   WooCommerce order ID.
	 * @return string|null     GMT datetime string, or null for no expiry.
	 */
	private function resolve_expiry( int $product_id, int $order_id ): ?string {
		$meta = get_post_meta( $product_id, '_purecart_download_expiry_days', true );
		$days = ( '' === $meta || null === $meta )
			? (int) Settings::get( OptionKeys::DOWNLOAD_EXPIRY_DAYS, 0 )
			: (int) $meta;

		$seconds = max( 0, $days ) * DAY_IN_SECONDS;

		/**
		 * Filters a download token's lifetime in seconds.
		 *
		 * @since 1.0.0
		 * @param int $seconds    Lifetime in seconds; 0 means the token never expires.
		 * @param int $order_id   WooCommerce order ID.
		 * @param int $product_id WooCommerce product ID.
		 */
		$seconds = (int) apply_filters( 'purecart_download_expiry_seconds', $seconds, $order_id, $product_id );

		if ( $seconds <= 0 ) {
			return null;
		}

		return gmdate( 'Y-m-d H:i:s', time() + $seconds );
	}
}

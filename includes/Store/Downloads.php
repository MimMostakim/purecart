<?php
/**
 * Database store for wp_purecart_downloads.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the secure download tokens table.
 *
 * One row per downloadable file per order item — a product carrying three
 * files produces three tokens, each with its own counter and expiry, so a
 * customer who exhausts one file's limit keeps access to the others.
 *
 * Two columns carry "unset" semantics rather than a sentinel row state:
 * `max_downloads = 0` means unlimited, and `expires_at IS NULL` means the
 * token never expires. Both are the defaults, matching WooCommerce's own
 * behaviour for a downloadable product with the fields left blank.
 *
 * @since 1.0.0
 */
class Downloads extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		// file_id is a VARCHAR, not an ID: WooCommerce keys the files of a
		// product by the MD5 hash returned from WC_Product::get_downloads(),
		// and that key is what links a token back to a specific file.
		return "CREATE TABLE {$wpdb->prefix}purecart_downloads (
            id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            order_id       BIGINT UNSIGNED NOT NULL DEFAULT 0,
            order_item_id  BIGINT UNSIGNED NOT NULL DEFAULT 0,
            user_id        BIGINT UNSIGNED NOT NULL DEFAULT 0,
            product_id     BIGINT UNSIGNED NOT NULL DEFAULT 0,
            license_id     BIGINT UNSIGNED NOT NULL DEFAULT 0,
            file_id        VARCHAR(64) NOT NULL DEFAULT '',
            token          VARCHAR(128) NOT NULL DEFAULT '',
            status         VARCHAR(20) NOT NULL DEFAULT 'active',
            download_count INT UNSIGNED NOT NULL DEFAULT 0,
            max_downloads  INT UNSIGNED NOT NULL DEFAULT 0,
            expires_at     DATETIME NULL DEFAULT NULL,
            ip_address     VARCHAR(45) NOT NULL DEFAULT '',
            country_code   VARCHAR(2)  NOT NULL DEFAULT '',
            created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY  token (token),
            KEY idx_order_user (order_id, user_id),
            KEY idx_order_item (order_item_id),
            KEY idx_product (product_id),
            KEY idx_status_expiry (status, expires_at)
        ) $charset;";
	}
}

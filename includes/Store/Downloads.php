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

		return "CREATE TABLE {$wpdb->prefix}purecart_downloads (
            id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            order_id       BIGINT UNSIGNED NOT NULL DEFAULT 0,
            user_id        BIGINT UNSIGNED NOT NULL DEFAULT 0,
            product_id     BIGINT UNSIGNED NOT NULL DEFAULT 0,
            file_id        BIGINT UNSIGNED NOT NULL DEFAULT 0,
            token          VARCHAR(128) NOT NULL DEFAULT '',
            download_count INT UNSIGNED NOT NULL DEFAULT 0,
            max_downloads  INT UNSIGNED NOT NULL DEFAULT 3,
            expires_at     DATETIME NOT NULL,
            ip_address     VARCHAR(45) NOT NULL DEFAULT '',
            country_code   VARCHAR(2)  NOT NULL DEFAULT '',
            created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY  token (token),
            KEY idx_order_user (order_id, user_id)
        ) $charset;";
	}
}

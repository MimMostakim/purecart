<?php
/**
 * Database store for wp_purecart_licenses.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the licenses table.
 *
 * @since 1.0.0
 */
class Licenses extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_licenses (
            id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            order_id         BIGINT UNSIGNED NOT NULL DEFAULT 0,
            user_id          BIGINT UNSIGNED NOT NULL DEFAULT 0,
            product_id       BIGINT UNSIGNED NOT NULL DEFAULT 0,
            license_key      VARCHAR(64)  NOT NULL DEFAULT '',
            plan_type        ENUM('single','multi','unlimited','lifetime') NOT NULL DEFAULT 'single',
            status           ENUM('active','expired','revoked','suspended') NOT NULL DEFAULT 'active',
            activation_limit INT UNSIGNED NOT NULL DEFAULT 1,
            activated_count  INT UNSIGNED NOT NULL DEFAULT 0,
            expires_at       DATETIME NULL DEFAULT NULL,
            created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY  license_key (license_key),
            KEY idx_user_id  (user_id),
            KEY idx_order_id (order_id),
            KEY idx_product  (product_id),
            KEY idx_status   (status)
        ) $charset;";
	}
}

<?php
/**
 * Database store for wp_purecart_license_activations.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the license activations table.
 *
 * @since 1.0.0
 */
class LicenseActivations extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_license_activations (
            id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            license_id   BIGINT UNSIGNED NOT NULL,
            domain       VARCHAR(255) NOT NULL DEFAULT '',
            ip_address   VARCHAR(45)  NOT NULL DEFAULT '',
            environment  ENUM('production','staging','local') NOT NULL DEFAULT 'production',
            activated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_check   DATETIME NULL DEFAULT NULL,
            PRIMARY KEY  (id),
            KEY idx_license_id (license_id),
            KEY idx_domain     (domain)
        ) $charset;";
	}
}

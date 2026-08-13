<?php
/**
 * Database store for wp_purecart_product_versions.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the product version / update manifest table.
 *
 * @since 1.0.0
 */
class ProductVersions extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_product_versions (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            product_id      BIGINT UNSIGNED NOT NULL,
            version         VARCHAR(20) NOT NULL DEFAULT '',
            file_path       TEXT        NOT NULL,
            checksum_sha256 VARCHAR(64) NOT NULL DEFAULT '',
            requires_wp     VARCHAR(10) NOT NULL DEFAULT '',
            tested_wp       VARCHAR(10) NOT NULL DEFAULT '',
            requires_php    VARCHAR(10) NOT NULL DEFAULT '',
            channel         ENUM('stable','beta') NOT NULL DEFAULT 'stable',
            changelog       LONGTEXT,
            released_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY idx_product_version (product_id, version),
            KEY idx_channel         (channel)
        ) $charset;";
	}
}

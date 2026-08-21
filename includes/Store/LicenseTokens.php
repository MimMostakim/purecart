<?php
/**
 * Database store for wp_purecart_license_tokens.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the license JWT tracking table.
 *
 * Each row is one issued access or refresh token (a "jti"), scoped to a
 * license + domain pair. See docs/RND-licensing-jwt.md.
 *
 * @since 1.0.0
 */
class LicenseTokens extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_license_tokens (
            id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            license_id   BIGINT UNSIGNED NOT NULL,
            jti          VARCHAR(64)  NOT NULL DEFAULT '',
            token_type   ENUM('access','refresh') NOT NULL DEFAULT 'access',
            domain       VARCHAR(255) NOT NULL DEFAULT '',
            expires_at   DATETIME NOT NULL,
            revoked      TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            revoked_at   DATETIME NULL DEFAULT NULL,
            created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY  jti            (jti),
            KEY         idx_license_id (license_id),
            KEY         idx_expires_at (expires_at),
            KEY         idx_revoked    (revoked)
        ) $charset;";
	}
}

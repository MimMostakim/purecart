<?php
/**
 * Database store for wp_purecart_saas_tokens.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the SaaS login JWT tracking table.
 *
 * Each row is one issued access or refresh token (a "jti"), scoped to a
 * SaaS account. Mirrors `wp_purecart_license_tokens` (Licensing module) —
 * no `domain` column here since SaaS login tokens aren't per-domain.
 *
 * @since 1.0.0
 */
class SaasTokens extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_saas_tokens (
            id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            account_id   BIGINT UNSIGNED NOT NULL,
            jti          VARCHAR(64)  NOT NULL DEFAULT '',
            token_type   ENUM('access','refresh') NOT NULL DEFAULT 'access',
            expires_at   DATETIME NOT NULL,
            revoked      TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            revoked_at   DATETIME NULL DEFAULT NULL,
            created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY  jti            (jti),
            KEY         idx_account_id (account_id),
            KEY         idx_expires_at (expires_at),
            KEY         idx_revoked    (revoked)
        ) $charset;";
	}
}

<?php
/**
 * Generates and rotates SaaS account API keys.
 *
 * @package PureCart\SaaS
 */

declare( strict_types=1 );

namespace PureCart\SaaS;

defined( 'ABSPATH' ) || exit;

/**
 * Owns the `purecart_`-prefixed API key lifecycle for SaaS accounts.
 *
 * @since 1.0.0
 */
class ApiKeyManager {

	/**
	 * Generate a new, cryptographically random API key.
	 *
	 * @since  1.0.0
	 * @return string
	 */
	public function generate(): string {
		return 'purecart_' . bin2hex( random_bytes( 24 ) );
	}

	/**
	 * Replace an account's API key with a freshly generated one. The old key
	 * stops authenticating the moment this returns.
	 *
	 * @since  1.0.0
	 * @param  int $account_id The purecart_saas_accounts row ID.
	 * @return string|null     The new API key, or null if the account wasn't found/updated.
	 */
	public function rotate( int $account_id ): ?string {
		global $wpdb;

		$new_key = $this->generate();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Key rotation must take effect immediately.
		$updated = $wpdb->update(
			$wpdb->prefix . 'purecart_saas_accounts',
			array( 'api_key' => $new_key ),
			array( 'id' => $account_id ),
			array( '%s' ),
			array( '%d' )
		);

		if ( ! $updated ) {
			return null;
		}

		do_action( 'purecart_api_key_rotated', $account_id, $new_key );

		return $new_key;
	}

	/**
	 * Permanently disable an account's API key without changing its status.
	 *
	 * The key is not blanked to an empty string. `api_key` carries a UNIQUE
	 * index on the table, and a second revoked account would collide on ''
	 * and fail its own update. Instead the key is overwritten with a random
	 * value shaped so it can never be mistaken for (or collide with) a real
	 * `purecart_` + 48-hex-char key, while staying unique across every
	 * revoked account.
	 *
	 * @since  1.0.0
	 * @param  int $account_id The purecart_saas_accounts row ID.
	 * @return bool True if the key was revoked, false otherwise.
	 */
	public function revoke( int $account_id ): bool {
		global $wpdb;

		$revoked_marker = 'revoked_' . $account_id . '_' . bin2hex( random_bytes( 8 ) );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Key revocation must take effect immediately.
		$updated = $wpdb->update(
			$wpdb->prefix . 'purecart_saas_accounts',
			array( 'api_key' => $revoked_marker ),
			array( 'id' => $account_id ),
			array( '%s' ),
			array( '%d' )
		);

		return (bool) $updated;
	}
}

<?php
/**
 * Revokes all outstanding JWTs for a license.
 *
 * @package PureCart\Licensing
 */

declare( strict_types=1 );

namespace PureCart\Licensing;

defined( 'ABSPATH' ) || exit;

/**
 * Blacklists every outstanding JWT for a license (revoke/expire kill-switch).
 *
 * @since 1.0.0
 */
class LicenseTokenRevoker {

	/**
	 * Mark every non-revoked token row for a license as revoked.
	 *
	 * @since  1.0.0
	 * @param  int $license_id License row ID.
	 * @return void
	 */
	public function revoke_all( int $license_id ): void {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Revocation must be immediate.
		$wpdb->update(
			$wpdb->prefix . 'purecart_license_tokens',
			array(
				'revoked'    => 1,
				'revoked_at' => current_time( 'mysql' ),
			),
			array(
				'license_id' => $license_id,
				'revoked'    => 0,
			),
			array( '%d', '%s' ),
			array( '%d', '%d' )
		);

		do_action( 'purecart_jwt_tokens_revoked', $license_id );
	}
}

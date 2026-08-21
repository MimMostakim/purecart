<?php
/**
 * Wires the JWT token layer into the existing license lifecycle hooks.
 *
 * @package PureCart\Licensing
 */

declare( strict_types=1 );

namespace PureCart\Licensing;

defined( 'ABSPATH' ) || exit;

/**
 * Token issuance on activation happens synchronously in
 * RestApi::license_activate() (the REST response needs the token pair back,
 * not just a fire-and-forget action) — this class only covers revocation,
 * which every listener (ours included) can react to asynchronously via
 * the standard action hooks.
 *
 * @since 1.0.0
 */
class JwtHooks {

	/**
	 * Register the JWT-related listeners on the license lifecycle hooks.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'purecart_license_revoked', array( $this, 'on_license_revoked' ), 10, 1 );
		add_action( 'purecart_licenses_expired', array( $this, 'on_licenses_expired' ), 10, 1 );
		add_action( 'purecart_cleanup_expired_tokens', array( $this, 'on_cleanup' ) );
	}

	/**
	 * A single license was revoked — blacklist every outstanding token for it.
	 *
	 * @since  1.0.0
	 * @param  int $license_id License row ID.
	 * @return void
	 */
	public function on_license_revoked( int $license_id ): void {
		( new LicenseTokenRevoker() )->revoke_all( $license_id );
	}

	/**
	 * A batch of licenses expired — blacklist every outstanding token for each.
	 *
	 * @since  1.0.0
	 * @param  int[] $expired_license_ids License row IDs.
	 * @return void
	 */
	public function on_licenses_expired( array $expired_license_ids ): void {
		$revoker = new LicenseTokenRevoker();
		foreach ( $expired_license_ids as $license_id ) {
			$revoker->revoke_all( (int) $license_id );
		}
	}

	/**
	 * Action Scheduler job: purge old token rows.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function on_cleanup(): void {
		( new LicenseTokenCleanup() )->run();
	}
}

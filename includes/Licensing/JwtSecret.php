<?php
/**
 * Resolves the HS256 secret used to sign license JWTs.
 *
 * @package PureCart\Licensing
 */

declare( strict_types=1 );

namespace PureCart\Licensing;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Shared by LicenseTokenIssuer, LicenseTokenValidator, and LicenseTokenRefresher.
 *
 * @since 1.0.0
 */
class JwtSecret {

	/**
	 * Return the signing secret, auto-generating and persisting one on
	 * first use if neither the PURECART_JWT_SECRET_KEY constant nor the
	 * stored option is set yet.
	 *
	 * @since  1.0.0
	 * @return string
	 */
	public static function get(): string {
		if ( defined( 'PURECART_JWT_SECRET_KEY' ) && PURECART_JWT_SECRET_KEY ) {
			return (string) PURECART_JWT_SECRET_KEY;
		}

		$secret = (string) Settings::get( OptionKeys::LICENSE_JWT_SECRET, '' );

		if ( '' === $secret ) {
			$secret = wp_generate_password( 64, true, true );
			Settings::set( OptionKeys::LICENSE_JWT_SECRET, $secret );
		}

		return $secret;
	}
}

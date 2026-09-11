<?php
/**
 * Resolves the HS256 secret used to sign SaaS login JWTs.
 *
 * @package PureCart\SaaS
 */

declare( strict_types=1 );

namespace PureCart\SaaS;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Shared by JwtIssuer. Deliberately its own secret, separate from
 * OptionKeys::LICENSE_JWT_SECRET — a SaaS login token and a license
 * activation token authenticate different things and should not be
 * forgeable from one leaked secret to the other.
 *
 * @since 1.0.0
 */
class JwtSecret {

	/**
	 * Return the signing secret, auto-generating and persisting one on
	 * first use if neither the PURECART_SAAS_JWT_SECRET_KEY constant nor
	 * the stored option is set yet.
	 *
	 * @since  1.0.0
	 * @return string
	 */
	public static function get(): string {
		if ( defined( 'PURECART_SAAS_JWT_SECRET_KEY' ) && PURECART_SAAS_JWT_SECRET_KEY ) {
			return (string) PURECART_SAAS_JWT_SECRET_KEY;
		}

		$secret = (string) Settings::get( OptionKeys::SAAS_JWT_SECRET, '' );

		if ( '' === $secret ) {
			$secret = wp_generate_password( 64, true, true );
			Settings::set( OptionKeys::SAAS_JWT_SECRET, $secret );
		}

		return $secret;
	}
}

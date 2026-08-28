<?php
/**
 * Decodes + verifies an incoming access-token JWT for the /license/check Bearer path.
 *
 * @package PureCart\Licensing
 */

declare( strict_types=1 );

namespace PureCart\Licensing;

defined( 'ABSPATH' ) || exit;

/**
 * Deliberately does no DB lookup — see docs/RND-licensing-jwt.md
 * "Why Not Validate JTI on Every /check Call?". That's the entire
 * performance point of the JWT layer; JTI is only checked on refresh
 * (LicenseTokenRefresher).
 *
 * @since 1.0.0
 */
class LicenseTokenValidator {

	/**
	 * Verify signature + exp/nbf and return the decoded payload.
	 *
	 * @since  1.0.0
	 * @param  string $jwt The compact JWT string (without the "Bearer " prefix).
	 * @return array<string,mixed>|\WP_Error
	 */
	public function validate( string $jwt ): array|\WP_Error {
		try {
			return Jwt::decode( $jwt, JwtSecret::get() );
		} catch ( \UnexpectedValueException $e ) {
			return new \WP_Error( 'purecart_invalid_token', $e->getMessage(), array( 'status' => 401 ) );
		}
	}
}

<?php
/**
 * Validates a refresh token and issues a new access token.
 *
 * @package PureCart\Licensing
 */

declare( strict_types=1 );

namespace PureCart\Licensing;

defined( 'ABSPATH' ) || exit;

/**
 * See docs/RND-licensing-jwt.md "3. REFRESH" and "Token Refresh — Request/Response".
 *
 * @since 1.0.0
 */
class LicenseTokenRefresher {

	/**
	 * Validate a refresh token and issue a new access token.
	 *
	 * @since  1.0.0
	 * @param  string $refresh_token The refresh JWT presented by the client.
	 * @return array{access_token: string, expires_in: int}|\WP_Error
	 */
	public function refresh( string $refresh_token ): array|\WP_Error {
		global $wpdb;

		try {
			$payload = Jwt::decode( $refresh_token, JwtSecret::get() );
		} catch ( \UnexpectedValueException $e ) {
			return new \WP_Error( 'invalid_refresh_token', __( 'Refresh token is invalid or has expired.', 'purecart' ), array( 'status' => 401 ) );
		}

		$jti = (string) ( $payload['jti'] ?? '' );
		if ( '' === $jti ) {
			return new \WP_Error( 'invalid_refresh_token', __( 'Refresh token is invalid or has expired.', 'purecart' ), array( 'status' => 401 ) );
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Refresh must see the current, real-time license + token state.
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT lt.license_id, lt.domain, lt.revoked, lt.expires_at,
                        l.license_key, l.status AS license_status, l.expires_at AS license_expires_at
                   FROM {$wpdb->prefix}purecart_license_tokens lt
                   JOIN {$wpdb->prefix}purecart_licenses l ON l.id = lt.license_id
                  WHERE lt.jti = %s AND lt.token_type = 'refresh'
                  LIMIT 1",
				$jti
			)
		);

		if ( ! $row
			|| (int) $row->revoked
			|| strtotime( (string) $row->expires_at ) < time()
		) {
			return new \WP_Error( 'invalid_refresh_token', __( 'Refresh token is invalid or has expired.', 'purecart' ), array( 'status' => 401 ) );
		}

		/**
		 * Filter the rate limit for token refresh per hour per license key.
		 *
		 * @since 1.0.0
		 * @param int $limit Max refresh calls per hour.
		 */
		$rate_limit = (int) apply_filters( 'purecart_jwt_refresh_rate_limit', 10 );
		$rate_key   = 'purecart_refresh_rate_' . md5( $row->license_key );
		$count      = (int) get_transient( $rate_key );

		if ( $count >= $rate_limit ) {
			return new \WP_Error( 'rate_limited', __( 'Too many refresh attempts. Please try again later.', 'purecart' ), array( 'status' => 429 ) );
		}
		set_transient( $rate_key, $count + 1, HOUR_IN_SECONDS );

		if ( 'revoked' === $row->license_status ) {
			return new \WP_Error( 'license_revoked', __( 'This license has been revoked.', 'purecart' ), array( 'status' => 403 ) );
		}

		if ( 'expired' === $row->license_status
			|| ( $row->license_expires_at && strtotime( (string) $row->license_expires_at ) < time() )
		) {
			return new \WP_Error( 'license_expired', __( 'Your license has expired. Please renew to continue.', 'purecart' ), array( 'status' => 403 ) );
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Environment isn't in the token claims; look up the activation's recorded value for the new access token's 'env' claim.
		$environment = (string) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT environment FROM {$wpdb->prefix}purecart_license_activations
                  WHERE license_id = %d AND domain = %s LIMIT 1",
				$row->license_id,
				$row->domain
			)
		);

		$issued = ( new LicenseTokenIssuer() )->issue_access(
			(int) $row->license_id,
			(string) $row->domain,
			'' !== $environment ? $environment : 'production'
		);

		if ( ! $issued ) {
			return new \WP_Error( 'invalid_refresh_token', __( 'Refresh token is invalid or has expired.', 'purecart' ), array( 'status' => 401 ) );
		}

		do_action( 'purecart_jwt_token_refreshed', $issued['jti'], $jti, (int) $row->license_id );

		return array(
			'access_token' => $issued['access_token'],
			'expires_in'   => $issued['expires_in'],
		);
	}
}

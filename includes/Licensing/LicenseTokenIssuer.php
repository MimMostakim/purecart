<?php
/**
 * Issues access + refresh JWTs for an activated license+domain pair.
 *
 * @package PureCart\Licensing
 */

declare( strict_types=1 );

namespace PureCart\Licensing;

defined( 'ABSPATH' ) || exit;

/**
 * See docs/RND-licensing-jwt.md "JWT Token Design" / "Token Lifecycle".
 *
 * @since 1.0.0
 */
class LicenseTokenIssuer {

	/**
	 * Issue a fresh access + refresh token pair for a license activation.
	 *
	 * @since  1.0.0
	 * @param  int    $license_id  License row ID.
	 * @param  string $domain      The activated domain.
	 * @param  string $environment Deployment environment recorded on the activation.
	 * @return array{access_token: string, refresh_token: string, expires_in: int}|null Null if the license no longer exists.
	 */
	public function issue( int $license_id, string $domain, string $environment = 'production' ): ?array {
		global $wpdb;

		$license = ( new LicenseGenerator() )->get_by_id( $license_id );
		if ( ! $license ) {
			return null;
		}

		// Filter: purecart_jwt_refresh_expire — refresh token TTL in seconds. Since 1.0.0.
		$refresh_ttl = (int) apply_filters( 'purecart_jwt_refresh_expire', 30 * DAY_IN_SECONDS );

		$now         = time();
		$refresh_jti = wp_generate_uuid4();

		$access = $this->build_access_token( $license, $domain, $environment );
		if ( ! $access ) {
			return null;
		}

		$refresh_payload = array(
			'iss'    => home_url(),
			'iat'    => $now,
			'exp'    => $now + $refresh_ttl,
			'jti'    => $refresh_jti,
			'sub'    => 'license_id:' . $license->id,
			'domain' => $domain,
		);

		$refresh_token = Jwt::encode( $refresh_payload, JwtSecret::get() );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available.
		$wpdb->insert(
			$wpdb->prefix . 'purecart_license_tokens',
			array(
				'license_id' => $license->id,
				'jti'        => $refresh_jti,
				'token_type' => 'refresh',
				'domain'     => $domain,
				'expires_at' => gmdate( 'Y-m-d H:i:s', $now + $refresh_ttl ),
				'created_at' => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s' )
		);

		do_action( 'purecart_jwt_token_issued', $access['jti'], $refresh_jti, $license->id, $domain );

		return array(
			'access_token'  => $access['token'],
			'refresh_token' => $refresh_token,
			'expires_in'    => $access['expires_in'],
		);
	}

	/**
	 * Issue a new access token only, without touching any refresh token.
	 *
	 * Used by LicenseTokenRefresher: the doc's REST contract for
	 * `/license/token/refresh` returns only `{ access_token, expires_in }`,
	 * so the existing refresh token stays valid until its own 30-day expiry
	 * rather than being rotated on every call (rotating it here without
	 * also returning the new refresh token to the caller would strand the
	 * client with a revoked one on its next refresh).
	 *
	 * @since  1.0.0
	 * @param  int    $license_id  License row ID.
	 * @param  string $domain      The activated domain.
	 * @param  string $environment Deployment environment recorded on the activation.
	 * @return array{access_token: string, expires_in: int, jti: string}|null
	 */
	public function issue_access( int $license_id, string $domain, string $environment = 'production' ): ?array {
		$license = ( new LicenseGenerator() )->get_by_id( $license_id );
		if ( ! $license ) {
			return null;
		}

		$access = $this->build_access_token( $license, $domain, $environment );
		if ( ! $access ) {
			return null;
		}

		return array(
			'access_token' => $access['token'],
			'expires_in'   => $access['expires_in'],
			'jti'          => $access['jti'],
		);
	}

	/**
	 * Build, sign, and persist a single access token row.
	 *
	 * @since  1.0.0
	 * @param  object $license     License DB row.
	 * @param  string $domain      Activated domain.
	 * @param  string $environment Deployment environment.
	 * @return array{token: string, expires_in: int, jti: string}
	 */
	private function build_access_token( object $license, string $domain, string $environment ): array {
		global $wpdb;

		// Filter: purecart_jwt_expire — access token TTL in seconds. Since 1.0.0.
		$access_ttl = (int) apply_filters( 'purecart_jwt_expire', 7 * DAY_IN_SECONDS );

		$now        = time();
		$access_jti = wp_generate_uuid4();

		/**
		 * Filter the plan feature flags embedded in the JWT `lic.features` claim.
		 *
		 * @since 1.0.0
		 * @param string[] $features Feature flag slugs.
		 * @param object   $license  License DB row.
		 * @param string   $domain   Activated domain.
		 */
		$features = apply_filters( 'purecart_license_features', array(), $license, $domain );

		$payload = array(
			'iss' => home_url(),
			'iat' => $now,
			'nbf' => $now,
			'exp' => $now + $access_ttl,
			'jti' => $access_jti,
			'lic' => array(
				'key'        => $license->license_key,
				'domain'     => $domain,
				'env'        => $environment,
				'plan'       => $license->plan_type,
				'limit'      => (int) $license->activation_limit,
				'count'      => (int) $license->activated_count,
				'expires_at' => $license->expires_at,
				'features'   => array_values( (array) $features ),
			),
		);

		/**
		 * Filter the JWT payload before signing. Add custom claims to the 'lic' namespace.
		 *
		 * @since 1.0.0
		 * @param array  $payload JWT payload array.
		 * @param object $license License DB row.
		 * @param string $domain  Activated domain.
		 */
		$payload = apply_filters( 'purecart_jwt_payload', $payload, $license, $domain );

		$token = Jwt::encode( $payload, JwtSecret::get() );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available.
		$wpdb->insert(
			$wpdb->prefix . 'purecart_license_tokens',
			array(
				'license_id' => $license->id,
				'jti'        => $access_jti,
				'token_type' => 'access',
				'domain'     => $domain,
				'expires_at' => gmdate( 'Y-m-d H:i:s', $now + $access_ttl ),
				'created_at' => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s' )
		);

		return array(
			'token'      => $token,
			'expires_in' => $access_ttl,
			'jti'        => $access_jti,
		);
	}
}

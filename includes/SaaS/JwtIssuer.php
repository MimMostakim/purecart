<?php
/**
 * Issues access + refresh JWTs for SaaS account login.
 *
 * @package PureCart\SaaS
 */

declare( strict_types=1 );

namespace PureCart\SaaS;

use PureCart\Licensing\Jwt;
use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Reuses PureCart\Licensing\Jwt — a dependency-free HS256 codec with no
 * license-specific logic in it — rather than adding firebase/php-jwt as a
 * Composer dependency. docs/RND-saas-provisioning.md's "JWT Library
 * Decision" section assumed firebase/php-jwt was already required by
 * composer.json; it isn't (composer.json has no runtime "require" beyond
 * PHP itself — see Autoloader.php: "Works without composer install"). The
 * in-house codec is what the Licensing module already ships and tests.
 *
 * @since 1.0.0
 */
class JwtIssuer {

	/**
	 * Issue a fresh access + refresh token pair for an API key.
	 *
	 * @since  1.0.0
	 * @param  string $api_key The account's `purecart_`-prefixed API key.
	 * @return array{access_token: string, refresh_token: string, expires_in: int, refresh_expires_in: int}|\WP_Error
	 */
	public function issue( string $api_key ): array|\WP_Error {
		$account = ( new AccountProvisioner() )->get_by_api_key( $api_key );

		if ( ! $account ) {
			return new \WP_Error( 'invalid_api_key', __( 'Unknown API key.', 'purecart' ), array( 'status' => 401 ) );
		}

		if ( 'active' !== $account->status ) {
			return new \WP_Error( 'account_suspended', __( 'This SaaS account is not active.', 'purecart' ), array( 'status' => 403 ) );
		}

		return $this->issue_pair( $account );
	}

	/**
	 * Validate a refresh token and issue a new access token.
	 *
	 * Mirrors Licensing\LicenseTokenRefresher: the refresh token itself is
	 * not rotated on every call — it stays valid until its own expiry, and
	 * only a new access token is returned. Rotating it here without handing
	 * the new refresh token back to the caller would strand the client with
	 * a token it can no longer use on its next refresh.
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

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Refresh must see the current, real-time token state.
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT account_id, revoked, expires_at
                   FROM {$wpdb->prefix}purecart_saas_tokens
                  WHERE jti = %s AND token_type = 'refresh'
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
		 * Filter the rate limit for token refresh per hour per SaaS account.
		 *
		 * @since 1.0.0
		 * @param int $limit Max refresh calls per hour.
		 */
		$rate_limit = (int) apply_filters( 'purecart_saas_jwt_refresh_rate_limit', 10 );
		$rate_key   = 'purecart_saas_refresh_rate_' . (int) $row->account_id;
		$count      = (int) get_transient( $rate_key );

		if ( $count >= $rate_limit ) {
			return new \WP_Error( 'rate_limited', __( 'Too many refresh attempts. Please try again later.', 'purecart' ), array( 'status' => 429 ) );
		}
		set_transient( $rate_key, $count + 1, HOUR_IN_SECONDS );

		$account = ( new AccountProvisioner() )->get_by_id( (int) $row->account_id );

		if ( ! $account || 'active' !== $account->status ) {
			return new \WP_Error( 'account_suspended', __( 'This SaaS account is not active.', 'purecart' ), array( 'status' => 403 ) );
		}

		$access = $this->build_access_token( $account );

		do_action( 'purecart_saas_jwt_token_refreshed', $access['jti'], $jti, $account->id );

		return array(
			'access_token' => $access['token'],
			'expires_in'   => $access['expires_in'],
		);
	}

	/**
	 * Build a full access + refresh token pair for an account and persist
	 * the refresh token's tracking row.
	 *
	 * @since  1.0.0
	 * @param  object $account SaaS account DB row.
	 * @return array{access_token: string, refresh_token: string, expires_in: int, refresh_expires_in: int}
	 */
	private function issue_pair( object $account ): array {
		global $wpdb;

		$refresh_ttl = (int) Settings::get( OptionKeys::SAAS_JWT_REFRESH_SECONDS, 30 * DAY_IN_SECONDS );

		$now         = time();
		$refresh_jti = wp_generate_uuid4();

		$access = $this->build_access_token( $account );

		$refresh_payload = array(
			'iss' => home_url(),
			'iat' => $now,
			'exp' => $now + $refresh_ttl,
			'jti' => $refresh_jti,
			'sub' => 'saas_account_id:' . $account->id,
		);

		$refresh_token = Jwt::encode( $refresh_payload, JwtSecret::get() );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available.
		$wpdb->insert(
			$wpdb->prefix . 'purecart_saas_tokens',
			array(
				'account_id' => $account->id,
				'jti'        => $refresh_jti,
				'token_type' => 'refresh',
				'expires_at' => gmdate( 'Y-m-d H:i:s', $now + $refresh_ttl ),
				'created_at' => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%s', '%s' )
		);

		do_action( 'purecart_saas_jwt_token_issued', $access['jti'], $refresh_jti, $account->id );

		return array(
			'access_token'       => $access['token'],
			'refresh_token'      => $refresh_token,
			'expires_in'         => $access['expires_in'],
			'refresh_expires_in' => $refresh_ttl,
		);
	}

	/**
	 * Build, sign, and persist a single access token row.
	 *
	 * The token deliberately does not carry the raw `api_key` as a claim —
	 * the access token itself is the credential from here on, and embedding
	 * the API key would mean a decoded (not even cracked, just base64-
	 * decoded) token leaks it, and a rotated key would leave stale, still
	 * technically-valid-looking key material sitting in old tokens.
	 *
	 * @since  1.0.0
	 * @param  object $account SaaS account DB row.
	 * @return array{token: string, expires_in: int, jti: string}
	 */
	private function build_access_token( object $account ): array {
		global $wpdb;

		$access_ttl = (int) Settings::get( OptionKeys::SAAS_JWT_EXPIRY_SECONDS, 600 );

		$now        = time();
		$access_jti = wp_generate_uuid4();

		$payload = array(
			'iss'  => home_url(),
			'iat'  => $now,
			'nbf'  => $now,
			'exp'  => $now + $access_ttl,
			'jti'  => $access_jti,
			'saas' => array(
				'account_id' => (int) $account->id,
				'user_id'    => (int) $account->user_id,
				'plan'       => $account->plan,
			),
		);

		/**
		 * Filter the JWT payload before signing. Add custom claims to the 'saas' namespace.
		 *
		 * @since 1.0.0
		 * @param array  $payload JWT payload array.
		 * @param object $account SaaS account DB row.
		 */
		$payload = apply_filters( 'purecart_saas_jwt_payload', $payload, $account );

		$token = Jwt::encode( $payload, JwtSecret::get() );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available.
		$wpdb->insert(
			$wpdb->prefix . 'purecart_saas_tokens',
			array(
				'account_id' => $account->id,
				'jti'        => $access_jti,
				'token_type' => 'access',
				'expires_at' => gmdate( 'Y-m-d H:i:s', $now + $access_ttl ),
				'created_at' => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%s', '%s' )
		);

		return array(
			'token'      => $token,
			'expires_in' => $access_ttl,
			'jti'        => $access_jti,
		);
	}
}

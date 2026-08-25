<?php
/**
 * Minimal, dependency-free HS256 JSON Web Token encoder/decoder.
 *
 * Deliberately not using firebase/php-jwt — the plugin is meant to run
 * without a `composer install` step (see Autoloader.php's own docblock:
 * "Works without composer install — the plugin is fully self-contained"),
 * and RS256/Phase-2 algorithms aren't needed yet, so a small in-house HS256
 * implementation avoids adding a Composer dependency for one algorithm.
 *
 * @package PureCart\Licensing
 */

declare( strict_types=1 );

namespace PureCart\Licensing;

defined( 'ABSPATH' ) || exit;

/**
 * Encode/decode HS256 JWTs.
 *
 * @since 1.0.0
 */
class Jwt {

	/**
	 * Sign a payload into a compact JWT string.
	 *
	 * @since  1.0.0
	 * @param  array<string,mixed> $payload Claims to encode.
	 * @param  string              $secret  HMAC signing secret.
	 * @return string
	 */
	public static function encode( array $payload, string $secret ): string {
		$header = array(
			'typ' => 'JWT',
			'alg' => 'HS256',
		);

		$segments   = array();
		$segments[] = self::base64url_encode( (string) wp_json_encode( $header ) );
		$segments[] = self::base64url_encode( (string) wp_json_encode( $payload ) );

		$signing_input = implode( '.', $segments );
		$signature     = hash_hmac( 'sha256', $signing_input, $secret, true );
		$segments[]    = self::base64url_encode( $signature );

		return implode( '.', $segments );
	}

	/**
	 * Decode and verify a JWT's signature and standard time-based claims.
	 *
	 * @since  1.0.0
	 * @param  string $jwt    The compact JWT string.
	 * @param  string $secret HMAC signing secret.
	 * @throws \UnexpectedValueException If the token is malformed, the signature is invalid, or exp/nbf fail.
	 * @return array<string,mixed> The decoded payload.
	 */
	public static function decode( string $jwt, string $secret ): array {
		$parts = explode( '.', $jwt );
		if ( 3 !== count( $parts ) ) {
			throw new \UnexpectedValueException( 'Wrong number of segments.' );
		}

		list( $header_b64, $payload_b64, $signature_b64 ) = $parts;

		$header = json_decode( self::base64url_decode( $header_b64 ), true );
		if ( ! is_array( $header ) || ( $header['alg'] ?? '' ) !== 'HS256' ) {
			throw new \UnexpectedValueException( 'Unsupported or missing algorithm.' );
		}

		$payload = json_decode( self::base64url_decode( $payload_b64 ), true );
		if ( ! is_array( $payload ) ) {
			throw new \UnexpectedValueException( 'Invalid payload encoding.' );
		}

		$signing_input      = $header_b64 . '.' . $payload_b64;
		$expected_signature = hash_hmac( 'sha256', $signing_input, $secret, true );
		$actual_signature   = self::base64url_decode( $signature_b64 );

		if ( ! hash_equals( $expected_signature, $actual_signature ) ) {
			throw new \UnexpectedValueException( 'Signature verification failed.' );
		}

		$now = time();

		if ( isset( $payload['nbf'] ) && $now < (int) $payload['nbf'] ) {
			throw new \UnexpectedValueException( 'Cannot handle token prior to nbf.' );
		}

		if ( isset( $payload['exp'] ) && $now >= (int) $payload['exp'] ) {
			throw new \UnexpectedValueException( 'Expired token.' );
		}

		return $payload;
	}

	/**
	 * Base64url-encode a raw string (RFC 4648 §5 — no padding).
	 *
	 * @since  1.0.0
	 * @param  string $data Raw bytes.
	 * @return string
	 */
	private static function base64url_encode( string $data ): string {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
	}

	/**
	 * Base64url-decode a string back to raw bytes.
	 *
	 * @since  1.0.0
	 * @param  string $data Base64url-encoded string.
	 * @return string
	 */
	private static function base64url_decode( string $data ): string {
		$padded = str_pad( $data, strlen( $data ) % 4 === 0 ? strlen( $data ) : strlen( $data ) + ( 4 - strlen( $data ) % 4 ), '=' );
		return (string) base64_decode( strtr( $padded, '-_', '+/' ), true );
	}
}

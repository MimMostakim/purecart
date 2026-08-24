<?php
/**
 * Signed, expiring, single-use download URLs for update packages.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

use PureCart\Licensing\LicenseGenerator;

defined( 'ABSPATH' ) || exit;

/**
 * Update packages are never reachable at a guessable path. Every download goes
 * through `/purecart-update/{token}.{signature}`, where the token is an
 * HMAC-SHA256-signed payload naming the package, the license it was issued to,
 * an expiry, and a one-time ID (RND-auto-updates.md § "Signed Download URL").
 *
 * Deliberately *stateless* on the issue side — unlike
 * `Downloads\TokenManager`, which writes a row per token. An update check runs
 * every 12 hours on every installed copy of a product; a store with 5,000
 * customers would generate 10,000 token rows a day for links that are mostly
 * never clicked. The signature makes the DB write unnecessary: the server can
 * verify a token it never stored. Only *use* is recorded, as a short-lived
 * transient, and only to stop replay.
 *
 * @since 1.0.0
 */
class UpdateDelivery {

	/** Query var carrying the token. */
	public const QUERY_VAR = 'purecart_update_token';

	/** URL prefix for package downloads. */
	public const URL_PREFIX = 'purecart-update';

	/** Option holding the HMAC secret. */
	private const SECRET_OPTION = 'purecart_update_secret';

	/** Transient prefix for spent token IDs. */
	private const REPLAY_PREFIX = 'purecart_upd_jti_';

	/** Default signed-URL lifetime, in seconds. */
	private const DEFAULT_TTL = 900;

	/** @var PackageRepository */
	private PackageRepository $packages;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->packages = new PackageRepository();

		add_action( 'init', array( $this, 'add_rewrite' ) );
		add_filter( 'query_vars', array( $this, 'query_vars' ) );
		add_action( 'template_redirect', array( $this, 'handle_download' ) );
	}

	// -----------------------------------------------------------------------
	// Routing
	// -----------------------------------------------------------------------

	/**
	 * The token contains base64url characters plus a `.` separating the
	 * signature, so the pattern must accept `-`, `_` and `.`.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function add_rewrite(): void {
		add_rewrite_rule(
			'^' . self::URL_PREFIX . '/([A-Za-z0-9_\-.]+)/?$',
			'index.php?' . self::QUERY_VAR . '=$matches[1]',
			'top'
		);
	}

	/**
	 * @since 1.0.0
	 * @param string[] $vars Existing public query variables.
	 * @return string[]
	 */
	public function query_vars( array $vars ): array {
		$vars[] = self::QUERY_VAR;
		return $vars;
	}

	// -----------------------------------------------------------------------
	// Secret
	// -----------------------------------------------------------------------

	/**
	 * The HMAC signing secret, generated on first use.
	 *
	 * Kept separate from WordPress's own salts so that regenerating it (to
	 * invalidate every outstanding download link) doesn't log every user out.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public function secret(): string {
		$secret = (string) get_option( self::SECRET_OPTION, '' );

		if ( '' === $secret ) {
			$secret = bin2hex( random_bytes( 32 ) );
			// autoload so the common path (verifying a token) costs no query.
			add_option( self::SECRET_OPTION, $secret, '', 'yes' );
		}

		return $secret;
	}

	/**
	 * Replace the signing secret, invalidating every outstanding link.
	 *
	 * @since 1.0.0
	 * @return string The new secret.
	 */
	public function regenerate_secret(): string {
		$secret = bin2hex( random_bytes( 32 ) );
		update_option( self::SECRET_OPTION, $secret );

		return $secret;
	}

	// -----------------------------------------------------------------------
	// Issuing
	// -----------------------------------------------------------------------

	/**
	 * Signed-URL lifetime in seconds.
	 *
	 * @since 1.0.0
	 * @return int
	 */
	public function ttl(): int {
		/**
		 * Filters how long a signed package URL stays valid.
		 *
		 * Note for anyone raising this: the client caches the update-check
		 * response (including this URL) for 12 hours, so a TTL shorter than
		 * the gap between "WordPress noticed the update" and "the user clicked
		 * Update" produces an expired link. PureCartUpdater avoids that by
		 * re-requesting a fresh URL immediately before downloading rather than
		 * using the cached one — see that class's upgrader_pre_download hook.
		 *
		 * @since 1.0.0
		 * @param int $ttl Seconds. Default 900 (15 minutes).
		 */
		return max( 60, (int) apply_filters( 'purecart_update_token_ttl', self::DEFAULT_TTL ) );
	}

	/**
	 * Mint a signed token for a package.
	 *
	 * @since 1.0.0
	 * @param int      $package_id Package row ID.
	 * @param int|null $license_id License row ID, or null when no license gate applies.
	 * @return string `{payload}.{signature}`
	 */
	public function issue_token( int $package_id, ?int $license_id = null ): string {
		$payload = array(
			'pkg' => $package_id,
			'lic' => $license_id,
			'exp' => time() + $this->ttl(),
			'jti' => bin2hex( random_bytes( 8 ) ),
		);

		$encoded = self::base64url_encode( (string) wp_json_encode( $payload ) );

		return $encoded . '.' . hash_hmac( 'sha256', $encoded, $this->secret() );
	}

	/**
	 * Full download URL for a package.
	 *
	 * @since 1.0.0
	 * @param int      $package_id Package row ID.
	 * @param int|null $license_id License row ID, or null.
	 * @return string
	 */
	public function download_url( int $package_id, ?int $license_id = null ): string {
		return home_url( '/' . self::URL_PREFIX . '/' . $this->issue_token( $package_id, $license_id ) );
	}

	// -----------------------------------------------------------------------
	// Verifying
	// -----------------------------------------------------------------------

	/**
	 * Verify a token's signature, expiry and replay status.
	 *
	 * @since 1.0.0
	 * @param string $raw       The `{payload}.{signature}` string.
	 * @param bool   $spend     Whether to mark the token used (false = inspect only).
	 * @return array<string, mixed>|\WP_Error Decoded payload, or an error.
	 */
	public function verify_token( string $raw, bool $spend = true ) {
		// Split at the LAST dot: base64url never contains one, but being
		// explicit keeps this correct if the payload encoding ever changes.
		$split = strrpos( $raw, '.' );
		if ( false === $split ) {
			return new \WP_Error( 'purecart_token_malformed', __( 'Malformed download token.', 'purecart' ), array( 'status' => 400 ) );
		}

		$encoded   = substr( $raw, 0, $split );
		$signature = substr( $raw, $split + 1 );

		$expected = hash_hmac( 'sha256', $encoded, $this->secret() );

		// hash_equals(), not === : a plain comparison returns as soon as two
		// bytes differ, and that timing difference is enough to recover a
		// valid signature byte by byte.
		if ( ! hash_equals( $expected, $signature ) ) {
			return new \WP_Error( 'purecart_token_invalid', __( 'Invalid download token.', 'purecart' ), array( 'status' => 403 ) );
		}

		$payload = json_decode( (string) self::base64url_decode( $encoded ), true );
		if ( ! is_array( $payload ) || ! isset( $payload['pkg'], $payload['exp'], $payload['jti'] ) ) {
			return new \WP_Error( 'purecart_token_malformed', __( 'Malformed download token.', 'purecart' ), array( 'status' => 400 ) );
		}

		if ( time() > (int) $payload['exp'] ) {
			return new \WP_Error( 'purecart_token_expired', __( 'This download link has expired.', 'purecart' ), array( 'status' => 403 ) );
		}

		$replay_key = self::REPLAY_PREFIX . $payload['jti'];

		if ( get_transient( $replay_key ) ) {
			return new \WP_Error( 'purecart_token_spent', __( 'This download link has already been used.', 'purecart' ), array( 'status' => 403 ) );
		}

		if ( $spend ) {
			// Held only until the token would have expired anyway — after that
			// the expiry check rejects it and the record is dead weight.
			set_transient( $replay_key, 1, max( 60, (int) $payload['exp'] - time() ) );
		}

		return $payload;
	}

	// -----------------------------------------------------------------------
	// Serving
	// -----------------------------------------------------------------------

	/**
	 * Validate the token and stream the package.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function handle_download(): void {
		$raw = (string) get_query_var( self::QUERY_VAR );
		if ( '' === $raw ) {
			return;
		}

		$payload = $this->verify_token( $raw );
		if ( is_wp_error( $payload ) ) {
			$this->fail( $payload->get_error_message(), (int) ( $payload->get_error_data()['status'] ?? 403 ) );
		}

		$package = $this->packages->find( (int) $payload['pkg'] );
		if ( ! $package ) {
			$this->fail( __( 'The requested package no longer exists.', 'purecart' ), 404 );
		}

		// A version withdrawn after the link was issued must stop downloading —
		// the whole point of is_active is pulling a broken release *now*.
		if ( ! (int) $package->is_active ) {
			$this->fail( __( 'This version is no longer available.', 'purecart' ), 410 );
		}

		// The license is re-checked at download time, not just when the link
		// was minted: a link issued 15 minutes ago must not still work if the
		// license was revoked in between.
		if ( ! empty( $payload['lic'] ) && ! $this->license_is_valid( (int) $payload['lic'] ) ) {
			$this->fail( __( 'The license for this download is no longer active.', 'purecart' ), 403 );
		}

		$file_path = (string) $package->file_path;

		if ( ! file_exists( $file_path ) || ! is_readable( $file_path ) ) {
			$this->fail( __( 'The package file could not be found.', 'purecart' ), 404 );
		}

		$this->packages->increment_download_count( (int) $package->id );

		/**
		 * Fires after a package download is authorised, before bytes are sent.
		 *
		 * @since 1.0.0
		 * @param int      $package_id Package row ID.
		 * @param int|null $license_id License row ID, or null.
		 * @param string   $ip_address Requesting IP.
		 */
		do_action(
			'purecart_update_package_downloaded',
			(int) $package->id,
			isset( $payload['lic'] ) ? (int) $payload['lic'] : null,
			isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : ''
		);

		$this->stream_file( $file_path, $this->download_filename( $package ) );
	}

	/**
	 * Whether a license is still good enough to download with.
	 *
	 * @since 1.0.0
	 * @param int $license_id License row ID.
	 * @return bool
	 */
	private function license_is_valid( int $license_id ): bool {
		if ( ! class_exists( LicenseGenerator::class ) ) {
			return true;
		}

		$license = ( new LicenseGenerator() )->get_by_id( $license_id );
		if ( ! $license ) {
			return false;
		}

		if ( 'active' !== $license->status ) {
			return false;
		}

		// An expired-but-not-yet-swept license still has status 'active' until
		// something marks it; check the date as well as the flag.
		if ( ! empty( $license->expires_at ) && strtotime( (string) $license->expires_at ) < time() ) {
			return false;
		}

		return true;
	}

	/**
	 * The filename the customer's browser/updater should see.
	 *
	 * The on-disk name carries a random prefix (see UpdatePackageManager);
	 * serving that would give WordPress's upgrader a folder name like
	 * `a3f9…-100-1.3.0` instead of the plugin slug. Rebuilt from the product
	 * slug and version instead.
	 *
	 * @since 1.0.0
	 * @param object $package Package row.
	 * @return string
	 */
	private function download_filename( object $package ): string {
		$extension = (string) pathinfo( (string) $package->file_path, PATHINFO_EXTENSION );
		$slug      = (string) get_post_meta( (int) $package->product_id, '_purecart_plugin_slug', true );

		if ( '' === $slug ) {
			$product = function_exists( 'wc_get_product' ) ? wc_get_product( (int) $package->product_id ) : null;
			$slug    = $product ? sanitize_title( $product->get_name() ) : 'package';
		}

		return sanitize_file_name( $slug . '.' . $package->version . '.' . $extension );
	}

	/**
	 * Stream a file to the client and stop.
	 *
	 * @since 1.0.0
	 * @param string $file_path Absolute path.
	 * @param string $filename  Name to present to the client.
	 * @return void
	 */
	private function stream_file( string $file_path, string $filename ): void {
		if ( ob_get_level() ) {
			ob_end_clean();
		}

		nocache_headers();
		header( 'Content-Type: application/octet-stream' );
		header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
		header( 'Content-Length: ' . filesize( $file_path ) );
		header( 'X-Robots-Tag: noindex, nofollow' );
		header( 'X-Content-Type-Options: nosniff' );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile -- WP_Filesystem::get_contents() reads the whole file into memory; packages can be hundreds of MB.
		readfile( $file_path );
		exit;
	}

	/**
	 * @since 1.0.0
	 * @param string $message Message to show.
	 * @param int    $status  HTTP status.
	 * @return void
	 */
	private function fail( string $message, int $status ): void {
		wp_die(
			esc_html( $message ),
			esc_html__( 'Download Error', 'purecart' ),
			array( 'response' => $status )
		);
	}

	// -----------------------------------------------------------------------
	// base64url
	// -----------------------------------------------------------------------

	/**
	 * Base64 with the two URL-unsafe characters swapped and padding removed,
	 * so the token survives being placed in a path segment.
	 *
	 * @since 1.0.0
	 * @param string $data Raw data.
	 * @return string
	 */
	public static function base64url_encode( string $data ): string {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
	}

	/**
	 * @since 1.0.0
	 * @param string $data Encoded data.
	 * @return string
	 */
	public static function base64url_decode( string $data ): string {
		return (string) base64_decode( strtr( $data, '-_', '+/' ), true );
	}
}

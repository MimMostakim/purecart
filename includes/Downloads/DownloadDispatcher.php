<?php
/**
 * Serves protected files via PHP — no direct file URL exposed.
 *
 * Rewrite: purecart-download/{token}  →  index.php?purecart_download_token={token}
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the rewrite rule and streams the file to the browser.
 */
class DownloadDispatcher {

	public const QUERY_VAR = 'purecart_download_token';

	/** Public URL segment the token is appended to. */
	public const URL_PREFIX = 'purecart-download';

	/**
	 * Register rewrite and download-handling hooks.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'add_rewrite' ) );
		add_filter( 'query_vars', array( $this, 'query_vars' ) );
		add_filter( 'redirect_canonical', array( $this, 'skip_canonical' ) );
		add_action( 'template_redirect', array( $this, 'handle_download' ) );
	}

	/**
	 * Keep WordPress's canonical redirect away from download URLs.
	 *
	 * Left alone, redirect_canonical() answers `/purecart-download/{token}`
	 * with a 301 to the same URL plus a trailing slash. Browsers follow it, so
	 * nothing visibly breaks, but every download pays for an extra round trip —
	 * and any client that does not follow redirects (a plain `wp_remote_get()`,
	 * an updater, a download manager) gets a 301 body instead of the file.
	 *
	 * @since  1.0.0
	 * @param  string|false $redirect The URL WordPress wants to redirect to.
	 * @return string|false
	 */
	public function skip_canonical( $redirect ) {
		return '' !== (string) get_query_var( self::QUERY_VAR ) ? false : $redirect;
	}

	/**
	 * Register the rewrite rules that map a token URL to a query var.
	 *
	 * Two rules, not one. The canonical `purecart-download/` prefix matches
	 * `PureCart\Updates\UpdateDelivery`'s `purecart-update/`, and its pattern
	 * is tight — tokens are 64 hex characters from bin2hex( random_bytes(32) ),
	 * so anything else never reaches the handler.
	 *
	 * The bare `purecart/` rule is the shape this module shipped with. Links
	 * built from it are already sitting in customers' order emails, so it stays
	 * registered as a permanent alias rather than breaking a paid download.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function add_rewrite(): void {
		add_rewrite_rule(
			'^' . self::URL_PREFIX . '/([a-f0-9]{64})/?$',
			'index.php?' . self::QUERY_VAR . '=$matches[1]',
			'top'
		);

		add_rewrite_rule(
			'^purecart/([a-zA-Z0-9_\-]+)/?$',
			'index.php?' . self::QUERY_VAR . '=$matches[1]',
			'top'
		);
	}

	/**
	 * Build the public download URL for a token.
	 *
	 * The single place the URL shape is defined — callers (My Account rows,
	 * order emails, REST responses) must not concatenate it themselves.
	 *
	 * @since  1.0.0
	 * @param  string $token The hex download token.
	 * @return string
	 */
	public static function url( string $token ): string {
		return home_url( '/' . self::URL_PREFIX . '/' . $token );
	}

	/**
	 * Register the purecart_download_token query variable.
	 *
	 * @since  1.0.0
	 * @param  string[] $vars Existing public query variables.
	 * @return string[]
	 */
	public function query_vars( array $vars ): array {
		$vars[] = self::QUERY_VAR;
		return $vars;
	}

	/**
	 * Validate the download token and stream the protected file to the browser.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function handle_download(): void {
		$token = (string) get_query_var( self::QUERY_VAR );
		if ( '' === $token ) {
			return;
		}

		do_action( 'purecart_before_file_download', $token );

		$manager  = new TokenManager();
		$logger   = new DownloadLogger();
		$download = $manager->validate( $token );

		if ( is_wp_error( $download ) ) {
			$this->refuse( $download, $logger );
		}

		$file      = $manager->file_for( $download );
		$file_path = $file ? $this->resolve_path( $file->get_file() ) : '';

		if ( '' === $file_path || ! file_exists( $file_path ) ) {
			$logger->record( (int) $download->id, DownloadLogger::EVENT_MISSING );

			wp_die(
				esc_html__( 'The requested file could not be found.', 'purecart' ),
				esc_html__( 'Download Error', 'purecart' ),
				array( 'response' => 404 )
			);
		}

		// A ranged request is one transfer continued, not a second download:
		// counting it again would burn a customer's limit every time their
		// connection hiccupped.
		if ( empty( $_SERVER['HTTP_RANGE'] ) ) {
			$manager->increment_count( (int) $download->id );
			$logger->record( (int) $download->id, DownloadLogger::EVENT_SERVED );
		}

		( new DownloadDelivery() )->serve( $file_path, basename( $file_path ) );
	}

	/**
	 * Log a refused download and end the request with a fitting response.
	 *
	 * The status code is part of the answer, not decoration: 410 says the link
	 * was genuinely issued and is now finished (expired, used up, revoked), so
	 * a client knows not to retry, while 403 covers a link that never granted
	 * access. Both stop caches from storing the refusal.
	 *
	 * @since  1.0.0
	 * @param  \WP_Error       $error  The refusal from TokenManager::validate().
	 * @param  DownloadLogger  $logger Logger to record the attempt with.
	 * @return void
	 */
	private function refuse( \WP_Error $error, DownloadLogger $logger ): void {
		$reason = $error->get_error_code();

		$events = array(
			'invalid'          => DownloadLogger::EVENT_INVALID,
			'revoked'          => DownloadLogger::EVENT_REVOKED,
			'expired'          => DownloadLogger::EVENT_EXPIRED,
			'limit_reached'    => DownloadLogger::EVENT_LIMIT,
			'license_inactive' => DownloadLogger::EVENT_LICENSE,
		);

		$statuses = array(
			'invalid'          => 403,
			'revoked'          => 410,
			'expired'          => 410,
			'limit_reached'    => 410,
			'license_inactive' => 403,
		);

		$data        = $error->get_error_data();
		$download_id = is_array( $data ) ? (int) ( $data['download_id'] ?? 0 ) : 0;

		$logger->record( $download_id, $events[ $reason ] ?? DownloadLogger::EVENT_INVALID );

		/**
		 * Fires when a download request is refused.
		 *
		 * @since 1.0.0
		 * @param string $reason      Refusal code from TokenManager::validate().
		 * @param int    $download_id Row ID, or 0 when the token matched nothing.
		 */
		do_action( 'purecart_download_refused', $reason, $download_id );

		wp_die(
			esc_html( $error->get_error_message() ),
			esc_html__( 'Download Error', 'purecart' ),
			array( 'response' => $statuses[ $reason ] ?? 403 )
		);
	}

	/**
	 * Turn a WooCommerce file reference into an absolute server path.
	 *
	 * WooCommerce stores a product's file as whatever the shop owner typed:
	 * usually an uploads URL from the media picker, sometimes an absolute
	 * server path typed by hand. Only files that live under the uploads
	 * directory can be mapped back from a URL — anything else (a remote URL on
	 * another host) has no local path and is rejected rather than guessed at.
	 *
	 * @since  1.0.0
	 * @param  string $file The `WC_Product_Download::get_file()` value.
	 * @return string       Absolute path, or '' when it cannot be resolved locally.
	 */
	private function resolve_path( string $file ): string {
		$file = trim( $file );

		if ( '' === $file ) {
			return '';
		}

		if ( ! preg_match( '#^https?://#i', $file ) ) {
			// Already a path — absolute, or relative to the WordPress root.
			return path_is_absolute( $file ) ? $file : ABSPATH . ltrim( $file, '/\\' );
		}

		$uploads = wp_get_upload_dir();

		// Compare scheme-insensitively: a file saved over http on a site now
		// served over https would otherwise fail to match its own uploads dir.
		$file_relative    = preg_replace( '#^https?://#i', '', $file );
		$baseurl_relative = preg_replace( '#^https?://#i', '', (string) $uploads['baseurl'] );

		if ( ! str_starts_with( (string) $file_relative, (string) $baseurl_relative ) ) {
			return '';
		}

		return $uploads['basedir'] . substr( (string) $file_relative, strlen( (string) $baseurl_relative ) );
	}
}

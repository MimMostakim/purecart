<?php
/**
 * PureCartUpdater — drop-in update client for WordPress plugins and themes.
 *
 * Copy this single file into your own plugin (no Composer, no autoloader
 * required) and boot it from your plugin's main file:
 *
 *     if ( is_admin() ) {
 *         require_once __DIR__ . '/includes/PureCartUpdater.php';
 *
 *         new \PureCart\Updater\v1\PureCartUpdater( array(
 *             'api_url'      => 'https://yourstore.com',
 *             'plugin_file'  => __FILE__,
 *             'product_slug' => 'my-plugin',
 *             'license_key'  => get_option( 'my_plugin_license_key' ),
 *             'version'      => MY_PLUGIN_VERSION,
 *         ) );
 *     }
 *
 * For a theme, pass `'theme_slug' => 'my-theme'` instead of `plugin_file`.
 *
 * @package PureCart\Updater
 */

declare( strict_types=1 );

namespace PureCart\Updater\v1;

defined( 'ABSPATH' ) || exit;

/**
 * Correction vs. RND-auto-updates.md, which shows this class living in each
 * vendor's own namespace (`\MyPlugin\PureCartUpdater`). That leaves every
 * plugin author to remember to rename it, and the failure mode when two
 * plugins ship the file unrenamed is a fatal "class already declared" that
 * takes down the customer's whole site.
 *
 * A shared, *version-pinned* namespace plus a class_exists() guard is safer:
 * two plugins shipping v1 share one identical implementation harmlessly, and
 * a future v2 can sit alongside v1 without either touching the other. It is
 * the same approach the widely used Plugin Update Checker library settled on.
 *
 * @since 1.0.0
 */
if ( ! class_exists( __NAMESPACE__ . '\PureCartUpdater' ) ) {

	/**
	 * Update client.
	 *
	 * @since 1.0.0
	 */
	class PureCartUpdater {

		/** How long an update-check response is cached, in seconds. */
		private const CACHE_TTL = 12 * HOUR_IN_SECONDS;

		/** @var array<string, mixed> */
		private array $config;

		/** @var string Plugin basename (`my-plugin/my-plugin.php`), or '' for themes. */
		private string $basename = '';

		/** @var bool */
		private bool $is_theme;

		/**
		 * @since 1.0.0
		 * @param array<string, mixed> $config api_url, product_slug, version, license_key, plugin_file|theme_slug.
		 */
		public function __construct( array $config ) {
			$this->config = array_merge(
				array(
					'api_url'      => '',
					'product_slug' => '',
					'version'      => '',
					'license_key'  => '',
					'plugin_file'  => '',
					'theme_slug'   => '',
					'channel'      => '',
				),
				$config
			);

			$this->is_theme = '' !== (string) $this->config['theme_slug'];

			if ( ! $this->is_theme && '' !== (string) $this->config['plugin_file'] ) {
				$this->basename = plugin_basename( (string) $this->config['plugin_file'] );
			}

			if ( '' === (string) $this->config['api_url'] || '' === (string) $this->config['product_slug'] ) {
				return;
			}

			if ( $this->is_theme ) {
				add_filter( 'pre_set_site_transient_update_themes', array( $this, 'check_theme_update' ) );
				add_filter( 'themes_api', array( $this, 'theme_info' ), 10, 3 );
			} else {
				add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'check_update' ) );
				add_filter( 'plugins_api', array( $this, 'plugin_info' ), 10, 3 );
				add_filter( 'auto_update_plugin', array( $this, 'auto_update_control' ), 10, 2 );
			}

			// Swap the cached download URL for a freshly signed one at the
			// moment WordPress actually downloads — see the method's comment.
			add_filter( 'upgrader_pre_download', array( $this, 'refresh_download_url' ), 10, 3 );

			add_action( 'upgrader_process_complete', array( $this, 'after_update' ), 10, 2 );
		}

		// ---------------------------------------------------------------
		// Update checks
		// ---------------------------------------------------------------

		/**
		 * Inject our update into WordPress's plugin update transient.
		 *
		 * @since 1.0.0
		 * @param mixed $transient The update_plugins transient.
		 * @return mixed
		 */
		public function check_update( $transient ) {
			if ( ! is_object( $transient ) || '' === $this->basename ) {
				return $transient;
			}

			$remote = $this->get_remote_info();

			if ( ! is_array( $remote ) ) {
				return $transient;
			}

			$item = (object) array(
				'id'          => $this->config['product_slug'],
				'slug'        => $this->config['product_slug'],
				'plugin'      => $this->basename,
				'new_version' => (string) ( $remote['version'] ?? $this->config['version'] ),
				'url'         => (string) ( $remote['homepage'] ?? '' ),
				'package'     => (string) ( $remote['download_url'] ?? '' ),
				'icons'       => array(),
				'banners'     => array(),
				'tested'      => (string) ( $remote['tested'] ?? '' ),
				'requires'    => (string) ( $remote['requires'] ?? '' ),
				'requires_php' => (string) ( $remote['requires_php'] ?? '' ),
			);

			if ( ! empty( $remote['update'] ) ) {
				$transient->response[ $this->basename ] = $item;
				unset( $transient->no_update[ $this->basename ] );
			} else {
				// WordPress 5.5+ reads no_update to render the per-plugin
				// "enable auto-updates" control. Omitting it makes the link
				// silently disappear for this plugin only, which looks like a
				// bug in the plugin rather than a missing hint.
				unset( $transient->response[ $this->basename ] );
				$transient->no_update[ $this->basename ] = $item;
			}

			return $transient;
		}

		/**
		 * Theme equivalent of check_update(). The themes transient stores
		 * arrays, not objects.
		 *
		 * @since 1.0.0
		 * @param mixed $transient The update_themes transient.
		 * @return mixed
		 */
		public function check_theme_update( $transient ) {
			if ( ! is_object( $transient ) ) {
				return $transient;
			}

			$remote = $this->get_remote_info();
			$slug   = (string) $this->config['theme_slug'];

			if ( ! is_array( $remote ) || empty( $remote['update'] ) ) {
				return $transient;
			}

			$transient->response[ $slug ] = array(
				'theme'       => $slug,
				'new_version' => (string) ( $remote['version'] ?? '' ),
				'url'         => (string) ( $remote['homepage'] ?? '' ),
				'package'     => (string) ( $remote['download_url'] ?? '' ),
			);

			return $transient;
		}

		// ---------------------------------------------------------------
		// Detail modals
		// ---------------------------------------------------------------

		/**
		 * @since 1.0.0
		 * @param mixed  $result Existing result.
		 * @param string $action plugins_api action.
		 * @param object $args   Request args.
		 * @return mixed
		 */
		public function plugin_info( $result, $action, $args ) {
			if ( 'plugin_information' !== $action ) {
				return $result;
			}

			if ( ! isset( $args->slug ) || $args->slug !== $this->config['product_slug'] ) {
				return $result;
			}

			$info = $this->request( '/plugin/info', array( 'slug' => $this->config['product_slug'] ) );

			return is_array( $info ) ? $this->to_api_object( $info ) : $result;
		}

		/**
		 * @since 1.0.0
		 * @param mixed  $result Existing result.
		 * @param string $action themes_api action.
		 * @param object $args   Request args.
		 * @return mixed
		 */
		public function theme_info( $result, $action, $args ) {
			if ( 'theme_information' !== $action ) {
				return $result;
			}

			if ( ! isset( $args->slug ) || $args->slug !== $this->config['theme_slug'] ) {
				return $result;
			}

			$info = $this->request( '/plugin/info', array( 'slug' => $this->config['theme_slug'] ) );

			return is_array( $info ) ? $this->to_api_object( $info ) : $result;
		}

		/**
		 * WordPress expects an object whose `sections` is an array.
		 *
		 * @since 1.0.0
		 * @param array<string, mixed> $info Info payload.
		 * @return object
		 */
		private function to_api_object( array $info ): object {
			$object = (object) $info;

			if ( isset( $object->sections ) ) {
				$object->sections = (array) $object->sections;
			}

			return $object;
		}

		// ---------------------------------------------------------------
		// Download
		// ---------------------------------------------------------------

		/**
		 * Replace the cached package URL with a freshly signed one.
		 *
		 * The update-check response is cached for 12 hours so every admin page
		 * load doesn't hit the store, but a signed download URL is only valid
		 * for 15 minutes. Without this, any customer who saw "update
		 * available" and clicked Update more than 15 minutes later would get an
		 * expired-link failure — and the retry would fail too, because the
		 * cached URL never changes. Re-requesting here costs one HTTP call at
		 * the moment it is actually needed.
		 *
		 * @since 1.0.0
		 * @param mixed  $reply    Short-circuit value; false to continue normally.
		 * @param string $package  Package URL WordPress is about to download.
		 * @param object $upgrader Upgrader instance.
		 * @return mixed
		 */
		public function refresh_download_url( $reply, $package, $upgrader ) {
			if ( false !== $reply || ! is_string( $package ) || '' === $package ) {
				return $reply;
			}

			// Only touch downloads pointed at our own store.
			if ( 0 !== strpos( $package, rtrim( (string) $this->config['api_url'], '/' ) ) ) {
				return $reply;
			}

			$this->clear_cache();
			$remote = $this->get_remote_info();

			if ( ! is_array( $remote ) || empty( $remote['download_url'] ) ) {
				return $reply;
			}

			$file = download_url( (string) $remote['download_url'] );

			if ( is_wp_error( $file ) ) {
				return $file;
			}

			// Verify the package really is the one the store described before
			// handing it to WordPress's unzipper.
			if ( ! empty( $remote['checksum'] ) ) {
				$expected = (string) $remote['checksum'];
				$actual   = 'sha256:' . hash_file( 'sha256', $file );

				if ( ! hash_equals( $expected, $actual ) ) {
					// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_unlink -- Removing the temp file this method just downloaded.
					@unlink( $file );

					return new \WP_Error(
						'purecart_checksum_mismatch',
						__( 'The downloaded package failed its checksum check and was discarded.', 'purecart' )
					);
				}
			}

			return $file;
		}

		// ---------------------------------------------------------------
		// Housekeeping
		// ---------------------------------------------------------------

		/**
		 * Drop the cached response after an update so the next check reflects
		 * the newly installed version rather than still offering it.
		 *
		 * @since 1.0.0
		 * @param object               $upgrader Upgrader instance.
		 * @param array<string, mixed> $options  Upgrade options.
		 * @return void
		 */
		public function after_update( $upgrader, $options ): void {
			if ( ! is_array( $options ) || 'update' !== ( $options['action'] ?? '' ) ) {
				return;
			}

			$this->clear_cache();
		}

		/**
		 * Stop WordPress auto-updating this plugin when the licence is not
		 * currently entitled to updates — an unattended auto-update that
		 * downloads a 403 page and unzips it would be far worse than not
		 * updating at all.
		 *
		 * @since 1.0.0
		 * @param mixed $update Whether to auto-update.
		 * @param mixed $item   Update item.
		 * @return mixed
		 */
		public function auto_update_control( $update, $item ) {
			$plugin = is_object( $item ) ? ( $item->plugin ?? '' ) : '';

			if ( $plugin !== $this->basename ) {
				return $update;
			}

			$remote = $this->get_remote_info();

			if ( ! is_array( $remote ) ) {
				return false;
			}

			/**
			 * Filters whether this plugin may auto-update.
			 *
			 * @since 1.0.0
			 * @param bool   $allowed     Whether auto-update is allowed.
			 * @param string $basename    Plugin basename.
			 * @param string $license_key Configured licence key.
			 */
			return apply_filters(
				'purecart_allow_auto_update',
				(bool) $update,
				$this->basename,
				(string) $this->config['license_key']
			);
		}

		// ---------------------------------------------------------------
		// Transport
		// ---------------------------------------------------------------

		/**
		 * Cached update-check response.
		 *
		 * @since 1.0.0
		 * @return array<string, mixed>|null
		 */
		private function get_remote_info(): ?array {
			$cached = get_site_transient( $this->cache_key() );

			if ( is_array( $cached ) ) {
				return $cached;
			}

			$response = $this->request(
				'/plugin/update-check',
				array(
					'slug'        => (string) $this->config['product_slug'],
					'version'     => (string) $this->config['version'],
					'license_key' => (string) $this->config['license_key'],
					'domain'      => $this->site_domain(),
					'channel'     => (string) $this->config['channel'],
				)
			);

			if ( ! is_array( $response ) ) {
				// Cache the failure briefly too. Otherwise a store that is
				// down turns every single admin page load into a blocking
				// HTTP request that has to time out first.
				set_site_transient( $this->cache_key(), array( 'update' => false ), 15 * MINUTE_IN_SECONDS );

				return null;
			}

			set_site_transient( $this->cache_key(), $response, self::CACHE_TTL );

			return $response;
		}

		/**
		 * @since 1.0.0
		 * @param string               $endpoint Endpoint path under the API namespace.
		 * @param array<string, mixed> $params   Query parameters.
		 * @return array<string, mixed>|null
		 */
		private function request( string $endpoint, array $params ): ?array {
			$url = rtrim( (string) $this->config['api_url'], '/' ) . '/wp-json/purecart/v1' . $endpoint;

			$response = wp_remote_get(
				add_query_arg( array_filter( $params, static fn( $v ) => '' !== $v && null !== $v ), $url ),
				array(
					'timeout' => 15,
					'headers' => array( 'Accept' => 'application/json' ),
				)
			);

			if ( is_wp_error( $response ) ) {
				return null;
			}

			$code = (int) wp_remote_retrieve_response_code( $response );
			$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );

			if ( 200 !== $code || ! is_array( $body ) ) {
				return null;
			}

			return $body;
		}

		/**
		 * @since 1.0.0
		 * @return string
		 */
		private function site_domain(): string {
			$host = (string) wp_parse_url( home_url(), PHP_URL_HOST );

			return '' !== $host ? $host : '';
		}

		/**
		 * Cache key includes the licence key and current version, so changing
		 * either takes effect immediately instead of after the 12-hour TTL —
		 * a customer who has just pasted in a licence expects the update to
		 * appear, not to wait half a day.
		 *
		 * @since 1.0.0
		 * @return string
		 */
		private function cache_key(): string {
			return 'purecart_upd_' . md5(
				(string) $this->config['product_slug'] . '|' .
				(string) $this->config['version'] . '|' .
				(string) $this->config['license_key']
			);
		}

		/**
		 * @since 1.0.0
		 * @return void
		 */
		public function clear_cache(): void {
			delete_site_transient( $this->cache_key() );
		}
	}
}

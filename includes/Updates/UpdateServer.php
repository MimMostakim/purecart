<?php
/**
 * Answers "is there a newer version, and may this caller have it?".
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * The update-check pipeline (RND-auto-updates.md § "WordPress Plugin/Theme
 * Update Flow"): resolve the product, gate on licence, resolve the channel,
 * find the newest entitled package, compare versions, and — only when an
 * update is actually available — mint a signed download URL.
 *
 * Deliberately free of REST plumbing: it takes a plain array and returns a
 * plain array or WP_Error, so `PureCart\API\Updates` stays a thin adapter and
 * this logic is testable without booting the REST server.
 *
 * @since 1.0.0
 */
class UpdateServer {

	/** @var PackageRepository */
	private PackageRepository $packages;

	/** @var ProductLocator */
	private ProductLocator $locator;

	/** @var LicenseGate */
	private LicenseGate $license_gate;

	/** @var UpdateChannelRouter */
	private UpdateChannelRouter $channels;

	/** @var UpdateDelivery */
	private UpdateDelivery $delivery;

	/**
	 * @since 1.0.0
	 * @param UpdateDelivery|null $delivery Shared delivery instance; a new one is built when omitted.
	 */
	public function __construct( ?UpdateDelivery $delivery = null ) {
		$this->packages     = new PackageRepository();
		$this->locator      = new ProductLocator();
		$this->license_gate = new LicenseGate();
		$this->channels     = new UpdateChannelRouter();

		// UpdateDelivery registers rewrite/template hooks in its constructor,
		// so the module's single instance is passed in rather than a second
		// one being created here — the same shared-instance rule the
		// Subscriptions module follows for RenewalEngine.
		$this->delivery = $delivery ?? new UpdateDelivery();
	}

	/**
	 * Run an update check.
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $params slug, version, license_key, domain, platform, channel.
	 * @return array<string, mixed>|\WP_Error
	 */
	public function check( array $params ) {
		$slug = sanitize_text_field( (string) ( $params['slug'] ?? '' ) );

		if ( '' === $slug ) {
			return new \WP_Error( 'purecart_missing_slug', __( 'A product slug is required.', 'purecart' ), array( 'status' => 400 ) );
		}

		$product_id = $this->locator->by_slug( $slug );
		if ( ! $product_id ) {
			return new \WP_Error( 'purecart_unknown_product', __( 'No product matches that slug.', 'purecart' ), array( 'status' => 404 ) );
		}

		// Licence gate, when this product uses one.
		$license_id = null;
		if ( $this->license_gate->requires_license( $product_id ) ) {
			$license = $this->license_gate->validate(
				(string) ( $params['license_key'] ?? '' ),
				$product_id,
				(string) ( $params['domain'] ?? '' )
			);

			if ( is_wp_error( $license ) ) {
				return $license;
			}

			$license_id = (int) $license->id;
		}

		$channel  = $this->channels->resolve( $product_id, $license_id, isset( $params['channel'] ) ? (string) $params['channel'] : null );
		$platform = '' !== (string) ( $params['platform'] ?? '' ) ? sanitize_text_field( (string) $params['platform'] ) : 'all';

		$package = $this->packages->get_latest( $product_id, $channel, $platform );

		$current_version = (string) ( $params['version'] ?? '' );

		if ( ! $package ) {
			// Nothing published yet for this channel/platform. Not an error —
			// the client should simply be told there is no update, or it will
			// surface a failure to the site owner on every check.
			return $this->no_update_response( $current_version );
		}

		if ( '' !== $current_version && version_compare( $current_version, (string) $package->version, '>=' ) ) {
			return $this->no_update_response( $current_version );
		}

		return $this->update_response( $package, $product_id, $license_id, $channel );
	}

	/**
	 * @since 1.0.0
	 * @param string $current_version Version the caller reported.
	 * @return array<string, mixed>
	 */
	private function no_update_response( string $current_version ): array {
		return array(
			'update'  => false,
			'version' => $current_version,
		);
	}

	/**
	 * Build the "yes, there is an update" payload.
	 *
	 * @since 1.0.0
	 * @param object   $package    Package row.
	 * @param int      $product_id WooCommerce product ID.
	 * @param int|null $license_id License row ID, or null.
	 * @param string   $channel    Resolved channel.
	 * @return array<string, mixed>
	 */
	private function update_response( object $package, int $product_id, ?int $license_id, string $channel ): array {
		$response = array(
			'update'       => true,
			'version'      => (string) $package->version,
			'download_url' => $this->delivery->download_url( (int) $package->id, $license_id ),
			// Prefixed so a client can tell which algorithm produced it without
			// guessing from the string length.
			'checksum'     => 'sha256:' . (string) $package->checksum_sha256,
			'channel'      => $channel,
			'last_updated' => (string) $package->released_at,
			'published_at' => $this->to_iso8601( (string) $package->released_at ),
		);

		if ( $this->locator->is_wordpress_product( $product_id ) ) {
			// WordPress reads these three to decide whether the site may
			// install the update at all.
			$response['requires']     = (string) $package->requires_wp;
			$response['requires_php'] = (string) $package->requires_php;
			$response['tested']       = (string) $package->tested_wp;
			$response['changelog']    = (string) $package->changelog;
		} else {
			// Non-WP software gets the plain-text notes instead of HTML, and
			// the platform it resolved to so a client shipping several builds
			// can confirm it received the right one.
			$response['release_notes'] = (string) $package->release_notes;
			$response['platform']      = (string) $package->platform;
		}

		/**
		 * Filters the update-check response before it is returned.
		 *
		 * @since 1.0.0
		 * @param array<string, mixed> $response   Response payload.
		 * @param int                  $product_id WooCommerce product ID.
		 * @param int|null             $license_id License row ID, or null.
		 */
		return (array) apply_filters( 'purecart_update_check_response', $response, $product_id, $license_id );
	}

	/**
	 * Convert a MySQL datetime to ISO-8601, the shape non-WP clients
	 * (Electron/Squirrel feeds, desktop updaters) expect.
	 *
	 * @since 1.0.0
	 * @param string $mysql_datetime Datetime string.
	 * @return string
	 */
	private function to_iso8601( string $mysql_datetime ): string {
		if ( '' === $mysql_datetime ) {
			return '';
		}

		$timestamp = strtotime( $mysql_datetime );

		return false !== $timestamp ? gmdate( 'c', $timestamp ) : '';
	}
}

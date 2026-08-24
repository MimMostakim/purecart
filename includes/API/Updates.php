<?php
/**
 * REST routes for the Updates module.
 *
 * @package PureCart\API
 */

declare( strict_types=1 );

namespace PureCart\API;

use PureCart\Updates\ChangelogManager;
use PureCart\Updates\ProductLocator;
use PureCart\Updates\UpdateDelivery;
use PureCart\Updates\UpdateInfo;
use PureCart\Updates\UpdateServer;

defined( 'ABSPATH' ) || exit;

/**
 * Correction vs. RND-auto-updates.md, which places the REST endpoint inside
 * `includes/Updates/UpdateServer.php`. This codebase keeps REST controllers in
 * `includes/API/` behind the `PureCartApi` base class (see API\Subscriptions),
 * so the route registration lives here and `Updates\UpdateServer` stays pure
 * business logic. That split is also what lets the update-check pipeline be
 * tested without booting WP_REST_Server.
 *
 * @since 1.0.0
 */
class Updates extends PureCartApi {

	/** @var UpdateServer */
	private UpdateServer $server;

	/** @var UpdateInfo */
	private UpdateInfo $info;

	/** @var ChangelogManager */
	private ChangelogManager $changelog;

	/** @var ProductLocator */
	private ProductLocator $locator;

	/**
	 * @since 1.0.0
	 * @param UpdateDelivery|null $delivery Shared delivery instance from the module bootstrap.
	 */
	public function __construct( ?UpdateDelivery $delivery = null ) {
		$this->server    = new UpdateServer( $delivery );
		$this->info      = new UpdateInfo();
		$this->changelog = new ChangelogManager();
		$this->locator   = new ProductLocator();
	}

	/**
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			PURECART_API_NAMESPACE,
			'/plugin/update-check',
			array(
				'methods'  => \WP_REST_Server::READABLE,
				'callback' => array( $this, 'update_check' ),
				// Public by design: the licence key in the query *is* the
				// credential, and the caller is an unauthenticated WordPress
				// site or desktop app that has no WP session here. Every
				// entitlement decision happens inside UpdateServer.
				'permission_callback' => '__return_true',
				'args'                => array(
					'slug'        => array( 'required' => true, 'type' => 'string' ),
					'version'     => array( 'type' => 'string' ),
					'license_key' => array( 'type' => 'string' ),
					'domain'      => array( 'type' => 'string' ),
					'platform'    => array( 'type' => 'string' ),
					'channel'     => array( 'type' => 'string' ),
				),
			)
		);

		// Public, and deliberately so: WordPress opens the "View details"
		// modal from an admin screen with no PureCart credentials, and the
		// payload is the same marketing copy the product page already shows.
		// It carries no download URL — see UpdateInfo's class docblock.
		register_rest_route(
			PURECART_API_NAMESPACE,
			'/plugin/info',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'plugin_info' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'slug'    => array( 'required' => true, 'type' => 'string' ),
					'channel' => array( 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/plugin/changelog/(?P<slug>[A-Za-z0-9_\-]+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'plugin_changelog' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'slug'  => array( 'required' => true, 'type' => 'string' ),
					'limit' => array( 'type' => 'integer' ),
				),
			)
		);
	}

	/**
	 * GET /plugin/info
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function plugin_info( \WP_REST_Request $request ) {
		$result = $this->info->for_slug(
			(string) $request->get_param( 'slug' ),
			$this->public_channel( (string) $request->get_param( 'channel' ) )
		);

		return is_wp_error( $result ) ? $result : rest_ensure_response( $result );
	}

	/**
	 * GET /plugin/changelog/{slug}
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function plugin_changelog( \WP_REST_Request $request ) {
		$slug       = (string) $request->get_param( 'slug' );
		$product_id = $this->locator->by_slug( $slug );

		if ( ! $product_id ) {
			return new \WP_Error( 'purecart_unknown_product', __( 'No product matches that slug.', 'purecart' ), array( 'status' => 404 ) );
		}

		$channel = $this->public_channel( (string) $request->get_param( 'channel' ) );
		$limit   = (int) ( $request->get_param( 'limit' ) ?: 20 );

		return rest_ensure_response(
			array(
				'slug'    => $slug,
				'channel' => $channel,
				'entries' => $this->changelog->entries( $product_id, $channel, $limit ),
				'html'    => $this->changelog->render( $product_id, $channel, $limit ),
			)
		);
	}

	/**
	 * Clamp a caller-supplied channel for the two unauthenticated endpoints.
	 *
	 * Neither presents a licence, so neither can prove entitlement to a
	 * pre-release channel. Accepting `?channel=nightly` here would publish
	 * unreleased version numbers and changelog text to anyone who asked, so
	 * `stable` is the only value honoured.
	 *
	 * @since 1.0.0
	 * @param string $requested Channel from the request.
	 * @return string
	 */
	private function public_channel( string $requested ): string {
		return 'stable';
	}

	/**
	 * GET /plugin/update-check
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_check( \WP_REST_Request $request ) {
		$result = $this->server->check(
			array(
				'slug'        => (string) $request->get_param( 'slug' ),
				'version'     => (string) $request->get_param( 'version' ),
				'license_key' => (string) $request->get_param( 'license_key' ),
				'domain'      => (string) $request->get_param( 'domain' ),
				'platform'    => (string) $request->get_param( 'platform' ),
				'channel'     => null !== $request->get_param( 'channel' ) ? (string) $request->get_param( 'channel' ) : null,
			)
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$response = rest_ensure_response( $result );

		// Update checks are per-site and licence-scoped; a shared cache in
		// front of the store must never hand one customer's signed download
		// URL to another.
		$response->header( 'Cache-Control', 'no-store, private' );

		return $response;
	}
}

<?php
declare( strict_types=1 );
/**
 * Admin REST routes for the Licensing module.
 *
 * @package PureCart\Api
 */

namespace PureCart\API;

use PureCart\Licensing\LicenseGenerator;
use PureCart\Licensing\LicenseActivator;
use PureCart\Licensing\LicenseTokenIssuer;
use PureCart\Licensing\LicenseTokenValidator;
use PureCart\Licensing\LicenseTokenRefresher;
use PureCart\Licensing\LicenseTokenRevoker;
use PureCart\Licensing\JwtSecret;
use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Every Licensing REST route, both surfaces:
 *
 *   `/license/*`  (singular) — customer/plugin-facing: activate, deactivate,
 *                 check, ping, revoke by key, JWT token refresh/revoke-all.
 *                 Public by design where the license key itself is the
 *                 credential; admin-gated (`manage_woocommerce`) where it
 *                 isn't (revoke, token/revoke-all).
 *   `/licenses/*` (plural)   — admin list/detail/manage API for the SPA's
 *                 Licenses pages, gated behind `manage_woocommerce`
 *                 throughout. Mirrors how API\Subscriptions and API\Updates
 *                 split "customer/plugin endpoints" from "admin management
 *                 endpoints" within one controller.
 *
 * Registered from `Licensing\Module`, alongside JwtHooks — the one other
 * class in this module that needs a boot hook.
 *
 * @since 1.0.0
 */
class Licenses extends PureCartApi {

	/**
	 * License row CRUD and admin lifecycle operations.
	 *
	 * @since 1.0.0
	 * @var LicenseGenerator
	 */
	private LicenseGenerator $generator;

	/**
	 * Per-domain activation records.
	 *
	 * @since 1.0.0
	 * @var LicenseActivator
	 */
	private LicenseActivator $activator;

	/**
	 * Builds the two domain classes this controller adapts to REST.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->generator = new LicenseGenerator();
		$this->activator = new LicenseActivator();
	}

	/**
	 * Every route on this controller is admin-only.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public function permission_admin(): bool {
		return current_user_can( 'manage_woocommerce' );
	}

	/**
	 * Registers every /licenses/* and /reports/licenses/* route.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes(): void {
		$ns   = PURECART_API_NAMESPACE;
		$base = '/licenses';

		// Customer/plugin-facing surface (singular /license/*).
		register_rest_route(
			$ns,
			'/license/activate',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'license_activate' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'license_key' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'domain'      => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'environment' => array(
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
						'default'           => 'production',
					),
				),
			)
		);

		register_rest_route(
			$ns,
			'/license/deactivate',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'license_deactivate' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'license_key' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'domain'      => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			$ns,
			'/license/check',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'license_check' ),
				// license_key lookups are public (by design — a license key
				// is itself the credential); a user_id lookup additionally
				// requires manage_woocommerce, enforced inside the callback
				// since a single route can't express "auth depends on which
				// param was sent" via permission_callback alone.
				'permission_callback' => '__return_true',
				'args'                => array(
					'license_key' => array(
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'domain'      => array(
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
						'default'           => '',
					),
					'user_id'     => array(
						'required'          => false,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			$ns,
			'/license/ping',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'license_ping' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/license/revoke',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'license_revoke' ),
				'permission_callback' => array( $this, 'permission_admin' ),
				'args'                => array(
					'license_key' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			$ns,
			'/license/token/refresh',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'license_token_refresh' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'refresh_token' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			$ns,
			'/license/token/revoke-all',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'license_token_revoke_all' ),
				'permission_callback' => array( $this, 'permission_admin' ),
				'args'                => array(
					'license_key' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		// Admin surface (plural /licenses/*).
		register_rest_route(
			$ns,
			$base,
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_licenses' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/export',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'export_csv' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/bulk-revoke',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'bulk_revoke' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_license' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		foreach ( array(
			'extend'            => 'admin_extend',
			'suspend'           => 'admin_suspend',
			'reinstate'         => 'admin_reinstate',
			'revoke'            => 'admin_revoke',
			'reset-activations' => 'admin_reset_activations',
			'duplicate'         => 'admin_duplicate',
		) as $action => $callback ) {
			register_rest_route(
				$ns,
				$base . '/(?P<id>\d+)/' . $action,
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, $callback ),
					'permission_callback' => array( $this, 'permission_admin' ),
				)
			);
		}

		register_rest_route(
			$ns,
			$base . '/settings',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'permission_admin' ),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'save_settings' ),
					'permission_callback' => array( $this, 'permission_admin' ),
					'args'                => array(
						'delivery_status' => array(
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
							'required'          => false,
						),
					),
				),
			)
		);

		register_rest_route(
			$ns,
			'/reports/licenses/summary',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_report_summary' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);
	}

	/**
	 * GET /licenses/settings
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function get_settings(): \WP_REST_Response {
		return rest_ensure_response(
			array(
				'delivery_status' => (string) Settings::get( OptionKeys::LICENSE_DELIVERY_STATUS, 'completed' ),
				'jwt_secret'      => JwtSecret::get(),
			)
		);
	}

	/**
	 * POST /licenses/settings — `jwt_secret` is deliberately not settable
	 * here; it's auto-generated by {@see JwtSecret::get()} on first use.
	 * Rotating it here would immediately invalidate every JWT already
	 * issued to a connected site, with no visible cause.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function save_settings( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$status = $request->get_param( 'delivery_status' );
		if ( null !== $status ) {
			if ( ! in_array( $status, array( 'completed', 'processing', 'both' ), true ) ) {
				return new \WP_Error( 'invalid_delivery_status', __( 'Invalid delivery status.', 'purecart' ), array( 'status' => 400 ) );
			}
			Settings::set( OptionKeys::LICENSE_DELIVERY_STATUS, $status );
		}

		return rest_ensure_response(
			array(
				'success'         => true,
				'delivery_status' => (string) Settings::get( OptionKeys::LICENSE_DELIVERY_STATUS, 'completed' ),
			)
		);
	}

	/**
	 * Handle POST /purecart/v1/license/activate.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function license_activate( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$license_key = (string) $request->get_param( 'license_key' );
		$domain      = (string) $request->get_param( 'domain' );
		$environment = (string) $request->get_param( 'environment' );

		$result = $this->activator->activate( $license_key, $domain, $environment );

		if ( ! $result['success'] ) {
			return new \WP_Error( 'purecart_activation_failed', $result['message'], array( 'status' => 403 ) );
		}

		// Issue a JWT pair so the customer's plugin can validate locally
		// instead of polling /license/check — see docs/RND-licensing-jwt.md.
		$license = $this->generator->get_by_key( $license_key );
		if ( $license ) {
			$token = ( new LicenseTokenIssuer() )->issue( (int) $license->id, $domain, $environment );
			if ( $token ) {
				$result['data'] = array( 'token' => $token );
			}
		}

		return rest_ensure_response( $result );
	}

	/**
	 * Handle POST /purecart/v1/license/deactivate.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function license_deactivate( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$result = $this->activator->deactivate(
			$request->get_param( 'license_key' ),
			$request->get_param( 'domain' )
		);

		if ( ! $result['success'] ) {
			return new \WP_Error( 'purecart_deactivation_failed', $result['message'], array( 'status' => 400 ) );
		}

		return rest_ensure_response( $result );
	}

	/**
	 * Handle GET /purecart/v1/license/check.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function license_check( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		// Bearer JWT path: validate locally, no DB lookup — the whole point
		// of the JWT layer (docs/RND-licensing-jwt.md "Why Not Validate JTI
		// on Every /check Call?"). Falls through to the legacy license_key
		// DB lookup below if no valid Bearer token is present.
		$auth_header = (string) $request->get_header( 'authorization' );
		if ( str_starts_with( $auth_header, 'Bearer ' ) ) {
			$decoded = ( new LicenseTokenValidator() )->validate( substr( $auth_header, 7 ) );

			if ( ! is_wp_error( $decoded ) ) {
				$lic = (array) ( $decoded['lic'] ?? array() );

				return rest_ensure_response(
					array(
						'status'           => ( $lic['expires_at'] ?? null ) && strtotime( (string) $lic['expires_at'] ) < time() ? 'expired' : 'active',
						'plan_type'        => $lic['plan'] ?? '',
						'activation_limit' => $lic['limit'] ?? 0,
						'activated_count'  => $lic['count'] ?? 0,
						'expires_at'       => $lic['expires_at'] ?? null,
						'is_lifetime'      => null === ( $lic['expires_at'] ?? null ),
						'features'         => $lic['features'] ?? array(),
					)
				);
			}
		}

		$user_id = (int) $request->get_param( 'user_id' );

		// Admin/server-to-server lookup: all licenses for a customer.
		if ( $user_id > 0 ) {
			if ( ! current_user_can( 'manage_woocommerce' ) ) {
				return new \WP_Error( 'purecart_forbidden', __( 'You are not allowed to view this license data.', 'purecart' ), array( 'status' => 403 ) );
			}

			return rest_ensure_response( $this->generator->get_by_user( $user_id ) );
		}

		$license_key = (string) $request->get_param( 'license_key' );
		if ( '' === $license_key ) {
			return new \WP_Error( 'purecart_missing_param', __( 'license_key or user_id is required.', 'purecart' ), array( 'status' => 400 ) );
		}

		$license = $this->generator->get_by_key( $license_key );

		if ( ! $license ) {
			return new \WP_Error( 'purecart_not_found', __( 'Invalid license key.', 'purecart' ), array( 'status' => 404 ) );
		}

		return rest_ensure_response(
			array(
				'status'           => $license->status,
				'plan_type'        => $license->plan_type,
				'activation_limit' => $license->activation_limit,
				'activated_count'  => $license->activated_count,
				'expires_at'       => $license->expires_at,
			)
		);
	}

	/**
	 * Handle GET /purecart/v1/license/ping — lightweight reachability check.
	 *
	 * Does not consume an activation or validate a key; used by remote
	 * plugins to verify the store is reachable before attempting activation.
	 *
	 * @since  1.0.0
	 * @return \WP_REST_Response
	 */
	public function license_ping(): \WP_REST_Response {
		return rest_ensure_response(
			array(
				'status'    => 'ok',
				'timestamp' => time(),
			)
		);
	}

	/**
	 * Handle POST /purecart/v1/license/token/refresh.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function license_token_refresh( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$result = ( new LicenseTokenRefresher() )->refresh( (string) $request->get_param( 'refresh_token' ) );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'data'    => $result,
			)
		);
	}

	/**
	 * Handle POST /purecart/v1/license/token/revoke-all (requires manage_woocommerce).
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function license_token_revoke_all( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$license = $this->generator->get_by_key( (string) $request->get_param( 'license_key' ) );

		if ( ! $license ) {
			return new \WP_Error( 'purecart_not_found', __( 'Invalid license key.', 'purecart' ), array( 'status' => 404 ) );
		}

		( new LicenseTokenRevoker() )->revoke_all( (int) $license->id );

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => __( 'All tokens revoked for this license.', 'purecart' ),
			)
		);
	}

	/**
	 * Handle POST /purecart/v1/license/revoke (requires manage_woocommerce).
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function license_revoke( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$key = (string) $request->get_param( 'license_key' );

		$license = $this->generator->get_by_key( $key );

		if ( ! $license ) {
			return new \WP_Error( 'purecart_not_found', __( 'Invalid license key.', 'purecart' ), array( 'status' => 404 ) );
		}

		if ( ! $this->generator->set_status( (int) $license->id, 'revoked' ) ) {
			return new \WP_Error( 'purecart_revoke_failed', __( 'Could not revoke license.', 'purecart' ), array( 'status' => 500 ) );
		}

		// purecart_license_status_changed already fires from set_status();
		// purecart_license_revoked is the documented, revoke-specific hook
		// the JWT token revoker (and any other listener) hangs off of.

		/**
		 * Fires when a license is revoked.
		 *
		 * @since 1.0.0
		 * @param int $license_id License row ID.
		 */
		do_action( 'purecart_license_revoked', (int) $license->id );

		/**
		 * Fires when a license is revoked via the REST API.
		 *
		 * @since 1.0.0
		 * @param string $license_key The revoked license key.
		 */
		do_action( 'purecart_license_revoked_via_api', $key );

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => __( 'License revoked.', 'purecart' ),
			)
		);
	}

	/**
	 * GET /licenses — admin list with the KPI strip's counts, optionally
	 * filtered by status/product/search/date-range, and paginated.
	 *
	 * Fetches every row and filters/paginates in PHP rather than in SQL —
	 * same trade-off API\Updates::admin_versions() makes: this table is an
	 * admin-only listing, not a high-frequency query path, and version-style
	 * filtering logic is far more readable in PHP than assembled SQL.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function list_licenses( \WP_REST_Request $request ): \WP_REST_Response {
		$page     = max( 1, (int) ( $request->get_param( 'page' ) ?: 1 ) );
		$per_page = max( 1, min( 100, (int) ( $request->get_param( 'perPage' ) ?: 20 ) ) );
		$search   = trim( (string) $request->get_param( 'search' ) );
		$status   = trim( (string) $request->get_param( 'status' ) );
		$product  = (int) $request->get_param( 'productId' );
		$days     = $request->get_param( 'expiresWithinDays' );

		$rows = $this->generator->find_all();

		$items = array();
		foreach ( $rows as $row ) {
			if ( '' !== $search ) {
				$q = strtolower( $search );
				if ( false === strpos( strtolower( (string) $row->license_key ), $q )
					&& false === strpos( strtolower( (string) $row->customer_name ), $q )
					&& false === strpos( strtolower( (string) $row->customer_email ), $q )
					&& false === strpos( strtolower( (string) $row->product_name ), $q )
				) {
					continue;
				}
			}

			if ( '' !== $status && 'All' !== $status && $status !== $row->status ) {
				continue;
			}

			if ( $product > 0 && $product !== (int) $row->product_id ) {
				continue;
			}

			if ( null !== $days && '' !== $days ) {
				if ( ! $row->expires_at ) {
					continue;
				}
				$within = strtotime( (string) $row->expires_at ) <= strtotime( '+' . (int) $days . ' days' );
				if ( ! $within ) {
					continue;
				}
			}

			$items[] = $this->prepare_license( $row );
		}

		$total       = count( $items );
		$total_pages = max( 1, (int) ceil( $total / $per_page ) );
		$offset      = ( $page - 1 ) * $per_page;

		return rest_ensure_response(
			array(
				'data'       => array_slice( $items, $offset, $per_page ),
				'total'      => $total,
				'totalPages' => $total_pages,
				'stats'      => $this->generator->stats(),
			)
		);
	}

	/**
	 * GET /licenses/{id} — one license, its activation records, and JWT
	 * token status.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_license( \WP_REST_Request $request ) {
		$id      = (int) $request->get_param( 'id' );
		$license = $this->generator->get_by_id_with_details( $id );

		if ( ! $license ) {
			return new \WP_Error( 'purecart_not_found', __( 'License not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		$activations = array_map(
			array( $this, 'prepare_activation' ),
			$this->activator->find_by_license( $id )
		);

		return rest_ensure_response(
			array(
				'license'     => $this->prepare_license( $license ),
				'activations' => $activations,
				'jwtStatus'   => $this->jwt_status( $id ),
			)
		);
	}

	/**
	 * GET /reports/licenses/summary — LicenseSummaryPage's aggregate data.
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function get_report_summary(): \WP_REST_Response {
		global $wpdb;

		$table = $wpdb->prefix . 'purecart_licenses';
		$stats = $this->generator->stats();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Reporting aggregate over a custom table; {$table} is not user input, the date is bound below.
		$issued_by_day = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT DATE( created_at ) AS day, COUNT(*) AS total
                   FROM {$table}
                  WHERE created_at >= %s
               GROUP BY day
               ORDER BY day ASC",
				gmdate( 'Y-m-d 00:00:00', strtotime( '-29 days' ) )
			)
		) ?: array();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- As above; fixed query, no variable input.
		$by_plan = $wpdb->get_results( "SELECT plan_type, COUNT(*) AS total FROM {$table} GROUP BY plan_type" ) ?: array();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- As above; fixed query, no variable input.
		$by_status = $wpdb->get_results( "SELECT status, COUNT(*) AS total FROM {$table} GROUP BY status" ) ?: array();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- As above; fixed query, no variable input.
		$by_product = $wpdb->get_results(
			"SELECT l.product_id, p.post_title AS product_name, COUNT(*) AS total
               FROM {$table} l
               LEFT JOIN {$wpdb->posts} p ON p.ID = l.product_id
           GROUP BY l.product_id
           ORDER BY total DESC
              LIMIT 10"
		) ?: array();

		// Per-product status breakdown — powers the Licenses by Product table.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- As above.
		$by_product_status = $wpdb->get_results(
			"SELECT
                l.product_id,
                p.post_title AS product_name,
                SUM( l.status = 'active'    ) AS active,
                SUM( l.status = 'expired'   ) AS expired,
                SUM( l.status = 'suspended' ) AS suspended,
                SUM( l.status = 'revoked'   ) AS revoked
               FROM {$table} l
               LEFT JOIN {$wpdb->posts} p ON p.ID = l.product_id
           GROUP BY l.product_id
           ORDER BY ( SUM( l.status = 'active' ) + SUM( l.status = 'expired' ) + SUM( l.status = 'suspended' ) + SUM( l.status = 'revoked' ) ) DESC
              LIMIT 10"
		) ?: array();

		// Top customers ranked by total license count — powers the Top Customers card.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- As above.
		$top_customers = $wpdb->get_results(
			"SELECT
                l.user_id,
                u.display_name AS customer_name,
                COUNT(*)                         AS total_licenses,
                SUM( l.status = 'active' )       AS active_licenses
               FROM {$table} l
               LEFT JOIN {$wpdb->users} u ON u.ID = l.user_id
           GROUP BY l.user_id
           ORDER BY total_licenses DESC
              LIMIT 10"
		) ?: array();

		// Recent license activity — most recently created or status-changed rows.
		// type is inferred: rows whose updated_at equals created_at are 'issued';
		// rows whose status changed after creation carry their current status as type.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- As above.
		$recent_activity = $wpdb->get_results(
			"SELECT
                l.user_id,
                u.display_name                                                              AS customer_name,
                l.product_id,
                p.post_title                                                                AS product_name,
                l.plan_type,
                CASE
                    WHEN l.updated_at <= l.created_at OR l.status = 'active' THEN 'issued'
                    ELSE l.status
                END                                                                         AS type,
                GREATEST( l.created_at, l.updated_at )                                     AS event_time
               FROM {$table} l
               LEFT JOIN {$wpdb->users} u ON u.ID = l.user_id
               LEFT JOIN {$wpdb->posts} p ON p.ID = l.product_id
           ORDER BY event_time DESC
              LIMIT 10"
		) ?: array();

		return rest_ensure_response(
			array(
				'stats'          => $stats,
				'issuedByDay'    => array_map(
					static fn( $r ) => array(
						'date'  => (string) $r->day,
						'count' => (int) $r->total,
					),
					$issued_by_day
				),
				'byPlan'         => array_map(
					static fn( $r ) => array(
						'plan'  => (string) $r->plan_type,
						'count' => (int) $r->total,
					),
					$by_plan
				),
				'byStatus'       => array_map(
					static fn( $r ) => array(
						'status' => (string) $r->status,
						'count'  => (int) $r->total,
					),
					$by_status
				),
				'topProducts'    => array_map(
					static fn( $r ) => array(
						'productId'   => (int) $r->product_id,
						'productName' => (string) ( $r->product_name ?: "Product #{$r->product_id}" ),
						'count'       => (int) $r->total,
					),
					$by_product
				),
				'byProduct'      => array_map(
					static fn( $r ) => array(
						'productId'   => (int) $r->product_id,
						'productName' => (string) ( $r->product_name ?: "Product #{$r->product_id}" ),
						'active'      => (int) $r->active,
						'expired'     => (int) $r->expired,
						'suspended'   => (int) $r->suspended,
						'revoked'     => (int) $r->revoked,
					),
					$by_product_status
				),
				'topCustomers'   => array_map(
					static fn( $r ) => array(
						'userId'          => (int) $r->user_id,
						'customerName'    => (string) ( $r->customer_name ?: "User #{$r->user_id}" ),
						'totalLicenses'   => (int) $r->total_licenses,
						'activeLicenses'  => (int) $r->active_licenses,
					),
					$top_customers
				),
				'recentActivity' => array_map(
					static fn( $r ) => array(
						'type'         => (string) $r->type,
						'customerName' => (string) ( $r->customer_name ?: "User #{$r->user_id}" ),
						'productName'  => (string) ( $r->product_name ?: "Product #{$r->product_id}" ),
						'planType'     => (string) $r->plan_type,
						'createdAt'    => (string) $r->event_time,
					),
					$recent_activity
				),
			)
		);
	}

	/**
	 * GET /licenses/export — CSV download of every license.
	 *
	 * @since 1.0.0
	 * @return void Exits after streaming the CSV; never returns.
	 */
	public function export_csv(): void {
		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="purecart-licenses-' . gmdate( 'Y-m-d' ) . '.csv"' );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen -- Streaming a generated CSV directly to the response; WP_Filesystem has no streaming-output equivalent.
		$out = fopen( 'php://output', 'w' );
		fputcsv( $out, array( 'License Key', 'Customer', 'Email', 'Product', 'Plan', 'Status', 'Activations', 'Limit', 'Expires', 'Created' ) );

		foreach ( $this->generator->find_all() as $row ) {
			fputcsv(
				$out,
				array(
					(string) $row->license_key,
					(string) $row->customer_name,
					(string) $row->customer_email,
					(string) $row->product_name,
					(string) $row->plan_type,
					(string) $row->status,
					(string) $row->activated_count,
					(string) $row->activation_limit,
					(string) $row->expires_at,
					(string) $row->created_at,
				)
			);
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- Pairs with the fopen() above.
		fclose( $out );
		exit;
	}

	/**
	 * POST /licenses/{id}/extend — push expiry forward by N days.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_extend( \WP_REST_Request $request ) {
		$id   = (int) $request->get_param( 'id' );
		$days = max( 1, (int) ( $request->get_param( 'days' ) ?: 30 ) );

		if ( ! $this->generator->get_by_id( $id ) ) {
			return new \WP_Error( 'purecart_not_found', __( 'License not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		$ok = $this->generator->extend_expiry( $id, $days, 'day' );
		if ( ! $ok ) {
			return new \WP_Error( 'purecart_extend_failed', __( 'This license cannot be extended (lifetime plans have no expiry).', 'purecart' ), array( 'status' => 400 ) );
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'license' => $this->prepare_license( $this->generator->get_by_id_with_details( $id ) ),
			)
		);
	}

	/**
	 * POST /licenses/{id}/suspend
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_suspend( \WP_REST_Request $request ) {
		return $this->set_status_response( (int) $request->get_param( 'id' ), 'suspended' );
	}

	/**
	 * POST /licenses/{id}/reinstate
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_reinstate( \WP_REST_Request $request ) {
		return $this->set_status_response( (int) $request->get_param( 'id' ), 'active' );
	}

	/**
	 * POST /licenses/{id}/revoke
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_revoke( \WP_REST_Request $request ) {
		return $this->set_status_response( (int) $request->get_param( 'id' ), 'revoked' );
	}

	/**
	 * POST /licenses/bulk-revoke — body: { ids: number[] }.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function bulk_revoke( \WP_REST_Request $request ): \WP_REST_Response {
		$ids = (array) $request->get_param( 'ids' );

		$revoked = 0;
		foreach ( $ids as $id ) {
			if ( $this->generator->set_status( (int) $id, 'revoked' ) ) {
				++$revoked;
			}
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'revoked' => $revoked,
			)
		);
	}

	/**
	 * POST /licenses/{id}/reset-activations
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_reset_activations( \WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );

		if ( ! $this->generator->get_by_id( $id ) ) {
			return new \WP_Error( 'purecart_not_found', __( 'License not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		$this->activator->reset_activations( $id );

		return rest_ensure_response(
			array(
				'success' => true,
				'license' => $this->prepare_license( $this->generator->get_by_id_with_details( $id ) ),
			)
		);
	}

	/**
	 * POST /licenses/{id}/duplicate
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_duplicate( \WP_REST_Request $request ) {
		$id      = (int) $request->get_param( 'id' );
		$created = $this->generator->duplicate( $id );

		if ( ! $created ) {
			return new \WP_Error( 'purecart_duplicate_failed', __( 'Could not duplicate this license.', 'purecart' ), array( 'status' => 400 ) );
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'license' => $this->prepare_license( $this->generator->get_by_id_with_details( (int) $created->id ) ),
			)
		);
	}

	/**
	 * Shared body for the suspend/reinstate/revoke actions, which all just
	 * set a different target status.
	 *
	 * @since 1.0.0
	 * @param int    $id     License row ID.
	 * @param string $status One of active/expired/revoked/suspended.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function set_status_response( int $id, string $status ) {
		if ( ! $this->generator->get_by_id( $id ) ) {
			return new \WP_Error( 'purecart_not_found', __( 'License not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		$this->generator->set_status( $id, $status );

		return rest_ensure_response(
			array(
				'success' => true,
				'license' => $this->prepare_license( $this->generator->get_by_id_with_details( $id ) ),
			)
		);
	}

	/**
	 * Snake_case DB row to the camelCase shape the SPA expects.
	 *
	 * @since 1.0.0
	 * @param object $row License row, joined with product/customer columns.
	 * @return array<string, mixed>
	 */
	private function prepare_license( object $row ): array {
		return array(
			'id'              => (int) $row->id,
			'orderId'         => (int) $row->order_id,
			'userId'          => (int) $row->user_id,
			'productId'       => (int) $row->product_id,
			'productName'     => (string) ( $row->product_name ?? '' ) ?: "Product #{$row->product_id}",
			'customerName'    => (string) ( $row->customer_name ?? '' ),
			'customerEmail'   => (string) ( $row->customer_email ?? '' ),
			'licenseKey'      => (string) $row->license_key,
			'planType'        => (string) $row->plan_type,
			'status'          => (string) $row->status,
			'activationLimit' => (int) $row->activation_limit,
			'activatedCount'  => (int) $row->activated_count,
			'expiresAt'       => $row->expires_at ? (string) $row->expires_at : null,
			'createdAt'       => (string) $row->created_at,
			'updatedAt'       => (string) $row->updated_at,
		);
	}

	/**
	 * Snake_case activation row to the camelCase shape the SPA expects.
	 *
	 * @since 1.0.0
	 * @param object $row Activation row.
	 * @return array<string, mixed>
	 */
	private function prepare_activation( object $row ): array {
		return array(
			'id'          => (int) $row->id,
			'licenseId'   => (int) $row->license_id,
			'domain'      => (string) $row->domain,
			'ipAddress'   => (string) $row->ip_address,
			'environment' => (string) $row->environment,
			'activatedAt' => (string) $row->activated_at,
			'lastCheck'   => $row->last_check ? (string) $row->last_check : null,
		);
	}

	/**
	 * Most recent non-revoked access/refresh token for a license, for the
	 * detail page's JWT section.
	 *
	 * @since 1.0.0
	 * @param int $license_id License row ID.
	 * @return array<string, mixed>
	 */
	private function jwt_status( int $license_id ): array {
		global $wpdb;

		$table = $wpdb->prefix . 'purecart_license_tokens';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Admin detail view, must reflect a token just issued/revoked; {$table} is not user input, $license_id is bound below.
		$access = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT expires_at, revoked FROM {$table}
                  WHERE license_id = %d AND token_type = 'access'
               ORDER BY created_at DESC LIMIT 1",
				$license_id
			)
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- As above.
		$refresh = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT expires_at, revoked FROM {$table}
                  WHERE license_id = %d AND token_type = 'refresh'
               ORDER BY created_at DESC LIMIT 1",
				$license_id
			)
		);

		$access_active = $access && ! (int) $access->revoked && strtotime( (string) $access->expires_at ) > time();

		return array(
			'accessTokenActive'     => (bool) $access_active,
			'accessTokenExpiresAt'  => $access ? (string) $access->expires_at : null,
			'refreshTokenExpiresAt' => $refresh ? (string) $refresh->expires_at : null,
		);
	}
}

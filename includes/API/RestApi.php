<?php
/**
 * Bootstraps all REST API route groups.
 *
 * Namespace: purecart/v1
 *
 * @package PureCart\API
 */

declare( strict_types=1 );

namespace PureCart\API;

defined( 'ABSPATH' ) || exit;

use PureCart\Licensing\LicenseActivator;
use PureCart\Licensing\LicenseGenerator;
use PureCart\Licensing\LicenseTokenIssuer;
use PureCart\Licensing\LicenseTokenValidator;
use PureCart\Licensing\LicenseTokenRefresher;
use PureCart\Licensing\LicenseTokenRevoker;
use PureCart\Downloads\DownloadDispatcher;

/**
 * Central REST API registrar.
 */
class RestApi {

	/**
	 * Boot sub-modules and register the rest_api_init hook.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		new DownloadDispatcher();

		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register all PureCart REST API routes.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			PURECART_API_NAMESPACE,
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
			PURECART_API_NAMESPACE,
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
			PURECART_API_NAMESPACE,
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
			PURECART_API_NAMESPACE,
			'/license/ping',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'license_ping' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/license/revoke',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'license_revoke' ),
				'permission_callback' => static fn() => current_user_can( 'manage_woocommerce' ),
				'args'                => array(
					'license_key' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
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
			PURECART_API_NAMESPACE,
			'/license/token/revoke-all',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'license_token_revoke_all' ),
				'permission_callback' => static fn() => current_user_can( 'manage_woocommerce' ),
				'args'                => array(
					'license_key' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/saas/usage/(?P<api_key>[a-z0-9_]+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'saas_usage' ),
				'permission_callback' => '__return_true',
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

		$result = ( new LicenseActivator() )->activate( $license_key, $domain, $environment );

		if ( ! $result['success'] ) {
			return new \WP_Error( 'purecart_activation_failed', $result['message'], array( 'status' => 403 ) );
		}

		// Issue a JWT pair so the customer's plugin can validate locally
		// instead of polling /license/check — see docs/RND-licensing-jwt.md.
		$license = ( new LicenseGenerator() )->get_by_key( $license_key );
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
		$result = ( new LicenseActivator() )->deactivate(
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

			return rest_ensure_response( ( new LicenseGenerator() )->get_by_user( $user_id ) );
		}

		$license_key = (string) $request->get_param( 'license_key' );
		if ( '' === $license_key ) {
			return new \WP_Error( 'purecart_missing_param', __( 'license_key or user_id is required.', 'purecart' ), array( 'status' => 400 ) );
		}

		$license = ( new LicenseGenerator() )->get_by_key( $license_key );

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
		$license = ( new LicenseGenerator() )->get_by_key( (string) $request->get_param( 'license_key' ) );

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

		$generator = new LicenseGenerator();
		$license   = $generator->get_by_key( $key );

		if ( ! $license ) {
			return new \WP_Error( 'purecart_not_found', __( 'Invalid license key.', 'purecart' ), array( 'status' => 404 ) );
		}

		if ( ! $generator->set_status( (int) $license->id, 'revoked' ) ) {
			return new \WP_Error( 'purecart_revoke_failed', __( 'Could not revoke license.', 'purecart' ), array( 'status' => 500 ) );
		}

		// purecart_license_status_changed already fires from set_status();
		// purecart_license_revoked is the documented, revoke-specific hook
		// the JWT token revoker (and any other listener) hangs off of.
		do_action( 'purecart_license_revoked', (int) $license->id );
		do_action( 'purecart_license_revoked_via_api', $key );

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => __( 'License revoked.', 'purecart' ),
			)
		);
	}

	/**
	 * Handle GET /purecart/v1/saas/usage/{api_key}.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function saas_usage( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- API key authentication; cached status could allow suspended accounts through.
		$account = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}purecart_saas_accounts WHERE api_key = %s LIMIT 1",
				sanitize_text_field( $request->get_param( 'api_key' ) )
			)
		);

		if ( ! $account ) {
			return new \WP_Error( 'purecart_not_found', __( 'Invalid API key.', 'purecart' ), array( 'status' => 401 ) );
		}

		if ( 'active' !== $account->status ) {
			return new \WP_Error( 'purecart_account_suspended', __( 'Account is not active.', 'purecart' ), array( 'status' => 403 ) );
		}

		return rest_ensure_response(
			array(
				'plan'           => $account->plan,
				'status'         => $account->status,
				'provisioned_at' => $account->provisioned_at,
			)
		);
	}
}

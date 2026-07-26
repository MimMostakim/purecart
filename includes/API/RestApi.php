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
				'permission_callback' => '__return_true',
				'args'                => array(
					'license_key' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'domain'      => array(
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
						'default'           => '',
					),
				),
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
		$result = ( new LicenseActivator() )->activate(
			$request->get_param( 'license_key' ),
			$request->get_param( 'domain' ),
			$request->get_param( 'environment' )
		);

		if ( ! $result['success'] ) {
			return new \WP_Error( 'purecart_activation_failed', $result['message'], array( 'status' => 403 ) );
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
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- License check is security-critical; cached status could allow revoked/expired licenses through.
		$license = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}purecart_licenses WHERE license_key = %s LIMIT 1",
				$request->get_param( 'license_key' )
			)
		);

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
	 * Handle POST /purecart/v1/license/revoke (requires manage_woocommerce).
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function license_revoke( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;

		$key = $request->get_param( 'license_key' );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Status update on custom table; must be real-time.
		$updated = $wpdb->update(
			$wpdb->prefix . 'purecart_licenses',
			array(
				'status'     => 'revoked',
				'updated_at' => current_time( 'mysql' ),
			),
			array( 'license_key' => $key ),
			array( '%s', '%s' ),
			array( '%s' )
		);

		if ( false === $updated ) {
			return new \WP_Error( 'purecart_revoke_failed', __( 'Could not revoke license.', 'purecart' ), array( 'status' => 500 ) );
		}

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

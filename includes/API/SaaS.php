<?php
/**
 * REST routes for the SaaS Provisioning module.
 *
 * @package PureCart\API
 */

declare( strict_types=1 );

namespace PureCart\API;

use PureCart\SaaS\AccountProvisioner;
use PureCart\SaaS\ApiKeyManager;
use PureCart\SaaS\JwtIssuer;
use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * `GET /saas/usage/{api_key}` deliberately stays registered in
 * `API\RestApi` rather than being duplicated or moved here — it already
 * works, and re-registering the same route path from two controllers risks
 * one silently shadowing the other depending on load order. Everything new
 * (admin CRUD, settings, and the JWT login endpoints from Step 5) lives in
 * this controller, mirroring API\Updates / API\Subscriptions.
 *
 * @since 1.0.0
 */
class SaaS extends PureCartApi {

	/** @var AccountProvisioner */
	private AccountProvisioner $accounts;

	/** @var ApiKeyManager */
	private ApiKeyManager $keys;

	/** @var JwtIssuer */
	private JwtIssuer $jwt;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->accounts = new AccountProvisioner();
		$this->keys     = new ApiKeyManager();
		$this->jwt      = new JwtIssuer();
	}

	// -----------------------------------------------------------------------
	// Route registration
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes(): void {
		$ns   = PURECART_API_NAMESPACE;
		$base = '/saas-accounts';

		register_rest_route(
			$ns,
			$base,
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_accounts' ),
				'permission_callback' => array( $this, 'permission_admin' ),
				'args'                => array(
					'search'     => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'required'          => false,
					),
					'status'     => array(
						'type'     => array( 'string', 'array' ),
						'required' => false,
					),
					'plan'       => array(
						'type'     => array( 'string', 'array' ),
						'required' => false,
					),
					'product_id' => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'required'          => false,
					),
					'page'       => array(
						'type'              => 'integer',
						'default'           => 1,
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
						'required'          => false,
					),
					'per_page'   => array(
						'type'     => 'integer',
						'default'  => 20,
						'minimum'  => 1,
						'maximum'  => 100,
						'required' => false,
					),
				),
			)
		);

		register_rest_route(
			$ns,
			$base . '/stats',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'stats' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

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
						'webhook_url'         => array(
							'type'              => 'string',
							'sanitize_callback' => 'esc_url_raw',
							'required'          => false,
						),
						'jwt_expiry_seconds'  => array(
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
							'required'          => false,
						),
						'jwt_refresh_seconds' => array(
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
							'required'          => false,
						),
					),
				),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_account' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		foreach ( array( 'suspend', 'activate' ) as $action ) {
			register_rest_route(
				$ns,
				$base . '/(?P<id>\d+)/' . $action,
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'handle_action_' . $action ),
					'permission_callback' => array( $this, 'permission_admin' ),
				)
			);
		}

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/rotate-key',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rotate_key' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		// Customer-facing: authenticated by the API key in the request body,
		// not a WP capability — a SaaS backend calling this has no WP session.
		register_rest_route(
			$ns,
			'/saas/token',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'issue_token' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'api_key' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			$ns,
			'/saas/token/refresh',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'refresh_token' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'refresh_token' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	// -----------------------------------------------------------------------
	// Permission callbacks
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @return bool
	 */
	public function permission_admin(): bool {
		return current_user_can( 'manage_woocommerce' );
	}

	// -----------------------------------------------------------------------
	// Admin: list / detail / stats
	// -----------------------------------------------------------------------

	/**
	 * GET /saas-accounts
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function list_accounts( \WP_REST_Request $request ): \WP_REST_Response {
		$search     = $request->get_param( 'search' );
		$status     = $request->get_param( 'status' );
		$plan       = $request->get_param( 'plan' );
		$product_id = $request->get_param( 'product_id' );
		$page       = (int) ( $request->get_param( 'page' ) ?? 1 );
		$per_page   = (int) ( $request->get_param( 'per_page' ) ?? 20 );

		$result = $this->accounts->find_all(
			search:     ! empty( $search ) ? (string) $search : null,
			status:     ! empty( $status ) ? $status : null,
			plan:       ! empty( $plan ) ? $plan : null,
			product_id: ! empty( $product_id ) ? (int) $product_id : null,
			page:       $page,
			per_page:   $per_page
		);

		$prepared = array_map( array( $this, 'prepare_account' ), $result['items'] );

		$response = rest_ensure_response( $prepared );
		$response->header( 'X-WP-Total', (string) $result['total'] );
		$response->header( 'X-WP-TotalPages', (string) $result['total_pages'] );

		return $response;
	}

	/**
	 * GET /saas-accounts/{id}
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_account( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$account = $this->accounts->get_by_id( (int) $request->get_param( 'id' ) );

		if ( ! $account ) {
			return new \WP_Error( 'purecart_not_found', __( 'SaaS account not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		return rest_ensure_response( $this->prepare_account( $account ) );
	}

	/**
	 * GET /saas-accounts/stats
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function stats(): \WP_REST_Response {
		return rest_ensure_response( $this->accounts->stats() );
	}

	// -----------------------------------------------------------------------
	// Admin: row actions
	// -----------------------------------------------------------------------

	/**
	 * POST /saas-accounts/{id}/suspend
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_suspend( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		return $this->handle_status_action( $request, 'suspend' );
	}

	/**
	 * POST /saas-accounts/{id}/activate
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_activate( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		return $this->handle_status_action( $request, 'activate' );
	}

	/**
	 * Shared implementation for the suspend/activate row actions.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request.
	 * @param  string           $action  'suspend' or 'activate'.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function handle_status_action( \WP_REST_Request $request, string $action ): \WP_REST_Response|\WP_Error {
		$account_id = (int) $request->get_param( 'id' );
		$account    = $this->accounts->get_by_id( $account_id );

		if ( ! $account ) {
			return new \WP_Error( 'purecart_not_found', __( 'SaaS account not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		$ok = 'suspend' === $action ? $this->accounts->suspend( $account_id ) : $this->accounts->activate( $account_id );

		if ( ! $ok ) {
			return new \WP_Error( 'purecart_action_noop', __( 'Account already in that state.', 'purecart' ), array( 'status' => 409 ) );
		}

		$updated = $this->accounts->get_by_id( $account_id );

		return rest_ensure_response( $this->prepare_account( $updated ) );
	}

	/**
	 * POST /saas-accounts/{id}/rotate-key
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function rotate_key( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$account_id = (int) $request->get_param( 'id' );
		$account    = $this->accounts->get_by_id( $account_id );

		if ( ! $account ) {
			return new \WP_Error( 'purecart_not_found', __( 'SaaS account not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		$new_key = $this->keys->rotate( $account_id );

		if ( ! $new_key ) {
			return new \WP_Error( 'purecart_rotate_failed', __( 'Could not rotate the API key.', 'purecart' ), array( 'status' => 500 ) );
		}

		$updated = $this->accounts->get_by_id( $account_id );

		return rest_ensure_response( $this->prepare_account( $updated ) );
	}

	// -----------------------------------------------------------------------
	// Admin: settings
	// -----------------------------------------------------------------------

	/**
	 * GET /saas-accounts/settings
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function get_settings(): \WP_REST_Response {
		return rest_ensure_response(
			array(
				'webhook_url'         => (string) Settings::get( OptionKeys::SAAS_WEBHOOK_URL, '' ),
				'webhook_secret'      => (string) Settings::get( OptionKeys::SAAS_WEBHOOK_SECRET, '' ),
				'jwt_expiry_seconds'  => (int) Settings::get( OptionKeys::SAAS_JWT_EXPIRY_SECONDS, 600 ),
				'jwt_refresh_seconds' => (int) Settings::get( OptionKeys::SAAS_JWT_REFRESH_SECONDS, 30 * DAY_IN_SECONDS ),
			)
		);
	}

	/**
	 * POST /saas-accounts/settings
	 *
	 * The webhook secret is deliberately not settable here — it is
	 * auto-generated on first use (AccountProvisioner) and rotating it from
	 * this form would silently break signature verification on the
	 * merchant's SaaS backend with no visible cause. Regenerating it is a
	 * deliberate future action, not a side effect of saving this form.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function save_settings( \WP_REST_Request $request ): \WP_REST_Response {
		if ( null !== $request->get_param( 'webhook_url' ) ) {
			Settings::set( OptionKeys::SAAS_WEBHOOK_URL, (string) $request->get_param( 'webhook_url' ) );
		}

		if ( null !== $request->get_param( 'jwt_expiry_seconds' ) ) {
			Settings::set( OptionKeys::SAAS_JWT_EXPIRY_SECONDS, max( 60, (int) $request->get_param( 'jwt_expiry_seconds' ) ) );
		}

		if ( null !== $request->get_param( 'jwt_refresh_seconds' ) ) {
			Settings::set( OptionKeys::SAAS_JWT_REFRESH_SECONDS, max( HOUR_IN_SECONDS, (int) $request->get_param( 'jwt_refresh_seconds' ) ) );
		}

		return $this->get_settings();
	}

	// -----------------------------------------------------------------------
	// Customer-facing: JWT login
	// -----------------------------------------------------------------------

	/**
	 * POST /saas/token
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function issue_token( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$result = $this->jwt->issue( (string) $request->get_param( 'api_key' ) );

		return is_wp_error( $result ) ? $result : rest_ensure_response( $result );
	}

	/**
	 * POST /saas/token/refresh
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function refresh_token( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$result = $this->jwt->refresh( (string) $request->get_param( 'refresh_token' ) );

		return is_wp_error( $result ) ? $result : rest_ensure_response( $result );
	}

	// -----------------------------------------------------------------------
	// Response shaping
	// -----------------------------------------------------------------------

	/**
	 * Shape one DB row into the REST/frontend contract — see Appendix A of
	 * docs/saas-module/dev-plan-saas.md for the shipped shape.
	 *
	 * @since  1.0.0
	 * @param  object $row Account row, optionally already carrying
	 *                     customer_email/customer_name/product_name from a
	 *                     find_all() join — resolved here if missing.
	 * @return array<string, mixed>
	 */
	private function prepare_account( object $row ): array {
		$order          = wc_get_order( (int) $row->order_id );
		$customer_name  = (string) ( $row->customer_name ?? '' );
		$customer_email = (string) ( $row->customer_email ?? '' );
		$product_name   = (string) ( $row->product_name ?? '' );

		// find_all() already joins user/product names in; get_by_id() (used
		// by the single-account, suspend, activate, and rotate-key
		// responses) doesn't, so resolve them here when missing.
		if ( '' === trim( $customer_name ) || '' === trim( $customer_email ) ) {
			$user = get_userdata( (int) $row->user_id );
			if ( $user instanceof \WP_User ) {
				$customer_name  = '' !== trim( $customer_name ) ? $customer_name : $user->display_name;
				$customer_email = '' !== trim( $customer_email ) ? $customer_email : $user->user_email;
			}
		}

		if ( '' === trim( $product_name ) ) {
			$product      = wc_get_product( (int) $row->product_id );
			$product_name = $product ? $product->get_name() : '';
		}

		return array(
			'id'              => (int) $row->id,
			'order_id'        => (int) $row->order_id,
			'order_number'    => $order ? $order->get_order_number() : (string) $row->order_id,
			'user_id'         => (int) $row->user_id,
			'customer_name'   => (string) $customer_name,
			'customer_email'  => (string) $customer_email,
			'product_id'      => (int) $row->product_id,
			'product_name'    => (string) $product_name,
			'plan'            => (string) $row->plan,
			// Masked — only the last 8 characters, matching the Downloads
			// module's token masking convention (Appendix A). The full key
			// was already shown to the customer once, in the provisioning
			// email; an admin who needs it in full has DB access.
			'api_key_masked'  => $this->mask_key( (string) $row->api_key ),
			'status'          => (string) $row->status,
			'provisioned_at'  => (string) $row->provisioned_at,
		);
	}

	/**
	 * @since  1.0.0
	 * @param  string $key Full API key.
	 * @return string
	 */
	private function mask_key( string $key ): string {
		if ( strlen( $key ) <= 8 ) {
			return $key;
		}

		return str_repeat( '•', 8 ) . substr( $key, -8 );
	}
}

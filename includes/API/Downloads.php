<?php
/**
 * REST routes for the Secure Downloads module.
 *
 * @package PureCart\API
 */

declare( strict_types=1 );

namespace PureCart\API;

use PureCart\Downloads\DownloadLogger;
use PureCart\Downloads\DownloadReport;
use PureCart\Downloads\TokenManager;
use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Admin endpoints behind the Downloads screens.
 *
 * Every route here is staff-only. The customer-facing side of this module is
 * not REST at all — it is the token URL handled by
 * {@see \PureCart\Downloads\DownloadDispatcher}, which streams a file rather
 * than returning JSON.
 *
 * @since 1.0.0
 */
class Downloads extends PureCartApi {

	/** @var DownloadReport */
	private DownloadReport $report;

	/** @var TokenManager */
	private TokenManager $tokens;

	/** @var DownloadLogger */
	private DownloadLogger $logger;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->report = new DownloadReport();
		$this->tokens = new TokenManager();
		$this->logger = new DownloadLogger();
	}

	/**
	 * Register the module's routes.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			PURECART_API_NAMESPACE,
			'/downloads',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_downloads' ),
				'permission_callback' => array( $this, 'permission_admin' ),
				'args'                => $this->list_args(),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/downloads/stats',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_stats' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/downloads/logs',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_logs' ),
				'permission_callback' => array( $this, 'permission_admin' ),
				'args'                => $this->log_args(),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/downloads/settings',
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
					'args'                => $this->settings_args(),
				),
			)
		);

		// Registered after the literal routes above: '/downloads/stats' would
		// otherwise be swallowed by a looser pattern here.
		register_rest_route(
			PURECART_API_NAMESPACE,
			'/downloads/(?P<id>\d+)',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_download' ),
					'permission_callback' => array( $this, 'permission_admin' ),
					'args'                => $this->id_arg(),
				),
				array(
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_download' ),
					'permission_callback' => array( $this, 'permission_admin' ),
					'args'                => $this->update_args(),
				),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/downloads/(?P<id>\d+)/revoke',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'revoke_download' ),
				'permission_callback' => array( $this, 'permission_admin' ),
				'args'                => $this->id_arg(),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/downloads/(?P<id>\d+)/regenerate',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'regenerate_download' ),
				'permission_callback' => array( $this, 'permission_admin' ),
				'args'                => $this->id_arg(),
			)
		);
	}

	/**
	 * Staff-only gate, matching the rest of the plugin's admin routes.
	 *
	 * @since  1.0.0
	 * @return bool
	 */
	public function permission_admin(): bool {
		return current_user_can( 'manage_woocommerce' );
	}

	// -----------------------------------------------------------------------
	// Handlers
	// -----------------------------------------------------------------------

	/**
	 * GET /downloads — paged, filtered token list.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function get_downloads( \WP_REST_Request $request ): \WP_REST_Response {
		$result = $this->report->list(
			array(
				'search'     => (string) $request->get_param( 'search' ),
				'status'     => (string) $request->get_param( 'status' ),
				'product_id' => (int) $request->get_param( 'product_id' ),
				'user_id'    => (int) $request->get_param( 'user_id' ),
				'order_id'   => (int) $request->get_param( 'order_id' ),
				'orderby'    => (string) $request->get_param( 'orderby' ),
				'order'      => (string) $request->get_param( 'order' ),
				'page'       => (int) $request->get_param( 'page' ),
				'per_page'   => (int) $request->get_param( 'per_page' ),
			)
		);

		$response = rest_ensure_response( $result['rows'] );
		$response->header( 'X-WP-Total', (string) $result['total'] );
		$response->header( 'X-WP-TotalPages', (string) $result['total_pages'] );

		return $response;
	}

	/**
	 * GET /downloads/{id} — one token plus its own audit trail.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_download( \WP_REST_Request $request ) {
		$id  = (int) $request->get_param( 'id' );
		$row = $this->report->find( $id );

		if ( ! $row ) {
			return $this->not_found();
		}

		$row['logs'] = $this->logger->get_logs(
			array(
				'download_id' => $id,
				'limit'       => 50,
			)
		);

		return rest_ensure_response( $row );
	}

	/**
	 * PATCH /downloads/{id} — adjust limit and expiry.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_download( \WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );

		$max     = $request->has_param( 'max_downloads' ) ? (int) $request->get_param( 'max_downloads' ) : null;
		$expires = $request->has_param( 'expires_at' ) ? (string) $request->get_param( 'expires_at' ) : null;

		if ( ! $this->tokens->update_limits( $id, $max, $expires ) ) {
			return $this->not_found();
		}

		return rest_ensure_response( $this->report->find( $id ) );
	}

	/**
	 * POST /downloads/{id}/revoke — kill a link.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function revoke_download( \WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );

		if ( ! $this->report->find( $id ) ) {
			return $this->not_found();
		}

		$this->tokens->revoke( $id );

		return rest_ensure_response( $this->report->find( $id ) );
	}

	/**
	 * POST /downloads/{id}/regenerate — new secret, counter reset.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function regenerate_download( \WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );

		if ( ! $this->tokens->regenerate( $id ) ) {
			return $this->not_found();
		}

		return rest_ensure_response( $this->report->find( $id ) );
	}

	/**
	 * GET /downloads/logs — the audit log across all tokens.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function get_logs( \WP_REST_Request $request ): \WP_REST_Response {
		$per_page = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 50 ) ) );
		$page     = max( 1, (int) ( $request->get_param( 'page' ) ?: 1 ) );

		$rows = $this->logger->get_logs(
			array(
				'download_id' => (int) $request->get_param( 'download_id' ),
				'event'       => (string) $request->get_param( 'event' ),
				'date_from'   => (string) $request->get_param( 'date_from' ),
				'date_to'     => (string) $request->get_param( 'date_to' ),
				'limit'       => $per_page,
				'offset'      => ( $page - 1 ) * $per_page,
			)
		);

		return rest_ensure_response( $rows );
	}

	/**
	 * GET /downloads/stats — overview tiles.
	 *
	 * @since  1.0.0
	 * @return \WP_REST_Response
	 */
	public function get_stats(): \WP_REST_Response {
		return rest_ensure_response( $this->report->stats() );
	}

	/**
	 * GET /downloads/settings — the module's store-wide options.
	 *
	 * @since  1.0.0
	 * @return \WP_REST_Response
	 */
	public function get_settings(): \WP_REST_Response {
		return rest_ensure_response(
			array(
				'delivery'        => (string) Settings::get( OptionKeys::DOWNLOAD_DELIVERY, 'streaming' ),
				'max_count'       => (int) Settings::get( OptionKeys::DOWNLOAD_MAX_COUNT, 0 ),
				'expiry_days'     => (int) Settings::get( OptionKeys::DOWNLOAD_EXPIRY_DAYS, 0 ),
				'trigger_status'  => (string) Settings::get( OptionKeys::DOWNLOAD_TRIGGER_STATUS, 'completed' ),
				'license_gate'    => (bool) Settings::get( OptionKeys::DOWNLOAD_LICENSE_GATE, true ),
				'log_retention'   => (int) Settings::get( OptionKeys::DOWNLOAD_LOG_RETENTION, 12 ),
				'allow_link_regen' => (bool) Settings::get( OptionKeys::DOWNLOAD_ALLOW_LINK_REGEN, false ),
			)
		);
	}

	/**
	 * POST /downloads/settings — save whichever options were sent.
	 *
	 * Only supplied keys are written, so a screen that edits one field cannot
	 * silently reset the rest to their defaults.
	 *
	 * @since  1.0.0
	 * @param  \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function save_settings( \WP_REST_Request $request ): \WP_REST_Response {
		$map = array(
			'delivery'         => array( OptionKeys::DOWNLOAD_DELIVERY, 'string' ),
			'max_count'        => array( OptionKeys::DOWNLOAD_MAX_COUNT, 'int' ),
			'expiry_days'      => array( OptionKeys::DOWNLOAD_EXPIRY_DAYS, 'int' ),
			'trigger_status'   => array( OptionKeys::DOWNLOAD_TRIGGER_STATUS, 'string' ),
			'license_gate'     => array( OptionKeys::DOWNLOAD_LICENSE_GATE, 'bool' ),
			'log_retention'    => array( OptionKeys::DOWNLOAD_LOG_RETENTION, 'int' ),
			'allow_link_regen' => array( OptionKeys::DOWNLOAD_ALLOW_LINK_REGEN, 'bool' ),
		);

		foreach ( $map as $param => $spec ) {
			if ( ! $request->has_param( $param ) ) {
				continue;
			}

			list( $key, $type ) = $spec;
			$value              = $request->get_param( $param );

			if ( 'int' === $type ) {
				$value = max( 0, (int) $value );
			} elseif ( 'bool' === $type ) {
				$value = (bool) $value;
			} else {
				$value = sanitize_text_field( (string) $value );
			}

			Settings::set( $key, $value );
		}

		return $this->get_settings();
	}

	// -----------------------------------------------------------------------
	// Argument schemas
	// -----------------------------------------------------------------------

	/**
	 * @since  1.0.0
	 * @return array<string, array<string, mixed>>
	 */
	private function id_arg(): array {
		return array(
			'id' => array(
				'required'          => true,
				'sanitize_callback' => 'absint',
			),
		);
	}

	/**
	 * @since  1.0.0
	 * @return array<string, array<string, mixed>>
	 */
	private function list_args(): array {
		return array(
			'search'     => array( 'sanitize_callback' => 'sanitize_text_field' ),
			'status'     => array(
				'enum'              => array( 'active', 'expired', 'exhausted', 'revoked' ),
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => 'rest_validate_request_arg',
			),
			'product_id' => array( 'sanitize_callback' => 'absint' ),
			'user_id'    => array( 'sanitize_callback' => 'absint' ),
			'order_id'   => array( 'sanitize_callback' => 'absint' ),
			'orderby'    => array(
				'enum'              => array( 'created_at', 'expires_at', 'download_count', 'product_name', 'order_id' ),
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => 'rest_validate_request_arg',
			),
			'order'      => array(
				'enum'              => array( 'asc', 'desc' ),
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => 'rest_validate_request_arg',
			),
			'page'       => array(
				'default'           => 1,
				'sanitize_callback' => 'absint',
			),
			'per_page'   => array(
				'default'           => 20,
				'sanitize_callback' => 'absint',
			),
		);
	}

	/**
	 * @since  1.0.0
	 * @return array<string, array<string, mixed>>
	 */
	private function log_args(): array {
		return array(
			'download_id' => array( 'sanitize_callback' => 'absint' ),
			'event'       => array(
				'enum'              => array(
					DownloadLogger::EVENT_SERVED,
					DownloadLogger::EVENT_INVALID,
					DownloadLogger::EVENT_REVOKED,
					DownloadLogger::EVENT_EXPIRED,
					DownloadLogger::EVENT_LIMIT,
					DownloadLogger::EVENT_LICENSE,
					DownloadLogger::EVENT_MISSING,
				),
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => 'rest_validate_request_arg',
			),
			'date_from'   => array( 'sanitize_callback' => 'sanitize_text_field' ),
			'date_to'     => array( 'sanitize_callback' => 'sanitize_text_field' ),
			'page'        => array(
				'default'           => 1,
				'sanitize_callback' => 'absint',
			),
			'per_page'    => array(
				'default'           => 50,
				'sanitize_callback' => 'absint',
			),
		);
	}

	/**
	 * @since  1.0.0
	 * @return array<string, array<string, mixed>>
	 */
	private function update_args(): array {
		return array_merge(
			$this->id_arg(),
			array(
				'max_downloads' => array( 'sanitize_callback' => 'absint' ),
				'expires_at'    => array(
					'sanitize_callback' => 'sanitize_text_field',
					'validate_callback' => static function ( $value ): bool {
						// '' is meaningful here: it clears the expiry.
						return '' === $value || false !== strtotime( (string) $value );
					},
				),
			)
		);
	}

	/**
	 * @since  1.0.0
	 * @return array<string, array<string, mixed>>
	 */
	private function settings_args(): array {
		return array(
			'delivery'         => array(
				'enum'              => array( 'streaming' ),
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => 'rest_validate_request_arg',
			),
			'max_count'        => array( 'sanitize_callback' => 'absint' ),
			'expiry_days'      => array( 'sanitize_callback' => 'absint' ),
			'trigger_status'   => array(
				'enum'              => array( 'completed', 'processing', 'both' ),
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => 'rest_validate_request_arg',
			),
			'license_gate'     => array( 'sanitize_callback' => 'rest_sanitize_boolean' ),
			'log_retention'    => array( 'sanitize_callback' => 'absint' ),
			'allow_link_regen' => array( 'sanitize_callback' => 'rest_sanitize_boolean' ),
		);
	}

	/**
	 * @since  1.0.0
	 * @return \WP_Error
	 */
	private function not_found(): \WP_Error {
		return new \WP_Error(
			'purecart_download_not_found',
			__( 'Download not found.', 'purecart' ),
			array( 'status' => 404 )
		);
	}
}

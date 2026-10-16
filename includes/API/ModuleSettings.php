<?php
declare( strict_types=1 );
/**
 * REST routes for the global module-toggle and plugin-wide settings.
 *
 * Registered unconditionally from Plugin::init() so that the enable/disable
 * route survives even when its target module has bailed out of its own
 * bootstrap. Every other settings tab (Licensing, Downloads, SaaS,
 * Subscriptions, Updates) keeps its endpoint inside its own module API
 * controller since those modules are either always-on or default-on.
 *
 * @package PureCart\API
 */

namespace PureCart\API;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Module-toggle settings controller.
 *
 * @since 1.0.0
 */
class ModuleSettings extends PureCartApi {

	/**
	 * Default enabled set — every module that Plugin::init() bootstraps
	 * unconditionally is on by default.
	 *
	 * @since 1.0.0
	 * @var string[]
	 */
	private const DEFAULTS = array(
		'secure-downloads',
		'license-manager',
		'update-manager',
		'subscriptions',
		'saas-provisioning',
		'affiliate-program',
		'abandoned-cart',
		'analytics',
		'security-suite',
	);

	/**
	 * Registers module-settings routes.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			PURECART_API_NAMESPACE,
			'/modules/settings',
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
				),
			)
		);
	}

	/**
	 * GET /modules/settings
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function get_settings(): \WP_REST_Response {
		return rest_ensure_response( array(
			'enabled_modules' => self::get_enabled(),
		) );
	}

	/**
	 * POST /modules/settings
	 *
	 * Expects `{ "enabled_modules": ["slug", ...] }`.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function save_settings( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$modules = $request->get_param( 'enabled_modules' );

		if ( ! is_array( $modules ) ) {
			return new \WP_Error(
				'invalid_param',
				__( 'enabled_modules must be an array of slugs.', 'purecart' ),
				array( 'status' => 400 )
			);
		}

		$sanitised = array_values( array_map( 'sanitize_key', $modules ) );
		Settings::set( OptionKeys::ENABLED_MODULES, wp_json_encode( $sanitised ) );

		return rest_ensure_response( array(
			'success'         => true,
			'enabled_modules' => $sanitised,
		) );
	}

	/**
	 * Admin-only gate.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public function permission_admin(): bool {
		return current_user_can( 'manage_woocommerce' );
	}

	/**
	 * Returns the current enabled-module slugs.
	 *
	 * @since 1.0.0
	 * @return string[]
	 */
	private static function get_enabled(): array {
		$raw = Settings::get( OptionKeys::ENABLED_MODULES, '' );

		if ( ! is_string( $raw ) || '' === $raw ) {
			return self::DEFAULTS;
		}

		$decoded = json_decode( $raw, true );

		return is_array( $decoded ) ? $decoded : self::DEFAULTS;
	}
}

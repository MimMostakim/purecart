<?php
/**
 * Abstract base for all PureCart REST API feature controllers.
 *
 * @package PureCart\Api
 */

declare( strict_types=1 );

namespace PureCart\API;

defined( 'ABSPATH' ) || exit;

/**
 * Feature API controllers extend this class, implement register_routes(), and
 * are activated by calling register() from the owning module's bootstrap.
 *
 * Mirrors PureCartStore's pattern: the owning module explicitly calls
 * ->register() rather than having routes self-register in the constructor,
 * so the calling site controls when (and whether) registration occurs.
 *
 * @since 1.0.0
 */
abstract class PureCartApi {

	/**
	 * Wire this controller's routes into `rest_api_init`.
	 *
	 * Call once from the module's bootstrap — analogous to
	 * PureCartStore::create() called from Activator::create_tables().
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register this controller's REST routes under PURECART_API_NAMESPACE.
	 *
	 * Called during `rest_api_init`. Must not inspect $request — this is
	 * registration only, not request handling.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	abstract public function register_routes(): void;
}

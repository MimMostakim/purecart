<?php
/**
 * Main plugin class — bootstraps all modules.
 *
 * @package PureCart
 */

declare( strict_types=1 );

namespace PureCart;

defined( 'ABSPATH' ) || exit;

use PureCart\Commerce\OrderHandler;
use PureCart\Commerce\ProductTypes;
use PureCart\API\RestApi;
use PureCart\CustomerDashboard\Dashboard;
use PureCart\Admin\Admin;
use PureCart\Subscriptions\Module as SubscriptionsModule;

/**
 * Plugin singleton.
 *
 * @since 1.0.0
 */
final class Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var Plugin|null
	 */
	private static ?Plugin $instance = null;

	/** Returns the singleton instance. */
	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
			self::$instance->init();
		}

		return self::$instance;
	}

	/** Private constructor — use ::instance(). */
	private function __construct() {}

	/** Boot all modules. */
	private function init(): void {
		new ProductTypes();
		new OrderHandler();
		new RestApi();
		new Dashboard();
		new SubscriptionsModule();

		if ( is_admin() ) {
			new Admin();
		}

		do_action( 'purecart_loaded', $this );
	}

	/** Version helper. */
	public function version(): string {
		return PURECART_VERSION;
	}
}

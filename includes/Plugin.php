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
use PureCart\Downloads\Module as DownloadsModule;
use PureCart\Admin\Admin;
use PureCart\Subscriptions\Module as SubscriptionsModule;
use PureCart\Updates\Module as UpdatesModule;
use PureCart\CLI\LicenseCommands;
use PureCart\Licensing\JwtHooks;

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
		// Run a lightweight schema upgrade check on every request.
		// The version comparison is a cached get_option() — essentially free.
		// dbDelta() only fires on version mismatch (post-update, first boot).
		// Belongs here rather than Admin so REST, CLI, and front-end requests
		// also receive the upgraded schema, not only WP admin page loads.
		Activator::maybe_upgrade();

		new ProductTypes();
		new OrderHandler();
		new RestApi();
		new Dashboard();
		new DownloadsModule();
		new SubscriptionsModule();
		new UpdatesModule();
		new JwtHooks();

		if ( is_admin() ) {
			new Admin();
		}

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			\WP_CLI::add_command( 'purecart license', LicenseCommands::class );
		}

		do_action( 'purecart_loaded', $this );
	}

	/** Version helper. */
	public function version(): string {
		return PURECART_VERSION;
	}
}

<?php
declare( strict_types=1 );
/**
 * Main plugin class — bootstraps all modules.
 *
 * Registers and initialises every feature module (Commerce, Downloads,
 * Licensing, Subscriptions, Updates, SaaS, Admin) in a single location,
 * keeping the root bootstrap file minimal.
 *
 * @package PureCart
 * @since   1.0.0
 */

namespace PureCart;

defined( 'ABSPATH' ) || exit;

use PureCart\Commerce\Module as CommerceModule;
use PureCart\CustomerDashboard\Dashboard;
use PureCart\Admin\Admin;
use PureCart\Downloads\Module as DownloadsModule;
use PureCart\Licensing\Module as LicensingModule;
use PureCart\Subscriptions\Module as SubscriptionsModule;
use PureCart\Updates\Module as UpdatesModule;
use PureCart\SaaS\Module as SaasModule;
use PureCart\API\ModuleSettings;
use PureCart\CLI\LicenseCommands;
use PureCart\CLI\SaasCommands;

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

	/**
	 * Returns the singleton instance, creating it on the first call.
	 *
	 * @since 1.0.0
	 * @return self
	 */
	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
			self::$instance->init();
		}

		return self::$instance;
	}

	/**
	 * Private constructor — use Plugin::instance().
	 *
	 * @since 1.0.0
	 */
	private function __construct() {}

	/**
	 * Bootstraps all plugin modules and registers WP-CLI commands.
	 *
	 * Runs a lightweight schema upgrade check, instantiates every feature
	 * module, conditionally loads the Admin panel, and registers any
	 * WP-CLI commands. Fires the `purecart_loaded` action on completion.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function init(): void {
		// Run a lightweight schema upgrade check on every request.
		// The version comparison is a cached get_option() — essentially free.
		// dbDelta() only fires on version mismatch (post-update, first boot).
		// Belongs here rather than Admin so REST, CLI, and front-end requests
		// also receive the upgraded schema, not only WP admin page loads.
		Activator::maybe_upgrade();

		new CommerceModule();
		new Dashboard();
		new DownloadsModule();
		new LicensingModule();
		new SubscriptionsModule();
		new UpdatesModule();
		new SaasModule();

		( new ModuleSettings() )->register();

		if ( is_admin() ) {
			new Admin();
		}

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			\WP_CLI::add_command( 'purecart license', LicenseCommands::class );
			\WP_CLI::add_command( 'purecart saas', SaasCommands::class );
		}

		/**
		 * Fires once all PureCart modules have been initialised.
		 *
		 * Use this hook to integrate with PureCart after its full boot sequence
		 * has completed and all modules, REST routes, and WP-CLI commands are
		 * registered.
		 *
		 * @since 1.0.0
		 * @param Plugin $plugin The plugin singleton instance.
		 */
		do_action( 'purecart_loaded', $this );
	}

	/**
	 * Returns the current plugin version string.
	 *
	 * @since 1.0.0
	 * @return string The PURECART_VERSION constant value.
	 */
	public function version(): string {
		return PURECART_VERSION;
	}
}

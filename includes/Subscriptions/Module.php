<?php
/**
 * Subscriptions module bootstrap.
 *
 * Wires the Subscriptions module into the plugin's existing init flow
 * (\PureCart\Plugin::init(), same pattern as ProductTypes/OrderHandler/RestApi)
 * and gates the whole module behind a single enable/disable option, per
 * subscription-final-dev-plan.md § 9 Step 2.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

use PureCart\Subscriptions\Delivery\CourseHandler;
use PureCart\Subscriptions\Delivery\DownloadHandler;
use PureCart\Subscriptions\Delivery\MembershipHandler;
use PureCart\Subscriptions\Delivery\ServiceHandler;

defined( 'ABSPATH' ) || exit;

/**
 * Boots the Subscriptions module's own classes when the module is enabled.
 *
 * @since 1.0.0
 */
class Module {

	/**
	 * Option key toggling the whole module on/off.
	 *
	 * @var string
	 */
	public const OPTION_ENABLED = 'purecart_sub_enabled';

	/**
	 * Register the module's classes/hooks, unless disabled in settings.
	 *
	 * Steps 4+ (SubscriptionManager, RenewalEngine, ...) will be instantiated
	 * here as they're built.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		if ( ! self::is_enabled() ) {
			return;
		}

		add_filter( 'purecart_subscription_delivery_handlers', array( $this, 'register_native_delivery_handlers' ) );

		new SubscriptionProduct();
		new SubscriptionManager();
		new ChurnScorer();

		// Shared, not a second `new RenewalEngine()` inside DunningManager —
		// a second instance would register the scan/process Action Scheduler
		// hooks a second time and double-run every renewal.
		$renewal_engine = new RenewalEngine();
		new DunningManager( $renewal_engine );
	}

	/**
	 * Register the four built-in, registry-backed delivery type handlers.
	 * `software`/`saas` are not registered here — DeliveryManager calls their
	 * companion modules (Licensing/SaaS) directly instead (§ 3).
	 *
	 * @since 1.0.0
	 * @param array<string, DeliveryHandlerInterface> $handlers Existing registered handlers.
	 * @return array<string, DeliveryHandlerInterface>
	 */
	public function register_native_delivery_handlers( array $handlers ): array {
		$handlers['membership'] = new MembershipHandler();
		$handlers['download']   = new DownloadHandler();
		$handlers['course']     = new CourseHandler();
		$handlers['service']    = new ServiceHandler();
		return $handlers;
	}

	/**
	 * Whether the Subscriptions module is enabled.
	 *
	 * Defaults to enabled — matches how Licensing/SaaS behave today (no
	 * per-module toggle exists for them either; this is the first one).
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public static function is_enabled(): bool {
		return (bool) get_option( self::OPTION_ENABLED, true );
	}
}

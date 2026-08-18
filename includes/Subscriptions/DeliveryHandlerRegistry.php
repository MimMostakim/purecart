<?php
/**
 * Pluggable registry of subscription delivery-type handlers.
 *
 * subscription-final-dev-plan.md § 3. Lets any module (including third-party
 * code) register a new delivery type via a filter, instead of a schema change —
 * this is why `delivery_type` on wp_purecart_subscriptions is VARCHAR, not ENUM.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves a delivery_type string to its registered handler instance.
 *
 * @since 1.0.0
 */
class DeliveryHandlerRegistry {

	/**
	 * Cached handler map, keyed by delivery_type.
	 *
	 * @var array<string, DeliveryHandlerInterface>|null
	 */
	private static ?array $handlers = null;

	/**
	 * Get every registered handler, keyed by delivery_type.
	 *
	 * `software` and `saas` are intentionally never in this list — they're
	 * handled directly by DeliveryManager (companion-module pattern), not
	 * through the generic handler interface.
	 *
	 * @since 1.0.0
	 * @return array<string, DeliveryHandlerInterface>
	 */
	public static function get_handlers(): array {
		if ( null === self::$handlers ) {
			/**
			 * Filters the map of registered subscription delivery-type handlers.
			 *
			 * @since 1.0.0
			 * @param array<string, DeliveryHandlerInterface> $handlers Delivery type => handler instance.
			 */
			self::$handlers = (array) apply_filters( 'purecart_subscription_delivery_handlers', array() );
		}

		return self::$handlers;
	}

	/**
	 * Look up the handler for a delivery type.
	 *
	 * @since 1.0.0
	 * @param string $delivery_type The delivery_type value.
	 * @return DeliveryHandlerInterface|null
	 */
	public static function get( string $delivery_type ): ?DeliveryHandlerInterface {
		return self::get_handlers()[ $delivery_type ] ?? null;
	}

	/**
	 * All registry-backed delivery_type values currently registered.
	 *
	 * @since 1.0.0
	 * @return string[]
	 */
	public static function get_registered_types(): array {
		return array_keys( self::get_handlers() );
	}

	/**
	 * Clear the cached handler map so the next call re-runs the filter.
	 *
	 * Mainly useful in tests, or after a plugin activates/deactivates mid-request.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function reset_cache(): void {
		self::$handlers = null;
	}
}

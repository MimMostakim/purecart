<?php
/**
 * Contract for pluggable subscription delivery-type handlers.
 *
 * subscription-final-dev-plan.md § 3 names this `Delivery_Handler_Interface`
 * (carried over un-translated from the `[nym-ARCH]` source doc) — renamed to
 * `DeliveryHandlerInterface` here to match this codebase's real PSR-4 PascalCase
 * convention (LicenseActivator, AccountProvisioner, ProductTypes, ...).
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Every delivery type registered via the `purecart_subscription_delivery_handlers`
 * filter must implement this. `software`/`saas` do NOT go through this interface —
 * they're wired directly in DeliveryManager (companion-module pattern, § 3).
 *
 * @since 1.0.0
 */
interface DeliveryHandlerInterface {

	/**
	 * First charge succeeds, or trial starts.
	 *
	 * @param array<string, mixed> $subscription Subscription row as an associative array.
	 * @return void
	 */
	public function activate( array $subscription ): void;

	/**
	 * Every successful renewal.
	 *
	 * @param array<string, mixed> $subscription Subscription row as an associative array.
	 * @return void
	 */
	public function renew( array $subscription ): void;

	/**
	 * Subscription becomes suspended/cancelled/expired.
	 *
	 * @param array<string, mixed> $subscription Subscription row as an associative array.
	 * @return void
	 */
	public function deactivate( array $subscription ): void;

	/**
	 * Type-specific data for the admin panel / REST response.
	 *
	 * @param array<string, mixed> $subscription Subscription row as an associative array.
	 * @return array<string, mixed>
	 */
	public function get_linked_data( array $subscription ): array;

	/**
	 * Validate type-specific data before it's persisted.
	 *
	 * @param array<string, mixed> $data Linked-entity data to validate.
	 * @return bool|\WP_Error
	 */
	public function validate_linked_data( array $data ): bool|\WP_Error;
}

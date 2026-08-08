<?php
/**
 * Dispatches provisioning across all registered subscription delivery types.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

use PureCart\Licensing\LicenseGenerator;
use PureCart\SaaS\AccountProvisioner;

defined( 'ABSPATH' ) || exit;

/**
 * `software` and `saas` are handled directly here (companion-module pattern,
 * subscription-final-dev-plan.md § 3) since Licensing/SaaS are sibling modules
 * with their own tables and richer domain logic. Every other delivery_type goes
 * through DeliveryHandlerRegistry.
 *
 * Correction vs. the doc: § 3 says this calls into `PureCart\Licensing\LicenseActivator`
 * for `software` — checked against the real class and that's wrong. `LicenseActivator`
 * only does per-domain activate/deactivate for a license the customer already owns.
 * The class that actually creates a new license row (what "activate a software
 * subscription" means) is `PureCart\Licensing\LicenseGenerator::create()`, used below.
 *
 * Not yet wired into anything — SubscriptionManager (Step 5) will call these
 * methods and persist the returned linked IDs via SubscriptionRepository (Step 4).
 *
 * @since 1.0.0
 */
class DeliveryManager {

	/**
	 * First charge succeeds, or trial starts. Returns linked-entity IDs to
	 * persist on the subscription row (e.g. `license_id`, `saas_account_id`);
	 * empty array for registry-backed types, which store their own linked data.
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $subscription Subscription data (order_id, user_id, product_id, delivery_type, ...).
	 * @return array<string, mixed>
	 */
	public static function activate( array $subscription ): array {
		$type = $subscription['delivery_type'] ?? 'software';

		if ( 'software' === $type ) {
			$license = ( new LicenseGenerator() )->create(
				(int) ( $subscription['order_id'] ?? 0 ),
				(int) ( $subscription['user_id'] ?? 0 ),
				(int) ( $subscription['product_id'] ?? 0 )
			);
			return array( 'license_id' => $license->id ?? null );
		}

		if ( 'saas' === $type ) {
			$account = ( new AccountProvisioner() )->provision(
				(int) ( $subscription['order_id'] ?? 0 ),
				(int) ( $subscription['user_id'] ?? 0 ),
				(int) ( $subscription['product_id'] ?? 0 )
			);
			return array( 'saas_account_id' => $account->id ?? null );
		}

		$handler = DeliveryHandlerRegistry::get( $type );
		if ( $handler ) {
			$handler->activate( $subscription );
		}

		return array();
	}

	/**
	 * Re-activate an *existing* linked resource after a suspension/pause/
	 * resubscribe-within-window — deliberately separate from activate(),
	 * which provisions a brand-new resource (new license key, new SaaS
	 * account). Calling activate() here would silently double-provision:
	 * SubscriptionManager::resubscribe()'s same-record path already has a
	 * `license_id`/`saas_account_id` on the row from the original purchase.
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public static function reactivate( array $subscription ): void {
		$type = $subscription['delivery_type'] ?? 'software';

		if ( 'saas' === $type ) {
			if ( ! empty( $subscription['saas_account_id'] ) ) {
				( new AccountProvisioner() )->activate( (int) $subscription['saas_account_id'] );
			}
			return;
		}

		if ( 'software' === $type ) {
			// Nothing to do yet — license record status changes (suspend/reactivate
			// the record itself, as opposed to per-domain activation) are Step 16.
			return;
		}

		// Registry-backed types have no "create vs. re-activate" distinction —
		// re-running activate() just re-syncs role/access, it doesn't create
		// a new resource, so it's safe to reuse here.
		$handler = DeliveryHandlerRegistry::get( $type );
		if ( $handler ) {
			$handler->activate( $subscription );
		}
	}

	/**
	 * Every successful renewal.
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public static function renew( array $subscription ): void {
		$type = $subscription['delivery_type'] ?? 'software';

		if ( 'software' === $type || 'saas' === $type ) {
			// License expiry extension / SaaS re-activation-on-renewal is Step 16
			// (Licensing/SaaS integration) — nothing to dispatch generically yet.
			return;
		}

		$handler = DeliveryHandlerRegistry::get( $type );
		if ( $handler ) {
			$handler->renew( $subscription );
		}
	}

	/**
	 * Subscription becomes suspended/cancelled/expired.
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public static function deactivate( array $subscription ): void {
		$type = $subscription['delivery_type'] ?? 'software';

		if ( 'saas' === $type ) {
			if ( ! empty( $subscription['saas_account_id'] ) ) {
				( new AccountProvisioner() )->suspend( (int) $subscription['saas_account_id'] );
			}
			return;
		}

		if ( 'software' === $type ) {
			// License record status changes (revoke/expire) are Step 16 — LicenseActivator
			// only tracks per-domain activations, not the license's own lifecycle.
			return;
		}

		$handler = DeliveryHandlerRegistry::get( $type );
		if ( $handler ) {
			$handler->deactivate( $subscription );
		}
	}
}

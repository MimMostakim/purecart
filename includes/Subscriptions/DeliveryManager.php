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
use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

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

	/** Deactivation reason: non-payment suspension — access stops now, restorable. */
	public const REASON_SUSPENDED = 'suspended';

	/** Deactivation reason: cancellation — access runs to the end of the paid-for period. */
	public const REASON_CANCELLED = 'cancelled';

	/** Deactivation reason: fixed term reached its end. */
	public const REASON_EXPIRED = 'expired';

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
			// Step 16: restore a license that a suspension put on hold. Only
			// lifts `suspended` — a `revoked` license is a deliberate admin
			// action and an `expired` one needs its date extended (which
			// renew() does), so neither should be silently flipped to active
			// just because a payment came through.
			if ( ! empty( $subscription['license_id'] ) ) {
				$licenses = new LicenseGenerator();
				$license  = $licenses->get_by_id( (int) $subscription['license_id'] );

				if ( $license && 'suspended' === $license->status ) {
					$licenses->set_status( (int) $subscription['license_id'], 'active' );
				}
			}
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

		if ( 'software' === $type ) {
			// Step 16: push the license's expiry out by exactly the billing
			// period that was just paid for, so the key keeps validating.
			if ( ! empty( $subscription['license_id'] ) ) {
				( new LicenseGenerator() )->extend_expiry(
					(int) $subscription['license_id'],
					max( 1, (int) ( $subscription['billing_interval'] ?? 1 ) ),
					(string) ( $subscription['billing_period'] ?? 'month' )
				);
			}
			return;
		}

		if ( 'saas' === $type ) {
			// Step 16: a renewal after a failed-payment suspension must put the
			// account back. activate() is idempotent, so calling it for an
			// already-active account is harmless.
			if ( ! empty( $subscription['saas_account_id'] ) ) {
				( new AccountProvisioner() )->activate( (int) $subscription['saas_account_id'] );
			}
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
	 * Gap found during Step 16: this method previously took no reason, and all
	 * six of its call sites (cancel, pending-cancel finalization, expire,
	 * dunning suspend, dunning hard-cancel, webhook) invoked it identically.
	 * That made this step's own requirement impossible to express — "suspend →
	 * license suspended" but "cancel → license valid until the natural expiry
	 * date the customer already paid for" are opposite outcomes, and nothing
	 * here could tell the two apart. `$reason` fixes that; it defaults to
	 * `cancelled`, the more conservative of the two (access is left running to
	 * its paid-for end rather than cut off early).
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $subscription Subscription row.
	 * @param string               $reason       One of 'suspended', 'cancelled', 'expired'.
	 * @return void
	 */
	public static function deactivate( array $subscription, string $reason = self::REASON_CANCELLED ): void {
		$type = $subscription['delivery_type'] ?? 'software';

		if ( 'saas' === $type ) {
			if ( ! empty( $subscription['saas_account_id'] ) && self::should_revoke_saas_now( $reason ) ) {
				( new AccountProvisioner() )->suspend( (int) $subscription['saas_account_id'] );
			}
			return;
		}

		if ( 'software' === $type ) {
			if ( empty( $subscription['license_id'] ) ) {
				return;
			}

			$license_id = (int) $subscription['license_id'];

			if ( self::REASON_SUSPENDED === $reason ) {
				// Non-payment: stop the key working now, but keep it restorable
				// — reactivate() lifts exactly this state if the customer pays.
				( new LicenseGenerator() )->set_status( $license_id, 'suspended' );
				return;
			}

			if ( self::REASON_EXPIRED === $reason ) {
				( new LicenseGenerator() )->set_status( $license_id, 'expired' );
				return;
			}

			// REASON_CANCELLED: deliberately does nothing to the license. The
			// customer has already paid for the period the license runs to, so
			// it stays valid until its own `expires_at` passes; it simply stops
			// being extended, because no further renewal will occur. Revoking
			// here would take away time that was already paid for.
			return;
		}

		$handler = DeliveryHandlerRegistry::get( $type );
		if ( $handler ) {
			$handler->deactivate( $subscription );
		}
	}

	/**
	 * Whether a SaaS account should be suspended right now for this reason.
	 *
	 * `purecart_sub_cancel_saas_immediately` is named by this step's checklist
	 * ("suspend/cancel → SaaS suspended per `cancel_saas_immediately` setting")
	 * but appears in no Configuration Options table in any doc and existed
	 * nowhere in the codebase — introduced here, matching how
	 * `purecart_sub_resubscribe_window_days` (Step 5) and
	 * `purecart_sub_trial_reminder_days` (Step 13) were handled.
	 *
	 * Default false: a cancellation leaves the SaaS account running until the
	 * paid-for period ends, mirroring the license rule above. A suspension for
	 * non-payment always cuts access immediately regardless — that money never
	 * arrived, so there is no paid-for period to honour.
	 *
	 * @since 1.0.0
	 * @param string $reason Deactivation reason.
	 * @return bool
	 */
	private static function should_revoke_saas_now( string $reason ): bool {
		if ( self::REASON_SUSPENDED === $reason || self::REASON_EXPIRED === $reason ) {
			return true;
		}

		return (bool) Settings::get( OptionKeys::SUB_CANCEL_SAAS_IMMEDIATELY, false );
	}
}

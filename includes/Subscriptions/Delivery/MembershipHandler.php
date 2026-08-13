<?php
/**
 * Membership delivery type — WP role assignment + content-access tier.
 *
 * @package PureCart\Subscriptions\Delivery
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Delivery;

use PureCart\Subscriptions\DeliveryHandlerInterface;

defined( 'ABSPATH' ) || exit;

/**
 * Stub for now (subscription-final-dev-plan.md § 9 Step 3) — satisfies the
 * registry contract so "Membership" is selectable as a delivery type today.
 * Real role assignment/removal is RoleManager's job (Step 14); this handler
 * will call into it once that class exists.
 *
 * @since 1.0.0
 */
class MembershipHandler implements DeliveryHandlerInterface {

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function activate( array $subscription ): void {
		// TODO(Step 14 – RoleManager): assign the tier's WP role to $subscription['user_id'].
	}

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function renew( array $subscription ): void {
		// TODO(Step 14): re-sync role in case the membership tier changed since last cycle.
	}

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function deactivate( array $subscription ): void {
		// TODO(Step 14): remove the role after purecart_sub_membership_grace_days elapses.
	}

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return array<string, mixed>
	 */
	public function get_linked_data( array $subscription ): array {
		return array();
	}

	/**
	 * @param array<string, mixed> $data Linked-entity data to validate.
	 * @return bool|\WP_Error
	 */
	public function validate_linked_data( array $data ): bool|\WP_Error {
		return true;
	}
}

<?php
/**
 * Digital Downloads delivery type — per-cycle download quota + drip schedule.
 *
 * @package PureCart\Subscriptions\Delivery
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Delivery;

use PureCart\Subscriptions\DeliveryHandlerInterface;

defined( 'ABSPATH' ) || exit;

/**
 * Stub for now (subscription-final-dev-plan.md § 9 Step 3) — satisfies the
 * registry contract so "Digital Downloads" is selectable as a delivery type
 * today. Real quota reset / drip scheduling is Phase 4 (Downloads module
 * integration) work, done once the linked-entities repository (Step 4) exists.
 *
 * @since 1.0.0
 */
class DownloadHandler implements DeliveryHandlerInterface {

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function activate( array $subscription ): void {
		// TODO(Step 4+): create the linked-entities row, seed downloads_this_cycle = 0.
	}

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function renew( array $subscription ): void {
		// TODO: reset downloads_this_cycle; advance next_drip_date if drip is configured.
	}

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function deactivate( array $subscription ): void {
		// TODO: revoke download access.
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

<?php
/**
 * Service/Retainer delivery type — deliverable tracking + optional invoice.
 *
 * @package PureCart\Subscriptions\Delivery
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Delivery;

use PureCart\Subscriptions\DeliveryHandlerInterface;

defined( 'ABSPATH' ) || exit;

/**
 * Stub for now (subscription-final-dev-plan.md § 9 Step 3) — satisfies the
 * registry contract so "Service / Retainer" is selectable as a delivery type
 * today. Real deliverable-due-date advancing and invoice dispatch are added
 * once the linked-entities repository (Step 4) exists.
 *
 * @since 1.0.0
 */
class ServiceHandler implements DeliveryHandlerInterface {

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function activate( array $subscription ): void {
		// TODO(Step 4+): seed next_deliverable_due from the product's deliverable template.
	}

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function renew( array $subscription ): void {
		// TODO: advance next_deliverable_due; send invoice per purecart_sub_service_invoice_mode.
	}

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function deactivate( array $subscription ): void {
		// TODO: nothing to revoke by default — deliverables already sent stay sent.
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

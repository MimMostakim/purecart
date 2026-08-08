<?php
/**
 * Learning/Course delivery type — LMS enrollment (LearnDash / LifterLMS / Tutor LMS).
 *
 * @package PureCart\Subscriptions\Delivery
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Delivery;

use PureCart\Subscriptions\DeliveryHandlerInterface;

defined( 'ABSPATH' ) || exit;

/**
 * Stub for now (subscription-final-dev-plan.md § 9 Step 3) — satisfies the
 * registry contract so "Learning / Course" is selectable as a delivery type
 * today. Real LMS enrollment calls depend on the `purecart_sub_lms_plugin`
 * setting and are added once the linked-entities repository (Step 4) exists.
 *
 * @since 1.0.0
 */
class CourseHandler implements DeliveryHandlerInterface {

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function activate( array $subscription ): void {
		// TODO(Step 4+): enroll $subscription['user_id'] into the product's configured course IDs.
	}

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function renew( array $subscription ): void {
		// TODO: extend course_access_until by one billing cycle.
	}

	/**
	 * @param array<string, mixed> $subscription Subscription row.
	 * @return void
	 */
	public function deactivate( array $subscription ): void {
		// TODO: revoke LMS enrollment(s).
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

<?php
/**
 * "Cancellation Notice" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * @since 1.0.0
 */
class CancellationNoticeEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_cancellation_notice';
		$this->title       = __( 'Cancellation Notice', 'purecart' );
		$this->description = __( 'Sent when a subscription is cancelled (by the customer or an admin).', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_subscription_status_changed' );
	}

	/**
	 * @since 1.0.0
	 * @param mixed $arg2 old_status.
	 * @param mixed $arg3 new_status.
	 * @return bool
	 */
	protected function should_send( $arg2 = null, $arg3 = null, $arg4 = null ): bool {
		return 'cancelled' === $arg3;
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your {product_name} subscription has been cancelled', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Subscription cancelled', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, your {product_name} subscription has been cancelled. You can resubscribe any time from your account.', 'purecart' );
	}
}

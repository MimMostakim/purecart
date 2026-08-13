<?php
/**
 * "Suspend Notice" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * @since 1.0.0
 */
class SuspendNoticeEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_suspend_notice';
		$this->title       = __( 'Suspend Notice', 'purecart' );
		$this->description = __( 'Sent when access is suspended after the active grace period is exhausted.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_subscription_suspended' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your {product_name} access has been suspended', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Access suspended', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, we were unable to collect payment for {product_name} after several attempts, so your access has been suspended. Update your payment method to restore access.', 'purecart' );
	}
}

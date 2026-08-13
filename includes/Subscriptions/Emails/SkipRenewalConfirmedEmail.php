<?php
/**
 * "Skip Renewal Confirmed" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * @since 1.0.0
 */
class SkipRenewalConfirmedEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_skip_renewal_confirmed';
		$this->title       = __( 'Skip Renewal Confirmed', 'purecart' );
		$this->description = __( 'Sent when a customer skips their next billing cycle.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_subscription_skipped' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your next {product_name} charge has been skipped', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Next renewal skipped', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, your next billing cycle for {product_name} has been skipped as requested — no charge this time. Your next payment is now due on {next_payment_date}.', 'purecart' );
	}
}

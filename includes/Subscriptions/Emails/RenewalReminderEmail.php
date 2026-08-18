<?php
/**
 * "Renewal Reminder" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fired by `SubscriptionEmail::send_reminders()`'s scan (Step 13), per
 * `purecart_sub_renewal_reminder_days` (e.g. [7, 3, 1] days before due).
 *
 * @since 1.0.0
 */
class RenewalReminderEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_renewal_reminder';
		$this->title       = __( 'Renewal Reminder', 'purecart' );
		$this->description = __( 'Sent a few days before an upcoming renewal charge.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_renewal_reminder_due' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Upcoming renewal for {product_name}', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Your subscription renews soon', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, this is a reminder that {amount} will be charged for your {product_name} subscription on {next_payment_date}.', 'purecart' );
	}
}

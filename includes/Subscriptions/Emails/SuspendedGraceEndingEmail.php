<?php
/**
 * "Suspended Grace Ending" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fired by `SubscriptionEmail::send_grace_reminders()`'s scan (Step 13), a
 * few days before `purecart_sub_suspended_grace_days` runs out and
 * DunningManager hard-cancels the subscription.
 *
 * @since 1.0.0
 */
class SuspendedGraceEndingEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_suspended_grace_ending';
		$this->title       = __( 'Suspended Grace Ending', 'purecart' );
		$this->description = __( 'Sent a few days before a suspended subscription is permanently cancelled.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_suspended_grace_ending' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Last chance to save your {product_name} subscription', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Your subscription will be cancelled soon', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, your {product_name} subscription is still suspended due to a failed payment. If it stays unresolved a little longer, it will be cancelled permanently. Update your payment method now to restore it.', 'purecart' );
	}
}

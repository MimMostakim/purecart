<?php
/**
 * "Trial Converted" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fires on the same `purecart_subscription_renewed` hook as
 * RenewalSuccessfulEmail — should_send() detects "this was the trial's first
 * real charge" from `renewal_count === 1 && trial_ends_at is set`, since the
 * renewed hook itself doesn't carry the pre-renewal status.
 *
 * @since 1.0.0
 */
class TrialConvertedEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_trial_converted';
		$this->title       = __( 'Trial Converted', 'purecart' );
		$this->description = __( 'Sent when a trial ends and the first real charge succeeds.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_subscription_renewed' );
	}

	/**
	 * @since 1.0.0
	 * @return bool
	 */
	protected function should_send( $arg2 = null, $arg3 = null, $arg4 = null ): bool {
		return $this->subscription
			&& 1 === (int) $this->subscription->renewal_count
			&& ! empty( $this->subscription->trial_ends_at );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your {product_name} trial has converted to a paid subscription', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Your trial has converted', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, your trial has ended and {amount} was charged for {product_name}. Your next payment is due on {next_payment_date}.', 'purecart' );
	}
}

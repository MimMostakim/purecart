<?php
/**
 * "Subscription Created" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fires on the same `purecart_subscription_activated` hook as
 * TrialStartedEmail — should_send() splits on whether a trial applied, so
 * exactly one of the two ever sends for a given activation.
 *
 * @since 1.0.0
 */
class SubscriptionCreatedEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_subscription_created';
		$this->title       = __( 'Subscription Created', 'purecart' );
		$this->description = __( 'Sent to the customer when a new subscription (no trial) is activated.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_subscription_activated' );
	}

	/**
	 * @since 1.0.0
	 * @return bool
	 */
	protected function should_send( $arg2 = null, $arg3 = null, $arg4 = null ): bool {
		return $this->subscription && 'trialing' !== $this->subscription->status;
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your {product_name} subscription is active', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Welcome aboard!', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, thanks for subscribing to {product_name}. Your subscription is now active at {amount} per billing cycle. Your next payment is due on {next_payment_date}.', 'purecart' );
	}
}

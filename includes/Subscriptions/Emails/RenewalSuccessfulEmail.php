<?php
/**
 * "Renewal Successful" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * should_send() excludes the trial-conversion case (TrialConvertedEmail
 * covers that one) so a subscriber doesn't get both emails for one charge.
 *
 * @since 1.0.0
 */
class RenewalSuccessfulEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_renewal_successful';
		$this->title       = __( 'Renewal Successful', 'purecart' );
		$this->description = __( 'Sent when a recurring payment is captured successfully.', 'purecart' );

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
		$is_trial_conversion = $this->subscription
			&& 1 === (int) $this->subscription->renewal_count
			&& ! empty( $this->subscription->trial_ends_at );

		return $this->subscription && ! $is_trial_conversion;
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Payment received for {product_name}', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Renewal successful', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, {amount} was charged for your {product_name} subscription. Your next payment is due on {next_payment_date}.', 'purecart' );
	}
}

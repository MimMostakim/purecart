<?php
/**
 * "Resubscription Confirmed" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * @since 1.0.0
 */
class ResubscriptionConfirmedEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_resubscription_confirmed';
		$this->title       = __( 'Resubscription Confirmed', 'purecart' );
		$this->description = __( 'Sent when a customer resubscribes to a cancelled/expired subscription.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_subscription_resubscribed' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( "You're resubscribed to {product_name}", 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Resubscription confirmed', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, welcome back! Your {product_name} subscription is active again at {amount} per cycle. Your next payment is due on {next_payment_date}.', 'purecart' );
	}
}

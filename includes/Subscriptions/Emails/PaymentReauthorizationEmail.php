<?php
/**
 * "Payment Reauthorization" email — outside the MVP-16 but explicitly
 * required by Step 13's own checklist (see CardExpiringSoonEmail's docblock).
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fires on `purecart_subscription_reauth_required` — already dispatched by
 * WebhookHandler (Step 12) when a gateway reports
 * `invoice.payment_action_required` (SCA/3DS challenge needed). No separate
 * scan needed here; this is purely event-driven.
 *
 * @since 1.0.0
 */
class PaymentReauthorizationEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_payment_reauthorization';
		$this->title       = __( 'Payment Reauthorization', 'purecart' );
		$this->description = __( 'Sent when a renewal charge requires bank authentication (SCA/3DS).', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_subscription_reauth_required' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Action needed: confirm your {product_name} payment', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Please confirm your payment', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, your bank requires additional confirmation before we can charge {amount} for {product_name}. Please contact us or check your account to complete this step.', 'purecart' );
	}
}

<?php
/**
 * "Card Expiring Soon" email — outside the MVP-16 but explicitly required by
 * Step 13's own checklist ("Card-expiry and reauth emails are wired even
 * though they're outside the MVP-16, since Steps 7-8 depend on them existing").
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fired by `SubscriptionEmail::send_card_expiry_warnings()`'s scan (Step 13) —
 * no HealthCheck class exists anywhere in this module (not assigned to any of
 * the 16 backend steps), so this scan lives here rather than waiting on a
 * class that was never scoped to be built.
 *
 * @since 1.0.0
 */
class CardExpiringSoonEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_card_expiring_soon';
		$this->title       = __( 'Card Expiring Soon', 'purecart' );
		$this->description = __( 'Sent when a subscription\'s saved card is close to its expiry date.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_card_expiring_soon' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your card on file for {product_name} is expiring soon', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Your card is expiring soon', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, the card on file for your {product_name} subscription is expiring soon. Update your payment method to avoid a missed renewal.', 'purecart' );
	}
}

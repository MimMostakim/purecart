<?php
/**
 * "Payment Retry Scheduled" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fires on `purecart_dunning_retry_scheduled` — a hook added in Step 13
 * (DunningManager previously only logged this, never fired an action for it).
 *
 * @since 1.0.0
 */
class PaymentRetryScheduledEmail extends AbstractSubscriptionEmail {

	/** Retry timestamp passed by the triggering hook. */
	private int $retry_timestamp = 0;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_payment_retry_scheduled';
		$this->title       = __( 'Payment Retry Scheduled', 'purecart' );
		$this->description = __( 'Sent when a failed payment retry is scheduled.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_dunning_retry_scheduled' );
	}

	/**
	 * @since 1.0.0
	 * @return bool
	 */
	protected function should_send( $arg2 = null, $arg3 = null, $arg4 = null ): bool {
		$this->retry_timestamp = (int) $arg2;
		return null !== $this->subscription;
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( "We'll retry your {product_name} payment soon", 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Payment retry scheduled', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		$retry_date = $this->retry_timestamp ? date_i18n( get_option( 'date_format' ), $this->retry_timestamp ) : '';

		return sprintf(
			/* translators: %s: retry date */
			__( 'Hi {first_name}, your last payment for {product_name} did not go through. We will automatically retry on %s — no action needed if your card issue resolves itself before then.', 'purecart' ),
			esc_html( $retry_date )
		);
	}
}

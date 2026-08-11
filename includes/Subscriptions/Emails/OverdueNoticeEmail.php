<?php
/**
 * "Overdue Notice" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fires on `purecart_dunning_retry_failed` — RND's "Day N: Retry ... Failure
 * -> Send overdue reminder email." A hook added in Step 13 (DunningManager
 * previously only logged this).
 *
 * @since 1.0.0
 */
class OverdueNoticeEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_overdue_notice';
		$this->title       = __( 'Overdue Notice', 'purecart' );
		$this->description = __( 'Sent after a scheduled payment retry also fails.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_dunning_retry_failed' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your {product_name} payment is still overdue', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Payment still overdue', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, we tried again to charge {amount} for {product_name} and it still failed. Please update your payment method soon to avoid losing access.', 'purecart' );
	}
}

<?php
/**
 * "Trial Ending Soon" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fired by `SubscriptionEmail::send_reminders()`'s scan (Step 13) — no
 * lifecycle-transition hook exists for "N days before a future date", this
 * needs a scan, not an event.
 *
 * @since 1.0.0
 */
class TrialEndingSoonEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_trial_ending_soon';
		$this->title       = __( 'Trial Ending Soon', 'purecart' );
		$this->description = __( 'Sent a few days before a free trial ends.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_trial_ending_soon' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your {product_name} trial ends soon', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Your trial is ending soon', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, your free trial of {product_name} ends on {trial_end_date}. After that, {amount} will be billed automatically to keep your access uninterrupted.', 'purecart' );
	}
}

<?php
/**
 * "Plan Changed" email — feature doc § 22 MVP set.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Fires on `purecart_subscription_plan_changed`, dispatched by RenewalEngine
 * (pending-switch applied), PlanUpgrade (no_proration/prorate_immediately),
 * and SplitPaymentManager's plan-change paths alike — one email covers all
 * of them since they all represent the same underlying event.
 *
 * @since 1.0.0
 */
class PlanChangedEmail extends AbstractSubscriptionEmail {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id          = 'purecart_plan_changed';
		$this->title       = __( 'Plan Changed', 'purecart' );
		$this->description = __( 'Sent when an upgrade or downgrade takes effect.', 'purecart' );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string[]
	 */
	protected function trigger_hooks(): array {
		return array( 'purecart_subscription_plan_changed' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your plan has changed to {product_name}', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Your plan has changed', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_body_message(): string {
		return __( 'Hi {first_name}, your subscription is now on the {product_name} plan at {amount} per cycle. Your next payment is due on {next_payment_date}.', 'purecart' );
	}
}

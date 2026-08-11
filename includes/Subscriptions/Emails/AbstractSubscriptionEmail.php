<?php
/**
 * Shared base for every subscription email — trigger wiring, placeholder
 * resolution, and rendering. Concrete emails only declare which hook(s) fire
 * them and their subject/heading/body text.
 *
 * @package PureCart\Subscriptions\Emails
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions\Emails;

use PureCart\Subscriptions\SubscriptionRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Scope decision: renders via WooCommerce's own `woocommerce_email_header`/
 * `woocommerce_email_footer` actions plus a plain formatted body, rather than
 * 16+ bespoke `.php` template files (the usual WC_Email pattern, one template
 * per email). Halves the amount of near-duplicate code for 18 emails and
 * automatically respects whatever email styling (logo, colours) the merchant
 * already configured in WooCommerce -> Settings -> Emails. Custom per-email
 * HTML design is a presentation concern for whoever builds the frontend/
 * templates layer later, not something this step needs to hand-author.
 *
 * @since 1.0.0
 */
abstract class AbstractSubscriptionEmail extends \WC_Email {

	/** @var SubscriptionRepository */
	protected SubscriptionRepository $subscriptions;

	/** Subscription row currently being emailed, set by trigger(). */
	protected ?object $subscription = null;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->subscriptions  = new SubscriptionRepository();
		$this->customer_email = true;
		$this->email_group    = 'purecart_subscriptions';

		foreach ( $this->trigger_hooks() as $hook ) {
			add_action( $hook, array( $this, 'trigger' ), 10, 4 );
		}

		parent::__construct();
	}

	/**
	 * Which action hook(s) fire this email. Most emails have exactly one;
	 * "Subscription Created" vs. "Trial Started" both listen to the same
	 * activation hook and use should_send() to decide which one actually applies.
	 *
	 * @since 1.0.0
	 * @return string[]
	 */
	abstract protected function trigger_hooks(): array;

	/**
	 * The email body (may contain placeholders, basic inline HTML like
	 * `<strong>`/`<a>` is fine — it's passed through wp_kses_post()).
	 *
	 * @since 1.0.0
	 * @return string
	 */
	abstract protected function get_body_message(): string;

	/**
	 * Called with whatever extra args the triggering hook provides (e.g.
	 * `purecart_subscription_status_changed`'s $old_status/$new_status) —
	 * override to only actually send under specific conditions. Default: always.
	 *
	 * @since 1.0.0
	 * @param mixed $arg2 Second hook argument, if any.
	 * @param mixed $arg3 Third hook argument, if any.
	 * @param mixed $arg4 Fourth hook argument, if any.
	 * @return bool
	 */
	protected function should_send( $arg2 = null, $arg3 = null, $arg4 = null ): bool {
		return true;
	}

	/**
	 * Universal trigger callback — every concrete email's hook(s) point here.
	 * Accepts up to 4 args since hook signatures vary across this module
	 * (some pass just $subscription_id, others also $order_id/$reason/etc.).
	 *
	 * @since 1.0.0
	 * @param int   $subscription_id Subscription row ID. Always the first arg
	 *                               on every hook this module fires.
	 * @param mixed $arg2 Second hook argument, if any.
	 * @param mixed $arg3 Third hook argument, if any.
	 * @param mixed $arg4 Fourth hook argument, if any.
	 * @return void
	 */
	public function trigger( $subscription_id, $arg2 = null, $arg3 = null, $arg4 = null ): void {
		$this->setup_locale();

		$this->subscription = $this->subscriptions->find( (int) $subscription_id );

		if ( $this->subscription && $this->should_send( $arg2, $arg3, $arg4 ) ) {
			$this->set_placeholders();
			$this->recipient = $this->get_customer_email();

			if ( $this->is_enabled() && $this->get_recipient() ) {
				$this->send( $this->get_recipient(), $this->get_subject(), $this->get_content(), $this->get_headers(), $this->get_attachments() );
			}
		}

		$this->subscription = null;
		$this->restore_locale();
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private function get_customer_email(): string {
		if ( ! $this->subscription ) {
			return '';
		}

		$user = get_userdata( (int) $this->subscription->user_id );

		return $user ? $user->user_email : '';
	}

	/**
	 * Populate the shared placeholder set (feature doc § 22's list, the
	 * subset that's actually derivable from data this module has). Merged on
	 * top of WC_Email's own base placeholders ({site_title}, {store_email}, ...).
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function set_placeholders(): void {
		if ( ! $this->subscription ) {
			return;
		}

		$user    = get_userdata( (int) $this->subscription->user_id );
		$product = function_exists( 'wc_get_product' ) ? wc_get_product( (int) $this->subscription->product_id ) : false;

		$installments_remaining = '';
		if ( ! empty( $this->subscription->max_payments ) ) {
			$installments_remaining = (string) max( 0, (int) $this->subscription->max_payments - (int) $this->subscription->renewal_count );
		}

		$this->placeholders = array_merge(
			$this->placeholders,
			array(
				'{first_name}'             => $user ? $user->first_name : '',
				'{last_name}'              => $user ? $user->last_name : '',
				'{subscription_id}'        => (string) $this->subscription->id,
				'{product_name}'           => $product ? $product->get_name() : '',
				'{plan_name}'              => $product ? $product->get_name() : '',
				'{amount}'                 => $this->format_amount( (float) $this->subscription->recurring_amount ),
				'{next_payment_date}'      => $this->format_date( $this->subscription->next_payment_at ),
				'{trial_end_date}'         => $this->format_date( $this->subscription->trial_ends_at ),
				'{cancel_date}'            => $this->format_date( $this->subscription->cancellation_date ?: $this->subscription->cancelled_at ),
				'{status}'                 => (string) $this->subscription->status,
				'{churn_risk}'             => (string) $this->subscription->churn_risk_score,
				'{renewal_count}'          => (string) $this->subscription->renewal_count,
				'{installment_number}'     => (string) $this->subscription->renewal_count,
				'{installments_remaining}' => $installments_remaining,
			)
		);
	}

	/**
	 * @since 1.0.0
	 * @param float $amount Amount to format.
	 * @return string
	 */
	private function format_amount( float $amount ): string {
		if ( function_exists( 'wc_price' ) ) {
			return wp_strip_all_tags( wc_price( $amount, array( 'currency' => (string) ( $this->subscription->currency ?? '' ) ) ) );
		}

		return number_format( $amount, 2 );
	}

	/**
	 * @since 1.0.0
	 * @param string|null $date A MySQL datetime string, or null/empty.
	 * @return string
	 */
	private function format_date( ?string $date ): string {
		if ( ! $date ) {
			return '';
		}

		return date_i18n( get_option( 'date_format' ), strtotime( $date ) );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_content_html() {
		ob_start();

		do_action( 'woocommerce_email_header', $this->get_heading(), $this );

		echo wp_kses_post( wpautop( $this->format_string( $this->get_body_message() ) ) );

		$additional = $this->get_additional_content();
		if ( $additional ) {
			echo wp_kses_post( wpautop( $this->format_string( $additional ) ) );
		}

		do_action( 'woocommerce_email_footer', $this );

		return (string) ob_get_clean();
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_content_plain() {
		$content = $this->format_string( $this->get_body_message() );

		$additional = $this->get_additional_content();
		if ( $additional ) {
			$content .= "\n\n" . $this->format_string( $additional );
		}

		return wp_strip_all_tags( $content );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_additional_content() {
		return __( 'Thanks for being a subscriber! If you have any questions, just reply to this email.', 'purecart' );
	}
}

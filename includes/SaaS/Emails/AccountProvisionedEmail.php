<?php
/**
 * "Your SaaS account is ready" customer email.
 *
 * @package PureCart\SaaS\Emails
 */

declare( strict_types=1 );

namespace PureCart\SaaS\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * A WC_Email, not a bare template file — matches Updates\Emails\
 * UpdateAvailableEmail and the Subscriptions module's emails, so this shows
 * up under WooCommerce → Settings → Emails alongside every other PureCart
 * mail. On/off is WooCommerce's own per-email "Enable this email" toggle
 * there (WC_Email::is_enabled()) — no separate PureCart setting for it.
 *
 * @since 1.0.0
 */
class AccountProvisionedEmail extends \WC_Email {

	/** Account row currently being emailed, set by trigger(). */
	private ?object $account = null;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id             = 'purecart_saas_account_provisioned';
		$this->title          = __( 'SaaS Account Ready', 'purecart' );
		$this->description    = __( 'Sent to the customer when a SaaS account is provisioned, with their API key.', 'purecart' );
		$this->customer_email = true;
		$this->email_group    = 'purecart_saas';

		add_action( 'purecart_saas_provisioned', array( $this, 'trigger' ), 10, 1 );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your {site_title} SaaS account is ready', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Your account is ready', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_additional_content() {
		return __( 'Thanks for being a customer of {site_title}.', 'purecart' );
	}

	/**
	 * Send the "account ready" email to one customer.
	 *
	 * @since 1.0.0
	 * @param object|null $account The purecart_saas_accounts row just provisioned.
	 * @return void
	 */
	public function trigger( $account = null ): void {
		$this->setup_locale();

		$user = is_object( $account ) ? get_userdata( (int) $account->user_id ) : false;

		if ( is_object( $account ) && $user instanceof \WP_User ) {
			$this->account   = $account;
			$this->recipient = $user->user_email;
			$this->set_placeholders( $user );
		}

		if ( $this->account && $this->is_enabled() && $this->get_recipient() ) {
			$this->send( $this->get_recipient(), $this->get_subject(), $this->get_content(), $this->get_headers(), $this->get_attachments() );
		}

		$this->account = null;

		$this->restore_locale();
	}

	/**
	 * @since 1.0.0
	 * @param \WP_User $user The account owner.
	 * @return void
	 */
	private function set_placeholders( \WP_User $user ): void {
		$product      = function_exists( 'wc_get_product' ) ? wc_get_product( (int) $this->account->product_id ) : null;
		$product_name = $product ? $product->get_name() : get_the_title( (int) $this->account->product_id );

		$this->placeholders = array_merge(
			(array) $this->placeholders,
			array(
				'{first_name}'   => (string) ( $user->first_name ?: $user->display_name ),
				'{plan}'         => (string) $this->account->plan,
				'{product_name}' => (string) $product_name,
			)
		);
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private function account_url(): string {
		if ( function_exists( 'wc_get_account_endpoint_url' ) ) {
			return wc_get_account_endpoint_url( 'purecart-api-keys' );
		}

		return wc_get_page_permalink( 'myaccount' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private function body_message(): string {
		$message  = __( 'Hi {first_name}, your {plan} plan SaaS account for {product_name} is ready to use.', 'purecart' );
		$message .= "\n\n" . sprintf(
			/* translators: %s: SaaS API key. */
			__( 'Your API key: %s', 'purecart' ),
			(string) $this->account->api_key
		);
		$message .= "\n\n" . sprintf(
			/* translators: %s: My Account API Keys tab URL. */
			__( 'You can view or rotate this key any time from your account: %s', 'purecart' ),
			esc_url( $this->account_url() )
		);

		return $message;
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_content_html() {
		ob_start();

		do_action( 'woocommerce_email_header', $this->get_heading(), $this );

		echo wp_kses_post( wpautop( $this->format_string( $this->body_message() ) ) );

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
		$content = $this->format_string( $this->body_message() );

		$additional = $this->get_additional_content();
		if ( $additional ) {
			$content .= "\n\n" . $this->format_string( $additional );
		}

		return wp_strip_all_tags( $content );
	}
}

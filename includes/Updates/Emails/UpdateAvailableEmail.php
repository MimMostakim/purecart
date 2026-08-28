<?php
/**
 * "Update Available" customer email.
 *
 * @package PureCart\Updates\Emails
 */

declare( strict_types=1 );

namespace PureCart\Updates\Emails;

use PureCart\Updates\PackageRepository;

defined( 'ABSPATH' ) || exit;

/**
 * A WC_Email rather than the standalone template file RND-auto-updates.md
 * describes. Registering with WooCommerce puts this alongside every other
 * store email under WooCommerce → Settings → Emails, so the store owner can
 * disable it, rewrite the subject and heading, and inherit the store's own
 * header, footer and branding — none of which a bare template file in the
 * plugin would offer. It matches how the Subscriptions module's 18 emails are
 * built, so a store has one place to manage all PureCart mail.
 *
 * @since 1.0.0
 */
class UpdateAvailableEmail extends \WC_Email {

	/** @var PackageRepository */
	private PackageRepository $packages;

	/** Package currently being announced, set by trigger(). */
	private ?object $package = null;

	/** Customer currently being emailed. */
	private ?\WP_User $customer = null;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->id             = 'purecart_update_available';
		$this->title          = __( 'Update Available', 'purecart' );
		$this->description    = __( 'Sent to licence holders when a new stable version of a product is published.', 'purecart' );
		$this->customer_email = true;
		$this->email_group    = 'purecart_updates';

		$this->packages = new PackageRepository();

		add_action( 'purecart_update_available_email', array( $this, 'trigger' ), 10, 2 );

		parent::__construct();
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'New version of {product_name} available — v{version}', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_heading() {
		return __( '{product_name} v{version} is ready', 'purecart' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	public function get_default_additional_content() {
		return __( 'Thanks for being a customer of {site_title}.', 'purecart' );
	}

	/**
	 * Send the announcement to one customer.
	 *
	 * @since 1.0.0
	 * @param int $user_id    WordPress user ID.
	 * @param int $package_id Package row ID.
	 * @return void
	 */
	public function trigger( $user_id = 0, $package_id = 0 ): void {
		$this->setup_locale();

		$this->package  = $this->packages->find( (int) $package_id );
		$user           = get_userdata( (int) $user_id );
		$this->customer = $user instanceof \WP_User ? $user : null;

		if ( $this->package && $this->customer ) {
			$this->set_placeholders();
			$this->recipient = $this->customer->user_email;

			if ( $this->is_enabled() && $this->get_recipient() ) {
				$this->send( $this->get_recipient(), $this->get_subject(), $this->get_content(), $this->get_headers(), $this->get_attachments() );
			}
		}

		$this->package  = null;
		$this->customer = null;

		$this->restore_locale();
	}

	/**
	 * @since 1.0.0
	 * @return void
	 */
	private function set_placeholders(): void {
		$product      = function_exists( 'wc_get_product' ) ? wc_get_product( (int) $this->package->product_id ) : null;
		$product_name = $product ? $product->get_name() : get_the_title( (int) $this->package->product_id );

		$this->placeholders = array_merge(
			(array) $this->placeholders,
			array(
				'{product_name}' => (string) $product_name,
				'{version}'      => (string) $this->package->version,
				'{first_name}'   => (string) ( $this->customer->first_name ?: $this->customer->display_name ),
				'{changelog}'    => $this->changelog_excerpt(),
			)
		);
	}

	/**
	 * A short, plain-text summary of what changed.
	 *
	 * Tags are stripped rather than rendered: the changelog is authored as
	 * HTML for the WordPress modal, and dropping arbitrary stored markup into
	 * an email body would break layout in the many clients that handle lists
	 * and nesting poorly.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	private function changelog_excerpt(): string {
		$source = (string) $this->package->changelog;

		if ( '' === trim( $source ) ) {
			$source = (string) $this->package->release_notes;
		}

		// Turn list items into lines before stripping tags, or every bullet
		// runs together into one unreadable paragraph.
		$text = (string) preg_replace( '#</li>#i', "\n", $source );
		$text = wp_strip_all_tags( $text );
		$text = trim( (string) preg_replace( "/\n{2,}/", "\n", $text ) );

		if ( '' === $text ) {
			return '';
		}

		return wp_html_excerpt( $text, 600, '…' );
	}

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private function body_message(): string {
		$message = __( 'Hi {first_name}, version {version} of {product_name} has been released.', 'purecart' );

		$excerpt = $this->changelog_excerpt();
		if ( '' !== $excerpt ) {
			$message .= "\n\n" . __( "What's new:", 'purecart' ) . "\n" . $excerpt;
		}

		$message .= "\n\n" . __( 'Update from your site\'s Plugins screen, or download the latest version from your account.', 'purecart' );

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

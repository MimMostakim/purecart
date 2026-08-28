<?php
/**
 * Updates module bootstrap.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

use PureCart\API\Updates as UpdatesApi;
use PureCart\Updates\Emails\UpdateAvailableEmail;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the Updates module into the plugin's init flow, mirroring how
 * `PureCart\Subscriptions\Module` boots that module.
 *
 * @since 1.0.0
 */
class Module {

	/**
	 * Bumped whenever a rewrite rule in this module changes, so existing
	 * installs re-flush without the admin having to visit Settings →
	 * Permalinks. Activator::activate() flushes too, but only covers a fresh
	 * activation — an update that adds a rule to an already-active plugin
	 * would otherwise 404 until someone happened to re-save permalinks.
	 *
	 * @var string
	 */
	private const REWRITE_VERSION = '1.0.0';

	/** Option storing the flushed rewrite version. */
	private const REWRITE_OPTION = 'purecart_updates_rewrite_version';

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		// One shared UpdateDelivery: it registers rewrite/template_redirect
		// hooks in its constructor, so a second instance would double-register
		// the download handler.
		$delivery = new UpdateDelivery();

		( new UpdatesApi( $delivery ) )->register();

		new UpdateNotifier();
		add_filter( 'woocommerce_email_classes', array( $this, 'register_emails' ) );

		if ( is_admin() ) {
			new ProductUpdatesTab();
		}

		// Priority 20: after UpdateDelivery's own init-hooked add_rewrite(),
		// so the rule exists before the flush happens.
		add_action( 'init', array( $this, 'maybe_flush_rewrites' ), 20 );
	}

	/**
	 * Put the module's customer emails under WooCommerce → Settings → Emails.
	 *
	 * @since 1.0.0
	 * @param array<string, \WC_Email> $emails Registered WooCommerce emails.
	 * @return array<string, \WC_Email>
	 */
	public function register_emails( array $emails ): array {
		$email                 = new UpdateAvailableEmail();
		$emails[ $email->id ] = $email;

		return $emails;
	}

	/**
	 * Flush rewrite rules once per rewrite-version change.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function maybe_flush_rewrites(): void {
		if ( self::REWRITE_VERSION === get_option( self::REWRITE_OPTION ) ) {
			return;
		}

		flush_rewrite_rules( false );
		update_option( self::REWRITE_OPTION, self::REWRITE_VERSION );
	}
}

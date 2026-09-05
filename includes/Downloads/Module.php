<?php
/**
 * Secure Downloads module bootstrap.
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the Secure Downloads module into the plugin's init flow, mirroring how
 * `PureCart\Updates\Module` boots that module.
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
	private const REWRITE_OPTION = 'purecart_downloads_rewrite_version';

	/**
	 * How long a token outlives the order it belongs to before it is eligible
	 * for deletion. Only ever applies to tokens whose order is already gone,
	 * so this is a grace period against a mid-deletion race, not a retention
	 * policy.
	 *
	 * @var int
	 */
	private const ORPHAN_GRACE_DAYS = 30;

	/** Tokens examined per cleanup run, so the job stays bounded on a large store. */
	private const CLEANUP_BATCH = 200;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		// One shared DownloadDispatcher: it registers rewrite/template_redirect
		// hooks in its constructor, so a second instance would double-register
		// the download handler.
		new DownloadDispatcher();

		new AccountDownloadsMerger();

		// Priority 20: after DownloadDispatcher's own init-hooked add_rewrite(),
		// so the rules exist before the flush happens.
		add_action( 'init', array( $this, 'maybe_flush_rewrites' ), 20 );

		add_action( 'purecart_cleanup_expired_tokens', array( $this, 'cleanup_tokens' ) );
		add_action( 'purecart_cleanup_download_logs', array( $this, 'cleanup_logs' ) );
	}

	/**
	 * Delete download tokens whose order no longer exists.
	 *
	 * Deliberately *not* "delete expired tokens", which is what this job was
	 * originally specified to do. A token row is what
	 * {@see AccountDownloadsMerger} matches a native WooCommerce download row
	 * against in order to replace its unprotected `?download_file=` URL — or,
	 * for a revoked token, to hide that row entirely. Delete the token and the
	 * match fails, so WooCommerce's own row reappears with its own link, and
	 * an expired or refunded download quietly becomes downloadable again.
	 * Keeping the row costs a few dozen bytes; deleting it reopens the file.
	 *
	 * What is genuinely safe to remove is a token belonging to an order that
	 * has been deleted outright: there is no native row left to guard, and no
	 * customer left to serve.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function cleanup_tokens(): void {
		global $wpdb;

		$cutoff = gmdate( 'Y-m-d H:i:s', time() - ( self::ORPHAN_GRACE_DAYS * DAY_IN_SECONDS ) );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table maintenance; a cached list would delete against stale state.
		$order_ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT order_id
                   FROM {$wpdb->prefix}purecart_downloads
                  WHERE created_at < %s
                  ORDER BY order_id ASC
                  LIMIT %d",
				$cutoff,
				self::CLEANUP_BATCH
			)
		);

		foreach ( (array) $order_ids as $order_id ) {
			$order_id = (int) $order_id;

			// wc_get_order() rather than a table join: it is the only lookup
			// that answers correctly under both HPOS and legacy post storage.
			if ( $order_id > 0 && wc_get_order( $order_id ) ) {
				continue;
			}

            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table maintenance DELETE; no WP API available.
			$wpdb->delete(
				$wpdb->prefix . 'purecart_downloads',
				array( 'order_id' => $order_id ),
				array( '%d' )
			);
		}
	}

	/**
	 * Trim the download log to the configured retention window.
	 *
	 * The log grows by a row per download attempt, forever, and nothing else
	 * ever removes one — on a busy store it is the only table in this module
	 * that can get genuinely large.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function cleanup_logs(): void {
		$months = (int) Settings::get( OptionKeys::DOWNLOAD_LOG_RETENTION, 12 );

		( new DownloadLogger() )->prune( $months );
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

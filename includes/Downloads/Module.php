<?php
/**
 * Secure Downloads module bootstrap.
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

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

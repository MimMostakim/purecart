<?php
/**
 * Action Scheduler job: purge old rows from wp_purecart_license_tokens.
 *
 * @package PureCart\Licensing
 */

declare( strict_types=1 );

namespace PureCart\Licensing;

defined( 'ABSPATH' ) || exit;

/**
 * Purges expired JWT tracking rows on a daily Action Scheduler job.
 *
 * @since 1.0.0
 */
class LicenseTokenCleanup {

	/**
	 * Delete token rows that expired more than 30 days ago.
	 *
	 * A single 30-day sweep covers both access and refresh tokens — the
	 * doc's second, 1-day "purecart_cleanup_refresh_tokens" job would only
	 * shrink the table a little sooner and isn't worth a second Action
	 * Scheduler job for that.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function run(): void {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Bulk housekeeping DELETE; no WP API available.
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->prefix}purecart_license_tokens WHERE expires_at < %s",
				gmdate( 'Y-m-d H:i:s', time() - 30 * DAY_IN_SECONDS )
			)
		);
	}
}

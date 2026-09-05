<?php
/**
 * Database store for wp_purecart_download_logs.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the download access log table.
 *
 * Every attempt is recorded, not only successful ones: `event` distinguishes
 * a served file from each way a request can be turned away, which is what
 * makes the log usable for support ("why can't my customer download?") and
 * for spotting a shared link being hammered from many addresses.
 *
 * @since 1.0.0
 */
class DownloadLogs extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		// event: served | rejected_invalid | rejected_revoked | rejected_expired
		//        | rejected_limit | rejected_license | rejected_missing
		// See PureCart\Downloads\DownloadLogger for the authoritative list.
		return "CREATE TABLE {$wpdb->prefix}purecart_download_logs (
            id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            download_id   BIGINT UNSIGNED NOT NULL,
            event         VARCHAR(32) NOT NULL DEFAULT 'served',
            ip_address    VARCHAR(45) NOT NULL DEFAULT '',
            user_agent    TEXT,
            country_code  VARCHAR(2)  NOT NULL DEFAULT '',
            downloaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY idx_download_id (download_id),
            KEY idx_event       (event),
            KEY idx_downloaded  (downloaded_at)
        ) $charset;";
	}
}

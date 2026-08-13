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

		return "CREATE TABLE {$wpdb->prefix}purecart_download_logs (
            id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            download_id   BIGINT UNSIGNED NOT NULL,
            ip_address    VARCHAR(45) NOT NULL DEFAULT '',
            user_agent    TEXT,
            country_code  VARCHAR(2)  NOT NULL DEFAULT '',
            downloaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY idx_download_id (download_id),
            KEY idx_downloaded  (downloaded_at)
        ) $charset;";
	}
}

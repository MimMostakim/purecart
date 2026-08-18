<?php
/**
 * Database store for wp_purecart_subscription_logs.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the per-subscription event log table.
 *
 * Records status changes, payment attempts, retention events, and emails sent.
 *
 * @since 1.0.0
 */
class SubscriptionLogs extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_subscription_logs (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            subscription_id BIGINT UNSIGNED NOT NULL,
            event           VARCHAR(100) NOT NULL,
            old_status      VARCHAR(30) NULL,
            new_status      VARCHAR(30) NULL,
            amount          DECIMAL(10,2) NULL,
            order_id        BIGINT UNSIGNED NULL,
            note            TEXT NULL,
            actor_type      VARCHAR(16) NOT NULL DEFAULT 'system',
            actor_id        BIGINT UNSIGNED DEFAULT 0,
            created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY idx_subscription_id (subscription_id),
            KEY idx_event (event),
            KEY idx_created_at (created_at)
        ) $charset;";
	}
}

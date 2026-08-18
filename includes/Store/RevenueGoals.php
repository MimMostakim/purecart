<?php
/**
 * Database store for wp_purecart_revenue_goals.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the admin-defined revenue targets table.
 *
 * Revenue goals are tracked against the subscription_revenue ledger.
 *
 * @since 1.0.0
 */
class RevenueGoals extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_revenue_goals (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name            VARCHAR(255) NOT NULL,
            target_amount   DECIMAL(10,2) NOT NULL,
            current_amount  DECIMAL(10,2) DEFAULT 0.00,
            start_date      DATE NOT NULL,
            end_date        DATE NOT NULL,
            status          ENUM('active','achieved','missed') DEFAULT 'active',
            created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY idx_status_dates (status, start_date, end_date)
        ) $charset;";
	}
}

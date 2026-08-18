<?php
/**
 * Database store for wp_purecart_subscription_revenue.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the recognized-revenue ledger.
 *
 * One row per completed billing period. Powers MRR/ARR/churn reporting
 * independent of WooCommerce's own order reports.
 *
 * @since 1.0.0
 */
class SubscriptionRevenue extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_subscription_revenue (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            subscription_id BIGINT UNSIGNED NOT NULL,
            amount          DECIMAL(10,2) NOT NULL,
            currency        VARCHAR(10) DEFAULT 'USD',
            billing_period  VARCHAR(20) NULL,
            period_start    DATE NOT NULL,
            period_end      DATE NOT NULL,
            transaction_id  VARCHAR(255) NULL,
            gateway         VARCHAR(50) NULL,
            created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY idx_subscription_id (subscription_id),
            KEY idx_period_start (period_start),
            UNIQUE KEY  uniq_transaction (transaction_id)
        ) $charset;";
	}
}

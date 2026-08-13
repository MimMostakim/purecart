<?php
/**
 * Database store for wp_purecart_subscription_payments.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the per-charge-attempt payments ledger.
 *
 * `uniq_transaction` is the idempotency backstop for inbound gateway webhooks.
 *
 * @since 1.0.0
 */
class SubscriptionPayments extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_subscription_payments (
            id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            subscription_id    BIGINT UNSIGNED NOT NULL,
            order_id           BIGINT UNSIGNED NOT NULL,
            transaction_id     VARCHAR(255) NOT NULL,
            amount             DECIMAL(10,2) NOT NULL,
            currency           VARCHAR(10) DEFAULT 'USD',
            status             VARCHAR(32) NOT NULL,
            is_partial_refund  TINYINT(1) NOT NULL DEFAULT 0,
            refunded_amount    DECIMAL(10,2) NULL,
            refund_reason      TEXT NULL,
            created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY idx_subscription_id (subscription_id),
            UNIQUE KEY  uniq_transaction (transaction_id)
        ) $charset;";
	}
}

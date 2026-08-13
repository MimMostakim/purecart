<?php
/**
 * Database store for wp_purecart_subscriptions.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the core subscriptions table.
 *
 * Also runs a defensive ALTER TABLE after dbDelta() to ensure the `status`
 * ENUM stays in sync across MySQL/MariaDB versions. Root cause: dbDelta's
 * field parser splits on commas/newlines, so a multi-line ENUM definition
 * is misread as separate column names, producing malformed ALTER statements.
 *
 * @since 1.0.0
 */
class Subscriptions extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_subscriptions (
            id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id                 BIGINT UNSIGNED NOT NULL,
            product_id              BIGINT UNSIGNED NOT NULL,
            order_id                BIGINT UNSIGNED NOT NULL,
            license_id              BIGINT UNSIGNED NULL,
            saas_account_id         BIGINT UNSIGNED NULL,
            delivery_type           VARCHAR(32) NOT NULL DEFAULT 'software',
            status                  ENUM('trialing','active','paused','past_due','pending_reauth','suspended','pending_cancel','cancelled','expired','completed') DEFAULT 'active',
            billing_interval        INT UNSIGNED NOT NULL,
            billing_period          ENUM('day','week','month','year') NOT NULL,
            recurring_amount        DECIMAL(10,2) NOT NULL,
            currency                VARCHAR(10) DEFAULT 'USD',
            signup_fee              DECIMAL(10,2) DEFAULT 0.00,
            trial_ends_at           DATETIME NULL,
            next_payment_at         DATETIME NULL,
            last_payment_at         DATETIME NULL,
            max_length_at           DATETIME NULL,
            paused_at               DATETIME NULL,
            pause_end_date          DATETIME NULL,
            suspended_at            DATETIME NULL,
            cancelled_at            DATETIME NULL,
            cancellation_date       DATETIME NULL,
            gateway                 VARCHAR(50) NULL,
            gateway_subscription_id VARCHAR(255) NULL,
            payment_token_id        BIGINT UNSIGNED NULL,
            retry_count             TINYINT UNSIGNED DEFAULT 0,
            renewal_count           INT UNSIGNED DEFAULT 0,
            skip_count              INT UNSIGNED DEFAULT 0,
            max_renewals            INT UNSIGNED NULL,
            payment_type            ENUM('recurring','split') DEFAULT 'recurring',
            max_payments            INT UNSIGNED NULL,
            access_timing           ENUM('immediate','after_full_payment','custom_duration') DEFAULT 'immediate',
            access_duration_value   INT UNSIGNED NULL,
            access_duration_unit    ENUM('day','week','month','year') NULL,
            access_end_date         DATETIME NULL,
            step_price              DECIMAL(10,2) NULL,
            step_after              INT UNSIGNED NULL,
            discount_percent            DECIMAL(5,2) NULL,
            discount_renewals_remaining SMALLINT UNSIGNED NULL,
            churn_risk_score        TINYINT UNSIGNED DEFAULT 0,
            customer_ltv            DECIMAL(10,2) DEFAULT 0.00,
            pending_switch_product  BIGINT UNSIGNED NULL,
            pending_switch_type     ENUM('upgrade','downgrade') NULL,
            shipping_amount         DECIMAL(10,2) DEFAULT 0.00,
            shipping_method         VARCHAR(255) NULL,
            billing_address         TEXT NULL,
            shipping_address        TEXT NULL,
            previous_subscription_id BIGINT UNSIGNED NULL,
            starts_at               DATETIME NOT NULL,
            created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY idx_user_id (user_id),
            KEY idx_product_id (product_id),
            KEY idx_status (status),
            KEY idx_next_payment (next_payment_at),
            KEY idx_trial_ends (trial_ends_at),
            KEY idx_pause_end (pause_end_date),
            KEY idx_churn (churn_risk_score),
            KEY idx_delivery_type (delivery_type),
            KEY idx_previous_subscription (previous_subscription_id)
        ) $charset;";
	}

	/**
	 * Run dbDelta then apply a defensive ALTER TABLE to keep the status ENUM
	 * definition consistent across MySQL/MariaDB versions.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function create(): void {
		parent::create();
		$this->migrate_status_enum();
	}

	/**
	 * Explicitly re-apply the full status ENUM value list via ALTER TABLE.
	 *
	 * dbDelta's handling of ENUM redefinitions is a known-fragile area — this
	 * ALTER is cheap, idempotent, and ensures the column is always correct
	 * regardless of which MySQL/MariaDB version the site runs.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function migrate_status_enum(): void {
		global $wpdb;

		$table = $wpdb->prefix . 'purecart_subscriptions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.NotPrepared -- Fixed DDL statement, no variable data; dbDelta() cannot perform this ALTER itself.
		$wpdb->query(
			"ALTER TABLE {$table} MODIFY COLUMN status ENUM('trialing','active','paused','past_due','pending_reauth','suspended','pending_cancel','cancelled','expired','completed') DEFAULT 'active'"
		);
	}
}

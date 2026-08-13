<?php
/**
 * Subscriptions module — DB schema (creates & upgrades all `wp_purecart_subscription_*` tables).
 *
 * Called from \PureCart\Activator so table creation/upgrade stays part of the
 * plugin's existing activation flow, per subscription-final-dev-plan.md § 9 Step 1.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Creates/upgrades the Subscriptions module's custom database tables via dbDelta().
 *
 * @since 1.0.0
 */
class Schema {

	/**
	 * Create or upgrade all Subscriptions module tables.
	 *
	 * Safe to call on every activation/upgrade — dbDelta() only applies the
	 * diff between this definition and what already exists.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function create_tables(): void {
		global $wpdb;

		$charset = $wpdb->get_charset_collate();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		self::create_subscriptions_table( $charset );
		self::create_linked_entities_table( $charset );
		self::create_logs_table( $charset );
		self::create_payments_table( $charset );
		self::create_items_table( $charset );
		self::create_revenue_table( $charset );
		self::create_revenue_goals_table( $charset );
		self::migrate_status_enum();
	}

	/**
	 * Explicitly (re-)apply the `status` ENUM's full value list, as a
	 * defensive backstop on top of the dbDelta() call above.
	 *
	 * Root cause of a real bug hit on a live site: dbDelta()'s field parser
	 * splits a CREATE TABLE body on commas/newlines to identify each column
	 * definition, and the `status` ENUM in create_subscriptions_table() used
	 * to be written across multiple lines. That confused dbDelta into treating
	 * each quoted enum value ('trialing', 'active', ...) as its own column
	 * name, producing malformed `ADD COLUMN 'trialing'` etc. statements that
	 * failed outright (see debug.log). Fixed by keeping that ENUM on one line,
	 * matching every other ENUM in this codebase (Activator.php's
	 * purecart_licenses/purecart_saas_accounts tables). This explicit ALTER
	 * is kept anyway as a defense-in-depth backstop, since dbDelta's handling
	 * of ENUM redefinitions in general is a known-fragile area across
	 * different MySQL/MariaDB versions — cheap and idempotent to re-run.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private static function migrate_status_enum(): void {
		global $wpdb;

		$table = $wpdb->prefix . 'purecart_subscriptions';

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.NotPrepared -- Fixed DDL statement, no variable data; dbDelta() cannot perform this ALTER itself (see docblock).
		$wpdb->query(
			"ALTER TABLE {$table} MODIFY COLUMN status ENUM('trialing','active','paused','past_due','pending_reauth','suspended','pending_cancel','cancelled','expired','completed') DEFAULT 'active'"
		);
	}

	/**
	 * Core subscriptions table — one row per customer subscription.
	 *
	 * Supersedes the earlier minimal `purecart_subscriptions` definition that
	 * used to live in Activator::create_tables(); this is the full schema from
	 * subscription-final-dev-plan.md § 2.
	 *
	 * @param string $charset Charset/collate clause from $wpdb->get_charset_collate().
	 * @return void
	 */
	private static function create_subscriptions_table( string $charset ): void {
		global $wpdb;

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_subscriptions (
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
        ) $charset;"
		);
	}

	/**
	 * Type-specific data for membership/download/course/service delivery types.
	 *
	 * software/saas store their linked IDs directly on the subscriptions table
	 * (license_id, saas_account_id) since Licensing/SaaS are sibling modules.
	 *
	 * @param string $charset Charset/collate clause.
	 * @return void
	 */
	private static function create_linked_entities_table( string $charset ): void {
		global $wpdb;

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_subscription_linked_entities (
            id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            subscription_id         BIGINT UNSIGNED NOT NULL,
            delivery_type           VARCHAR(32) NOT NULL,
            membership_tier         VARCHAR(100) NULL,
            assigned_role           VARCHAR(100) NULL,
            content_access_label    VARCHAR(255) NULL,
            grace_ends_at           DATETIME NULL,
            downloads_this_cycle    INT UNSIGNED DEFAULT 0,
            download_limit          INT UNSIGNED NULL,
            next_drip_date          DATETIME NULL,
            lms_enrollment_id       VARCHAR(255) NULL,
            enrolled_course_ids     TEXT NULL,
            course_access_until     DATETIME NULL,
            deliverable_notes       TEXT NULL,
            next_deliverable_due    DATETIME NULL,
            last_deliverable_at     DATETIME NULL,
            extra_data              LONGTEXT NULL,
            created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY  uniq_subscription (subscription_id),
            KEY idx_delivery_type (delivery_type),
            KEY idx_next_drip (next_drip_date),
            KEY idx_course_access (course_access_until),
            KEY idx_grace_ends (grace_ends_at)
        ) $charset;"
		);
	}

	/**
	 * Per-subscription event log (status changes, payment attempts, emails, retention events).
	 *
	 * Supersedes the earlier minimal `purecart_subscription_logs` definition
	 * that used to live in Activator::create_tables().
	 *
	 * @param string $charset Charset/collate clause.
	 * @return void
	 */
	private static function create_logs_table( string $charset ): void {
		global $wpdb;

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_subscription_logs (
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
        ) $charset;"
		);
	}

	/**
	 * Per-charge-attempt ledger. `uniq_transaction` is the idempotency backstop
	 * for inbound gateway webhooks (subscription-final-dev-plan.md § 5).
	 *
	 * @param string $charset Charset/collate clause.
	 * @return void
	 */
	private static function create_payments_table( string $charset ): void {
		global $wpdb;

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_subscription_payments (
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
        ) $charset;"
		);
	}

	/**
	 * Forward-looking line-items table (bundle/multi-product subscriptions).
	 * Not used by MVP logic yet — created now so no later migration is needed.
	 *
	 * @param string $charset Charset/collate clause.
	 * @return void
	 */
	private static function create_items_table( string $charset ): void {
		global $wpdb;

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_subscription_items (
            id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            subscription_id  BIGINT UNSIGNED NOT NULL,
            product_id       BIGINT UNSIGNED NOT NULL,
            variation_id     BIGINT UNSIGNED DEFAULT 0,
            qty              INT UNSIGNED NOT NULL DEFAULT 1,
            line_subtotal    DECIMAL(10,2) NOT NULL,
            line_total       DECIMAL(10,2) NOT NULL,
            delivery_type    VARCHAR(32) NOT NULL DEFAULT 'membership',
            PRIMARY KEY  (id),
            KEY idx_subscription_id (subscription_id)
        ) $charset;"
		);
	}

	/**
	 * Recognized-revenue ledger, one row per completed billing period. Powers
	 * MRR/ARR/churn reporting independent of WooCommerce's own order reports.
	 *
	 * @param string $charset Charset/collate clause.
	 * @return void
	 */
	private static function create_revenue_table( string $charset ): void {
		global $wpdb;

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_subscription_revenue (
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
        ) $charset;"
		);
	}

	/**
	 * Admin-defined revenue targets (e.g. "$10k MRR by Q4"), tracked against
	 * the revenue ledger above.
	 *
	 * @param string $charset Charset/collate clause.
	 * @return void
	 */
	private static function create_revenue_goals_table( string $charset ): void {
		global $wpdb;

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_revenue_goals (
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
        ) $charset;"
		);
	}
}

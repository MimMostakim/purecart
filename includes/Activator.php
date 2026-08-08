<?php
/**
 * Plugin activation / deactivation — creates & upgrades custom DB tables.
 *
 * @package PureCart
 */

declare( strict_types=1 );

namespace PureCart;

defined( 'ABSPATH' ) || exit;

/**
 * Handles activation, deactivation, and DB schema.
 *
 * @since 1.0.0
 */
class Activator {

	/** DB version option key. */
	private const DB_VERSION_KEY = 'purecart_db_version';

	/** Current DB schema version. */
	private const DB_VERSION = '1.2.3';

	/** Action Scheduler group for all plugin jobs. */
	private const AS_GROUP = 'purecart';

	/**
	 * Run on plugin activation: create tables, schedule jobs, flush rewrite rules.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function activate(): void {
		self::create_tables();
		self::schedule_jobs();
		update_option( self::DB_VERSION_KEY, self::DB_VERSION );
		flush_rewrite_rules();
	}

	/**
	 * Run on plugin deactivation: unschedule AS jobs and flush rewrite rules.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function deactivate(): void {
		as_unschedule_all_actions( 'purecart_check_expired_licenses', array(), self::AS_GROUP );
		as_unschedule_all_actions( 'purecart_process_dunning', array(), self::AS_GROUP );
		as_unschedule_all_actions( 'purecart_scan_due_renewals', array(), self::AS_GROUP );
		flush_rewrite_rules();
	}

	/**
	 * Create or upgrade all PureCart custom database tables using dbDelta().
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function create_tables(): void {
		global $wpdb;

		$charset = $wpdb->get_charset_collate();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_licenses (
            id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            order_id         BIGINT UNSIGNED NOT NULL DEFAULT 0,
            user_id          BIGINT UNSIGNED NOT NULL DEFAULT 0,
            product_id       BIGINT UNSIGNED NOT NULL DEFAULT 0,
            license_key      VARCHAR(64)  NOT NULL DEFAULT '',
            plan_type        ENUM('single','multi','unlimited','lifetime') NOT NULL DEFAULT 'single',
            status           ENUM('active','expired','revoked','suspended') NOT NULL DEFAULT 'active',
            activation_limit INT UNSIGNED NOT NULL DEFAULT 1,
            activated_count  INT UNSIGNED NOT NULL DEFAULT 0,
            expires_at       DATETIME NULL DEFAULT NULL,
            created_at       DATETIME NOT NULL,
            updated_at       DATETIME NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY  license_key (license_key),
            KEY idx_user_id  (user_id),
            KEY idx_order_id (order_id),
            KEY idx_product  (product_id),
            KEY idx_status   (status)
        ) $charset;"
		);

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_license_activations (
            id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            license_id   BIGINT UNSIGNED NOT NULL,
            domain       VARCHAR(255) NOT NULL DEFAULT '',
            ip_address   VARCHAR(45)  NOT NULL DEFAULT '',
            environment  ENUM('production','staging','local') NOT NULL DEFAULT 'production',
            activated_at DATETIME NOT NULL,
            last_check   DATETIME NULL DEFAULT NULL,
            PRIMARY KEY  (id),
            KEY idx_license_id (license_id),
            KEY idx_domain     (domain)
        ) $charset;"
		);

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_downloads (
            id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            order_id       BIGINT UNSIGNED NOT NULL DEFAULT 0,
            user_id        BIGINT UNSIGNED NOT NULL DEFAULT 0,
            product_id     BIGINT UNSIGNED NOT NULL DEFAULT 0,
            file_id        BIGINT UNSIGNED NOT NULL DEFAULT 0,
            token          VARCHAR(128) NOT NULL DEFAULT '',
            download_count INT UNSIGNED NOT NULL DEFAULT 0,
            max_downloads  INT UNSIGNED NOT NULL DEFAULT 3,
            expires_at     DATETIME NOT NULL,
            ip_address     VARCHAR(45) NOT NULL DEFAULT '',
            country_code   VARCHAR(2)  NOT NULL DEFAULT '',
            created_at     DATETIME NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY  token (token),
            KEY idx_order_user (order_id, user_id)
        ) $charset;"
		);

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_download_logs (
            id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            download_id   BIGINT UNSIGNED NOT NULL,
            ip_address    VARCHAR(45) NOT NULL DEFAULT '',
            user_agent    TEXT,
            country_code  VARCHAR(2)  NOT NULL DEFAULT '',
            downloaded_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            KEY idx_download_id (download_id),
            KEY idx_downloaded  (downloaded_at)
        ) $charset;"
		);

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_product_versions (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            product_id      BIGINT UNSIGNED NOT NULL,
            version         VARCHAR(20) NOT NULL DEFAULT '',
            file_path       TEXT        NOT NULL,
            checksum_sha256 VARCHAR(64) NOT NULL DEFAULT '',
            requires_wp     VARCHAR(10) NOT NULL DEFAULT '',
            tested_wp       VARCHAR(10) NOT NULL DEFAULT '',
            requires_php    VARCHAR(10) NOT NULL DEFAULT '',
            channel         ENUM('stable','beta') NOT NULL DEFAULT 'stable',
            changelog       LONGTEXT,
            released_at     DATETIME NOT NULL,
            PRIMARY KEY  (id),
            KEY idx_product_version (product_id, version),
            KEY idx_channel         (channel)
        ) $charset;"
		);

		// Subscriptions module tables (wp_purecart_subscriptions, _logs, _linked_entities,
		// _payments, _items, _revenue, _revenue_goals) — owned by Subscriptions\Schema,
		// per subscription-final-dev-plan.md § 9 Step 1. This supersedes the earlier
		// minimal purecart_subscriptions / purecart_subscription_logs definitions that
		// used to be inlined here.
		\PureCart\Subscriptions\Schema::create_tables();

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}purecart_saas_accounts (
            id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id        BIGINT UNSIGNED NOT NULL DEFAULT 0,
            order_id       BIGINT UNSIGNED NOT NULL DEFAULT 0,
            product_id     BIGINT UNSIGNED NOT NULL DEFAULT 0,
            plan           VARCHAR(50)  NOT NULL DEFAULT '',
            api_key        VARCHAR(128) NOT NULL DEFAULT '',
            status         ENUM('active','suspended','cancelled') NOT NULL DEFAULT 'active',
            provisioned_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY  api_key          (api_key),
            KEY idx_user_product (user_id, product_id)
        ) $charset;"
		);
	}

	/** Schedule recurring Action Scheduler jobs. */
	private static function schedule_jobs(): void {
		if ( false === as_next_scheduled_action( 'purecart_check_expired_licenses', array(), self::AS_GROUP ) ) {
			as_schedule_recurring_action(
				time(),
				DAY_IN_SECONDS,
				'purecart_check_expired_licenses',
				array(),
				self::AS_GROUP
			);
		}

		if ( false === as_next_scheduled_action( 'purecart_process_dunning', array(), self::AS_GROUP ) ) {
			as_schedule_recurring_action(
				time(),
				12 * HOUR_IN_SECONDS,
				'purecart_process_dunning',
				array(),
				self::AS_GROUP
			);
		}
	}

	/**
	 * Run a lightweight DB upgrade if the stored schema version is older than the current one.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function maybe_upgrade(): void {
		$stored = get_option( self::DB_VERSION_KEY, '0.0.0' );

		if ( version_compare( (string) $stored, self::DB_VERSION, '<' ) ) {
			self::create_tables();
			update_option( self::DB_VERSION_KEY, self::DB_VERSION );
		}
	}
}

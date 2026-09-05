<?php
/**
 * Plugin activation / deactivation — creates & upgrades custom DB tables.
 *
 * @package PureCart
 */

declare( strict_types=1 );

namespace PureCart;

use PureCart\Store\Licenses;
use PureCart\Store\LicenseActivations;
use PureCart\Store\LicenseTokens;
use PureCart\Store\Downloads;
use PureCart\Store\DownloadLogs;
use PureCart\Store\ProductVersions;
use PureCart\Store\SaasAccounts;
use PureCart\Store\Subscriptions;
use PureCart\Store\SubscriptionLinkedEntities;
use PureCart\Store\SubscriptionLogs;
use PureCart\Store\SubscriptionPayments;
use PureCart\Store\SubscriptionItems;
use PureCart\Store\SubscriptionRevenue;
use PureCart\Store\RevenueGoals;

defined( 'ABSPATH' ) || exit;

/**
 * Handles activation, deactivation, and DB schema.
 *
 * @since 1.0.0
 */
class Activator {

	/** DB version option key. */
	private const DB_VERSION_KEY = 'purecart_db_version';

	/** Current DB schema version. 1.4.2 — Secure Downloads columns, plus the download-log cleanup job. */
	private const DB_VERSION = '1.4.2';

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
		as_unschedule_all_actions( 'purecart_cleanup_expired_tokens', array(), self::AS_GROUP );
		as_unschedule_all_actions( 'purecart_cleanup_download_logs', array(), self::AS_GROUP );
		flush_rewrite_rules();
	}

	/**
	 * Create or upgrade all PureCart custom database tables.
	 *
	 * Each table is owned by its dedicated Store subclass in includes/Store/.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function create_tables(): void {
		( new Licenses() )->create();
		( new LicenseActivations() )->create();
		( new LicenseTokens() )->create();
		( new Downloads() )->create();
		( new DownloadLogs() )->create();
		( new ProductVersions() )->create();

		// Subscriptions module tables.
		( new Subscriptions() )->create();
		( new SubscriptionLinkedEntities() )->create();
		( new SubscriptionLogs() )->create();
		( new SubscriptionPayments() )->create();
		( new SubscriptionItems() )->create();
		( new SubscriptionRevenue() )->create();
		( new RevenueGoals() )->create();

		( new SaasAccounts() )->create();
	}

	/**
	 * Schedule recurring Action Scheduler jobs.
	 *
	 * Every branch is guarded by as_next_scheduled_action(), so this is safe
	 * to call more than once. Must not run before Action Scheduler has
	 * initialised — see maybe_upgrade().
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function schedule_jobs(): void {
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

		if ( false === as_next_scheduled_action( 'purecart_cleanup_expired_tokens', array(), self::AS_GROUP ) ) {
			as_schedule_recurring_action(
				time(),
				DAY_IN_SECONDS,
				'purecart_cleanup_expired_tokens',
				array(),
				self::AS_GROUP
			);
		}

		// Monthly: the download log only needs trimming to a retention window
		// measured in months, so a daily pass would be almost entirely no-ops.
		if ( false === as_next_scheduled_action( 'purecart_cleanup_download_logs', array(), self::AS_GROUP ) ) {
			as_schedule_recurring_action(
				time(),
				MONTH_IN_SECONDS,
				'purecart_cleanup_download_logs',
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

			// Jobs, not just tables: activate() is the only other caller of
			// schedule_jobs(), so a recurring job added in a plugin update
			// would never be scheduled on a site that simply updated in place
			// rather than deactivating and reactivating.
			//
			// Deferred rather than called here: this runs from Plugin::init()
			// on plugins_loaded, while Action Scheduler only initialises on
			// init. Scheduling before its data store exists fails silently —
			// the job simply never appears.
			add_action( 'action_scheduler_init', array( self::class, 'schedule_jobs' ) );

			update_option( self::DB_VERSION_KEY, self::DB_VERSION );
		}
	}
}

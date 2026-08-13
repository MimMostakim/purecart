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

	/** Current DB schema version. */
	private const DB_VERSION = '1.2.4';

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

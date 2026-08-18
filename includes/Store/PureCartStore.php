<?php
/**
 * Base class for all PureCart database table stores.
 *
 * Each concrete subclass owns exactly one custom table. The base class
 * handles the dbDelta() call and the require_once for upgrade.php, so
 * subclasses only have to return their CREATE TABLE SQL string.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Abstract base store — one subclass per custom database table.
 *
 * Usage:
 *   ( new MyFeatureStore() )->create();
 *
 * @since 1.0.0
 */
abstract class PureCartStore {

	/**
	 * Return the full CREATE TABLE SQL for this table.
	 *
	 * The string must be a valid dbDelta() statement — trailing semicolon
	 * required, two spaces before PRIMARY KEY, no trailing comma on the last
	 * column definition. The $charset argument must be appended after the
	 * closing parenthesis: `") $charset;"`.
	 *
	 * @since 1.0.0
	 * @param string $charset Result of $wpdb->get_charset_collate().
	 * @return string
	 */
	abstract protected function schema( string $charset ): string;

	/**
	 * Create or upgrade this store's table via dbDelta().
	 *
	 * Safe to call on every request — dbDelta() compares the existing table
	 * structure to the SQL and only alters columns / adds indexes when the
	 * schema has changed. No-op when the table is already up to date.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function create(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		dbDelta( $this->schema( $wpdb->get_charset_collate() ) );
	}
}

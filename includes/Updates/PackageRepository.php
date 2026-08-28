<?php
/**
 * All reads/writes for wp_purecart_product_versions.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * Data layer for update packages.
 *
 * `PureCart\Store\ProductVersions` owns the table's *shape* (it runs the
 * dbDelta CREATE TABLE); this class owns every query against it. Same split
 * the Subscriptions module uses between `Schema` and its `*Repository`
 * classes, so business logic never touches $wpdb directly.
 *
 * @since 1.0.0
 */
class PackageRepository {

	/** Release channels, ordered from most to least stable. */
	public const CHANNELS = array( 'stable', 'beta', 'nightly' );

	/**
	 * Which channels a subscriber to a given channel is allowed to see
	 * (RND-auto-updates.md § "Version Channels"): a beta tester still receives
	 * stable releases, a nightly tester receives everything.
	 *
	 * @var array<string, string[]>
	 */
	private const CHANNEL_VISIBILITY = array(
		'stable'  => array( 'stable' ),
		'beta'    => array( 'stable', 'beta' ),
		'nightly' => array( 'stable', 'beta', 'nightly' ),
	);

	/**
	 * Column => $wpdb format specifier for every settable column.
	 *
	 * @var array<string, string>
	 */
	private const COLUMN_FORMATS = array(
		'product_id'      => '%d',
		'version'         => '%s',
		'platform'        => '%s',
		'channel'         => '%s',
		'file_path'       => '%s',
		'file_size'       => '%d',
		'checksum_sha256' => '%s',
		'requires_wp'     => '%s',
		'tested_wp'       => '%s',
		'requires_php'    => '%s',
		'changelog'       => '%s',
		'release_notes'   => '%s',
		'is_active'       => '%d',
		'download_count'  => '%d',
		'released_at'     => '%s',
		'created_by'      => '%d',
	);

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'purecart_product_versions';
	}

	/**
	 * Keep only real columns, so a caller passing extra keys can't break the
	 * INSERT/UPDATE.
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $data Candidate column data.
	 * @return array<string, mixed>
	 */
	private function only_columns( array $data ): array {
		return array_intersect_key( $data, self::COLUMN_FORMATS );
	}

	/**
	 * @since 1.0.0
	 * @param array<string, mixed> $row Column data.
	 * @return string[]
	 */
	private function formats_for( array $row ): array {
		$formats = array();
		foreach ( array_keys( $row ) as $column ) {
			$formats[] = self::COLUMN_FORMATS[ $column ] ?? '%s';
		}
		return $formats;
	}

	// -----------------------------------------------------------------------
	// Writes
	// -----------------------------------------------------------------------

	/**
	 * Insert a package row.
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $data Column data; product_id, version and file_path are required.
	 * @return object|null The inserted row, or null on failure.
	 */
	public function create( array $data ): ?object {
		global $wpdb;

		foreach ( array( 'product_id', 'version', 'file_path' ) as $required ) {
			if ( empty( $data[ $required ] ) ) {
				return null;
			}
		}

		$row = $this->only_columns(
			array_merge(
				array(
					'platform'    => 'all',
					'channel'     => 'stable',
					'is_active'   => 1,
					'released_at' => current_time( 'mysql' ),
				),
				$data
			)
		);

		$row['channel']  = in_array( $row['channel'], self::CHANNELS, true ) ? $row['channel'] : 'stable';
		$row['platform'] = '' !== (string) $row['platform'] ? sanitize_text_field( (string) $row['platform'] ) : 'all';

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available.
		$inserted = $wpdb->insert( $this->table(), $row, $this->formats_for( $row ) );

		return $inserted ? $this->find( (int) $wpdb->insert_id ) : null;
	}

	/**
	 * Partially update a package row.
	 *
	 * @since 1.0.0
	 * @param int                  $id   Package row ID.
	 * @param array<string, mixed> $data Columns to change.
	 * @return bool
	 */
	public function update( int $id, array $data ): bool {
		global $wpdb;

		$row = $this->only_columns( $data );
		if ( ! $row ) {
			return false;
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table UPDATE; no WP API available.
		$updated = $wpdb->update( $this->table(), $row, array( 'id' => $id ), $this->formats_for( $row ), array( '%d' ) );

		return false !== $updated;
	}

	/**
	 * @since 1.0.0
	 * @param int $id Package row ID.
	 * @return bool
	 */
	public function delete( int $id ): bool {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table DELETE; no WP API available.
		return (bool) $wpdb->delete( $this->table(), array( 'id' => $id ), array( '%d' ) );
	}

	/**
	 * Increment a package's download counter.
	 *
	 * Done as a single atomic `SET download_count = download_count + 1`
	 * statement rather than read-modify-write: two concurrent downloads of a
	 * popular release would otherwise both read the same value and one
	 * increment would be lost.
	 *
	 * @since 1.0.0
	 * @param int $id Package row ID.
	 * @return bool
	 */
	public function increment_download_count( int $id ): bool {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Atomic counter increment on a custom table.
		return false !== $wpdb->query(
			$wpdb->prepare(
				"UPDATE {$this->table()} SET download_count = download_count + 1 WHERE id = %d",
				$id
			)
		);
	}

	// -----------------------------------------------------------------------
	// Reads
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @param int $id Package row ID.
	 * @return object|null
	 */
	public function find( int $id ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Package rows change on admin upload; a cached row could serve a withdrawn release.
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$this->table()} WHERE id = %d", $id ) ) ?: null;
	}

	/**
	 * Find one specific version of a product on one platform — the duplicate
	 * guard for uploads.
	 *
	 * @since 1.0.0
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $version    Version string.
	 * @param string $platform   Platform slug.
	 * @return object|null
	 */
	public function find_version( int $product_id, string $version, string $platform = 'all' ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Duplicate-upload guard; must see the row just inserted.
		return $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->table()} WHERE product_id = %d AND version = %s AND platform = %s LIMIT 1",
				$product_id,
				$version,
				$platform
			)
		) ?: null;
	}

	/**
	 * Every package for a product, newest release date first.
	 *
	 * Ordered by `released_at`, not by `version` — see version_sort() for why
	 * a SQL sort on the version string is wrong. This ordering is for the
	 * admin history table, where "most recently uploaded" is what an admin
	 * expects; update resolution uses get_latest() instead.
	 *
	 * @since 1.0.0
	 * @param int       $product_id  WooCommerce product ID.
	 * @param bool|null $active_only true = active only, false = inactive only, null = all.
	 * @return array<int, object>
	 */
	public function find_by_product( int $product_id, ?bool $active_only = null ): array {
		global $wpdb;

		if ( null === $active_only ) {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin version history; must reflect a just-uploaded package.
			return $wpdb->get_results(
				$wpdb->prepare( "SELECT * FROM {$this->table()} WHERE product_id = %d ORDER BY released_at DESC, id DESC", $product_id )
			) ?: array();
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- As above.
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->table()} WHERE product_id = %d AND is_active = %d ORDER BY released_at DESC, id DESC",
				$product_id,
				$active_only ? 1 : 0
			)
		) ?: array();
	}

	/**
	 * The newest package a customer on $channel/$platform is entitled to.
	 *
	 * Two rules the doc specifies, both implemented here rather than in SQL:
	 *
	 * 1. **Version ordering must use `version_compare()`, not SQL.** Sorting
	 *    the `version` column in MySQL is a string sort, which ranks '1.9.0'
	 *    above '1.10.0' — a store would stop shipping updates the moment it
	 *    released a double-digit minor. Rows are filtered in SQL and ordered
	 *    in PHP.
	 * 2. **Platform falls back to `all`.** An exact platform match wins; if a
	 *    product ships one universal package it is stored as `all` and every
	 *    platform resolves to it.
	 *
	 * @since 1.0.0
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $channel    Channel the requester is subscribed to.
	 * @param string $platform   Platform slug, or 'all'.
	 * @return object|null
	 */
	public function get_latest( int $product_id, string $channel = 'stable', string $platform = 'all' ): ?object {
		$visible = self::CHANNEL_VISIBILITY[ $channel ] ?? self::CHANNEL_VISIBILITY['stable'];

		$candidates = $this->find_active_in_channels( $product_id, $visible );
		if ( ! $candidates ) {
			return null;
		}

		// Exact platform first; only fall back to the universal package when
		// this product publishes nothing for the requested platform.
		$exact = array_values(
			array_filter(
				$candidates,
				static function ( $row ) use ( $platform ) {
					return (string) $row->platform === $platform;
				}
			)
		);

		if ( ! $exact && 'all' !== $platform ) {
			$exact = array_values(
				array_filter(
					$candidates,
					static function ( $row ) {
						return 'all' === (string) $row->platform;
					}
				)
			);
		}

		$pool = $exact ?: ( 'all' === $platform ? $candidates : array() );
		if ( ! $pool ) {
			return null;
		}

		return $this->version_sort( $pool )[0] ?? null;
	}

	/**
	 * Active packages for a product within a set of channels.
	 *
	 * @since 1.0.0
	 * @param int      $product_id WooCommerce product ID.
	 * @param string[] $channels   Channel names.
	 * @return array<int, object>
	 */
	private function find_active_in_channels( int $product_id, array $channels ): array {
		global $wpdb;

		$channels = array_values( array_intersect( $channels, self::CHANNELS ) );
		if ( ! $channels ) {
			return array();
		}

		// Placeholders are generated from a whitelist-filtered array, so the
		// count is bounded and every value is still bound through prepare().
		$placeholders = implode( ',', array_fill( 0, count( $channels ), '%s' ) );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $placeholders is a generated %s list, never user input; all values are bound below.
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->table()}
                  WHERE product_id = %d AND is_active = 1 AND channel IN ( {$placeholders} )",
				array_merge( array( $product_id ), $channels )
			)
		) ?: array();
	}

	/**
	 * Sort package rows newest-version-first using PHP's version_compare(),
	 * which understands WordPress-style ('1.0.0-beta.1'), semver, and
	 * four-part version strings.
	 *
	 * @since 1.0.0
	 * @param array<int, object> $rows Package rows.
	 * @return array<int, object>
	 */
	public function version_sort( array $rows ): array {
		usort(
			$rows,
			static function ( $a, $b ) {
				$cmp = version_compare( (string) $b->version, (string) $a->version );
				// Same version on two rows (e.g. re-upload): newest row wins.
				return 0 !== $cmp ? $cmp : ( (int) $b->id <=> (int) $a->id );
			}
		);

		return $rows;
	}
}

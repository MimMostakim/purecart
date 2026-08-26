<?php
/**
 * Records and reports which release each activated site is running.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * "Update adoption rate" needs something no other part of the module stored:
 * the version each customer site is *currently running*. Update checks were
 * deliberately stateless — the signed-token design exists precisely so the
 * server need not write a row per check — so the reported version is recorded
 * on the one row that already represents a licence-plus-site pair,
 * `purecart_license_activations`, rather than in a new per-check log.
 *
 * That keeps the write to a single UPDATE on an existing row, and keeps the
 * data bounded by the number of activated sites rather than by how often they
 * poll (every site checks twice a day; a per-check log would grow by tens of
 * thousands of rows a week and describe nothing the latest row doesn't).
 *
 * @since 1.0.0
 */
class AdoptionRepository {

	/**
	 * @since 1.0.0
	 * @return string
	 */
	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'purecart_license_activations';
	}

	/**
	 * Note the version a site reported during an update check.
	 *
	 * Only updates rows that already exist — an update check is not an
	 * activation, so it must never create one. A customer who has not run the
	 * activation flow simply contributes nothing to adoption figures rather
	 * than silently consuming one of their activation slots.
	 *
	 * @since 1.0.0
	 * @param int    $license_id License row ID.
	 * @param string $domain     Normalised domain.
	 * @param string $version    Version the site reported running.
	 * @return bool Whether a row was updated.
	 */
	public function record( int $license_id, string $domain, string $version ): bool {
		global $wpdb;

		if ( $license_id <= 0 || '' === $domain || '' === $version ) {
			return false;
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Telemetry write on a custom table; no WP API available.
		$updated = $wpdb->update(
			$this->table(),
			array(
				'reported_version' => substr( $version, 0, 32 ),
				'last_check'       => current_time( 'mysql' ),
			),
			array(
				'license_id' => $license_id,
				'domain'     => $domain,
			),
			array( '%s', '%s' ),
			array( '%d', '%s' )
		);

		return (bool) $updated;
	}

	/**
	 * Version distribution across all activated sites for a product.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return array<int, object> Rows of { version, sites }, most-used first.
	 */
	public function distribution( int $product_id ): array {
		global $wpdb;

		$licenses = $wpdb->prefix . 'purecart_licenses';

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reporting aggregate over custom tables.
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT a.reported_version AS version, COUNT(*) AS sites
                   FROM {$this->table()} a
                   INNER JOIN {$licenses} l ON l.id = a.license_id
                  WHERE l.product_id = %d
                    AND a.reported_version <> ''
               GROUP BY a.reported_version
               ORDER BY sites DESC",
				$product_id
			)
		) ?: array();
	}

	/**
	 * How many activated sites have reported in at all for a product.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return int
	 */
	public function reporting_sites( int $product_id ): int {
		global $wpdb;

		$licenses = $wpdb->prefix . 'purecart_licenses';

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reporting aggregate over custom tables.
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*)
                   FROM {$this->table()} a
                   INNER JOIN {$licenses} l ON l.id = a.license_id
                  WHERE l.product_id = %d AND a.reported_version <> ''",
				$product_id
			)
		);
	}

	/**
	 * Share of reporting sites already on $version, as a percentage.
	 *
	 * Deliberately measured against *reporting* sites, not against all licences
	 * sold: a licence that was never activated, or belongs to a site that has
	 * been offline for a year, says nothing about whether the latest release is
	 * being adopted, and counting it would permanently depress the figure for
	 * reasons unrelated to the release.
	 *
	 * @since 1.0.0
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $version    Version to measure.
	 * @return float 0.0-100.0, rounded to one decimal.
	 */
	public function adoption_rate( int $product_id, string $version ): float {
		if ( '' === $version ) {
			return 0.0;
		}

		$total = $this->reporting_sites( $product_id );
		if ( $total <= 0 ) {
			return 0.0;
		}

		$on_version = 0;
		foreach ( $this->distribution( $product_id ) as $row ) {
			if ( version_compare( (string) $row->version, $version, '>=' ) ) {
				$on_version += (int) $row->sites;
			}
		}

		return round( ( $on_version / $total ) * 100, 1 );
	}
}

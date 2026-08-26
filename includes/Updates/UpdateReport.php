<?php
/**
 * Admin-facing reporting for the Updates module.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * Feeds the admin Update Manager screen: which products distribute updates,
 * what their latest release is per channel, how often each version has been
 * downloaded, and how widely the newest release has actually been adopted.
 *
 * Read-only and hookless, like `Subscriptions\SubscriptionReport` — the REST
 * layer owns the capability check, and every figure here is site-wide.
 *
 * @since 1.0.0
 */
class UpdateReport {

	/** @var PackageRepository */
	private PackageRepository $packages;

	/** @var AdoptionRepository */
	private AdoptionRepository $adoption;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->packages = new PackageRepository();
		$this->adoption = new AdoptionRepository();
	}

	/**
	 * Every product that distributes updates, with its release summary.
	 *
	 * @since 1.0.0
	 * @return array<int, array<string, mixed>>
	 */
	public function products(): array {
		$rows = array();

		foreach ( $this->update_enabled_product_ids() as $product_id ) {
			$rows[] = $this->product_summary( $product_id );
		}

		return $rows;
	}

	/**
	 * Summary for one product.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return array<string, mixed>
	 */
	public function product_summary( int $product_id ): array {
		$all      = $this->packages->find_by_product( $product_id );
		$product  = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;
		$latest   = $this->packages->get_latest( $product_id, 'stable' );
		$version  = $latest ? (string) $latest->version : '';

		$downloads = 0;
		$channels  = array_fill_keys( PackageRepository::CHANNELS, null );

		foreach ( $all as $row ) {
			$downloads += (int) $row->download_count;
		}

		foreach ( PackageRepository::CHANNELS as $channel ) {
			$newest = $this->packages->get_latest( $product_id, $channel );
			// get_latest( 'beta' ) also returns stable releases by design, so
			// only report a channel when its own newest release really belongs
			// to it — otherwise every product would look like it ships beta.
			$channels[ $channel ] = ( $newest && $channel === (string) $newest->channel ) ? (string) $newest->version : null;
		}

		return array(
			'product_id'      => $product_id,
			'product_name'    => $product ? $product->get_name() : get_the_title( $product_id ),
			'slug'            => (string) get_post_meta( $product_id, ProductLocator::SLUG_META, true ),
			'type'            => (string) ( get_post_meta( $product_id, ProductLocator::TYPE_META, true ) ?: 'wp-plugin' ),
			'requires_license' => ( new LicenseGate() )->requires_license( $product_id ),
			'latest_version'  => $version,
			'latest_released' => $latest ? (string) $latest->released_at : '',
			'channels'        => $channels,
			'version_count'   => count( $all ),
			'active_count'    => count( $this->packages->find_by_product( $product_id, true ) ),
			'total_downloads' => $downloads,
			'reporting_sites' => $this->adoption->reporting_sites( $product_id ),
			'adoption_rate'   => $this->adoption->adoption_rate( $product_id, $version ),
		);
	}

	/**
	 * Full version history for a product, shaped for an admin table.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return array<int, array<string, mixed>>
	 */
	public function versions( int $product_id ): array {
		$rows = array();

		foreach ( $this->packages->find_by_product( $product_id ) as $row ) {
			$rows[] = array(
				'id'             => (int) $row->id,
				'version'        => (string) $row->version,
				'channel'        => (string) $row->channel,
				'platform'       => (string) $row->platform,
				'file_size'      => (int) $row->file_size,
				'checksum'       => 'sha256:' . (string) $row->checksum_sha256,
				'requires_wp'    => (string) $row->requires_wp,
				'tested_wp'      => (string) $row->tested_wp,
				'requires_php'   => (string) $row->requires_php,
				'is_active'      => (bool) (int) $row->is_active,
				'download_count' => (int) $row->download_count,
				'released_at'    => (string) $row->released_at,
				// Never the on-disk path: it is not useful to a client and
				// exposing it would undo the randomised-filename protection.
			);
		}

		return $rows;
	}

	/**
	 * Version distribution across reporting sites.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return array<int, array<string, mixed>>
	 */
	public function adoption( int $product_id ): array {
		$total = $this->adoption->reporting_sites( $product_id );
		$rows  = array();

		foreach ( $this->adoption->distribution( $product_id ) as $row ) {
			$rows[] = array(
				'version' => (string) $row->version,
				'sites'   => (int) $row->sites,
				'share'   => $total > 0 ? round( ( (int) $row->sites / $total ) * 100, 1 ) : 0.0,
			);
		}

		return $rows;
	}

	/**
	 * Product IDs that have a non-empty update slug.
	 *
	 * @since 1.0.0
	 * @return int[]
	 */
	private function update_enabled_product_ids(): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin listing over a meta key; must reflect a slug saved moments ago.
		$ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT pm.post_id
                   FROM {$wpdb->postmeta} pm
                   INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                  WHERE pm.meta_key = %s
                    AND pm.meta_value <> ''
                    AND p.post_type = 'product'
                    AND p.post_status IN ( 'publish', 'private', 'draft' )
               ORDER BY p.post_title ASC",
				ProductLocator::SLUG_META
			)
		);

		return array_map( 'intval', (array) $ids );
	}
}

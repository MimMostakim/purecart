<?php
/**
 * Emails licence holders when a new version is published.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * Listens for `purecart_update_package_published` and fans the notification
 * out through Action Scheduler in batches (RND-auto-updates.md §
 * "Customer Email Notification").
 *
 * Emailing every licence holder inline would time out the request that
 * published the release — a store with 10,000 customers would leave the
 * admin's browser hanging and abort partway, having emailed an arbitrary
 * fraction of them with no record of which.
 *
 * @since 1.0.0
 */
class UpdateNotifier {

	/** Action Scheduler hook processing one batch. */
	public const BATCH_HOOK = 'purecart_send_update_notification_batch';

	/** Action Scheduler group shared by the whole plugin. */
	private const AS_GROUP = 'purecart';

	/** Licence holders per batch. */
	private const BATCH_SIZE = 100;

	/** Product meta gating notifications. */
	private const NOTIFY_META = '_purecart_update_notify_customers';

	/** @var PackageRepository */
	private PackageRepository $packages;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->packages = new PackageRepository();

		add_action( 'purecart_update_package_published', array( $this, 'on_package_published' ), 10, 3 );
		add_action( self::BATCH_HOOK, array( $this, 'process_batch' ), 10, 2 );
	}

	/**
	 * Queue notification batches for a freshly published package.
	 *
	 * @since 1.0.0
	 * @param int    $package_id Package row ID.
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $version    Version string.
	 * @return int Number of batches queued.
	 */
	public function on_package_published( int $package_id, int $product_id, string $version ): int {
		if ( ! $this->should_notify( $package_id, $product_id ) ) {
			return 0;
		}

		$user_ids = $this->notifiable_user_ids( $product_id );
		if ( ! $user_ids ) {
			return 0;
		}

		$batches = array_chunk( $user_ids, self::BATCH_SIZE );

		foreach ( $batches as $index => $batch ) {
			// Each job carries its own explicit list of user IDs rather than an
			// offset. An offset-paginated job set drifts if a licence is sold
			// or revoked while the queue is draining — rows shift and some
			// customers get emailed twice while others are skipped entirely.
			// It also makes every job independent, so one failure doesn't
			// silently truncate the run.
			as_schedule_single_action(
				time() + $index,
				self::BATCH_HOOK,
				array( $package_id, array_values( $batch ) ),
				self::AS_GROUP
			);
		}

		return count( $batches );
	}

	/**
	 * Whether this release should notify anyone.
	 *
	 * @since 1.0.0
	 * @param int $package_id Package row ID.
	 * @param int $product_id WooCommerce product ID.
	 * @return bool
	 */
	private function should_notify( int $package_id, int $product_id ): bool {
		$package = $this->packages->find( $package_id );

		if ( ! $package || ! (int) $package->is_active ) {
			return false;
		}

		// Only stable releases are announced. A beta or nightly build exists
		// for the handful of testers who opted into that channel; mailing the
		// entire customer base about a build almost none of them can even
		// download would be both noise and a support burden.
		if ( 'stable' !== (string) $package->channel ) {
			return false;
		}

		$meta = get_post_meta( $product_id, self::NOTIFY_META, true );

		/**
		 * Filters whether a published package notifies licence holders.
		 *
		 * @since 1.0.0
		 * @param bool $notify     Whether to notify.
		 * @param int  $package_id Package row ID.
		 * @param int  $product_id WooCommerce product ID.
		 */
		return (bool) apply_filters(
			'purecart_update_should_notify',
			'' === $meta || ! in_array( $meta, array( 'no', '0', 0, false ), true ),
			$package_id,
			$product_id
		);
	}

	/**
	 * Distinct customers holding a usable licence for this product.
	 *
	 * Deduplicated by user, not by licence: a customer who bought two seats of
	 * the same product holds two licence rows and should still receive one
	 * email, not two.
	 *
	 * Expired and revoked licences are excluded — those customers cannot
	 * download the release even if they are told about it, so the email would
	 * only produce a failed download and a support ticket.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return int[]
	 */
	public function notifiable_user_ids( int $product_id ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-off recipient list built at release time; caching would risk mailing a stale audience.
		$user_ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT user_id
                   FROM {$wpdb->prefix}purecart_licenses
                  WHERE product_id = %d
                    AND status = 'active'
                    AND user_id > 0
                    AND ( expires_at IS NULL OR expires_at > %s )",
				$product_id,
				current_time( 'mysql' )
			)
		);

		return array_map( 'intval', (array) $user_ids );
	}

	/**
	 * Action Scheduler callback: email one batch of customers.
	 *
	 * @since 1.0.0
	 * @param int   $package_id Package row ID.
	 * @param int[] $user_ids   Customers in this batch.
	 * @return void
	 */
	public function process_batch( $package_id, $user_ids = array() ): void {
		$package = $this->packages->find( (int) $package_id );

		// The release may have been withdrawn or deleted between queueing and
		// running — announcing it now would send customers after a download
		// that is going to refuse them.
		if ( ! $package || ! (int) $package->is_active ) {
			return;
		}

		foreach ( (array) $user_ids as $user_id ) {
			/**
			 * Fires once per customer who should hear about a new version.
			 *
			 * `Updates\Emails\UpdateAvailableEmail` listens here.
			 *
			 * @since 1.0.0
			 * @param int $user_id    WordPress user ID.
			 * @param int $package_id Package row ID.
			 */
			do_action( 'purecart_update_available_email', (int) $user_id, (int) $package->id );
		}
	}
}

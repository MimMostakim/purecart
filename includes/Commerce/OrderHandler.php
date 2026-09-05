<?php
/**
 * Handles WooCommerce order events to provision licenses, downloads, and SaaS accounts.
 *
 * @package PureCart\Commerce
 */

declare( strict_types=1 );

namespace PureCart\Commerce;

defined( 'ABSPATH' ) || exit;

use PureCart\Licensing\LicenseGenerator;
use PureCart\Downloads\TokenManager;
use PureCart\SaaS\AccountProvisioner;
use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

/**
 * Hooks into WooCommerce order lifecycle.
 */
class OrderHandler {

	/**
	 * Register order lifecycle and Action Scheduler hooks.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		// Which order status triggers provisioning is configurable — see
		// OptionKeys::LICENSE_DELIVERY_STATUS. on_order_complete() is
		// idempotent (skips items already carrying license order-item meta),
		// so 'both' can safely fire on either transition without double-issuing keys.
		$delivery_status = Settings::get( OptionKeys::LICENSE_DELIVERY_STATUS, 'completed' );
		if ( in_array( $delivery_status, array( 'completed', 'both' ), true ) ) {
			add_action( 'woocommerce_order_status_completed', array( $this, 'on_order_complete' ), 10, 1 );
		}
		if ( in_array( $delivery_status, array( 'processing', 'both' ), true ) ) {
			add_action( 'woocommerce_order_status_processing', array( $this, 'on_order_complete' ), 10, 1 );
		}

		// Download tokens run on their own trigger, deliberately: plenty of
		// stores hand over the file the moment payment clears but only issue
		// the license key once the order is marked completed. Like
		// on_order_complete(), issue_downloads() is idempotent, so 'both' can
		// safely fire on either transition.
		$download_status = Settings::get( OptionKeys::DOWNLOAD_TRIGGER_STATUS, 'completed' );
		if ( in_array( $download_status, array( 'completed', 'both' ), true ) ) {
			add_action( 'woocommerce_order_status_completed', array( $this, 'issue_downloads' ), 10, 1 );
		}
		if ( in_array( $download_status, array( 'processing', 'both' ), true ) ) {
			add_action( 'woocommerce_order_status_processing', array( $this, 'issue_downloads' ), 10, 1 );
		}

		add_action( 'woocommerce_order_status_refunded', array( $this, 'on_order_refunded' ), 10, 1 );
		add_action( 'woocommerce_order_status_cancelled', array( $this, 'on_order_cancelled' ), 10, 1 );
		add_action( 'woocommerce_subscription_status_cancelled', array( $this, 'on_subscription_cancelled' ), 10, 1 );

		// Action Scheduler handlers.
		add_action( 'purecart_check_expired_licenses', array( $this, 'expire_licenses' ) );
		add_action( 'purecart_process_dunning', array( $this, 'run_dunning' ) );
	}

	/**
	 * Provision licenses and SaaS accounts when an order is completed.
	 *
	 * Download tokens are issued separately by {@see self::issue_downloads()},
	 * which runs on its own configurable order status.
	 *
	 * @since  1.0.0
	 * @param  int $order_id WooCommerce order ID.
	 * @return void
	 */
	public function on_order_complete( int $order_id ): void {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		foreach ( $order->get_items() as $item ) {
			/**
			 * Current order item — typed for IDE assistance.
			 *
			 * @var \WC_Order_Item_Product $item
			 */
			$product = $item->get_product();
			if ( ! $product ) {
				continue;
			}

			$product_id = $product->get_id();
			$user_id    = (int) $order->get_customer_id();
			$type       = $product->get_type();
			$item_id    = $item->get_id();

			if ( in_array( $type, array( 'purecart_plugin', 'purecart_saas', 'purecart_bundle' ), true ) ) {
				// Idempotency guard: with LICENSE_DELIVERY_STATUS = 'both' this
				// method runs on both the processing and completed transitions —
				// don't re-issue keys for an item that already has one.
				if ( ! $item->get_meta( '_purecart_license_id', true ) ) {
					$quantity = max( 1, $item->get_quantity() );
					for ( $i = 0; $i < $quantity; $i++ ) {
						$license = ( new LicenseGenerator() )->create( $order_id, $user_id, $product_id );
						if ( ! $license ) {
							continue;
						}

						// One key per unit — first key also gets the bare
						// `_purecart_license_id` key so single-qty purchases
						// (the overwhelming majority) stay a simple lookup.
						$meta_key = 0 === $i ? '_purecart_license_id' : '_purecart_license_id_' . $i;
						wc_add_order_item_meta( $item_id, $meta_key, $license->id );
					}
				}
			}

			if ( 'purecart_saas' === $type ) {
				( new AccountProvisioner() )->provision( $order_id, $user_id, $product_id );
			}
		}

		do_action( 'purecart_order_provisioned', $order_id );
	}

	/**
	 * Issue secure download tokens for every downloadable file in an order.
	 *
	 * Membership of a PureCart product type is not the test — whether the
	 * product actually carries files is. A plain WooCommerce downloadable
	 * product bought from a PureCart store should be protected by the same
	 * expiring, counted, revocable links as a PureCart plugin.
	 *
	 * @since  1.0.0
	 * @param  int $order_id WooCommerce order ID.
	 * @return void
	 */
	public function issue_downloads( int $order_id ): void {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		$manager = new TokenManager();

		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof \WC_Order_Item_Product ) {
				continue;
			}

			$manager->create_for_order_item( $item );
		}

		do_action( 'purecart_order_downloads_issued', $order_id );
	}

	/**
	 * Suspend licenses and SaaS accounts, and revoke download links, when an
	 * order is refunded.
	 *
	 * @since  1.0.0
	 * @param  int $order_id WooCommerce order ID.
	 * @return void
	 */
	public function on_order_refunded( int $order_id ): void {
		$this->suspend_by_order( $order_id, 'refunded' );
		( new TokenManager() )->revoke_by_order( $order_id );
		do_action( 'purecart_order_refunded', $order_id );
	}

	/**
	 * Suspend licenses and SaaS accounts, and revoke download links, when an
	 * order is cancelled.
	 *
	 * @since  1.0.0
	 * @param  int $order_id WooCommerce order ID.
	 * @return void
	 */
	public function on_order_cancelled( int $order_id ): void {
		$this->suspend_by_order( $order_id, 'cancelled' );
		( new TokenManager() )->revoke_by_order( $order_id );
		do_action( 'purecart_order_cancelled', $order_id );
	}

	/**
	 * Fire the cancellation hook when a WooCommerce Subscription is cancelled.
	 *
	 * @since  1.0.0
	 * @param  mixed $subscription Subscription object or ID.
	 * @return void
	 */
	public function on_subscription_cancelled( mixed $subscription ): void {
		$sub_id = is_object( $subscription ) ? $subscription->get_id() : (int) $subscription;
		do_action( 'purecart_subscription_cancelled', $sub_id );
	}

	/**
	 * Action Scheduler job: mark overdue licenses as expired.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function expire_licenses(): void {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Expiry check must be real-time; caching would miss newly expired licenses.
		$expired = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT id FROM {$wpdb->prefix}purecart_licenses
                  WHERE status = 'active'
                    AND expires_at IS NOT NULL
                    AND expires_at < %s",
				current_time( 'mysql' )
			)
		);

		foreach ( $expired as $id ) {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Status update on custom table; must be real-time.
			$wpdb->update(
				$wpdb->prefix . 'purecart_licenses',
				array(
					'status'     => 'expired',
					'updated_at' => current_time( 'mysql' ),
				),
				array( 'id' => $id ),
				array( '%s', '%s' ),
				array( '%d' )
			);

			do_action( 'purecart_license_expired', (int) $id );
		}

		if ( ! empty( $expired ) ) {
			// Batch hook — RND-licensing.md documents this shape (array of ids)
			// for the Subscriptions module and the JWT token revoker.
			do_action( 'purecart_licenses_expired', array_map( 'intval', $expired ) );
		}
	}

	/**
	 * Action Scheduler job: run the dunning / payment-retry process.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function run_dunning(): void {
		do_action( 'purecart_dunning_processed' );
	}

	/**
	 * Suspend licenses and SaaS accounts associated with an order.
	 *
	 * @since  1.0.0
	 * @param  int    $order_id WooCommerce order ID.
	 * @param  string $reason   Reason string passed to the action hook.
	 * @return void
	 */
	private function suspend_by_order( int $order_id, string $reason ): void {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Bulk status update on refund/cancellation; must be immediate.
		$wpdb->update(
			$wpdb->prefix . 'purecart_licenses',
			array(
				'status'     => 'suspended',
				'updated_at' => current_time( 'mysql' ),
			),
			array( 'order_id' => $order_id ),
			array( '%s', '%s' ),
			array( '%d' )
		);

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Bulk status update on refund/cancellation; must be immediate.
		$wpdb->update(
			$wpdb->prefix . 'purecart_saas_accounts',
			array( 'status' => 'suspended' ),
			array( 'order_id' => $order_id ),
			array( '%s' ),
			array( '%d' )
		);

		do_action( 'purecart_order_suspended', $order_id, $reason );
	}
}

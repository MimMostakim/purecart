<?php
/**
 * WP-CLI commands for the Licensing module.
 *
 * @package PureCart\CLI
 */

declare( strict_types=1 );

namespace PureCart\CLI;

use PureCart\Licensing\LicenseGenerator;

defined( 'ABSPATH' ) || exit;

/**
 * `wp purecart license ...` commands.
 *
 * @since 1.0.0
 */
class LicenseCommands {

	/**
	 * Generate license keys for completed orders placed before the plugin
	 * (or a licensable product) existed — the "Past-Order Retroactive Key
	 * Generation" tool from RND-licensing.md.
	 *
	 * ## OPTIONS
	 *
	 * [--product-id=<id>]
	 * : Only orders containing this product.
	 *
	 * [--date-from=<date>]
	 * : Only orders placed on or after this date (Y-m-d).
	 *
	 * [--date-to=<date>]
	 * : Only orders placed on or before this date (Y-m-d).
	 *
	 * [--status=<status>]
	 * : Order status to scan. Default: completed.
	 *
	 * [--dry-run]
	 * : List what would be generated without writing anything.
	 *
	 * ## EXAMPLES
	 *
	 *     wp purecart license generate-past-orders --product-id=123 --dry-run
	 *     wp purecart license generate-past-orders --product-id=123
	 *
	 * @since 1.0.0
	 * @param array<int,string>   $args       Positional arguments (unused).
	 * @param array<string,mixed> $assoc_args Named arguments.
	 * @return void
	 */
	public function generate_past_orders( array $args, array $assoc_args ): void {
		$product_id = isset( $assoc_args['product-id'] ) ? (int) $assoc_args['product-id'] : 0;
		$dry_run    = isset( $assoc_args['dry-run'] );

		$query_args = array(
			'status' => $assoc_args['status'] ?? 'completed',
			'limit'  => -1,
			'return' => 'ids',
		);

		if ( ! empty( $assoc_args['date-from'] ) || ! empty( $assoc_args['date-to'] ) ) {
			$query_args['date_created'] = sprintf(
				'%s...%s',
				$assoc_args['date-from'] ?? '',
				$assoc_args['date-to'] ?? ''
			);
		}

		if ( $product_id > 0 ) {
			$query_args['product_id'] = $product_id;
		}

		$order_ids = wc_get_orders( $query_args );

		$generated = 0;
		$skipped   = 0;

		foreach ( $order_ids as $order_id ) {
			$order = wc_get_order( $order_id );
			if ( ! $order ) {
				continue;
			}

			foreach ( $order->get_items() as $item ) {
				/**
				 * Current order item.
				 *
				 * @var \WC_Order_Item_Product $item
				 */
				$product = $item->get_product();
				if ( ! $product ) {
					continue;
				}

				if ( $product_id > 0 && $product->get_id() !== $product_id ) {
					continue;
				}

				if ( ! in_array( $product->get_type(), array( 'purecart_plugin', 'purecart_saas', 'purecart_bundle' ), true ) ) {
					continue;
				}

				// Idempotent — never re-issue a key for an item that already has one.
				if ( $item->get_meta( '_purecart_license_id', true ) ) {
					++$skipped;
					continue;
				}

				if ( $dry_run ) {
					\WP_CLI::log(
						sprintf(
							'Would generate license — order #%d, product #%d, customer #%d',
							$order_id,
							$product->get_id(),
							(int) $order->get_customer_id()
						)
					);
					++$generated;
					continue;
				}

				$license = ( new LicenseGenerator() )->create( $order_id, (int) $order->get_customer_id(), $product->get_id() );
				if ( ! $license ) {
					continue;
				}

				wc_add_order_item_meta( $item->get_id(), '_purecart_license_id', $license->id );

				do_action( 'purecart_license_past_order_generated', $license->id, $order_id, $product->get_id() );

				++$generated;
			}
		}

		\WP_CLI::success(
			sprintf(
				'%s %d license(s) (%d order-item(s) already had one and were skipped).',
				$dry_run ? 'Would generate' : 'Generated',
				$generated,
				$skipped
			)
		);
	}
}

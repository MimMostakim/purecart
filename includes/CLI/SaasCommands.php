<?php
/**
 * WP-CLI commands for the SaaS Provisioning module.
 *
 * @package PureCart\CLI
 */

declare( strict_types=1 );

namespace PureCart\CLI;

use PureCart\SaaS\AccountProvisioner;

defined( 'ABSPATH' ) || exit;

/**
 * `wp purecart saas ...` commands.
 *
 * @since 1.0.0
 */
class SaasCommands {

	/**
	 * Provision SaaS accounts for completed orders placed before the plugin
	 * (or a purecart_saas product) existed — mirrors
	 * LicenseCommands::generate_past_orders().
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
	 * : List what would be provisioned without writing anything.
	 *
	 * ## EXAMPLES
	 *
	 *     wp purecart saas provision-past-orders --product-id=123 --dry-run
	 *     wp purecart saas provision-past-orders --product-id=123
	 *
	 * @since 1.0.0
	 * @param array<int,string>   $args       Positional arguments (unused).
	 * @param array<string,mixed> $assoc_args Named arguments.
	 * @return void
	 */
	public function provision_past_orders( array $args, array $assoc_args ): void {
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

		$order_ids   = wc_get_orders( $query_args );
		$provisioner = new AccountProvisioner();

		$provisioned = 0;
		$skipped     = 0;

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

				if ( 'purecart_saas' !== $product->get_type() ) {
					continue;
				}

				// Idempotent — provision_for_order_item() itself checks
				// _purecart_saas_account_id, but the dry-run path needs to
				// report the same skip decision without calling it.
				if ( $item->get_meta( '_purecart_saas_account_id', true ) ) {
					++$skipped;
					continue;
				}

				if ( $dry_run ) {
					\WP_CLI::log(
						sprintf(
							'Would provision SaaS account — order #%d, product #%d, customer #%d',
							$order_id,
							$product->get_id(),
							(int) $order->get_customer_id()
						)
					);
					++$provisioned;
					continue;
				}

				$account = $provisioner->provision_for_order_item(
					$item,
					$order_id,
					(int) $order->get_customer_id(),
					$product->get_id()
				);

				if ( ! $account ) {
					continue;
				}

				do_action( 'purecart_saas_past_order_provisioned', $account->id, $order_id, $product->get_id() );

				++$provisioned;
			}
		}

		\WP_CLI::success(
			sprintf(
				'%s %d SaaS account(s) (%d order-item(s) already had one and were skipped).',
				$dry_run ? 'Would provision' : 'Provisioned',
				$provisioned,
				$skipped
			)
		);
	}
}

<?php
/**
 * Provisions SaaS accounts when WooCommerce orders are completed.
 *
 * @package PureCart\SaaS
 */

declare( strict_types=1 );

namespace PureCart\SaaS;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Manages the purecart_saas_accounts table and webhook calls.
 */
class AccountProvisioner {

	/**
	 * Provision a SaaS account for one order item, guarding against
	 * re-provisioning when this runs more than once for the same item
	 * (e.g. LICENSE_DELIVERY_STATUS = 'both' firing on both the processing
	 * and completed transitions).
	 *
	 * The resulting account ID is stored on the order item as
	 * `_purecart_saas_account_id` so a repeat call — and any code that later
	 * needs "the SaaS account for this line item" (refund, admin lookup) —
	 * can resolve it directly instead of re-deriving it from order_id, which
	 * breaks once an order contains more than one purecart_saas item.
	 *
	 * @since  1.0.0
	 * @param  \WC_Order_Item_Product $item       The order line item being provisioned.
	 * @param  int                    $order_id   WooCommerce order ID.
	 * @param  int                    $user_id    WordPress user ID of the customer.
	 * @param  int                    $product_id WooCommerce product ID.
	 * @return object|null             The account row (existing or newly created), or null on failure.
	 */
	public function provision_for_order_item( \WC_Order_Item_Product $item, int $order_id, int $user_id, int $product_id ): ?object {
		$existing_id = (int) $item->get_meta( '_purecart_saas_account_id', true );

		if ( $existing_id > 0 ) {
			$existing = $this->get_by_id( $existing_id );
			if ( $existing ) {
				return $existing;
			}
			// Meta pointed at a row that no longer exists — fall through and provision fresh.
		}

		$account = $this->create_account( $order_id, $user_id, $product_id );

		if ( $account ) {
			wc_add_order_item_meta( $item->get_id(), '_purecart_saas_account_id', $account->id );
		}

		return $account;
	}

	/**
	 * Create a SaaS account record and fire the provisioning webhook.
	 *
	 * @deprecated 1.0.0 Use provision_for_order_item() so the account is
	 *             idempotency-guarded and linked back to its order item.
	 *             Kept for any external callers that already depend on this
	 *             signature; it does not guard against duplicate calls.
	 *
	 * @since  1.0.0
	 * @param  int $order_id   WooCommerce order ID.
	 * @param  int $user_id    WordPress user ID of the customer.
	 * @param  int $product_id WooCommerce product ID.
	 * @return object|null             The inserted account row, or null on failure.
	 */
	public function provision( int $order_id, int $user_id, int $product_id ): ?object {
		return $this->create_account( $order_id, $user_id, $product_id );
	}

	/**
	 * Insert a new SaaS account row, fire the provisioning webhook, and the
	 * `purecart_saas_provisioned` action. Shared by provision_for_order_item()
	 * and the deprecated provision() shim.
	 *
	 * @since  1.0.0
	 * @param  int $order_id   WooCommerce order ID.
	 * @param  int $user_id    WordPress user ID of the customer.
	 * @param  int $product_id WooCommerce product ID.
	 * @return object|null     The inserted account row, or null on failure.
	 */
	private function create_account( int $order_id, int $user_id, int $product_id ): ?object {
		global $wpdb;

		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return null;
		}

		$plan    = $product->get_meta( '_purecart_saas_plan' ) ?: 'starter';
		$api_key = ( new ApiKeyManager() )->generate();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available.
		$inserted = $wpdb->insert(
			$wpdb->prefix . 'purecart_saas_accounts',
			array(
				'user_id'        => $user_id,
				'order_id'       => $order_id,
				'product_id'     => $product_id,
				'plan'           => $plan,
				'api_key'        => $api_key,
				'status'         => 'active',
				'provisioned_at' => current_time( 'mysql' ),
			),
			array( '%d', '%d', '%d', '%s', '%s', '%s', '%s' )
		);

		if ( ! $inserted ) {
			return null;
		}

		$account = $this->get_by_id( $wpdb->insert_id );

		$this->send_webhook( $account, 'provision' );

		// WC_Emails is lazy-instantiated on WooCommerce's first WC()->mailer()
		// call — until then, AccountProvisionedEmail's own constructor (and
		// its add_action( 'purecart_saas_provisioned', ... ) listener) hasn't
		// run yet. Provisioning happens inside OrderHandler::on_order_complete(),
		// hooked to the same 'woocommerce_order_status_completed' action
		// WooCommerce's own core order emails use — if our handler runs
		// before WooCommerce's, firing this action here would silently lose
		// the listener that isn't registered yet. Confirmed live: the
		// provisioning webhook fired correctly but the "account ready" email
		// never sent. This forces WC_Emails to initialize first, exactly as
		// WooCommerce's own custom-email documentation prescribes.
		WC()->mailer();

		do_action( 'purecart_saas_provisioned', $account );

		return $account;
	}

	/**
	 * Set a SaaS account status to suspended and fire the suspend webhook.
	 *
	 * @since  1.0.0
	 * @param  int $account_id The purecart_saas_accounts row ID.
	 * @return bool             True if the record was updated, false otherwise.
	 */
	public function suspend( int $account_id ): bool {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Status update on custom table; must be real-time.
		$updated = $wpdb->update(
			$wpdb->prefix . 'purecart_saas_accounts',
			array( 'status' => 'suspended' ),
			array( 'id' => $account_id ),
			array( '%s' ),
			array( '%d' )
		);

		if ( $updated ) {
			$account = $this->get_by_id( $account_id );
			if ( $account ) {
				$this->send_webhook( $account, 'suspend' );
			}
		}

		return (bool) $updated;
	}

	/**
	 * Restore a suspended SaaS account to active and fire the activate webhook.
	 *
	 * @since  1.0.0
	 * @param  int $account_id The purecart_saas_accounts row ID.
	 * @return bool             True if the record was updated, false otherwise.
	 */
	public function activate( int $account_id ): bool {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Status update on custom table; must be real-time.
		$updated = $wpdb->update(
			$wpdb->prefix . 'purecart_saas_accounts',
			array( 'status' => 'active' ),
			array( 'id' => $account_id ),
			array( '%s' ),
			array( '%d' )
		);

		if ( $updated ) {
			$account = $this->get_by_id( $account_id );
			if ( $account ) {
				$this->send_webhook( $account, 'activate' );
			}
		}

		return (bool) $updated;
	}

	/**
	 * Paginated, filtered admin listing — mirrors
	 * Subscriptions\SubscriptionRepository::find_all()'s shape so the REST
	 * controller and (later) the frontend list page can treat every
	 * PureCart module's list endpoint the same way.
	 *
	 * @since  1.0.0
	 * @param  string|null            $search     Matches customer email/name, product name, plan, or API key.
	 * @param  array|string|null      $status     One or more of active/suspended/cancelled.
	 * @param  array|string|null      $plan       One or more plan identifiers.
	 * @param  int|null               $product_id Exact product ID filter.
	 * @param  int                    $page       1-indexed page number.
	 * @param  int                    $per_page   Rows per page.
	 * @return array{items: array<int, object>, total: int, page: int, per_page: int, total_pages: int}
	 */
	public function find_all(
		?string $search = null,
		array|string|null $status = null,
		array|string|null $plan = null,
		?int $product_id = null,
		int $page = 1,
		int $per_page = 20
	): array {
		global $wpdb;

		$page = max( 1, $page );

		$where  = array();
		$params = array();

		$add_in_filter = static function ( string $column, array|string|null $values ) use ( &$where, &$params ): void {
			if ( null === $values ) {
				return;
			}

			$values = is_array( $values ) ? $values : array( $values );
			$values = array_values(
				array_filter(
					$values,
					static fn( $v ) => null !== $v && '' !== trim( (string) $v )
				)
			);

			if ( empty( $values ) ) {
				return;
			}

			$placeholders = implode( ', ', array_fill( 0, count( $values ), '%s' ) );
			$where[]      = "a.{$column} IN ({$placeholders})";

			foreach ( $values as $value ) {
				$params[] = (string) $value;
			}
		};

		$add_in_filter( 'status', $status );
		$add_in_filter( 'plan', $plan );

		if ( null !== $product_id && $product_id > 0 ) {
			$where[]  = 'a.product_id = %d';
			$params[] = $product_id;
		}

		if ( null !== $search && '' !== trim( $search ) ) {
			$like    = '%' . $wpdb->esc_like( trim( $search ) ) . '%';
			$where[] = '(u.user_email LIKE %s OR u.display_name LIKE %s OR p.post_title LIKE %s OR a.plan LIKE %s OR a.api_key LIKE %s)';
			array_push( $params, $like, $like, $like, $like, $like );
		}

		$where_sql = ! empty( $where ) ? ' WHERE ' . implode( ' AND ', $where ) : '';

		$from = "{$wpdb->prefix}purecart_saas_accounts a
                   LEFT JOIN {$wpdb->users} u ON u.ID = a.user_id
                   LEFT JOIN {$wpdb->posts} p ON p.ID = a.product_id";

		$count_query = "SELECT COUNT(*) FROM {$from}{$where_sql}";

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin list count; must reflect current filters, not a cached total.
		$total = (int) ( ! empty( $params )
			? $wpdb->get_var( $wpdb->prepare( $count_query, ...$params ) )
			: $wpdb->get_var( $count_query ) );

		$per_page = max( 1, $per_page );
		$offset   = ( $page - 1 ) * $per_page;

		$query = "SELECT a.*, u.user_email AS customer_email, u.display_name AS customer_name, p.post_title AS product_name
                    FROM {$from}
                    {$where_sql}
                    ORDER BY a.provisioned_at DESC
                    LIMIT %d OFFSET %d";

		$query_params   = $params;
		$query_params[] = $per_page;
		$query_params[] = $offset;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin list page; must reflect current filters/state, not a cached page.
		$results = $wpdb->get_results( $wpdb->prepare( $query, ...$query_params ) ) ?: array();

		return array(
			'items'       => $results,
			'total'       => $total,
			'page'        => $page,
			'per_page'    => $per_page,
			'total_pages' => (int) ceil( $total / $per_page ),
		);
	}

	/**
	 * Admin dashboard counters: totals by status, today's provisioning
	 * count, and the top 5 plans by account count.
	 *
	 * @since  1.0.0
	 * @return array{total: int, active: int, suspended: int, cancelled: int, provisioned_today: int, top_plans: array<int, array{plan: string, count: int}>}
	 */
	public function stats(): array {
		global $wpdb;

		$table = "{$wpdb->prefix}purecart_saas_accounts";

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin dashboard counters; must be current, not a cached snapshot.
		$by_status = $wpdb->get_results( "SELECT status, COUNT(*) AS count FROM {$table} GROUP BY status", ARRAY_A ) ?: array();

		$counts = array(
			'active'    => 0,
			'suspended' => 0,
			'cancelled' => 0,
		);
		foreach ( $by_status as $row ) {
			$counts[ $row['status'] ] = (int) $row['count'];
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin dashboard counter; must be current, not a cached snapshot.
		$today = (int) $wpdb->get_var(
			$wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE DATE(provisioned_at) = %s", current_time( 'Y-m-d' ) )
		);

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin dashboard counter; must be current, not a cached snapshot.
		$top_plans = $wpdb->get_results( "SELECT plan, COUNT(*) AS count FROM {$table} GROUP BY plan ORDER BY count DESC LIMIT 5", ARRAY_A ) ?: array();

		return array(
			'total'             => array_sum( $counts ),
			'active'            => $counts['active'],
			'suspended'         => $counts['suspended'],
			'cancelled'         => $counts['cancelled'],
			'provisioned_today' => $today,
			'top_plans'         => array_map(
				static fn( $row ) => array(
					'plan'  => (string) $row['plan'],
					'count' => (int) $row['count'],
				),
				$top_plans
			),
		);
	}

	/**
	 * Retrieve all SaaS accounts for a given user, ordered newest first.
	 *
	 * @since  1.0.0
	 * @param  int $user_id WordPress user ID.
	 * @return array<int, object>
	 */
	public function get_by_user( int $user_id ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- User account list changes on every order/status update; caching would show stale data in the customer dashboard.
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT a.*, p.post_title AS product_name
                   FROM {$wpdb->prefix}purecart_saas_accounts a
                   LEFT JOIN {$wpdb->posts} p ON p.ID = a.product_id
                  WHERE a.user_id = %d
                  ORDER BY a.provisioned_at DESC",
				$user_id
			)
		) ?: array();
	}

	/**
	 * Fetch a single SaaS account row by its API key.
	 *
	 * @since  1.0.0
	 * @param  string $api_key The account's `purecart_`-prefixed API key.
	 * @return object|null     The account row, or null if not found.
	 */
	public function get_by_api_key( string $api_key ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Auth-path lookup; must reflect the current key/status, not a cached one.
		return $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}purecart_saas_accounts WHERE api_key = %s LIMIT 1",
				$api_key
			)
		) ?: null;
	}

	/**
	 * Fetch a single SaaS account row by its primary key.
	 *
	 * @since  1.0.0
	 * @param  int $account_id The purecart_saas_accounts row ID.
	 * @return object|null     The account row, or null if not found.
	 */
	public function get_by_id( int $account_id ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Internal helper called immediately after an UPDATE; must reflect the just-written state.
		return $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}purecart_saas_accounts WHERE id = %d LIMIT 1",
				$account_id
			)
		) ?: null;
	}

	/**
	 * POST a signed webhook to the configured SaaS webhook URL.
	 *
	 * @since  1.0.0
	 * @param  object $account The SaaS account row.
	 * @param  string $event   Event name: 'provision', 'suspend', or 'activate'.
	 * @return void
	 */
	private function send_webhook( object $account, string $event ): void {
		$webhook_url = Settings::get( OptionKeys::SAAS_WEBHOOK_URL, '' );

		if ( empty( $webhook_url ) ) {
			return;
		}

		$secret = $this->get_or_create_webhook_secret();

		$payload = wp_json_encode(
			array(
				'event'   => $event,
				'api_key' => $account->api_key,
				'plan'    => $account->plan,
				'user_id' => $account->user_id,
			)
		);

		$sig = hash_hmac( 'sha256', (string) $payload, (string) $secret );

		wp_remote_post(
			$webhook_url,
			array(
				'timeout'     => 15,
				'redirection' => 0,
				'headers'     => array(
					'Content-Type'       => 'application/json',
					'X-PureCart-Webhook' => $event,
					'X-PureCart-Sig'     => $sig,
				),
				'body'        => $payload,
			)
		);
	}

	/**
	 * Read the stored webhook HMAC secret, generating and persisting one on
	 * first use so a store never fires a signed webhook with an empty secret.
	 *
	 * @since  1.0.0
	 * @return string
	 */
	private function get_or_create_webhook_secret(): string {
		$secret = Settings::get( OptionKeys::SAAS_WEBHOOK_SECRET, '' );

		if ( empty( $secret ) ) {
			$secret = wp_generate_password( 32, false );
			Settings::set( OptionKeys::SAAS_WEBHOOK_SECRET, $secret );
		}

		return (string) $secret;
	}
}

<?php
/**
 * All reads/writes for wp_purecart_subscriptions.
 *
 * Keeps $wpdb calls out of business-logic classes (SubscriptionManager,
 * RenewalEngine, ...), per subscription-final-dev-plan.md § 9 Step 4.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * CRUD + lookup queries for the core subscriptions table.
 *
 * @since 1.0.0
 */
class SubscriptionRepository {

	/**
	 * Column => $wpdb format specifier, for every settable column on
	 * wp_purecart_subscriptions (everything except the auto-increment `id`).
	 * Used to build correctly-typed $wpdb->insert()/update() calls from
	 * whatever partial subset of columns a caller passes in.
	 *
	 * @var array<string,string>
	 */
	private const COLUMN_FORMATS = array(
		'user_id'                  => '%d',
		'product_id'               => '%d',
		'order_id'                 => '%d',
		'license_id'               => '%d',
		'saas_account_id'          => '%d',
		'delivery_type'            => '%s',
		'status'                   => '%s',
		'billing_interval'         => '%d',
		'billing_period'           => '%s',
		'recurring_amount'         => '%f',
		'currency'                 => '%s',
		'signup_fee'               => '%f',
		'trial_ends_at'            => '%s',
		'next_payment_at'          => '%s',
		'last_payment_at'          => '%s',
		'max_length_at'            => '%s',
		'paused_at'                => '%s',
		'pause_end_date'           => '%s',
		'suspended_at'             => '%s',
		'cancelled_at'             => '%s',
		'cancellation_date'        => '%s',
		'gateway'                  => '%s',
		'gateway_subscription_id'  => '%s',
		'payment_token_id'         => '%d',
		'retry_count'              => '%d',
		'renewal_count'            => '%d',
		'skip_count'               => '%d',
		'max_renewals'             => '%d',
		'payment_type'             => '%s',
		'max_payments'             => '%d',
		'access_timing'            => '%s',
		'access_duration_value'    => '%d',
		'access_duration_unit'     => '%s',
		'access_end_date'          => '%s',
		'step_price'               => '%f',
		'step_after'               => '%d',
		'churn_risk_score'         => '%d',
		'customer_ltv'             => '%f',
		'pending_switch_product'   => '%d',
		'pending_switch_type'      => '%s',
		'shipping_amount'          => '%f',
		'shipping_method'          => '%s',
		'billing_address'          => '%s',
		'shipping_address'         => '%s',
		'previous_subscription_id' => '%d',
		'starts_at'                => '%s',
		'created_at'               => '%s',
		'updated_at'               => '%s',
	);

	/** Required columns for a valid new subscription row. */
	private const REQUIRED_ON_CREATE = array( 'user_id', 'product_id', 'order_id', 'billing_interval', 'billing_period', 'recurring_amount' );

	/**
	 * Fully-qualified table name.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'purecart_subscriptions';
	}

	/**
	 * Keep only known columns from an arbitrary data array, so a typo'd or
	 * unexpected key can never reach $wpdb->insert()/update().
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $data Raw column => value pairs.
	 * @return array<string, mixed>
	 */
	private function filter_known_columns( array $data ): array {
		return array_intersect_key( $data, self::COLUMN_FORMATS );
	}

	/**
	 * Build the $wpdb format array matching a filtered row's column order.
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $row Already-filtered column => value pairs.
	 * @return string[]
	 */
	private function formats_for( array $row ): array {
		$formats = array();
		foreach ( array_keys( $row ) as $column ) {
			$formats[] = self::COLUMN_FORMATS[ $column ] ?? '%s';
		}
		return $formats;
	}

	/**
	 * Insert a new subscription row.
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $data Column => value pairs. Must include all of REQUIRED_ON_CREATE.
	 * @return object|null The inserted row, or null if a required field was missing or the insert failed.
	 */
	public function create( array $data ): ?object {
		global $wpdb;

		$now  = current_time( 'mysql' );
		$data = wp_parse_args(
			$data,
			array(
				'delivery_type' => 'software',
				'status'        => 'active',
				'currency'      => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'USD',
				'signup_fee'    => 0.00,
				'starts_at'     => $now,
			)
		);
		$data['created_at'] = $now;
		$data['updated_at'] = $now;

		foreach ( self::REQUIRED_ON_CREATE as $required_field ) {
			if ( ! isset( $data[ $required_field ] ) ) {
				return null;
			}
		}

		$row      = $this->filter_known_columns( $data );
		$inserted = $wpdb->insert( $this->table(), $row, $this->formats_for( $row ) );

		return $inserted ? $this->find( (int) $wpdb->insert_id ) : null;
	}

	/**
	 * Update an existing subscription row. `updated_at` is always refreshed.
	 *
	 * @since 1.0.0
	 * @param int                   $id   Subscription row ID.
	 * @param array<string, mixed> $data Column => value pairs to change.
	 * @return bool
	 */
	public function update( int $id, array $data ): bool {
		global $wpdb;

		$data['updated_at'] = current_time( 'mysql' );
		$row                = $this->filter_known_columns( $data );

		if ( empty( $row ) ) {
			return false;
		}

		$updated = $wpdb->update( $this->table(), $row, array( 'id' => $id ), $this->formats_for( $row ), array( '%d' ) );

		return false !== $updated;
	}

	/**
	 * Find a subscription by its primary key.
	 *
	 * @since 1.0.0
	 * @param int $id Subscription row ID.
	 * @return object|null
	 */
	public function find( int $id ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Subscription state changes on every lifecycle action; a stale cache would show the wrong status.
		return $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$this->table()} WHERE id = %d", $id )
		) ?: null;
	}

	/**
	 * Find the subscription created from a given order (initial order, not a renewal order).
	 *
	 * Used by SubscriptionManager (Step 5) to keep `maybe_create_from_order()`
	 * idempotent when WooCommerce fires its completion hooks more than once.
	 *
	 * @since 1.0.0
	 * @param int $order_id WooCommerce order ID.
	 * @return object|null
	 */
	public function find_by_order( int $order_id ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Called synchronously during order completion; must reflect the current state, not a cached one.
		return $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$this->table()} WHERE order_id = %d LIMIT 1", $order_id )
		) ?: null;
	}

	/**
	 * Find the subscription created for a specific line item of an order.
	 *
	 * The real idempotency key for "was this line item already turned into a
	 * subscription" — a single order can contain more than one subscription
	 * product (feature doc § 3, "Multiple subscriptions"), so `find_by_order()`
	 * alone (first match, any product) isn't precise enough to guard each item.
	 *
	 * @since 1.0.0
	 * @param int $order_id   WooCommerce order ID.
	 * @param int $product_id WooCommerce product ID.
	 * @return object|null
	 */
	public function find_by_order_and_product( int $order_id, int $product_id ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Idempotency guard checked synchronously during order completion.
		return $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->table()} WHERE order_id = %d AND product_id = %d LIMIT 1",
				$order_id,
				$product_id
			)
		) ?: null;
	}

	/**
	 * All subscriptions belonging to a customer, newest first.
	 *
	 * @since 1.0.0
	 * @param int $user_id WordPress user ID.
	 * @return array<int, object>
	 */
	public function find_by_user( int $user_id ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Customer-facing "My Subscriptions" list; must reflect actions taken moments ago (pause/cancel/resume).
		return $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM {$this->table()} WHERE user_id = %d ORDER BY created_at DESC", $user_id )
		) ?: array();
	}

	/**
	 * All subscriptions currently in a given status, oldest-updated first.
	 *
	 * Used by DunningManager's grace-period scan (past_due / suspended).
	 *
	 * @since 1.0.0
	 * @param string $status One of the subscription status enum values.
	 * @return array<int, object>
	 */
	public function find_by_status( string $status ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Polled by DunningManager's grace-period scan; must reflect the latest status.
		return $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM {$this->table()} WHERE status = %s ORDER BY updated_at ASC", $status )
		) ?: array();
	}

	/**
	 * Subscriptions due for a renewal attempt right now.
	 *
	 * Matches trialing/active subscriptions whose next_payment_at has arrived.
	 * `next_payment_at IS NOT NULL` excludes split-payment subscriptions that
	 * have already completed (Step 11 sets it to NULL on completion).
	 *
	 * @since 1.0.0
	 * @return array<int, object>
	 */
	public function find_due_renewals(): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Polled by the RenewalEngine's Action Scheduler job; must never see a stale "already renewed" row.
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->table()}
                  WHERE status IN ('trialing','active')
                    AND next_payment_at IS NOT NULL
                    AND next_payment_at <= %s
                  ORDER BY next_payment_at ASC",
				current_time( 'mysql' )
			)
		) ?: array();
	}
}

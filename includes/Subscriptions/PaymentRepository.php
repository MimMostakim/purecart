<?php
/**
 * All reads/writes for wp_purecart_subscription_payments.
 *
 * New vs. the original [dev-plan] class list — needed for § 2's per-charge-attempt
 * ledger table, per subscription-final-dev-plan.md § 9 Step 4.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Per-charge-attempt ledger. `uniq_transaction` (schema § 2) is the real
 * idempotency backstop for inbound gateway webhooks (§ 5) — record() relies
 * on that unique key failing the INSERT for a duplicate transaction_id,
 * rather than doing its own existence check first (avoids a check-then-insert
 * race between two webhook deliveries arriving at nearly the same time).
 *
 * @since 1.0.0
 */
class PaymentRepository {

	/** Valid values for the status column. */
	private const STATUSES = array( 'succeeded', 'failed', 'refunded' );

	/**
	 * Fully-qualified table name.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'purecart_subscription_payments';
	}

	/**
	 * Record a charge attempt.
	 *
	 * On a duplicate transaction_id (uniq_transaction rejects the insert),
	 * returns the already-existing row instead of null — callers can treat
	 * "already recorded" the same as "just recorded" without special-casing it.
	 *
	 * @since 1.0.0
	 * @param array{
	 *     subscription_id: int,
	 *     order_id: int,
	 *     transaction_id: string,
	 *     amount: float,
	 *     status: string,
	 *     currency?: string,
	 *     is_partial_refund?: bool,
	 *     refunded_amount?: float|null,
	 *     refund_reason?: string|null,
	 * } $data Payment attempt data.
	 * @return object|null
	 */
	public function record( array $data ): ?object {
		global $wpdb;

		foreach ( array( 'subscription_id', 'order_id', 'transaction_id', 'amount', 'status' ) as $required_field ) {
			if ( ! isset( $data[ $required_field ] ) ) {
				return null;
			}
		}

		$transaction_id = sanitize_text_field( (string) $data['transaction_id'] );
		$status         = in_array( $data['status'], self::STATUSES, true ) ? $data['status'] : 'failed';

		$row = array(
			'subscription_id'   => absint( $data['subscription_id'] ),
			'order_id'          => absint( $data['order_id'] ),
			'transaction_id'    => $transaction_id,
			'amount'            => (float) $data['amount'],
			'currency'          => isset( $data['currency'] ) ? sanitize_text_field( $data['currency'] ) : 'USD',
			'status'            => $status,
			'is_partial_refund' => empty( $data['is_partial_refund'] ) ? 0 : 1,
			'refunded_amount'   => isset( $data['refunded_amount'] ) ? (float) $data['refunded_amount'] : null,
			'refund_reason'     => isset( $data['refund_reason'] ) ? sanitize_textarea_field( (string) $data['refund_reason'] ) : null,
			'created_at'        => current_time( 'mysql' ),
		);

		// Suppress wpdb's screen/log warning for the expected case: a duplicate
		// transaction_id hitting uniq_transaction. Restored immediately after.
		$wpdb->suppress_errors( true );
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available. Duplicate transaction_id is an expected, handled outcome (idempotency).
		$inserted = $wpdb->insert(
			$this->table(),
			$row,
			array( '%d', '%d', '%s', '%f', '%s', '%s', '%d', '%f', '%s', '%s' )
		);
		$wpdb->suppress_errors( false );

		if ( ! $inserted ) {
			return $this->find_by_transaction( $transaction_id );
		}

		return $this->find( (int) $wpdb->insert_id );
	}

	/**
	 * Find a payment row by its primary key.
	 *
	 * @since 1.0.0
	 * @param int $id Payment row ID.
	 * @return object|null
	 */
	public function find( int $id ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Fetched immediately after an insert/lookup; must reflect current state.
		return $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$this->table()} WHERE id = %d", $id )
		) ?: null;
	}

	/**
	 * Find a payment row by its gateway transaction ID. This is the
	 * idempotency lookup used by WebhookHandler (Step 12).
	 *
	 * @since 1.0.0
	 * @param string $transaction_id Gateway transaction/charge ID.
	 * @return object|null
	 */
	public function find_by_transaction( string $transaction_id ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Webhook idempotency check; a cached miss could let a duplicate event double-process.
		return $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$this->table()} WHERE transaction_id = %s", $transaction_id )
		) ?: null;
	}

	/**
	 * Full payment history for one subscription, newest first.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return array<int, object>
	 */
	public function find_by_subscription( int $subscription_id ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin "Payment Log" tab; must show a just-recorded charge/refund.
		return $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM {$this->table()} WHERE subscription_id = %d ORDER BY created_at DESC", $subscription_id )
		) ?: array();
	}
}

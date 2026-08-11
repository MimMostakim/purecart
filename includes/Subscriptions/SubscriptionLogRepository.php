<?php
/**
 * All reads/writes for wp_purecart_subscription_logs.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Per-subscription event log (status changes, payment attempts, retention
 * events, emails sent). Every write goes through log() so the actor_type/
 * actor_id and event-name sanitization rules are enforced in exactly one place.
 *
 * @since 1.0.0
 */
class SubscriptionLogRepository {

	/** Valid values for the actor_type column. */
	private const ACTOR_TYPES = array( 'system', 'customer', 'admin', 'webhook' );

	/**
	 * Fully-qualified table name.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'purecart_subscription_logs';
	}

	/**
	 * Record one event against a subscription.
	 *
	 * @since 1.0.0
	 * @param int    $subscription_id Subscription row ID.
	 * @param string $event           Event slug, e.g. 'renewed', 'payment_failed', 'cancelled'.
	 * @param array{
	 *     old_status?: string|null,
	 *     new_status?: string|null,
	 *     amount?: float|null,
	 *     order_id?: int|null,
	 *     note?: string|null,
	 *     actor_type?: string,
	 *     actor_id?: int,
	 * } $args Optional event details.
	 * @return bool
	 */
	public function log( int $subscription_id, string $event, array $args = array() ): bool {
		global $wpdb;

		$args = wp_parse_args(
			$args,
			array(
				'old_status' => null,
				'new_status' => null,
				'amount'     => null,
				'order_id'   => null,
				'note'       => null,
				'actor_type' => 'system',
				'actor_id'   => 0,
			)
		);

		$actor_type = in_array( $args['actor_type'], self::ACTOR_TYPES, true ) ? $args['actor_type'] : 'system';

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available.
		$inserted = $wpdb->insert(
			$this->table(),
			array(
				'subscription_id' => $subscription_id,
				'event'           => sanitize_key( $event ),
				'old_status'      => $args['old_status'] ? sanitize_key( $args['old_status'] ) : null,
				'new_status'      => $args['new_status'] ? sanitize_key( $args['new_status'] ) : null,
				'amount'          => null !== $args['amount'] ? (float) $args['amount'] : null,
				'order_id'        => null !== $args['order_id'] ? absint( $args['order_id'] ) : null,
				'note'            => null !== $args['note'] ? sanitize_textarea_field( (string) $args['note'] ) : null,
				'actor_type'      => $actor_type,
				'actor_id'        => absint( $args['actor_id'] ),
				'created_at'      => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%s', '%f', '%d', '%s', '%s', '%d', '%s' )
		);

		return (bool) $inserted;
	}

	/**
	 * Full event history for one subscription, newest first.
	 *
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return array<int, object>
	 */
	public function find_by_subscription( int $subscription_id ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin/customer event-log view; must show an action just taken.
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->table()} WHERE subscription_id = %d ORDER BY created_at DESC",
				$subscription_id
			)
		) ?: array();
	}

	// -----------------------------------------------------------------------
	// Reporting aggregates (Step 15)
	// -----------------------------------------------------------------------

	/**
	 * How many subscriptions transitioned *into* a given status within a date
	 * range. The log is the only place point-in-time history exists — the
	 * subscriptions table holds current state plus a handful of timestamps
	 * (`cancelled_at`, ...), with no column at all for e.g. when a row
	 * expired, so churn over a past window can only be counted from here.
	 *
	 * @since 1.0.0
	 * @param string $new_status Status transitioned into (e.g. 'cancelled').
	 * @param string $start      Inclusive range start (MySQL datetime).
	 * @param string $end        Inclusive range end (MySQL datetime).
	 * @return int
	 */
	public function count_transitions_to( string $new_status, string $start, string $end ): int {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reporting aggregate over a custom table.
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT( DISTINCT subscription_id ) FROM {$this->table()}
                  WHERE new_status = %s AND created_at >= %s AND created_at <= %s",
				sanitize_key( $new_status ),
				$start,
				$end
			)
		);
	}

	/**
	 * Subscription IDs that had already ended (cancelled or expired) before a
	 * given moment — used to reconstruct "how many were active at the start of
	 * the period", the denominator of the churn-rate formula (§ 8).
	 *
	 * @since 1.0.0
	 * @param string $before Exclusive cutoff (MySQL datetime).
	 * @return int[]
	 */
	public function ended_before( string $before ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reporting aggregate over a custom table.
		$ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT subscription_id FROM {$this->table()}
                  WHERE new_status IN ( 'cancelled', 'expired' ) AND created_at < %s",
				$before
			)
		);

		return array_map( 'intval', (array) $ids );
	}
}

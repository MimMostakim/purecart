<?php
/**
 * Records every download attempt — served or refused.
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

defined( 'ABSPATH' ) || exit;

/**
 * Append-only audit log over the purecart_download_logs table.
 *
 * Refusals are logged as deliberately as successes. "The customer says the
 * link doesn't work" is the single most common support ticket a digital store
 * gets, and without a row saying *why* it was refused — expired, limit hit,
 * licence revoked — the only way to answer is guesswork.
 *
 * @since 1.0.0
 */
class DownloadLogger {

	/** The file was sent. */
	public const EVENT_SERVED = 'served';

	/** No such token — mistyped, or a link from a deleted order. */
	public const EVENT_INVALID = 'rejected_invalid';

	/** Token belongs to a refunded or cancelled order. */
	public const EVENT_REVOKED = 'rejected_revoked';

	/** Past its expiry date. */
	public const EVENT_EXPIRED = 'rejected_expired';

	/** Download count reached the limit. */
	public const EVENT_LIMIT = 'rejected_limit';

	/** Licence gate refused: the linked licence is no longer active. */
	public const EVENT_LICENSE = 'rejected_license';

	/** Token was fine but the file is gone from disk. */
	public const EVENT_MISSING = 'rejected_missing';

	/**
	 * Record one download attempt.
	 *
	 * @since  1.0.0
	 * @param  int    $download_id The purecart_downloads row ID, or 0 when the token matched nothing.
	 * @param  string $event       One of this class's EVENT_* constants.
	 * @return void
	 */
	public function record( int $download_id, string $event = self::EVENT_SERVED ): void {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Append-only event log on a custom table; no WP API available.
		$wpdb->insert(
			$wpdb->prefix . 'purecart_download_logs',
			array(
				'download_id'   => $download_id,
				'event'         => $event,
				'ip_address'    => $this->client_ip(),
				'user_agent'    => $this->user_agent(),
				'country_code'  => '',
				'downloaded_at' => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s' )
		);
	}

	/**
	 * Read log rows, newest first.
	 *
	 * @since  1.0.0
	 * @param  array{download_id?:int, event?:string, date_from?:string, date_to?:string, limit?:int, offset?:int} $args Filters.
	 * @return array<int, object>
	 */
	public function get_logs( array $args = array() ): array {
		global $wpdb;

		$where  = array( '1=1' );
		$params = array();

		if ( ! empty( $args['download_id'] ) ) {
			$where[]  = 'download_id = %d';
			$params[] = (int) $args['download_id'];
		}

		if ( ! empty( $args['event'] ) ) {
			$where[]  = 'event = %s';
			$params[] = (string) $args['event'];
		}

		if ( ! empty( $args['date_from'] ) ) {
			$where[]  = 'downloaded_at >= %s';
			$params[] = (string) $args['date_from'];
		}

		if ( ! empty( $args['date_to'] ) ) {
			$where[]  = 'downloaded_at <= %s';
			$params[] = (string) $args['date_to'];
		}

		$params[] = max( 1, (int) ( $args['limit'] ?? 50 ) );
		$params[] = max( 0, (int) ( $args['offset'] ?? 0 ) );

		$sql = 'SELECT * FROM ' . $wpdb->prefix . 'purecart_download_logs'
			. ' WHERE ' . implode( ' AND ', $where )
			. ' ORDER BY downloaded_at DESC, id DESC LIMIT %d OFFSET %d';

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Custom table; $sql is assembled from fixed fragments with every value passed as a placeholder to prepare().
		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $params ) );

		return $rows ?: array();
	}

	/**
	 * Delete log rows older than the given number of months.
	 *
	 * @since  1.0.0
	 * @param  int $months Retention window; 0 or less keeps everything.
	 * @return int         Rows deleted.
	 */
	public function prune( int $months ): int {
		global $wpdb;

		if ( $months <= 0 ) {
			return 0;
		}

		$cutoff = gmdate( 'Y-m-d H:i:s', strtotime( '-' . $months . ' months' ) );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table maintenance DELETE; no WP API available.
		$deleted = $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->prefix}purecart_download_logs WHERE downloaded_at < %s",
				$cutoff
			)
		);

		return (int) $deleted;
	}

	// -----------------------------------------------------------------------
	// Internals
	// -----------------------------------------------------------------------

	/**
	 * The requesting IP address.
	 *
	 * Deliberately REMOTE_ADDR only. X-Forwarded-For is trivially spoofed by
	 * the client, and a log that can be poisoned by the person it is meant to
	 * incriminate is worse than no log. Sites behind a proxy should set
	 * REMOTE_ADDR correctly at the web-server layer.
	 *
	 * @since  1.0.0
	 * @return string
	 */
	private function client_ip(): string {
		$ip = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) );

		return (string) ( filter_var( $ip, FILTER_VALIDATE_IP ) ?: '' );
	}

	/**
	 * The requesting user agent, truncated to fit comfortably in the column.
	 *
	 * @since  1.0.0
	 * @return string
	 */
	private function user_agent(): string {
		$agent = sanitize_text_field( wp_unslash( (string) ( $_SERVER['HTTP_USER_AGENT'] ?? '' ) ) );

		return substr( $agent, 0, 500 );
	}
}

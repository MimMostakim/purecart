<?php
/**
 * Admin-facing queries over the download tables.
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

defined( 'ABSPATH' ) || exit;

/**
 * Read-only reporting for the Downloads admin screens.
 *
 * Kept apart from {@see TokenManager}, which owns the token lifecycle, for
 * the same reason `Updates\UpdateReport` is kept apart from the update
 * pipeline: listing, searching and counting have nothing to do with issuing
 * or validating, and mixing them makes both harder to follow.
 *
 * @since 1.0.0
 */
class DownloadReport {

	/**
	 * The four states a token can be in, expressed as SQL.
	 *
	 * `status` in the table only records whether a token was revoked. Expired
	 * and exhausted are consequences of the expiry date and the counter, so
	 * they have to be derived — and derived in SQL rather than in PHP, or
	 * filtering and paging by state would have to load the whole table first.
	 *
	 * Order matters and matches {@see TokenManager::validate()}: a revoked
	 * token reads as revoked even after it would also have expired.
	 *
	 * @since  1.0.0
	 * @return array<string, string>
	 */
	private function state_conditions(): array {
		return array(
			'revoked'   => "d.status = 'revoked'",
			'expired'   => "d.status = 'active' AND d.expires_at IS NOT NULL AND d.expires_at < UTC_TIMESTAMP()",
			'exhausted' => "d.status = 'active' AND ( d.expires_at IS NULL OR d.expires_at >= UTC_TIMESTAMP() ) AND d.max_downloads > 0 AND d.download_count >= d.max_downloads",
			'active'    => "d.status = 'active' AND ( d.expires_at IS NULL OR d.expires_at >= UTC_TIMESTAMP() ) AND ( d.max_downloads = 0 OR d.download_count < d.max_downloads )",
		);
	}

	/**
	 * A paged, filtered list of download tokens.
	 *
	 * @since  1.0.0
	 * @param  array{search?:string, status?:string, product_id?:int, user_id?:int, order_id?:int, orderby?:string, order?:string, page?:int, per_page?:int} $args Query arguments.
	 * @return array{rows: array<int, array<string, mixed>>, total: int, total_pages: int}
	 */
	public function list( array $args = array() ): array {
		global $wpdb;

		$per_page = min( 100, max( 1, (int) ( $args['per_page'] ?? 20 ) ) );
		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$offset   = ( $page - 1 ) * $per_page;

		list( $where, $params ) = $this->build_where( $args );

		$order_by = $this->build_order_by( (string) ( $args['orderby'] ?? 'created_at' ), (string) ( $args['order'] ?? 'desc' ) );

		$from = "FROM {$wpdb->prefix}purecart_downloads d
                 LEFT JOIN {$wpdb->posts} p ON p.ID = d.product_id
                 LEFT JOIN {$wpdb->users} u ON u.ID = d.user_id
                 WHERE " . $where;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Custom table; the SQL is assembled from fixed fragments and every value is a placeholder. Counters change on every download, so caching would serve stale numbers.
		$total = (int) $wpdb->get_var(
			$params ? $wpdb->prepare( 'SELECT COUNT(*) ' . $from, $params ) : 'SELECT COUNT(*) ' . $from
		);

		$sql          = 'SELECT d.*, p.post_title AS product_name, u.display_name AS customer_name, u.user_email AS customer_email '
			. $from . ' ORDER BY ' . $order_by . ' LIMIT %d OFFSET %d';
		$page_params  = $params;
		$page_params[] = $per_page;
		$page_params[] = $offset;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- As above: fixed fragments, placeholder values.
		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $page_params ) );

		return array(
			'rows'        => array_map( array( $this, 'prepare' ), (array) $rows ),
			'total'       => $total,
			'total_pages' => (int) ceil( $total / $per_page ),
		);
	}

	/**
	 * One token, shaped like a list row.
	 *
	 * @since  1.0.0
	 * @param  int $download_id The purecart_downloads row ID.
	 * @return array<string, mixed>|null
	 */
	public function find( int $download_id ): ?array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table; counters change on every download.
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT d.*, p.post_title AS product_name, u.display_name AS customer_name, u.user_email AS customer_email
                   FROM {$wpdb->prefix}purecart_downloads d
                   LEFT JOIN {$wpdb->posts} p ON p.ID = d.product_id
                   LEFT JOIN {$wpdb->users} u ON u.ID = d.user_id
                  WHERE d.id = %d",
				$download_id
			)
		);

		return $row ? $this->prepare( $row ) : null;
	}

	/**
	 * Headline numbers for the admin overview.
	 *
	 * @since  1.0.0
	 * @return array<string, mixed>
	 */
	public function stats(): array {
		global $wpdb;

		$states = $this->state_conditions();

		$select = array( 'COUNT(*) AS total' );
		foreach ( $states as $name => $condition ) {
			$select[] = sprintf( 'SUM( CASE WHEN %s THEN 1 ELSE 0 END ) AS %s', $condition, $name );
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Custom table; the CASE expressions are built from this class's own fixed condition strings, with no external input.
		$totals = $wpdb->get_row(
			'SELECT ' . implode( ', ', $select ) . " FROM {$wpdb->prefix}purecart_downloads d",
			ARRAY_A
		);

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table; a live count is the entire point of the figure.
		$served_today = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->prefix}purecart_download_logs
                  WHERE event = %s AND downloaded_at >= %s",
				DownloadLogger::EVENT_SERVED,
				gmdate( 'Y-m-d 00:00:00' )
			)
		);

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table aggregate; no WP API available.
		$top = $wpdb->get_results(
			"SELECT d.product_id, p.post_title AS product_name, SUM( d.download_count ) AS downloads
               FROM {$wpdb->prefix}purecart_downloads d
               LEFT JOIN {$wpdb->posts} p ON p.ID = d.product_id
              GROUP BY d.product_id, p.post_title
              HAVING downloads > 0
              ORDER BY downloads DESC
              LIMIT 5"
		);

		return array(
			'total'        => (int) ( $totals['total'] ?? 0 ),
			'active'       => (int) ( $totals['active'] ?? 0 ),
			'expired'      => (int) ( $totals['expired'] ?? 0 ),
			'exhausted'    => (int) ( $totals['exhausted'] ?? 0 ),
			'revoked'      => (int) ( $totals['revoked'] ?? 0 ),
			'served_today' => $served_today,
			'top_products' => array_map(
				static function ( $row ): array {
					return array(
						'product_id'   => (int) $row->product_id,
						'product_name' => (string) ( $row->product_name ?? '' ),
						'downloads'    => (int) $row->downloads,
					);
				},
				(array) $top
			),
		);
	}

	// -----------------------------------------------------------------------
	// Internals
	// -----------------------------------------------------------------------

	/**
	 * Build the WHERE clause and its bound values.
	 *
	 * @since  1.0.0
	 * @param  array<string, mixed> $args Query arguments.
	 * @return array{0:string, 1:array<int, mixed>}
	 */
	private function build_where( array $args ): array {
		global $wpdb;

		$where  = array( '1=1' );
		$params = array();

		$status = (string) ( $args['status'] ?? '' );
		$states = $this->state_conditions();
		if ( isset( $states[ $status ] ) ) {
			$where[] = '( ' . $states[ $status ] . ' )';
		}

		foreach ( array( 'product_id' => 'd.product_id', 'user_id' => 'd.user_id', 'order_id' => 'd.order_id' ) as $arg => $column ) {
			if ( ! empty( $args[ $arg ] ) ) {
				$where[]  = $column . ' = %d';
				$params[] = (int) $args[ $arg ];
			}
		}

		$search = trim( (string) ( $args['search'] ?? '' ) );
		if ( '' !== $search ) {
			$like     = '%' . $wpdb->esc_like( $search ) . '%';
			$where[]  = '( p.post_title LIKE %s OR u.user_email LIKE %s OR u.display_name LIKE %s OR d.order_id = %d )';
			$params[] = $like;
			$params[] = $like;
			$params[] = $like;
			$params[] = (int) $search;
		}

		return array( implode( ' AND ', $where ), $params );
	}

	/**
	 * Map a caller-supplied sort to a column this table actually has.
	 *
	 * An allowlist rather than escaping: ORDER BY cannot take a placeholder,
	 * so the only safe input is one this class chose itself.
	 *
	 * @since  1.0.0
	 * @param  string $orderby Requested sort field.
	 * @param  string $order   Requested direction.
	 * @return string
	 */
	private function build_order_by( string $orderby, string $order ): string {
		$columns = array(
			'created_at'     => 'd.created_at',
			'expires_at'     => 'd.expires_at',
			'download_count' => 'd.download_count',
			'product_name'   => 'p.post_title',
			'order_id'       => 'd.order_id',
		);

		$column    = $columns[ $orderby ] ?? 'd.created_at';
		$direction = 'asc' === strtolower( $order ) ? 'ASC' : 'DESC';

		return $column . ' ' . $direction . ', d.id ' . $direction;
	}

	/**
	 * Shape one row for the API.
	 *
	 * @since  1.0.0
	 * @param  object $row Joined download row.
	 * @return array<string, mixed>
	 */
	private function prepare( object $row ): array {
		$file      = ( new TokenManager() )->file_for( $row );
		$token     = (string) $row->token;
		$order     = wc_get_order( (int) $row->order_id );
		$is_active = 'active' === $row->status;

		return array(
			'id'             => (int) $row->id,
			'order_id'       => (int) $row->order_id,
			'order_number'   => $order ? (string) $order->get_order_number() : '',
			'user_id'        => (int) $row->user_id,
			'customer_name'  => (string) ( $row->customer_name ?? '' ),
			'customer_email' => (string) ( $row->customer_email ?? '' ),
			'product_id'     => (int) $row->product_id,
			'product_name'   => (string) ( $row->product_name ?? '' ),
			'file_name'      => $file ? $file->get_name() : '',
			// Only the tail of the token: enough to match a row against a
			// support email, useless to anyone reading the admin screen over
			// someone's shoulder — the full string is a bearer credential.
			'token'          => '…' . substr( $token, -8 ),
			'download_url'   => $is_active ? DownloadDispatcher::url( $token ) : '',
			'download_count' => (int) $row->download_count,
			'max_downloads'  => (int) $row->max_downloads,
			'license_id'     => (int) $row->license_id,
			'status'         => $this->state_of( $row ),
			'expires_at'     => $row->expires_at,
			'created_at'     => $row->created_at,
		);
	}

	/**
	 * Derive a row's display state.
	 *
	 * @since  1.0.0
	 * @param  object $row A purecart_downloads row.
	 * @return string      active | expired | exhausted | revoked
	 */
	private function state_of( object $row ): string {
		if ( 'active' !== $row->status ) {
			return 'revoked';
		}

		if ( ! empty( $row->expires_at ) && strtotime( (string) $row->expires_at ) < time() ) {
			return 'expired';
		}

		if ( (int) $row->max_downloads > 0 && (int) $row->download_count >= (int) $row->max_downloads ) {
			return 'exhausted';
		}

		return 'active';
	}
}

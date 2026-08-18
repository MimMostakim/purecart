<?php
/**
 * Browser-initiated CSV download of the subscriptions export, over
 * admin-post.php.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Exists because the REST export endpoint, correct as it is for the admin SPA
 * (which sends an `X-WP-Nonce` header with every fetch), cannot be used by a
 * plain browser navigation — and a file download *is* a browser navigation.
 *
 * WordPress's REST cookie authentication requires a `wp_rest` nonce: with no
 * nonce present, `rest_cookie_check_errors()` calls `wp_set_current_user( 0 )`
 * and treats the request as anonymous (wp-includes/rest-api.php, verified
 * against this install), so an administrator pasting the endpoint URL into
 * their address bar gets a 401 rather than a file. That is correct REST
 * behaviour, not something to work around inside the REST layer.
 *
 * admin-post.php is WordPress's own answer to this: it runs the full admin
 * bootstrap with ordinary cookie authentication, so a signed link works from
 * a browser. Capability and nonce are still both checked below — the nonce
 * here guards against CSRF (a link on another site causing an admin's browser
 * to silently pull down the whole customer list), which a capability check
 * alone does not.
 *
 * @since 1.0.0
 */
class SubscriptionExport {

	/** admin-post.php action name. */
	public const ACTION = 'purecart_export_subscriptions';

	/** Nonce action. */
	private const NONCE_ACTION = 'purecart_export_subscriptions';

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'admin_post_' . self::ACTION, array( $this, 'handle_download' ) );
	}

	/**
	 * A nonce-signed download URL for the current user.
	 *
	 * @since 1.0.0
	 * @param string $status Optional status filter; '' = every subscription.
	 * @return string
	 */
	public static function download_url( string $status = '' ): string {
		$url = add_query_arg(
			array(
				'action' => self::ACTION,
				'status' => $status,
			),
			admin_url( 'admin-post.php' )
		);

		return wp_nonce_url( $url, self::NONCE_ACTION );
	}

	/**
	 * Stream the CSV as a file download.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function handle_download(): void {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die(
				esc_html__( 'You do not have permission to export subscriptions.', 'purecart' ),
				esc_html__( 'Permission denied', 'purecart' ),
				array( 'response' => 403 )
			);
		}

		check_admin_referer( self::NONCE_ACTION );

		$status = isset( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : '';
		$csv    = ( new SubscriptionReport() )->to_csv( '' !== $status ? $status : null );

		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="purecart-subscriptions-' . gmdate( 'Y-m-d' ) . '.csv"' );

		// UTF-8 BOM — without it Excel misreads non-ASCII names/titles.
		echo "\xEF\xBB\xBF" . $csv; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSV file body, not HTML; fputcsv() has already quoted every field.

		exit;
	}
}

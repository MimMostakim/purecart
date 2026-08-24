<?php
/**
 * Decides whether a license key may receive updates for a product.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * Correction vs. RND-auto-updates.md, which calls
 * `LicenseActivator::validate( license_key, domain )` — that method does not
 * exist. `LicenseActivator` only performs per-domain activate/deactivate for a
 * license the customer already holds, and the only other license entry point
 * (`RestApi::license_check()`) merely *reports* status; neither decides
 * entitlement. This class is that missing decision.
 *
 * Its single most important rule is one the doc never states: **the license
 * must belong to the product being updated**. Without that check, a $9 license
 * for any product in the catalogue would unlock update downloads for every
 * other product in it, which defeats the point of licensing the updates at all.
 *
 * @since 1.0.0
 */
class LicenseGate {

	/** Product meta: whether updates require a license at all. */
	private const REQUIRES_LICENSE_META = '_purecart_update_requires_license';

	/**
	 * Whether this product gates updates behind a license.
	 *
	 * Defaults to true (doc § "Key Design Decisions" 1) — a store that hasn't
	 * configured anything should not be giving paid updates away. Setting the
	 * meta to a falsey value opts a freemium product out.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return bool
	 */
	public function requires_license( int $product_id ): bool {
		$meta = get_post_meta( $product_id, self::REQUIRES_LICENSE_META, true );

		if ( '' === $meta ) {
			return true;
		}

		return ! in_array( $meta, array( 'no', '0', 0, false ), true );
	}

	/**
	 * Validate a license key for one product.
	 *
	 * @since 1.0.0
	 * @param string $license_key Submitted license key.
	 * @param int    $product_id  Product the update is being requested for.
	 * @param string $domain      Requesting site's domain, if supplied.
	 * @return object|\WP_Error The license row, or an error describing the refusal.
	 */
	public function validate( string $license_key, int $product_id, string $domain = '' ) {
		$license_key = trim( $license_key );

		if ( '' === $license_key ) {
			return new \WP_Error( 'purecart_license_missing', __( 'A license key is required for updates to this product.', 'purecart' ), array( 'status' => 401 ) );
		}

		$license = $this->find_by_key( $license_key );

		if ( ! $license ) {
			return new \WP_Error( 'purecart_license_invalid', __( 'Invalid license key.', 'purecart' ), array( 'status' => 403 ) );
		}

		// The rule the doc omits — see the class docblock.
		if ( (int) $license->product_id !== $product_id ) {
			return new \WP_Error(
				'purecart_license_wrong_product',
				__( 'This license is not valid for this product.', 'purecart' ),
				array( 'status' => 403 )
			);
		}

		if ( 'active' !== $license->status ) {
			return new \WP_Error(
				'purecart_license_inactive',
				sprintf(
					/* translators: %s: license status, e.g. revoked */
					__( 'This license is %s.', 'purecart' ),
					$license->status
				),
				array( 'status' => 403 )
			);
		}

		// `expires_at` is checked independently of `status`: nothing sweeps
		// lapsed licenses to `expired` on a schedule, so a license can sit at
		// `active` with a date in the past.
		if ( ! empty( $license->expires_at ) && strtotime( (string) $license->expires_at ) < time() ) {
			return new \WP_Error(
				'purecart_license_expired',
				__( 'This license has expired. Renew it to continue receiving updates.', 'purecart' ),
				array( 'status' => 403 )
			);
		}

		$domain = $this->normalize_domain( $domain );

		if ( '' !== $domain && ! $this->domain_is_allowed( $license, $domain ) ) {
			return new \WP_Error(
				'purecart_license_domain',
				__( 'This license has reached its activation limit and this site is not one of the activated sites.', 'purecart' ),
				array( 'status' => 403 )
			);
		}

		/**
		 * Filters the outcome of an update license check.
		 *
		 * @since 1.0.0
		 * @param object|\WP_Error $license    The license row, or an error.
		 * @param string           $license_key Submitted key.
		 * @param int              $product_id  Product ID.
		 * @param string           $domain      Requesting domain.
		 */
		return apply_filters( 'purecart_update_license_validated', $license, $license_key, $product_id, $domain );
	}

	/**
	 * Whether this domain may use this license.
	 *
	 * Deliberately permissive while the license still has activations spare:
	 * an update check is not an activation, and refusing updates to a site
	 * that simply hasn't run the activation flow yet would look like a broken
	 * product. It only refuses once the limit is genuinely exhausted *and*
	 * this domain is not among the sites already using it — the case that
	 * actually represents license sharing.
	 *
	 * `unlimited` and `lifetime` plans skip the check entirely.
	 *
	 * @since 1.0.0
	 * @param object $license License row.
	 * @param string $domain  Normalised domain.
	 * @return bool
	 */
	private function domain_is_allowed( object $license, string $domain ): bool {
		if ( in_array( (string) $license->plan_type, array( 'unlimited', 'lifetime' ), true ) ) {
			return true;
		}

		$limit = (int) $license->activation_limit;
		if ( $limit <= 0 ) {
			return true;
		}

		if ( (int) $license->activated_count < $limit ) {
			return true;
		}

		return $this->domain_is_activated( (int) $license->id, $domain );
	}

	/**
	 * @since 1.0.0
	 * @param int    $license_id License row ID.
	 * @param string $domain     Normalised domain.
	 * @return bool
	 */
	private function domain_is_activated( int $license_id, string $domain ): bool {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- License enforcement; a cached activation list could let a deactivated site keep pulling updates.
		$found = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->prefix}purecart_license_activations WHERE license_id = %d AND domain = %s",
				$license_id,
				$domain
			)
		);

		return (int) $found > 0;
	}

	/**
	 * Reduce a submitted domain to a comparable host.
	 *
	 * Strips scheme, `www.`, path, port and case, so `https://WWW.Example.com/wp/`
	 * and `example.com` are recognised as the same site rather than counting
	 * as two activations.
	 *
	 * @since 1.0.0
	 * @param string $domain Raw domain or URL.
	 * @return string
	 */
	public function normalize_domain( string $domain ): string {
		$domain = trim( $domain );
		if ( '' === $domain ) {
			return '';
		}

		if ( false !== strpos( $domain, '//' ) ) {
			$domain = (string) wp_parse_url( $domain, PHP_URL_HOST );
		} else {
			// No scheme: parse_url won't find a host, so cut the path manually.
			$domain = (string) strtok( $domain, '/' );
		}

		$domain = strtolower( trim( $domain ) );
		$domain = (string) preg_replace( '/:\d+$/', '', $domain );
		$domain = (string) preg_replace( '/^www\./', '', $domain );

		return $domain;
	}

	/**
	 * @since 1.0.0
	 * @param string $license_key License key.
	 * @return object|null
	 */
	private function find_by_key( string $license_key ): ?object {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- License validation is security-critical; a cached row could serve a revoked license.
		return $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}purecart_licenses WHERE license_key = %s LIMIT 1",
				$license_key
			)
		) ?: null;
	}
}

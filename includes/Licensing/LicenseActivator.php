<?php
/**
 * Handles domain activation and deactivation for licenses.
 *
 * @package PureCart\Licensing
 */

declare( strict_types=1 );

namespace PureCart\Licensing;

defined( 'ABSPATH' ) || exit;

/**
 * Manages the purecart_license_activations table.
 */
class LicenseActivator {

	/**
	 * Activate a license on a domain.
	 *
	 * @since  1.0.0
	 * @param  string $license_key The license key to activate.
	 * @param  string $domain      The domain being activated (e.g. example.com).
	 * @param  string $environment Deployment environment: production, staging, or local.
	 * @return array{success: bool, message: string}
	 */
	public function activate( string $license_key, string $domain, string $environment = 'production' ): array {
		global $wpdb;

		/**
		 * Veto an activation before any lookup happens. Return a WP_Error to reject.
		 *
		 * @since 1.0.0
		 * @param null|\WP_Error $veto        Null by default; return a WP_Error to reject.
		 * @param string         $license_key The license key being activated.
		 * @param string         $domain      The domain being activated.
		 */
		$veto = apply_filters( 'purecart_pre_license_activate', null, $license_key, $domain );
		if ( is_wp_error( $veto ) ) {
			return array(
				'success' => false,
				'message' => $veto->get_error_message(),
			);
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- License validation is security-critical; cached results could allow revoked/expired licenses through.
		$license = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}purecart_licenses WHERE license_key = %s LIMIT 1",
				$license_key
			)
		);

		if ( ! $license ) {
			return array(
				'success' => false,
				'message' => __( 'Invalid license key.', 'purecart' ),
			);
		}

		if ( 'active' !== $license->status ) {
			return array(
				'success' => false,
				'message' => __( 'License is not active.', 'purecart' ),
			);
		}

		if ( $license->expires_at && strtotime( $license->expires_at ) < time() ) {
			return array(
				'success' => false,
				'message' => __( 'License has expired.', 'purecart' ),
			);
		}

		// Already activated on this domain — refresh last_check.
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Activation state is security-critical; cannot use stale cache.
		$existing = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT id FROM {$wpdb->prefix}purecart_license_activations
                  WHERE license_id = %d AND domain = %s LIMIT 1",
				$license->id,
				$domain
			)
		);

		if ( $existing ) {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Updating last_check on existing activation record.
			$wpdb->update(
				$wpdb->prefix . 'purecart_license_activations',
				array( 'last_check' => current_time( 'mysql' ) ),
				array( 'id' => $existing ),
				array( '%s' ),
				array( '%d' )
			);
			return array(
				'success' => true,
				'message' => __( 'License already activated on this domain.', 'purecart' ),
			);
		}

		$env_allowed = array( 'production', 'staging', 'local' );
		if ( ! in_array( $environment, $env_allowed, true ) ) {
			$environment = 'production';
		}

		$exempt = $this->is_staging_or_local( $domain, $environment );
		if ( $exempt && 'production' === $environment ) {
			// Domain matched an exempt pattern even though the caller didn't
			// declare it — reclassify so the activation row's audit trail is
			// accurate, per RND-licensing.md "Staging / Localhost Exemption".
			$environment = 'local';
		}

		if ( ! $exempt
			&& 'unlimited' !== $license->plan_type
			&& (int) $license->activated_count >= (int) $license->activation_limit
		) {
			return array(
				'success' => false,
				'message' => __( 'Activation limit reached.', 'purecart' ),
			);
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table INSERT; no WP API available.
		$wpdb->insert(
			$wpdb->prefix . 'purecart_license_activations',
			array(
				'license_id'   => $license->id,
				'domain'       => $domain,
				'ip_address'   => sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) ),
				'environment'  => $environment,
				'activated_at' => current_time( 'mysql' ),
				'last_check'   => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s' )
		);

		// Staging/local activations are exempt from the limit, so they don't
		// consume an activation slot — only production (and unrecognized
		// declared-staging-but-non-matching) domains increment the counter.
		if ( ! $exempt ) {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Atomic counter increment; must be real-time.
			$wpdb->query(
				$wpdb->prepare(
					"UPDATE {$wpdb->prefix}purecart_licenses
                        SET activated_count = activated_count + 1,
                            updated_at = %s
                      WHERE id = %d",
					current_time( 'mysql' ),
					$license->id
				)
			);
		}

		do_action( 'purecart_license_activated', $license->id, $domain, $environment );

		return array(
			'success' => true,
			'message' => __( 'License activated successfully.', 'purecart' ),
		);
	}

	/**
	 * Deactivate a license from a domain.
	 *
	 * @since  1.0.0
	 * @param  string $license_key The license key to deactivate.
	 * @param  string $domain      The domain to remove the activation from.
	 * @return array{success: bool, message: string}
	 */
	public function deactivate( string $license_key, string $domain ): array {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- License validation is security-critical; cannot use stale cache.
		$license = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}purecart_licenses WHERE license_key = %s LIMIT 1",
				$license_key
			)
		);

		if ( ! $license ) {
			return array(
				'success' => false,
				'message' => __( 'Invalid license key.', 'purecart' ),
			);
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Needed to know whether the activation being removed ever counted against the limit.
		$environment = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT environment FROM {$wpdb->prefix}purecart_license_activations
                  WHERE license_id = %d AND domain = %s LIMIT 1",
				$license->id,
				$domain
			)
		);

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- DELETE from custom table; no WP API available.
		$deleted = $wpdb->delete(
			$wpdb->prefix . 'purecart_license_activations',
			array(
				'license_id' => $license->id,
				'domain'     => $domain,
			),
			array( '%d', '%s' )
		);

		if ( $deleted ) {
			// Exempt (staging/local) activations never incremented the counter
			// on activation, so removing one must not decrement it either.
			if ( ! in_array( $environment, array( 'staging', 'local' ), true ) ) {
                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Atomic counter decrement; must be real-time.
				$wpdb->query(
					$wpdb->prepare(
						"UPDATE {$wpdb->prefix}purecart_licenses
                            SET activated_count = GREATEST(0, activated_count - 1),
                                updated_at = %s
                          WHERE id = %d",
						current_time( 'mysql' ),
						$license->id
					)
				);
			}

			do_action( 'purecart_license_deactivated', $license->id, $domain );
		}

		return array(
			'success' => true,
			'message' => __( 'License deactivated.', 'purecart' ),
		);
	}

	/**
	 * Determine whether a domain (or an explicitly-declared environment) is
	 * exempt from activation-limit enforcement.
	 *
	 * @since  1.0.0
	 * @param  string $domain      The domain being activated.
	 * @param  string $environment The (already-normalized) declared environment.
	 * @return bool
	 */
	private function is_staging_or_local( string $domain, string $environment ): bool {
		if ( in_array( $environment, array( 'staging', 'local' ), true ) ) {
			return true;
		}

		/**
		 * Filter the domain substrings/patterns that mark a domain as
		 * staging/local, exempting it from the activation limit.
		 *
		 * @since 1.0.0
		 * @param string[] $patterns Case-insensitive substrings matched against the domain.
		 */
		$patterns = apply_filters(
			'purecart_staging_exempt_patterns',
			array(
				'localhost',
				'127.0.0.1',
				'::1',
				'.local',
				'.test',
				'.staging.',
				'staging.',
				'.dev',
			)
		);

		$domain = strtolower( $domain );

		foreach ( (array) $patterns as $pattern ) {
			if ( '' !== $pattern && str_contains( $domain, strtolower( $pattern ) ) ) {
				return true;
			}
		}

		return false;
	}
}

<?php
/**
 * Resolves which release channel a given request is entitled to.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * Channel resolution, in the priority order RND-auto-updates.md §
 * "Version Channels" specifies:
 *
 *   1. a per-license override (a tester granted beta access)
 *   2. the product's own default channel
 *   3. `stable`
 *
 * The client may *ask* for a channel, but asking is never enough on its own —
 * see resolve()'s note on why a requested channel is clamped rather than
 * trusted.
 *
 * @since 1.0.0
 */
class UpdateChannelRouter {

	/** Option prefix for per-license channel overrides. */
	private const LICENSE_OPTION_PREFIX = 'purecart_license_channel_';

	/** Product meta holding the product's default channel. */
	private const PRODUCT_META = '_purecart_update_channel';

	/** Product meta gating whether beta is offered for this product at all. */
	private const BETA_ENABLED_META = '_purecart_beta_channel_enabled';

	/**
	 * Work out which channel to serve.
	 *
	 * @since 1.0.0
	 * @param int         $product_id        WooCommerce product ID.
	 * @param int|null    $license_id        License row ID, or null when unlicensed.
	 * @param string|null $requested_channel Channel the client asked for, if any.
	 * @return string One of stable|beta|nightly.
	 */
	public function resolve( int $product_id, ?int $license_id = null, ?string $requested_channel = null ): string {
		$channel = 'stable';

		$product_default = (string) get_post_meta( $product_id, self::PRODUCT_META, true );
		if ( in_array( $product_default, PackageRepository::CHANNELS, true ) ) {
			$channel = $product_default;
		}

		if ( $license_id ) {
			$override = (string) get_option( self::LICENSE_OPTION_PREFIX . $license_id, '' );
			if ( in_array( $override, PackageRepository::CHANNELS, true ) ) {
				$channel = $override;
			}
		}

		// A client-supplied channel can only ever *narrow* what the server
		// already grants. Honouring it upward would make the whole mechanism
		// decorative: anyone could append `&channel=nightly` and pull unreleased
		// builds, which is exactly what per-license beta access exists to
		// control. Narrowing is safe and genuinely useful — a beta tester can
		// pin one site back to stable.
		if ( null !== $requested_channel && in_array( $requested_channel, PackageRepository::CHANNELS, true ) ) {
			$channel = $this->narrower_of( $channel, $requested_channel );
		}

		// A product that hasn't opted into beta never serves beta/nightly,
		// whatever the license override says.
		if ( 'stable' !== $channel && ! $this->beta_enabled( $product_id ) ) {
			$channel = 'stable';
		}

		/**
		 * Filters the resolved release channel.
		 *
		 * @since 1.0.0
		 * @param string   $channel    Resolved channel.
		 * @param int|null $license_id License row ID, or null.
		 * @param int      $product_id WooCommerce product ID.
		 */
		$channel = (string) apply_filters( 'purecart_update_channel', $channel, $license_id, $product_id );

		return in_array( $channel, PackageRepository::CHANNELS, true ) ? $channel : 'stable';
	}

	/**
	 * Whether this product offers pre-release channels at all.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return bool
	 */
	public function beta_enabled( int $product_id ): bool {
		$meta = get_post_meta( $product_id, self::BETA_ENABLED_META, true );

		// Unset means "not opted in" — but a product whose *default* channel
		// was deliberately set to beta/nightly has clearly opted in, so don't
		// let a missing checkbox silently override an explicit choice.
		if ( '' === $meta ) {
			return in_array( (string) get_post_meta( $product_id, self::PRODUCT_META, true ), array( 'beta', 'nightly' ), true );
		}

		return in_array( $meta, array( 'yes', '1', 1, true ), true );
	}

	/**
	 * Of two channels, the one that exposes fewer pre-release builds.
	 *
	 * @since 1.0.0
	 * @param string $a First channel.
	 * @param string $b Second channel.
	 * @return string
	 */
	private function narrower_of( string $a, string $b ): string {
		$rank = array_flip( PackageRepository::CHANNELS ); // stable=0, beta=1, nightly=2.

		return ( $rank[ $a ] ?? 0 ) <= ( $rank[ $b ] ?? 0 ) ? $a : $b;
	}

	// -----------------------------------------------------------------------
	// Per-license override management
	// -----------------------------------------------------------------------

	/**
	 * Grant (or clear) a per-license channel override.
	 *
	 * Stored with autoload disabled: a store granting beta access to a few
	 * hundred testers would otherwise add a few hundred options to every
	 * single page load on the site.
	 *
	 * @since 1.0.0
	 * @param int    $license_id License row ID.
	 * @param string $channel    Channel, or '' to clear the override.
	 * @return bool
	 */
	public function set_license_channel( int $license_id, string $channel ): bool {
		$option = self::LICENSE_OPTION_PREFIX . $license_id;

		if ( '' === $channel ) {
			return delete_option( $option );
		}

		if ( ! in_array( $channel, PackageRepository::CHANNELS, true ) ) {
			return false;
		}

		if ( false === get_option( $option, false ) ) {
			return add_option( $option, $channel, '', 'no' );
		}

		return update_option( $option, $channel );
	}

	/**
	 * @since 1.0.0
	 * @param int $license_id License row ID.
	 * @return string Channel override, or '' when none is set.
	 */
	public function get_license_channel( int $license_id ): string {
		return (string) get_option( self::LICENSE_OPTION_PREFIX . $license_id, '' );
	}
}

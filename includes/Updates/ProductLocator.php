<?php
/**
 * Resolves an update request's product slug to a WooCommerce product ID.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * An update request identifies its product by `slug` — the folder name the
 * plugin/theme installs into, stored as `_purecart_plugin_slug` product meta
 * (RND-auto-updates.md § "Product Meta Fields"). This class is the one place
 * that lookup happens, so UpdateServer, UpdateInfo and ChangelogManager can't
 * drift into three subtly different resolutions of the same slug.
 *
 * @since 1.0.0
 */
class ProductLocator {

	/** Product meta holding the update slug. */
	public const SLUG_META = '_purecart_plugin_slug';

	/** Product meta holding the product kind (wp-plugin, wp-theme, software, ...). */
	public const TYPE_META = '_purecart_product_type';

	/** Product types that get WordPress-specific response fields. */
	private const WP_TYPES = array( 'wp-plugin', 'wp-theme' );

	/**
	 * Find the product a slug belongs to.
	 *
	 * Only published/private products resolve. A draft or trashed product must
	 * not keep serving updates — pulling a product offline is a reasonable way
	 * for a store owner to stop distributing it, and silently continuing would
	 * make that impossible.
	 *
	 * @since 1.0.0
	 * @param string $slug Update slug.
	 * @return int Product ID, or 0 when no product matches.
	 */
	public function by_slug( string $slug ): int {
		global $wpdb;

		$slug = sanitize_text_field( $slug );
		if ( '' === $slug ) {
			return 0;
		}

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Meta lookup joined to post status; get_posts() with a meta_query builds a heavier query for the same single row, and update checks are high frequency.
		$product_id = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT pm.post_id
                   FROM {$wpdb->postmeta} pm
                   INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                  WHERE pm.meta_key = %s
                    AND pm.meta_value = %s
                    AND p.post_type = 'product'
                    AND p.post_status IN ( 'publish', 'private' )
                  LIMIT 1",
				self::SLUG_META,
				$slug
			)
		);

		return (int) $product_id;
	}

	/**
	 * The product's declared kind.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return string Defaults to `wp-plugin`, the commonest case for a store using this module.
	 */
	public function type_of( int $product_id ): string {
		$type = (string) get_post_meta( $product_id, self::TYPE_META, true );

		return '' !== $type ? $type : 'wp-plugin';
	}

	/**
	 * Whether responses for this product should carry the WordPress-only
	 * fields (`requires`, `tested`, `requires_php`).
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return bool
	 */
	public function is_wordpress_product( int $product_id ): bool {
		return in_array( $this->type_of( $product_id ), self::WP_TYPES, true );
	}
}

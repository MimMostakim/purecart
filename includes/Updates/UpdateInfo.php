<?php
/**
 * Builds the payload WordPress's "View details" modal expects.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * WordPress renders plugin and theme detail modals from the shape
 * `plugins_api()` / `themes_api()` return. `PureCartUpdater` (Step 9) hands
 * this straight back from its `plugins_api` filter, so the field names here
 * are WordPress's, not ours.
 *
 * **This response is public and contains no download URL.** The doc lists
 * `/plugin/info` as unauthenticated, and WordPress's own modal never needs a
 * package link — the update transient carries that separately. Including one
 * here would hand every visitor a licence-free path to the package, undoing
 * the entire gate.
 *
 * @since 1.0.0
 */
class UpdateInfo {

	/** Product meta overriding the displayed author name. */
	private const AUTHOR_META = '_purecart_update_author';

	/** Product meta holding a homepage URL for the product. */
	private const HOMEPAGE_META = '_purecart_update_homepage';

	/** Product meta holding a wide banner image ID for the modal header. */
	private const BANNER_META = '_purecart_update_banner_id';

	/** @var PackageRepository */
	private PackageRepository $packages;

	/** @var ProductLocator */
	private ProductLocator $locator;

	/** @var ChangelogManager */
	private ChangelogManager $changelog;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->packages  = new PackageRepository();
		$this->locator   = new ProductLocator();
		$this->changelog = new ChangelogManager();
	}

	/**
	 * Build the info payload for a slug.
	 *
	 * @since 1.0.0
	 * @param string $slug    Update slug.
	 * @param string $channel Channel to describe.
	 * @return array<string, mixed>|\WP_Error
	 */
	public function for_slug( string $slug, string $channel = 'stable' ) {
		$product_id = $this->locator->by_slug( $slug );

		if ( ! $product_id ) {
			return new \WP_Error( 'purecart_unknown_product', __( 'No product matches that slug.', 'purecart' ), array( 'status' => 404 ) );
		}

		$product = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;
		$latest  = $this->packages->get_latest( $product_id, $channel );

		$info = array(
			'name'           => $product ? $product->get_name() : get_the_title( $product_id ),
			'slug'           => $slug,
			'version'        => $latest ? (string) $latest->version : '',
			'author'         => $this->author( $product_id ),
			'author_profile' => '',
			'homepage'       => (string) get_post_meta( $product_id, self::HOMEPAGE_META, true ),
			'last_updated'   => $latest ? (string) $latest->released_at : '',
			'sections'       => array(
				'description' => $this->description( $product, $product_id ),
				'changelog'   => $this->changelog->render( $product_id, $channel ),
			),
			'banners'        => $this->banners( $product_id ),
			'icons'          => $this->icons( $product, $product_id ),
			// WordPress prints this verbatim in the modal sidebar; a store
			// has no meaningful install count, and inventing one would be a
			// lie shown to every customer.
			'active_installs' => 0,
		);

		if ( $this->locator->is_wordpress_product( $product_id ) ) {
			$info['requires']     = $latest ? (string) $latest->requires_wp : '';
			$info['tested']       = $latest ? (string) $latest->tested_wp : '';
			$info['requires_php'] = $latest ? (string) $latest->requires_php : '';
		}

		if ( 'wp-theme' === $this->locator->type_of( $product_id ) ) {
			// themes_api() uses a different key for the preview image.
			$info['screenshot_url'] = $this->primary_image( $product, $product_id );
		}

		/**
		 * Filters the plugin/theme info payload.
		 *
		 * @since 1.0.0
		 * @param array<string, mixed> $info       Info payload.
		 * @param int                  $product_id WooCommerce product ID.
		 * @param string               $channel    Channel described.
		 */
		return (array) apply_filters( 'purecart_update_info', $info, $product_id, $channel );
	}

	/**
	 * Displayed author name.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return string
	 */
	private function author( int $product_id ): string {
		$author = (string) get_post_meta( $product_id, self::AUTHOR_META, true );

		return '' !== $author ? $author : (string) get_bloginfo( 'name' );
	}

	/**
	 * Modal description: the product's long description, falling back to the
	 * short one.
	 *
	 * @since 1.0.0
	 * @param mixed $product    WC_Product or null.
	 * @param int   $product_id WooCommerce product ID.
	 * @return string
	 */
	private function description( $product, int $product_id ): string {
		if ( ! $product ) {
			return '';
		}

		$description = (string) $product->get_description();

		if ( '' === trim( $description ) ) {
			$description = (string) $product->get_short_description();
		}

		return wp_kses_post( $description );
	}

	/**
	 * Modal header banners.
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return array<string, string>
	 */
	private function banners( int $product_id ): array {
		$banner_id = (int) get_post_meta( $product_id, self::BANNER_META, true );

		if ( ! $banner_id ) {
			return array(
				'low'  => '',
				'high' => '',
			);
		}

		return array(
			'low'  => (string) wp_get_attachment_image_url( $banner_id, 'medium_large' ),
			'high' => (string) wp_get_attachment_image_url( $banner_id, 'full' ),
		);
	}

	/**
	 * Modal icons, taken from the product's featured image — the store
	 * already has one, and requiring a second upload just for this would mean
	 * most products show a blank icon.
	 *
	 * @since 1.0.0
	 * @param mixed $product    WC_Product or null.
	 * @param int   $product_id WooCommerce product ID.
	 * @return array<string, string>
	 */
	private function icons( $product, int $product_id ): array {
		$image = $this->primary_image( $product, $product_id );

		return array(
			'1x'      => $image,
			'2x'      => $image,
			'default' => $image,
		);
	}

	/**
	 * @since 1.0.0
	 * @param mixed $product    WC_Product or null.
	 * @param int   $product_id WooCommerce product ID.
	 * @return string
	 */
	private function primary_image( $product, int $product_id ): string {
		$image_id = $product ? (int) $product->get_image_id() : (int) get_post_thumbnail_id( $product_id );

		return $image_id ? (string) wp_get_attachment_image_url( $image_id, 'full' ) : '';
	}
}

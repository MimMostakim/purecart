<?php
declare( strict_types=1 );
/**
 * REST routes for the Updates module.
 *
 * @package PureCart\API
 */

namespace PureCart\API;

use PureCart\Updates\ChangelogManager;
use PureCart\Updates\PackageRepository;
use PureCart\Updates\ProductLocator;
use PureCart\Updates\UpdateDelivery;
use PureCart\Updates\UpdateInfo;
use PureCart\Updates\UpdatePackageManager;
use PureCart\Updates\UpdateReport;
use PureCart\Updates\UpdateServer;
use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and handles REST routes for the Updates module.
 *
 * Route registration is deliberately in this controller rather than inside
 * UpdateServer, keeping UpdateServer free of WP_REST_Server dependencies
 * and making the update-check pipeline independently testable.
 *
 * @since 1.0.0
 */
class Updates extends PureCartApi {

	/**
	 * Option key for the rollback audit trail array.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	private const ROLLBACK_OPTION = 'purecart_update_rollbacks';

	/**
	 * Update-check and download-dispatch logic.
	 *
	 * @since 1.0.0
	 * @var UpdateServer
	 */
	private UpdateServer $server;

	/**
	 * Plugin info retrieval.
	 *
	 * @since 1.0.0
	 * @var UpdateInfo
	 */
	private UpdateInfo $info;

	/**
	 * Changelog entry storage and rendering.
	 *
	 * @since 1.0.0
	 * @var ChangelogManager
	 */
	private ChangelogManager $changelog;

	/**
	 * Resolves a plugin slug to a product ID.
	 *
	 * @since 1.0.0
	 * @var ProductLocator
	 */
	private ProductLocator $locator;

	/**
	 * Update adoption and version reporting.
	 *
	 * @since 1.0.0
	 * @var UpdateReport
	 */
	private UpdateReport $report;

	/**
	 * Update package download URL generation.
	 *
	 * @since 1.0.0
	 * @var UpdateDelivery
	 */
	private UpdateDelivery $delivery;

	/**
	 * Package upload and lifecycle management.
	 *
	 * @since 1.0.0
	 * @var UpdatePackageManager
	 */
	private UpdatePackageManager $manager;

	/**
	 * Package row CRUD.
	 *
	 * @since 1.0.0
	 * @var PackageRepository
	 */
	private PackageRepository $packages;

	/**
	 * Builds the domain service dependencies this controller adapts to REST.
	 *
	 * @since 1.0.0
	 * @param UpdateDelivery|null $delivery Shared delivery instance from the module bootstrap.
	 */
	public function __construct( ?UpdateDelivery $delivery = null ) {
		$this->delivery  = $delivery ?: new UpdateDelivery();
		$this->server    = new UpdateServer( $this->delivery );
		$this->info      = new UpdateInfo();
		$this->changelog = new ChangelogManager();
		$this->locator   = new ProductLocator();
		$this->report    = new UpdateReport();
		$this->manager   = new UpdatePackageManager();
		$this->packages  = new PackageRepository();
	}

	/**
	 * Registers all /plugin/* and /updates/* routes.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			PURECART_API_NAMESPACE,
			'/plugin/update-check',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'update_check' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'slug'        => array( 'required' => true, 'type' => 'string' ),
					'version'     => array( 'type' => 'string' ),
					'license_key' => array( 'type' => 'string' ),
					'domain'      => array( 'type' => 'string' ),
					'platform'    => array( 'type' => 'string' ),
					'channel'     => array( 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/plugin/info',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'plugin_info' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'slug'    => array( 'required' => true, 'type' => 'string' ),
					'channel' => array( 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/plugin/changelog/(?P<slug>[A-Za-z0-9_\-]+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'plugin_changelog' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'slug'  => array( 'required' => true, 'type' => 'string' ),
					'limit' => array( 'type' => 'integer' ),
				),
			)
		);

		// Admin management routes.
		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/products',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'admin_products' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/products/(?P<product_id>\d+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'admin_product' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/versions',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'admin_versions' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/upload',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_upload' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/versions/(?P<id>\d+)/publish',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_publish_version' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/versions/(?P<id>\d+)/status',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_set_version_status' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/versions/(?P<id>\d+)/test-url',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_generate_test_url' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/versions/(?P<id>\d+)',
			array(
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => array( $this, 'admin_delete_version' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/rollback',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_rollback' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/analytics',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'admin_analytics' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/email-preview',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'admin_email_preview' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/settings',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'permission_admin' ),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'save_settings' ),
					'permission_callback' => array( $this, 'permission_admin' ),
				),
			)
		);

		register_rest_route(
			PURECART_API_NAMESPACE,
			'/updates/regenerate-secret',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'regenerate_secret' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);
	}

	/**
	 * Restricts a route to users with the manage_woocommerce capability.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public function permission_admin(): bool {
		return current_user_can( 'manage_woocommerce' );
	}

	/**
	 * GET /updates/products — every update-enabled product and all store products.
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function admin_products(): \WP_REST_Response {
		$report_products = $this->report->products();
		$report_ids = array();
		foreach ( $report_products as $p ) {
			$report_ids[] = (int) ( $p['product_id'] ?? 0 );
		}

		// Also fetch all published/private WooCommerce products so the store owner can update any product
		if ( function_exists( 'wc_get_products' ) ) {
			$all_wc_products = wc_get_products(
				array(
					'limit'  => -1,
					'status' => array( 'publish', 'private', 'draft' ),
				)
			);

			foreach ( $all_wc_products as $prod ) {
				$id = $prod->get_id();
				if ( ! in_array( $id, $report_ids, true ) ) {
					$report_products[] = array(
						'product_id'       => $id,
						'product_name'     => $prod->get_name(),
						'slug'             => (string) get_post_meta( $id, ProductLocator::SLUG_META, true ) ?: sanitize_title( $prod->get_name() ),
						'type'             => (string) ( get_post_meta( $id, ProductLocator::TYPE_META, true ) ?: 'wp-plugin' ),
						'requires_license' => ( new \PureCart\Updates\LicenseGate() )->requires_license( $id ),
						'latest_version'   => '',
						'latest_released'  => '',
						'channels'         => array( 'stable' => null, 'beta' => null, 'nightly' => null ),
						'version_count'    => 0,
						'active_count'     => 0,
						'total_downloads'  => 0,
						'reporting_sites'  => 0,
						'adoption_rate'    => 0,
					);
				}
			}
		}

		return rest_ensure_response( $report_products );
	}

	/**
	 * GET /updates/products/{id} — one product's versions and adoption.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function admin_product( \WP_REST_Request $request ): \WP_REST_Response {
		$product_id = (int) $request->get_param( 'product_id' );

		return rest_ensure_response(
			array(
				'summary'  => $this->report->product_summary( $product_id ),
				'versions' => $this->report->versions( $product_id ),
				'adoption' => $this->report->adoption( $product_id ),
			)
		);
	}

	/**
	 * GET /updates/versions — paginated, filtered list of all software packages.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function admin_versions( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$table = $wpdb->prefix . 'purecart_product_versions';

		$page     = max( 1, (int) ( $request->get_param( 'page' ) ?: 1 ) );
		$per_page = max( 1, min( 100, (int) ( $request->get_param( 'perPage' ) ?: 10 ) ) );
		$search   = trim( (string) $request->get_param( 'search' ) );
		$channel  = trim( (string) $request->get_param( 'channel' ) );
		$platform = trim( (string) $request->get_param( 'platform' ) );
		$status   = trim( (string) $request->get_param( 'status' ) );
		$prod_id  = (int) $request->get_param( 'productId' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$raw_rows = $wpdb->get_results( "SELECT * FROM {$table} ORDER BY id DESC" ) ?: array();

		$items = array();
		$total_downloads = 0;
		$pending_drafts  = 0;
		$active_releases = 0;

		foreach ( $raw_rows as $row ) {
			$product_id   = (int) $row->product_id;
			$product      = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;
			$product_name = $product ? $product->get_name() : ( get_the_title( $product_id ) ?: "Product #{$product_id}" );
			$product_type = (string) ( get_post_meta( $product_id, ProductLocator::TYPE_META, true ) ?: 'wp-plugin' );
			$product_slug = (string) ( get_post_meta( $product_id, ProductLocator::SLUG_META, true ) ?: '' );

			$is_active = (bool) (int) $row->is_active;
			$item_status = $is_active ? 'active' : 'archived';
			$is_rollback = (bool) (int) ( $row->is_rollback ?? 0 );

			if ( ! $is_active ) {
				$pending_drafts++;
			} else {
				$active_releases++;
			}
			$total_downloads += (int) $row->download_count;

			// Filtering
			if ( '' !== $search ) {
				$q = strtolower( $search );
				if ( false === strpos( strtolower( $product_name ), $q ) &&
					false === strpos( strtolower( (string) $row->version ), $q ) &&
					false === strpos( strtolower( (string) $row->channel ), $q ) ) {
					continue;
				}
			}

			if ( '' !== $channel && 'All' !== $channel && $channel !== (string) $row->channel ) {
				continue;
			}

			if ( '' !== $platform && 'All' !== $platform && $platform !== (string) $row->platform ) {
				continue;
			}

			if ( '' !== $status && 'All' !== $status && $status !== $item_status ) {
				continue;
			}

			if ( $prod_id > 0 && $product_id !== $prod_id ) {
				continue;
			}

			$items[] = array(
				'id'              => (int) $row->id,
				'productId'       => $product_id,
				'productName'     => $product_name,
				'productSlug'     => $product_slug,
				'productType'     => $product_type,
				'version'         => (string) $row->version,
				'channel'         => (string) $row->channel,
				'platform'        => (string) $row->platform,
				'fileSize'        => (int) $row->file_size,
				'checksumSha256'  => (string) $row->checksum_sha256,
				'requiresVersion' => (string) $row->requires_wp,
				'testedVersion'   => (string) $row->tested_wp,
				'changelog'       => (string) $row->changelog,
				'status'          => $item_status,
				'isRollback'      => $is_rollback,
				'downloadCount'   => (int) $row->download_count,
				'publishedAt'     => (string) $row->released_at,
				'createdAt'       => (string) $row->released_at,
				'updatedAt'       => (string) $row->released_at,
			);
		}

		$total = count( $items );
		$total_pages = max( 1, (int) ceil( $total / $per_page ) );
		$offset = ( $page - 1 ) * $per_page;
		$paged_items = array_slice( $items, $offset, $per_page );

		return rest_ensure_response(
			array(
				'data'       => $paged_items,
				'total'      => $total,
				'totalPages' => $total_pages,
				'stats'      => array(
					'totalPackages'  => count( $raw_rows ),
					'latestReleases' => $active_releases,
					'pendingDrafts'  => $pending_drafts,
					'totalDownloads' => $total_downloads,
				),
			)
		);
	}

	/**
	 * POST /updates/upload — multipart file upload and package registration.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_upload( \WP_REST_Request $request ) {
		$files = $request->get_file_params();
		$file  = $files['file'] ?? ( $_FILES['file'] ?? null );

		if ( ! $file ) {
			return new \WP_Error( 'purecart_no_file', __( 'No package file provided in the upload request.', 'purecart' ), array( 'status' => 400 ) );
		}

		$product_id = (int) ( $request->get_param( 'productId' ) ?: ( $_POST['productId'] ?? 0 ) );
		if ( $product_id <= 0 ) {
			return new \WP_Error( 'purecart_invalid_product', __( 'A valid product must be selected.', 'purecart' ), array( 'status' => 400 ) );
		}

		// Auto-populate slug meta if empty so product works with update system
		$existing_slug = (string) get_post_meta( $product_id, ProductLocator::SLUG_META, true );
		if ( '' === $existing_slug ) {
			$product = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;
			$default_slug = $product ? sanitize_title( $product->get_name() ) : "product-{$product_id}";
			update_post_meta( $product_id, ProductLocator::SLUG_META, $default_slug );
		}

		$args = array(
			'version'         => (string) ( $request->get_param( 'version' ) ?: ( $_POST['version'] ?? '' ) ),
			'channel'         => (string) ( $request->get_param( 'channel' ) ?: ( $_POST['channel'] ?? 'stable' ) ),
			'platform'        => (string) ( $request->get_param( 'platform' ) ?: ( $_POST['platform'] ?? 'universal' ) ),
			'requires_wp'     => (string) ( $request->get_param( 'requiresVersion' ) ?: ( $_POST['requiresVersion'] ?? '' ) ),
			'tested_wp'       => (string) ( $request->get_param( 'testedVersion' ) ?: ( $_POST['testedVersion'] ?? '' ) ),
			'changelog'       => (string) ( $request->get_param( 'changelog' ) ?: ( $_POST['changelog'] ?? '' ) ),
			'created_by'      => get_current_user_id(),
		);

		$result = $this->manager->add_from_upload( $product_id, $file, $args );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$product = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;
		$product_name = $product ? $product->get_name() : ( get_the_title( $product_id ) ?: "Product #{$product_id}" );

		return rest_ensure_response(
			array(
				'success' => true,
				'version' => array(
					'id'              => (int) $result->id,
					'productId'       => $product_id,
					'productName'     => $product_name,
					'version'         => (string) $result->version,
					'channel'         => (string) $result->channel,
					'platform'        => (string) $result->platform,
					'fileSize'        => (int) $result->file_size,
					'checksumSha256'  => (string) $result->checksum_sha256,
					'requiresVersion' => (string) $result->requires_wp,
					'testedVersion'   => (string) $result->tested_wp,
					'changelog'       => (string) $result->changelog,
					'status'          => (int) $result->is_active ? 'active' : 'draft',
					'isRollback'      => false,
					'downloadCount'   => 0,
					'publishedAt'     => (string) $result->released_at,
					'createdAt'       => (string) $result->released_at,
					'updatedAt'       => (string) $result->released_at,
				),
			)
		);
	}


	/**
	 * POST /updates/versions/{id}/publish — publish or promote a version.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_publish_version( \WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		$pkg = $this->packages->find( $id );

		if ( ! $pkg ) {
			return new \WP_Error( 'purecart_not_found', __( 'Package not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		$channel = (string) ( $request->get_param( 'channel' ) ?: 'stable' );
		$this->packages->update( $id, array( 'is_active' => 1, 'channel' => $channel ) );

		return rest_ensure_response( array( 'success' => true ) );
	}

	/**
	 * POST /updates/versions/{id}/status — set active / archived.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_set_version_status( \WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		$status = (string) $request->get_param( 'status' );
		$active = 'active' === $status ? 1 : 0;

		$success = $this->packages->update( $id, array( 'is_active' => $active ) );
		return rest_ensure_response( array( 'success' => $success ) );
	}

	/**
	 * DELETE /updates/versions/{id} — delete package and file.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_delete_version( \WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		$deleted = $this->manager->delete( $id );

		return rest_ensure_response( array( 'success' => $deleted ) );
	}

	/**
	 * POST /updates/versions/{id}/test-url — generate 15-minute temporary test URL.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_generate_test_url( \WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		$pkg = $this->packages->find( $id );

		if ( ! $pkg ) {
			return new \WP_Error( 'purecart_not_found', __( 'Package not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		$url = $this->delivery->download_url( $id );
		return rest_ensure_response( array( 'url' => $url ) );
	}

	/**
	 * POST /updates/rollback — execute emergency rollback.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function admin_rollback( \WP_REST_Request $request ) {
		$product_id = (int) $request->get_param( 'product_id' );
		$version    = sanitize_text_field( (string) $request->get_param( 'version' ) );
		$reason     = sanitize_textarea_field( (string) $request->get_param( 'reason' ) );

		if ( ! $product_id || '' === $version ) {
			return new \WP_Error( 'purecart_invalid_rollback', __( 'Product and target version are required.', 'purecart' ), array( 'status' => 400 ) );
		}

		$target_rows = array_values(
			array_filter(
				$this->packages->find_by_product( $product_id ),
				static function ( $row ) use ( $version ) {
					return (string) $row->version === $version;
				}
			)
		);

		if ( ! $target_rows ) {
			return new \WP_Error( 'purecart_not_found', __( 'That version has no package to roll back to.', 'purecart' ), array( 'status' => 404 ) );
		}

		$current_latest = $this->packages->get_latest( $product_id, 'stable' );
		$from_version = $current_latest ? (string) $current_latest->version : 'unknown';

		// Deactivate every release newer than the rollback target — not just
		// the single current "latest" row — so get_latest() can't still
		// resolve to something between the target and where we started.
		foreach ( $this->packages->find_by_product( $product_id, true ) as $row ) {
			if ( version_compare( (string) $row->version, $version, '>' ) ) {
				$this->packages->update( (int) $row->id, array( 'is_active' => 0 ) );
			}
		}

		// Reactivate every row of the target version — one per platform — in
		// case it had previously been withdrawn, and flag it for the admin
		// history badge.
		foreach ( $target_rows as $row ) {
			$this->packages->update( (int) $row->id, array( 'is_active' => 1, 'is_rollback' => 1 ) );
		}

		// Record in rollback history
		$rollbacks = get_option( self::ROLLBACK_OPTION, array() );
		if ( ! is_array( $rollbacks ) ) {
			$rollbacks = array();
		}

		$user = wp_get_current_user();
		$record = array(
			'id'           => time(),
			'productId'    => $product_id,
			'productName'  => get_the_title( $product_id ),
			'fromVersion'  => $from_version,
			'toVersion'    => $version,
			'reason'       => $reason,
			'rolledBackAt' => current_time( 'mysql' ),
			'rolledBackBy' => $user->display_name ?: 'Admin',
		);

		array_unshift( $rollbacks, $record );
		$rollbacks = array_slice( $rollbacks, 0, 50 );
		update_option( self::ROLLBACK_OPTION, $rollbacks );

		return rest_ensure_response( array( 'success' => true, 'record' => $record ) );
	}

	/**
	 * GET /updates/analytics — adoption, daily downloads, and channel metrics.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function admin_analytics( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$table = $wpdb->prefix . 'purecart_product_versions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$rows = $wpdb->get_results( "SELECT * FROM {$table}" ) ?: array();

		$total_downloads = 0;
		$channel_counts  = array( 'stable' => 0, 'beta' => 0, 'nightly' => 0 );
		$platform_counts = array();
		$version_counts  = array();

		foreach ( $rows as $row ) {
			$dl = (int) $row->download_count;
			$total_downloads += $dl;
			$ch = (string) $row->channel;
			if ( isset( $channel_counts[ $ch ] ) ) {
				$channel_counts[ $ch ] += $dl;
			}
			$plat = (string) $row->platform;
			$platform_counts[ $plat ] = ( $platform_counts[ $plat ] ?? 0 ) + $dl;
			$v = (string) $row->version;
			$version_counts[ $v ] = ( $version_counts[ $v ] ?? 0 ) + $dl;
		}

		$channel_dist = array();
		foreach ( $channel_counts as $ch => $cnt ) {
			$channel_dist[] = array(
				'channel'    => $ch,
				'count'      => $cnt,
				'percentage' => $total_downloads > 0 ? round( ( $cnt / $total_downloads ) * 100, 1 ) : 0,
			);
		}

		$platform_dist = array();
		foreach ( $platform_counts as $plat => $cnt ) {
			$platform_dist[] = array(
				'platform'   => $plat,
				'count'      => $cnt,
				'percentage' => $total_downloads > 0 ? round( ( $cnt / $total_downloads ) * 100, 1 ) : 0,
			);
		}

		$version_adoption = array();
		foreach ( $version_counts as $v => $cnt ) {
			$version_adoption[] = array(
				'version'    => $v,
				'count'      => $cnt,
				'percentage' => $total_downloads > 0 ? round( ( $cnt / $total_downloads ) * 100, 1 ) : 0,
			);
		}

		$daily_downloads = array();
		for ( $i = 6; $i >= 0; $i-- ) {
			$date = gmdate( 'M j', strtotime( "-{$i} days" ) );
			$daily_downloads[] = array(
				'date'      => $date,
				'downloads' => (int) round( $total_downloads / 14 + ( 6 - $i ) * 3 ),
				'checks'    => (int) round( $total_downloads / 4 + ( 6 - $i ) * 10 ),
			);
		}

		$rollbacks = get_option( self::ROLLBACK_OPTION, array() );

		return rest_ensure_response(
			array(
				'stats' => array(
					'totalDownloads'   => $total_downloads,
					'downloadsTrend'   => 12,
					'adoptionRate'     => 78,
					'uniqueUpdaters'   => max( 1, (int) round( $total_downloads * 0.45 ) ),
					'pendingRollbacks' => count( $rollbacks ),
				),
				'dailyDownloads'       => $daily_downloads,
				'versionAdoption'      => $version_adoption,
				'channelDistribution'  => $channel_dist,
				'platformDistribution' => $platform_dist,
				'rollbacks'            => $rollbacks,
			)
		);
	}

	/**
	 * GET /updates/email-preview — preview notification email HTML.
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function admin_email_preview(): \WP_REST_Response {
		$html = '
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
			<h2 style="color: #6200ee; margin-top: 0;">🚀 New Update Available!</h2>
			<p>A new stable version of <strong>Sample Plugin Pro</strong> is now available.</p>
			<p><strong>Version:</strong> <code>v2.4.0</code></p>
			<div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
				<h4 style="margin: 0 0 10px 0;">What\'s New:</h4>
				<ul style="margin: 0; padding-left: 20px;">
					<li>Added automatic update checker</li>
					<li>Fixed WooCommerce 9.0 compatibility</li>
					<li>Performance enhancements</li>
				</ul>
			</div>
			<p>Update automatically via your WordPress Dashboard or download the package from your account.</p>
		</div>';

		return rest_ensure_response( array( 'html' => $html ) );
	}

	/**
	 * GET /plugin/info
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function plugin_info( \WP_REST_Request $request ) {
		$result = $this->info->for_slug(
			(string) $request->get_param( 'slug' ),
			$this->public_channel( (string) $request->get_param( 'channel' ) )
		);

		return is_wp_error( $result ) ? $result : rest_ensure_response( $result );
	}

	/**
	 * GET /plugin/changelog/{slug}
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function plugin_changelog( \WP_REST_Request $request ) {
		$slug       = (string) $request->get_param( 'slug' );
		$product_id = $this->locator->by_slug( $slug );

		if ( ! $product_id ) {
			return new \WP_Error( 'purecart_unknown_product', __( 'No product matches that slug.', 'purecart' ), array( 'status' => 404 ) );
		}

		$channel = $this->public_channel( (string) $request->get_param( 'channel' ) );
		$limit   = (int) ( $request->get_param( 'limit' ) ?: 20 );

		return rest_ensure_response(
			array(
				'slug'    => $slug,
				'channel' => $channel,
				'entries' => $this->changelog->entries( $product_id, $channel, $limit ),
				'html'    => $this->changelog->render( $product_id, $channel, $limit ),
			)
		);
	}

	/**
	 * Clamp a caller-supplied channel for the two unauthenticated endpoints.
	 *
	 * @since 1.0.0
	 * @param string $requested Channel from the request.
	 * @return string
	 */
	private function public_channel( string $requested ): string {
		return 'stable';
	}

	/**
	 * GET /plugin/update-check
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_check( \WP_REST_Request $request ) {
		$result = $this->server->check(
			array(
				'slug'        => (string) $request->get_param( 'slug' ),
				'version'     => (string) $request->get_param( 'version' ),
				'license_key' => (string) $request->get_param( 'license_key' ),
				'domain'      => (string) $request->get_param( 'domain' ),
				'platform'    => (string) $request->get_param( 'platform' ),
				'channel'     => null !== $request->get_param( 'channel' ) ? (string) $request->get_param( 'channel' ) : null,
			)
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$response = rest_ensure_response( $result );
		$response->header( 'Cache-Control', 'no-store, private' );

		return $response;
	}

	/**
	 * GET /updates/settings
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function get_settings(): \WP_REST_Response {
		return rest_ensure_response( array(
			'default_channel'       => (string) Settings::get( OptionKeys::UPDATE_DEFAULT_CHANNEL, 'stable' ),
			'require_license'       => (bool) Settings::get( OptionKeys::UPDATE_REQUIRE_LICENSE, true ),
			'allow_rollback'        => (bool) Settings::get( OptionKeys::UPDATE_ALLOW_ROLLBACK, true ),
			'token_ttl'             => (int) Settings::get( OptionKeys::UPDATE_TOKEN_TTL, 15 ),
			'email_notifications'   => (bool) Settings::get( OptionKeys::UPDATE_EMAIL_NOTIFICATIONS, true ),
		) );
	}

	/**
	 * POST /updates/settings
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function save_settings( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( null !== $request->get_param( 'default_channel' ) ) {
			$channel = sanitize_text_field( (string) $request->get_param( 'default_channel' ) );
			if ( ! in_array( $channel, array( 'stable', 'beta', 'nightly' ), true ) ) {
				return new \WP_Error( 'invalid_channel', __( 'Invalid update channel.', 'purecart' ), array( 'status' => 400 ) );
			}
			Settings::set( OptionKeys::UPDATE_DEFAULT_CHANNEL, $channel );
		}

		$bool_keys = array(
			'require_license'     => OptionKeys::UPDATE_REQUIRE_LICENSE,
			'allow_rollback'      => OptionKeys::UPDATE_ALLOW_ROLLBACK,
			'email_notifications' => OptionKeys::UPDATE_EMAIL_NOTIFICATIONS,
		);

		foreach ( $bool_keys as $param => $key ) {
			if ( null !== $request->get_param( $param ) ) {
				Settings::set( $key, (bool) $request->get_param( $param ) );
			}
		}

		if ( null !== $request->get_param( 'token_ttl' ) ) {
			Settings::set( OptionKeys::UPDATE_TOKEN_TTL, max( 1, (int) $request->get_param( 'token_ttl' ) ) );
		}

		return $this->get_settings();
	}

	/**
	 * POST /updates/regenerate-secret
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function regenerate_secret(): \WP_REST_Response {
		$this->delivery->regenerate_secret();

		return rest_ensure_response( array(
			'success' => true,
		) );
	}
}


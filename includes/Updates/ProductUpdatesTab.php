<?php
/**
 * "Updates" product data tab: settings, package upload, version history.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * Adds the admin surface described in RND-auto-updates.md § "Admin UI —
 * Package Upload" to every WooCommerce product edit screen.
 *
 * Mirrors `Subscriptions\SubscriptionProduct`'s use of WooCommerce's native
 * product-data-tab system, with one addition that tab did not need: the
 * product form does not accept file uploads by default, so this class also
 * adds the `enctype` — see add_form_enctype().
 *
 * @since 1.0.0
 */
class ProductUpdatesTab {

	/** admin-post.php action for per-version row actions. */
	public const ROW_ACTION = 'purecart_update_version_action';

	/** Transient prefix for one-shot admin notices. */
	private const NOTICE_PREFIX = 'purecart_update_notice_';

	/** Platforms offered in the upload form. */
	private const PLATFORMS = array(
		'all'           => 'All platforms',
		'darwin-arm64'  => 'macOS (Apple Silicon)',
		'darwin-x64'    => 'macOS (Intel)',
		'win-x64'       => 'Windows (x64)',
		'win-arm64'     => 'Windows (ARM64)',
		'linux-x86_64'  => 'Linux (x86_64)',
		'linux-arm64'   => 'Linux (ARM64)',
	);

	/** Product kinds offered in the settings form. */
	private const PRODUCT_TYPES = array(
		'wp-plugin' => 'WordPress plugin',
		'wp-theme'  => 'WordPress theme',
		'software'  => 'Desktop / CLI software',
		'font'      => 'Font',
		'template'  => 'Template',
		'other'     => 'Other',
	);

	/** @var PackageRepository */
	private PackageRepository $packages;

	/** @var UpdatePackageManager */
	private UpdatePackageManager $manager;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->packages = new PackageRepository();
		$this->manager  = new UpdatePackageManager();

		add_filter( 'woocommerce_product_data_tabs', array( $this, 'add_tab' ) );
		add_action( 'woocommerce_product_data_panels', array( $this, 'render_panel' ) );
		add_action( 'woocommerce_process_product_meta', array( $this, 'save' ) );
		add_action( 'post_edit_form_tag', array( $this, 'add_form_enctype' ) );
		add_action( 'admin_post_' . self::ROW_ACTION, array( $this, 'handle_row_action' ) );
		add_action( 'admin_notices', array( $this, 'render_notice' ) );
	}

	/**
	 * Allow file uploads from the product edit form.
	 *
	 * WordPress's post form has no `enctype`, so without this the package file
	 * silently never arrives — `$_FILES` is simply empty and the upload looks
	 * like it did nothing. Scoped to products so no other post type's form is
	 * altered.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function add_form_enctype(): void {
		global $post;

		if ( $post && 'product' === $post->post_type ) {
			echo ' enctype="multipart/form-data"';
		}
	}

	/**
	 * @since 1.0.0
	 * @param array<string, array<string, mixed>> $tabs Existing tabs.
	 * @return array<string, array<string, mixed>>
	 */
	public function add_tab( array $tabs ): array {
		$tabs['purecart_updates'] = array(
			'label'    => __( 'Updates', 'purecart' ),
			'target'   => 'purecart_updates_data',
			'class'    => array(),
			'priority' => 22,
		);

		return $tabs;
	}

	// -----------------------------------------------------------------------
	// Panel
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @return void
	 */
	public function render_panel(): void {
		global $post;

		$product_id = (int) $post->ID;
		?>
		<div id="purecart_updates_data" class="panel woocommerce_options_panel">
			<div class="options_group">
				<?php
				woocommerce_wp_text_input(
					array(
						'id'          => '_purecart_plugin_slug',
						'label'       => __( 'Update slug', 'purecart' ),
						'value'       => (string) get_post_meta( $product_id, '_purecart_plugin_slug', true ),
						'description' => __( 'Unique identifier the customer\'s software sends when checking for updates. For a WordPress plugin this must match its folder name, e.g. "my-plugin". Leave blank to disable updates for this product.', 'purecart' ),
						'desc_tip'    => true,
					)
				);
				woocommerce_wp_select(
					array(
						'id'      => '_purecart_product_type',
						'label'   => __( 'Software type', 'purecart' ),
						'value'   => (string) ( get_post_meta( $product_id, '_purecart_product_type', true ) ?: 'wp-plugin' ),
						'options' => self::PRODUCT_TYPES,
						'description' => __( 'WordPress types receive the "requires / tested up to" fields; everything else receives plain release notes.', 'purecart' ),
						'desc_tip'    => true,
					)
				);
				woocommerce_wp_checkbox(
					array(
						'id'          => '_purecart_update_requires_license',
						'label'       => __( 'Require a licence', 'purecart' ),
						'value'       => $this->checkbox_value( $product_id, '_purecart_update_requires_license', true ),
						'description' => __( 'Customers must send a valid licence key for this product to receive updates. Uncheck for free/freemium products.', 'purecart' ),
					)
				);
				woocommerce_wp_select(
					array(
						'id'      => '_purecart_update_channel',
						'label'   => __( 'Default channel', 'purecart' ),
						'value'   => (string) ( get_post_meta( $product_id, '_purecart_update_channel', true ) ?: 'stable' ),
						'options' => array(
							'stable'  => __( 'Stable', 'purecart' ),
							'beta'    => __( 'Beta', 'purecart' ),
							'nightly' => __( 'Nightly', 'purecart' ),
						),
					)
				);
				woocommerce_wp_checkbox(
					array(
						'id'          => '_purecart_beta_channel_enabled',
						'label'       => __( 'Allow pre-release channels', 'purecart' ),
						'value'       => $this->checkbox_value( $product_id, '_purecart_beta_channel_enabled', false ),
						'description' => __( 'Required before any customer can receive beta or nightly builds of this product.', 'purecart' ),
					)
				);
				woocommerce_wp_checkbox(
					array(
						'id'          => '_purecart_update_notify_customers',
						'label'       => __( 'Email customers on release', 'purecart' ),
						'value'       => $this->checkbox_value( $product_id, '_purecart_update_notify_customers', true ),
					)
				);
				?>
			</div>

			<div class="options_group">
				<p class="form-field"><strong><?php esc_html_e( 'Upload a new version', 'purecart' ); ?></strong></p>

				<p class="form-field">
					<label for="purecart_update_package"><?php esc_html_e( 'Package file', 'purecart' ); ?></label>
					<input type="file" id="purecart_update_package" name="purecart_update_package">
					<span class="description"><?php esc_html_e( 'ZIP for WordPress plugins/themes; .dmg, .exe, .deb, .AppImage and similar for other software.', 'purecart' ); ?></span>
				</p>

				<?php
				woocommerce_wp_text_input(
					array(
						'id'          => 'purecart_update_version',
						'label'       => __( 'Version', 'purecart' ),
						'value'       => '',
						'description' => __( 'Leave blank for a WordPress ZIP and the version is read from readme.txt ("Stable tag") or the plugin/theme header.', 'purecart' ),
						'desc_tip'    => true,
					)
				);
				woocommerce_wp_select(
					array(
						'id'      => 'purecart_update_channel_new',
						'label'   => __( 'Release channel', 'purecart' ),
						'value'   => 'stable',
						'options' => array(
							'stable'  => __( 'Stable', 'purecart' ),
							'beta'    => __( 'Beta', 'purecart' ),
							'nightly' => __( 'Nightly', 'purecart' ),
						),
					)
				);
				woocommerce_wp_select(
					array(
						'id'      => 'purecart_update_platform',
						'label'   => __( 'Platform', 'purecart' ),
						'value'   => 'all',
						'options' => self::PLATFORMS,
					)
				);
				woocommerce_wp_text_input(
					array(
						'id'    => 'purecart_update_requires_wp',
						'label' => __( 'Requires WordPress', 'purecart' ),
						'value' => '',
						'placeholder' => '6.5',
					)
				);
				woocommerce_wp_text_input(
					array(
						'id'    => 'purecart_update_tested_wp',
						'label' => __( 'Tested up to', 'purecart' ),
						'value' => '',
						'placeholder' => '6.8',
					)
				);
				woocommerce_wp_text_input(
					array(
						'id'    => 'purecart_update_requires_php',
						'label' => __( 'Requires PHP', 'purecart' ),
						'value' => '',
						'placeholder' => '8.0',
					)
				);
				woocommerce_wp_textarea_input(
					array(
						'id'          => 'purecart_update_changelog',
						'label'       => __( 'Changelog (HTML)', 'purecart' ),
						'value'       => '',
						'description' => __( 'Shown in the WordPress "View details" modal. Basic HTML such as &lt;ul&gt; and &lt;li&gt; is allowed.', 'purecart' ),
						'desc_tip'    => true,
					)
				);
				woocommerce_wp_textarea_input(
					array(
						'id'          => 'purecart_update_release_notes',
						'label'       => __( 'Release notes (plain text)', 'purecart' ),
						'value'       => '',
						'description' => __( 'Used instead of the changelog for non-WordPress software.', 'purecart' ),
						'desc_tip'    => true,
					)
				);
				?>
				<p class="form-field">
					<span class="description">
						<?php esc_html_e( 'The package is saved when you press Update on this product. Its SHA-256 checksum is calculated automatically.', 'purecart' ); ?>
					</span>
				</p>
			</div>

			<?php $this->render_version_history( $product_id ); ?>
		</div>
		<?php
	}

	/**
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return void
	 */
	private function render_version_history( int $product_id ): void {
		$versions = $this->packages->find_by_product( $product_id );
		?>
		<div class="options_group">
			<p class="form-field"><strong><?php esc_html_e( 'Version history', 'purecart' ); ?></strong></p>

			<?php if ( ! $versions ) : ?>
				<p class="form-field"><span class="description"><?php esc_html_e( 'No versions have been uploaded yet.', 'purecart' ); ?></span></p>
			<?php else : ?>
				<table class="widefat striped" style="margin: 0 12px 12px;">
					<thead>
						<tr>
							<th><?php esc_html_e( 'Version', 'purecart' ); ?></th>
							<th><?php esc_html_e( 'Channel', 'purecart' ); ?></th>
							<th><?php esc_html_e( 'Platform', 'purecart' ); ?></th>
							<th><?php esc_html_e( 'Size', 'purecart' ); ?></th>
							<th><?php esc_html_e( 'Downloads', 'purecart' ); ?></th>
							<th><?php esc_html_e( 'Released', 'purecart' ); ?></th>
							<th><?php esc_html_e( 'Status', 'purecart' ); ?></th>
							<th><?php esc_html_e( 'Actions', 'purecart' ); ?></th>
						</tr>
					</thead>
					<tbody>
					<?php foreach ( $versions as $version ) : ?>
						<?php $is_active = (bool) (int) $version->is_active; ?>
						<tr>
							<td><strong><?php echo esc_html( (string) $version->version ); ?></strong></td>
							<td><?php echo esc_html( (string) $version->channel ); ?></td>
							<td><?php echo esc_html( (string) $version->platform ); ?></td>
							<td><?php echo esc_html( size_format( (int) $version->file_size ) ?: '—' ); ?></td>
							<td><?php echo esc_html( (string) (int) $version->download_count ); ?></td>
							<td><?php echo esc_html( (string) $version->released_at ); ?></td>
							<td>
								<?php if ( $is_active ) : ?>
									<span style="color:#1a7f37;">● <?php esc_html_e( 'Serving', 'purecart' ); ?></span>
								<?php else : ?>
									<span style="color:#8a8a8a;">○ <?php esc_html_e( 'Withdrawn', 'purecart' ); ?></span>
								<?php endif; ?>
							</td>
							<td>
								<a href="<?php echo esc_url( $this->row_action_url( $is_active ? 'deactivate' : 'activate', (int) $version->id, $product_id ) ); ?>">
									<?php echo $is_active ? esc_html__( 'Withdraw', 'purecart' ) : esc_html__( 'Restore', 'purecart' ); ?>
								</a>
								&nbsp;|&nbsp;
								<a href="<?php echo esc_url( $this->row_action_url( 'delete', (int) $version->id, $product_id ) ); ?>"
									style="color:#b32d2e;"
									onclick="return confirm( '<?php echo esc_js( __( 'Delete this version and its package file permanently?', 'purecart' ) ); ?>' );">
									<?php esc_html_e( 'Delete', 'purecart' ); ?>
								</a>
							</td>
						</tr>
					<?php endforeach; ?>
					</tbody>
				</table>
				<p class="form-field">
					<span class="description">
						<?php esc_html_e( '"Withdraw" stops a version being served without deleting it — use it to pull a broken release immediately.', 'purecart' ); ?>
					</span>
				</p>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Signed URL for one row action.
	 *
	 * @since 1.0.0
	 * @param string $action     activate|deactivate|delete.
	 * @param int    $version_id Package row ID.
	 * @param int    $product_id WooCommerce product ID.
	 * @return string
	 */
	private function row_action_url( string $action, int $version_id, int $product_id ): string {
		return wp_nonce_url(
			add_query_arg(
				array(
					'action'     => self::ROW_ACTION,
					'do'         => $action,
					'version_id' => $version_id,
					'product_id' => $product_id,
				),
				admin_url( 'admin-post.php' )
			),
			self::ROW_ACTION . '_' . $version_id
		);
	}

	/**
	 * WooCommerce's checkbox helper wants 'yes'/'no'; unset meta has to fall
	 * back to the field's documented default rather than to 'no'.
	 *
	 * @since 1.0.0
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $key        Meta key.
	 * @param bool   $default    Default when the meta has never been saved.
	 * @return string
	 */
	private function checkbox_value( int $product_id, string $key, bool $default ): string {
		$meta = get_post_meta( $product_id, $key, true );

		if ( '' === $meta ) {
			return $default ? 'yes' : 'no';
		}

		return in_array( $meta, array( 'yes', '1', 1, true ), true ) ? 'yes' : 'no';
	}

	// -----------------------------------------------------------------------
	// Save
	// -----------------------------------------------------------------------

	/**
	 * Persist the tab's settings and, if one was supplied, the uploaded
	 * package.
	 *
	 * WooCommerce verifies the `woocommerce_save_data` nonce and
	 * `current_user_can( 'edit_post' )` before firing
	 * `woocommerce_process_product_meta`; the capability re-check here is
	 * defence in depth, matching SubscriptionProduct::save_meta().
	 *
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return void
	 */
	public function save( int $product_id ): void {
		if ( ! current_user_can( 'edit_post', $product_id ) ) {
			return;
		}

		$this->save_settings( $product_id );
		$this->maybe_store_upload( $product_id );
	}

	/**
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return void
	 */
	private function save_settings( int $product_id ): void {
		if ( isset( $_POST['_purecart_plugin_slug'] ) ) {
			// sanitize_title(), not sanitize_text_field(): this value is
			// matched against a plugin folder name and appears in URLs, so it
			// must be a slug rather than arbitrary text.
			update_post_meta( $product_id, '_purecart_plugin_slug', sanitize_title( wp_unslash( $_POST['_purecart_plugin_slug'] ) ) );
		}

		$enums = array(
			'_purecart_product_type'   => array( array_keys( self::PRODUCT_TYPES ), 'wp-plugin' ),
			'_purecart_update_channel' => array( PackageRepository::CHANNELS, 'stable' ),
		);

		foreach ( $enums as $key => list( $allowed, $default ) ) {
			if ( ! isset( $_POST[ $key ] ) ) {
				continue;
			}
			$value = sanitize_text_field( wp_unslash( $_POST[ $key ] ) );
			update_post_meta( $product_id, $key, in_array( $value, $allowed, true ) ? $value : $default );
		}

		foreach ( array( '_purecart_update_requires_license', '_purecart_beta_channel_enabled', '_purecart_update_notify_customers' ) as $checkbox ) {
			update_post_meta( $product_id, $checkbox, isset( $_POST[ $checkbox ] ) ? 'yes' : 'no' );
		}
	}

	/**
	 * @since 1.0.0
	 * @param int $product_id WooCommerce product ID.
	 * @return void
	 */
	private function maybe_store_upload( int $product_id ): void {
		if ( empty( $_FILES['purecart_update_package']['name'] ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Each member is sanitized inside UpdatePackageManager; passing the raw $_FILES entry is required for is_uploaded_file().
		$file = $_FILES['purecart_update_package'];

		$result = $this->manager->add_from_upload(
			$product_id,
			$file,
			array(
				'version'       => isset( $_POST['purecart_update_version'] ) ? sanitize_text_field( wp_unslash( $_POST['purecart_update_version'] ) ) : '',
				'channel'       => isset( $_POST['purecart_update_channel_new'] ) ? sanitize_text_field( wp_unslash( $_POST['purecart_update_channel_new'] ) ) : 'stable',
				'platform'      => isset( $_POST['purecart_update_platform'] ) ? sanitize_text_field( wp_unslash( $_POST['purecart_update_platform'] ) ) : 'all',
				'requires_wp'   => isset( $_POST['purecart_update_requires_wp'] ) ? sanitize_text_field( wp_unslash( $_POST['purecart_update_requires_wp'] ) ) : '',
				'tested_wp'     => isset( $_POST['purecart_update_tested_wp'] ) ? sanitize_text_field( wp_unslash( $_POST['purecart_update_tested_wp'] ) ) : '',
				'requires_php'  => isset( $_POST['purecart_update_requires_php'] ) ? sanitize_text_field( wp_unslash( $_POST['purecart_update_requires_php'] ) ) : '',
				'changelog'     => isset( $_POST['purecart_update_changelog'] ) ? wp_kses_post( wp_unslash( $_POST['purecart_update_changelog'] ) ) : '',
				'release_notes' => isset( $_POST['purecart_update_release_notes'] ) ? sanitize_textarea_field( wp_unslash( $_POST['purecart_update_release_notes'] ) ) : '',
			)
		);

		if ( is_wp_error( $result ) ) {
			$this->add_notice( 'error', $result->get_error_message() );
			return;
		}

		$this->add_notice(
			'success',
			sprintf(
				/* translators: %s: version number */
				__( 'Version %s uploaded and published.', 'purecart' ),
				$result->version
			)
		);
	}

	// -----------------------------------------------------------------------
	// Row actions
	// -----------------------------------------------------------------------

	/**
	 * Handle withdraw / restore / delete from the version history table.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function handle_row_action(): void {
		$version_id = isset( $_GET['version_id'] ) ? absint( wp_unslash( $_GET['version_id'] ) ) : 0;
		$product_id = isset( $_GET['product_id'] ) ? absint( wp_unslash( $_GET['product_id'] ) ) : 0;

		check_admin_referer( self::ROW_ACTION . '_' . $version_id );

		// The nonce proves the link came from us; this proves the person
		// following it may still edit this product.
		if ( ! $product_id || ! current_user_can( 'edit_post', $product_id ) ) {
			wp_die(
				esc_html__( 'You do not have permission to manage versions for this product.', 'purecart' ),
				esc_html__( 'Permission denied', 'purecart' ),
				array( 'response' => 403 )
			);
		}

		$package = $this->packages->find( $version_id );

		// A nonce is scoped to the version ID but says nothing about which
		// product owns it — without this, a link for one product's version
		// could be replayed against another product the user cannot edit.
		if ( ! $package || (int) $package->product_id !== $product_id ) {
			wp_die(
				esc_html__( 'That version does not belong to this product.', 'purecart' ),
				esc_html__( 'Invalid request', 'purecart' ),
				array( 'response' => 400 )
			);
		}

		$do = isset( $_GET['do'] ) ? sanitize_key( wp_unslash( $_GET['do'] ) ) : '';

		switch ( $do ) {
			case 'activate':
				$this->manager->set_active( $version_id, true );
				$this->add_notice( 'success', sprintf( /* translators: %s: version */ __( 'Version %s is being served again.', 'purecart' ), $package->version ) );
				break;

			case 'deactivate':
				$this->manager->set_active( $version_id, false );
				$this->add_notice( 'success', sprintf( /* translators: %s: version */ __( 'Version %s withdrawn. Customers will no longer receive it.', 'purecart' ), $package->version ) );
				break;

			case 'delete':
				$this->manager->delete( $version_id );
				$this->add_notice( 'success', sprintf( /* translators: %s: version */ __( 'Version %s deleted.', 'purecart' ), $package->version ) );
				break;

			default:
				$this->add_notice( 'error', __( 'Unrecognised action.', 'purecart' ) );
		}

		wp_safe_redirect( get_edit_post_link( $product_id, 'redirect' ) ?: admin_url( 'edit.php?post_type=product' ) );
		exit;
	}

	// -----------------------------------------------------------------------
	// Notices
	// -----------------------------------------------------------------------

	/**
	 * Queue a one-shot notice for the current user.
	 *
	 * Stored per user rather than globally: two administrators publishing
	 * releases at the same time would otherwise see each other's messages.
	 *
	 * @since 1.0.0
	 * @param string $type    success|error.
	 * @param string $message Message text.
	 * @return void
	 */
	private function add_notice( string $type, string $message ): void {
		set_transient(
			self::NOTICE_PREFIX . get_current_user_id(),
			array(
				'type'    => $type,
				'message' => $message,
			),
			60
		);
	}

	/**
	 * @since 1.0.0
	 * @return void
	 */
	public function render_notice(): void {
		$key    = self::NOTICE_PREFIX . get_current_user_id();
		$notice = get_transient( $key );

		if ( ! is_array( $notice ) || empty( $notice['message'] ) ) {
			return;
		}

		delete_transient( $key );

		printf(
			'<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>',
			'error' === $notice['type'] ? 'error' : 'success',
			esc_html( (string) $notice['message'] )
		);
	}
}

<?php
/**
 * WordPress admin screens for PureCart.
 *
 * @package PureCart\Admin
 */

declare( strict_types=1 );

namespace PureCart\Admin;

defined( 'ABSPATH' ) || exit;

use PureCart\Licensing\LicenseGenerator;
use PureCart\Activator;
use PureCart\Subscriptions\Module as SubscriptionsModule;

/**
 * Admin panel: menus, product meta boxes, settings.
 */
class Admin {

	/**
	 * Register admin hooks.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menus' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'add_meta_boxes', array( $this, 'meta_boxes' ) );
		add_action( 'save_post_product', array( $this, 'save_product_meta' ) );
		add_action( 'admin_init', array( $this, 'maybe_upgrade_db' ) );
		add_filter( 'plugin_action_links_' . PURECART_BASENAME, array( $this, 'action_links' ) );
	}

	/**
	 * Run the DB schema upgrade check, gated to users who can manage the
	 * site's settings.
	 *
	 * dbDelta() itself is idempotent/safe to run repeatedly, so this wasn't a
	 * data-integrity issue — but `admin_init` fires for anyone who can reach
	 * any wp-admin screen, not just administrators, and there's no reason to
	 * let a lower-privileged admin-area visitor trigger a schema migration
	 * on every page load. Kept as a thin wrapper (rather than adding the
	 * check inside Activator::maybe_upgrade() itself) so that method stays a
	 * plain "check version, migrate if stale" utility, reusable from contexts
	 * that don't run under this hook.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function maybe_upgrade_db(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		Activator::maybe_upgrade();
	}

	/**
	 * Register the top-level PureCart admin menu and sub-pages.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_menus(): void {
		add_menu_page(
			__( 'PureCart', 'purecart' ),
			__( 'PureCart', 'purecart' ),
			'manage_woocommerce',
			'purecart-dashboard',
			array( $this, 'page_dashboard' ),
			'dashicons-download',
			58
		);

		add_submenu_page(
			'purecart-dashboard',
			__( 'Licenses', 'purecart' ),
			__( 'Licenses', 'purecart' ),
			'manage_woocommerce',
			'purecart-licenses',
			array( $this, 'page_licenses' )
		);

		add_submenu_page(
			'purecart-dashboard',
			__( 'Settings', 'purecart' ),
			__( 'Settings', 'purecart' ),
			'manage_options',
			'purecart-settings',
			array( $this, 'page_settings' )
		);
		// React app — currently Subscriptions-only (src/app/router/paths.ts scopes every
		// route under /subscriptions), so the visible label says "Subscriptions", not the
		// previous generic "Dashboard". Slug kept as-is so existing links don't break.
		if ( SubscriptionsModule::is_enabled() ) {
			add_submenu_page(
				'purecart-dashboard',
				__( 'Subscriptions', 'purecart' ),
				__( 'Subscriptions', 'purecart' ),
				'manage_woocommerce',
				'purecart-react-dashboard',
				array( $this, 'page_react_dashboard' )
			);
		}
	}

	/**
	 * Enqueue admin CSS/JS on PureCart screens and the product edit page.
	 *
	 * @since 1.0.0
	 * @param string $hook Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_assets( string $hook ): void {
		$our_hooks = array(
			'toplevel_page_purecart-dashboard',
			'purecart_page_purecart-licenses',
			'purecart_page_purecart-versions',
			'purecart_page_purecart-settings',
			'purecart_page_purecart-react-dashboard',
		);

		if ( ! in_array( $hook, $our_hooks, true ) && 'post.php' !== $hook && 'post-new.php' !== $hook ) {
			return;
		}

		wp_enqueue_style( 'purecart-admin', PURECART_URL . 'assets/css/admin.css', array(), PURECART_VERSION );
		wp_enqueue_script( 'purecart-admin', PURECART_URL . 'assets/js/admin.js', array( 'jquery' ), PURECART_VERSION, true );

		$asset_file =  PURECART_PATH . 'build/admin/admin.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		
		$asset = require $asset_file;
		wp_enqueue_style(
			'wdd-admin',
			 PURECART_URL . 'build/admin/admin.css',
			[],
			$asset['version']
		);

		wp_enqueue_script(
			'wdd-admin',
			 PURECART_URL . 'build/admin/admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'purecart-admin',
			'purecartAdmin',
			array(
				'nonce' => wp_create_nonce( 'purecart_admin_nonce' ),
			)
		);
	}

	/**
	 * Register the PureCart product settings meta box.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function meta_boxes(): void {
		add_meta_box(
			'purecart_product_settings',
			__( 'PureCart Settings', 'purecart' ),
			array( $this, 'render_product_meta_box' ),
			'product',
			'normal',
			'high'
		);
	}

	/**
	 * Render the PureCart product settings meta box.
	 *
	 * @since 1.0.0
	 * @param \WP_Post $post The current product post object.
	 * @return void
	 */
	public function render_product_meta_box( \WP_Post $post ): void {
		wp_nonce_field( 'purecart_save_product_meta', 'purecart_product_nonce' );

		$product      = wc_get_product( $post->ID );
		$license_type = $product ? $product->get_meta( '_purecart_license_type' ) : 'single';
		$act_limit    = $product ? $product->get_meta( '_purecart_activation_limit' ) : 1;
		$duration     = $product ? $product->get_meta( '_purecart_license_duration_days' ) : 365;
		$plugin_slug  = $product ? $product->get_meta( '_purecart_plugin_slug' ) : '';
		$saas_plan    = $product ? $product->get_meta( '_purecart_saas_plan' ) : 'starter';

		?>
		<table class="form-table purecart-meta-table">
			<tr>
				<th><label for="purecart_license_type"><?php esc_html_e( 'License Type', 'purecart' ); ?></label></th>
				<td>
					<select id="purecart_license_type" name="purecart_license_type">
						<?php
						foreach ( array(
							'single'    => __( 'Single Site', 'purecart' ),
							'multi'     => __( 'Multi Site', 'purecart' ),
							'unlimited' => __( 'Unlimited Sites', 'purecart' ),
							'lifetime'  => __( 'Lifetime (No Expiry)', 'purecart' ),
						) as $val => $label ) :
							?>
							<option value="<?php echo esc_attr( $val ); ?>" <?php selected( $license_type, $val ); ?>>
															<?php echo esc_html( $label ); ?>
							</option>
						<?php endforeach; ?>
					</select>
				</td>
			</tr>
			<tr>
				<th><label for="purecart_activation_limit"><?php esc_html_e( 'Activation Limit', 'purecart' ); ?></label></th>
				<td>
					<input type="number" id="purecart_activation_limit" name="purecart_activation_limit"
							value="<?php echo esc_attr( $act_limit ); ?>" min="1" class="small-text">
					<p class="description"><?php esc_html_e( 'Number of sites the license can be activated on.', 'purecart' ); ?></p>
				</td>
			</tr>
			<tr>
				<th><label for="purecart_license_duration_days"><?php esc_html_e( 'License Duration (days)', 'purecart' ); ?></label></th>
				<td>
					<input type="number" id="purecart_license_duration_days" name="purecart_license_duration_days"
							value="<?php echo esc_attr( $duration ); ?>" min="1" class="small-text">
					<p class="description"><?php esc_html_e( 'Set 365 for 1 year. Ignored for "Lifetime" type.', 'purecart' ); ?></p>
				</td>
			</tr>
			<tr>
				<th><label for="purecart_plugin_slug"><?php esc_html_e( 'Plugin Slug', 'purecart' ); ?></label></th>
				<td>
					<input type="text" id="purecart_plugin_slug" name="purecart_plugin_slug"
							value="<?php echo esc_attr( $plugin_slug ); ?>" class="regular-text">
					<p class="description"><?php esc_html_e( 'Used for the auto-update API endpoint.', 'purecart' ); ?></p>
				</td>
			</tr>
			<tr>
				<th><label for="purecart_saas_plan"><?php esc_html_e( 'SaaS Plan', 'purecart' ); ?></label></th>
				<td>
					<input type="text" id="purecart_saas_plan" name="purecart_saas_plan"
							value="<?php echo esc_attr( $saas_plan ); ?>" class="regular-text">
					<p class="description"><?php esc_html_e( 'Plan identifier sent to your SaaS webhook.', 'purecart' ); ?></p>
				</td>
			</tr>
		</table>
		<?php
	}

	/**
	 * Save PureCart product meta fields on product save.
	 *
	 * @since 1.0.0
	 * @param int $post_id The ID of the product post being saved.
	 * @return void
	 */
	public function save_product_meta( int $post_id ): void {
		if ( ! isset( $_POST['purecart_product_nonce'] )
			|| ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['purecart_product_nonce'] ) ), 'purecart_save_product_meta' )
			|| ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE )
			|| ! current_user_can( 'edit_post', $post_id )
		) {
			return;
		}

		$fields = array(
			'_purecart_license_type'          => 'purecart_license_type',
			'_purecart_activation_limit'      => 'purecart_activation_limit',
			'_purecart_license_duration_days' => 'purecart_license_duration_days',
			'_purecart_plugin_slug'           => 'purecart_plugin_slug',
			'_purecart_saas_plan'             => 'purecart_saas_plan',
		);

		foreach ( $fields as $meta_key => $post_key ) {
			if ( isset( $_POST[ $post_key ] ) ) {
				update_post_meta( $post_id, $meta_key, sanitize_text_field( wp_unslash( $_POST[ $post_key ] ) ) );
			}
		}
	}

	//react page_react_dashboard

	public function page_react_dashboard(): void {
		?>
		<div class="wrap">
			<div id="purecart-react-dashboard-root"></div>
		</div>
		<?php
	}

	/**
	 * Render the PureCart overview dashboard page.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function page_dashboard(): void {
		global $wpdb;

		$cache_key = 'purecart_dashboard_stats';
		$stats     = wp_cache_get( $cache_key, 'purecart' );

		if ( false === $stats ) {
            // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom tables; no WP API. Results cached below.
			$total_licenses  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}purecart_licenses" );
			$active_licenses = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}purecart_licenses WHERE status = 'active'" );
			$total_downloads = (int) $wpdb->get_var( "SELECT SUM(download_count) FROM {$wpdb->prefix}purecart_downloads" );
			$total_saas      = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}purecart_saas_accounts WHERE status = 'active'" );
            // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery

			$stats = compact( 'total_licenses', 'active_licenses', 'total_downloads', 'total_saas' );
			wp_cache_set( $cache_key, $stats, 'purecart', 5 * MINUTE_IN_SECONDS );
		}

		?>
		<div class="wrap purecart-dashboard">
			<h1><?php esc_html_e( 'PureCart Dashboard', 'purecart' ); ?></h1>
			<div class="purecart-stats-grid">
				<div class="purecart-stat-card"><h3><?php echo esc_html( $stats['active_licenses'] ); ?></h3><p><?php esc_html_e( 'Active Licenses', 'purecart' ); ?></p></div>
				<div class="purecart-stat-card"><h3><?php echo esc_html( $stats['total_licenses'] ); ?></h3><p><?php esc_html_e( 'Total Licenses', 'purecart' ); ?></p></div>
				<div class="purecart-stat-card"><h3><?php echo esc_html( $stats['total_downloads'] ?: 0 ); ?></h3><p><?php esc_html_e( 'Total Downloads', 'purecart' ); ?></p></div>
				<div class="purecart-stat-card"><h3><?php echo esc_html( $stats['total_saas'] ); ?></h3><p><?php esc_html_e( 'Active SaaS Accounts', 'purecart' ); ?></p></div>
			</div>
			<p>
			<?php
				printf(
					/* translators: %1$s = version, %2$s = link */
					esc_html__( 'Plugin version %1$s. Go to %2$s to manage licenses.', 'purecart' ),
					esc_html( PURECART_VERSION ),
					'<a href="' . esc_url( admin_url( 'admin.php?page=purecart-licenses' ) ) . '">' . esc_html__( 'Licenses', 'purecart' ) . '</a>'
				);
			?>
				</p>
		</div>
		<?php
	}

	/**
	 * Render the license management admin page.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function page_licenses(): void {
		global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin-only list table; results change on every action, persistent caching would show stale data.
		$licenses = $wpdb->get_results(
			"SELECT l.*, p.post_title AS product_name, u.user_email
               FROM {$wpdb->prefix}purecart_licenses l
               LEFT JOIN {$wpdb->posts} p ON p.ID = l.product_id
               LEFT JOIN {$wpdb->users} u ON u.ID = l.user_id
              ORDER BY l.created_at DESC
              LIMIT 100"
		);

		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Licenses', 'purecart' ); ?></h1>
			<table class="wp-list-table widefat fixed striped">
				<thead><tr>
					<th><?php esc_html_e( 'License Key', 'purecart' ); ?></th>
					<th><?php esc_html_e( 'Customer', 'purecart' ); ?></th>
					<th><?php esc_html_e( 'Product', 'purecart' ); ?></th>
					<th><?php esc_html_e( 'Status', 'purecart' ); ?></th>
					<th><?php esc_html_e( 'Sites', 'purecart' ); ?></th>
					<th><?php esc_html_e( 'Expires', 'purecart' ); ?></th>
				</tr></thead>
				<tbody>
				<?php if ( empty( $licenses ) ) : ?>
					<tr><td colspan="6"><?php esc_html_e( 'No licenses found.', 'purecart' ); ?></td></tr>
				<?php else : ?>
					<?php foreach ( $licenses as $l ) : ?>
					<tr>
						<td><code><?php echo esc_html( $l->license_key ); ?></code></td>
						<td><?php echo esc_html( $l->user_email ?? '' ); ?></td>
						<td><?php echo esc_html( $l->product_name ?? '' ); ?></td>
						<td><span class="purecart-badge purecart-badge--<?php echo esc_attr( $l->status ); ?>"><?php echo esc_html( ucfirst( $l->status ) ); ?></span></td>
						<td><?php echo esc_html( $l->activated_count . ' / ' . ( 'unlimited' === $l->plan_type ? '∞' : $l->activation_limit ) ); ?></td>
						<td><?php echo $l->expires_at ? esc_html( date_i18n( get_option( 'date_format' ), strtotime( $l->expires_at ) ) ) : esc_html__( 'Lifetime', 'purecart' ); ?></td>
					</tr>
					<?php endforeach; ?>
				<?php endif; ?>
				</tbody>
			</table>
		</div>
		<?php
	}

	/**
	 * Render the PureCart settings admin page and process form submissions.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function page_settings(): void {
		if ( isset( $_POST['purecart_settings_nonce'] )
			&& wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['purecart_settings_nonce'] ) ), 'purecart_save_settings' ) ) {

			update_option( 'purecart_saas_webhook_url', sanitize_url( wp_unslash( $_POST['purecart_saas_webhook_url'] ?? '' ) ) );
			update_option( 'purecart_webhook_secret', sanitize_text_field( wp_unslash( $_POST['purecart_webhook_secret'] ?? '' ) ) );
			update_option( 'purecart_download_expiry_seconds', absint( $_POST['purecart_download_expiry_seconds'] ?? DAY_IN_SECONDS ) );
			update_option( 'purecart_download_max_count', absint( $_POST['purecart_download_max_count'] ?? 3 ) );
			update_option( SubscriptionsModule::OPTION_ENABLED, isset( $_POST['purecart_sub_enabled'] ) ? 1 : 0 );

			// Subscriptions Step 14 (RoleManager) reads these three as plain
			// get_option() values — added here, on the one settings page that
			// already exists, rather than waiting on the customer-portal/admin
			// SPA (out of scope for this backend work) so they're actually
			// configurable in the meantime. '' = role untouched at that
			// transition, same as RoleManager's own default.
			foreach ( array( 'purecart_sub_trial_role', 'purecart_sub_active_role', 'purecart_sub_cancelled_role' ) as $role_option ) {
				$submitted_role = sanitize_key( wp_unslash( $_POST[ $role_option ] ?? '' ) );
				update_option( $role_option, array_key_exists( $submitted_role, get_editable_roles() ) ? $submitted_role : '' );
			}

			echo '<div class="notice notice-success"><p>' . esc_html__( 'Settings saved.', 'purecart' ) . '</p></div>';
		}

		$webhook_url   = get_option( 'purecart_saas_webhook_url', '' );
		$secret        = get_option( 'purecart_webhook_secret', '' );
		$expiry        = get_option( 'purecart_download_expiry_seconds', DAY_IN_SECONDS );
		$max_dl        = get_option( 'purecart_download_max_count', 3 );
		$sub_enabled   = SubscriptionsModule::is_enabled();
		$trial_role     = get_option( 'purecart_sub_trial_role', '' );
		$active_role    = get_option( 'purecart_sub_active_role', '' );
		$cancelled_role = get_option( 'purecart_sub_cancelled_role', '' );
		$editable_roles = get_editable_roles();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'PureCart Settings', 'purecart' ); ?></h1>
			<form method="post">
				<?php wp_nonce_field( 'purecart_save_settings', 'purecart_settings_nonce' ); ?>
				<table class="form-table">
					<tr>
						<th><label for="purecart_sub_enabled"><?php esc_html_e( 'Subscriptions Module', 'purecart' ); ?></label></th>
						<td>
							<label>
								<input type="checkbox" id="purecart_sub_enabled" name="purecart_sub_enabled" value="1" <?php checked( $sub_enabled ); ?>>
								<?php esc_html_e( 'Enable recurring subscriptions', 'purecart' ); ?>
							</label>
							<p class="description"><?php esc_html_e( 'Disabling this hides the Subscriptions menu and stops the module from loading.', 'purecart' ); ?></p>
						</td>
					</tr>
					<tr>
						<th><label for="purecart_saas_webhook_url"><?php esc_html_e( 'SaaS Webhook URL', 'purecart' ); ?></label></th>
						<td><input type="url"      id="purecart_saas_webhook_url"        name="purecart_saas_webhook_url"        value="<?php echo esc_attr( $webhook_url ); ?>" class="regular-text"></td>
					</tr>
					<tr>
						<th><label for="purecart_webhook_secret"><?php esc_html_e( 'Webhook Secret', 'purecart' ); ?></label></th>
						<td><input type="password" id="purecart_webhook_secret"          name="purecart_webhook_secret"          value="<?php echo esc_attr( $secret ); ?>"      class="regular-text"></td>
					</tr>
					<tr>
						<th><label for="purecart_download_expiry_seconds"><?php esc_html_e( 'Download Link Expiry (seconds)', 'purecart' ); ?></label></th>
						<td><input type="number"   id="purecart_download_expiry_seconds" name="purecart_download_expiry_seconds" value="<?php echo esc_attr( $expiry ); ?>"       class="small-text" min="3600"></td>
					</tr>
					<tr>
						<th><label for="purecart_download_max_count"><?php esc_html_e( 'Max Downloads per Token', 'purecart' ); ?></label></th>
						<td><input type="number"   id="purecart_download_max_count"      name="purecart_download_max_count"      value="<?php echo esc_attr( $max_dl ); ?>"        class="small-text" min="1"></td>
					</tr>
					<tr>
						<th><?php esc_html_e( 'Subscription Roles', 'purecart' ); ?></th>
						<td>
							<?php
							$role_fields = array(
								'purecart_sub_trial_role'     => array( __( 'Trial role', 'purecart' ), $trial_role ),
								'purecart_sub_active_role'    => array( __( 'Active role', 'purecart' ), $active_role ),
								'purecart_sub_cancelled_role' => array( __( 'Cancelled role', 'purecart' ), $cancelled_role ),
							);
							foreach ( $role_fields as $option_name => list( $label, $current_value ) ) :
								?>
								<p>
									<label for="<?php echo esc_attr( $option_name ); ?>"><?php echo esc_html( $label ); ?></label><br>
									<select id="<?php echo esc_attr( $option_name ); ?>" name="<?php echo esc_attr( $option_name ); ?>">
										<option value=""><?php esc_html_e( '— None (leave role unchanged) —', 'purecart' ); ?></option>
										<?php foreach ( $editable_roles as $role_slug => $role_data ) : ?>
											<option value="<?php echo esc_attr( $role_slug ); ?>" <?php selected( $current_value, $role_slug ); ?>>
												<?php echo esc_html( translate_user_role( $role_data['name'] ) ); ?>
											</option>
										<?php endforeach; ?>
									</select>
								</p>
								<?php
							endforeach;
							?>
							<p class="description"><?php esc_html_e( 'Assigned/removed automatically as a customer\'s subscription goes trialing -> active -> cancelled. Leave any of these blank to not touch roles at that transition.', 'purecart' ); ?></p>
						</td>
					</tr>
					<?php if ( SubscriptionsModule::is_enabled() ) : ?>
					<tr>
						<th><?php esc_html_e( 'Export Subscriptions', 'purecart' ); ?></th>
						<td>
							<a href="<?php echo esc_url( \PureCart\Subscriptions\SubscriptionExport::download_url() ); ?>" class="button">
								<?php esc_html_e( 'Download CSV', 'purecart' ); ?>
							</a>
							<p class="description"><?php esc_html_e( 'Every subscription, with customer, plan, billing, churn score and LTV columns.', 'purecart' ); ?></p>
						</td>
					</tr>
					<?php endif; ?>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}

	/**
	 * Add Settings and Licenses quick links to the plugin row on the Plugins screen.
	 *
	 * @since  1.0.0
	 * @param  string[] $links Existing plugin action links.
	 * @return string[]
	 */
	public function action_links( array $links ): array {
		$extra = array(
			'<a href="' . esc_url( admin_url( 'admin.php?page=purecart-settings' ) ) . '">' . esc_html__( 'Settings', 'purecart' ) . '</a>',
			'<a href="' . esc_url( admin_url( 'admin.php?page=purecart-licenses' ) ) . '">' . esc_html__( 'Licenses', 'purecart' ) . '</a>',
		);
		return array_merge( $extra, $links );
	}
}

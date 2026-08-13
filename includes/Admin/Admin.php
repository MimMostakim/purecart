<?php

/**
 * WordPress admin integration for PureCart.
 *
 * Registers the top-level menu and all eleven sub-pages. Every page
 * renders the same React SPA root element — client-side routing (HashRouter)
 * handles navigation within the SPA. WordPress receives a `currentPage`
 * value via wp_localize_script so the SPA can navigate to the correct
 * route on first load without a full-page reload.
 *
 * @package PureCart\Admin
 */

declare(strict_types=1);

namespace PureCart\Admin;

defined('ABSPATH') || exit;

/**
 * Admin panel: menus, asset enqueue, product meta boxes, settings.
 *
 * @since 1.0.0
 */
class Admin
{

	/**
	 * WP admin page slug → React page name.
	 *
	 * Used by enqueue_assets() to pass the correct initial route to the SPA
	 * via wp_localize_script without having to inspect the $hook suffix.
	 *
	 * @since 1.0.0
	 * @var array<string, string>
	 */
	private const SLUG_TO_PAGE = array(
		'purecart-dashboard'      => 'overview',
		'purecart-licenses'       => 'licenses',
		'purecart-downloads'      => 'downloads',
		'purecart-updates'        => 'updates',
		'purecart-subscriptions'  => 'subscriptions',
		'purecart-saas-accounts'  => 'saas-accounts',
		'purecart-affiliates'     => 'affiliates',
		'purecart-abandoned-cart' => 'abandoned-cart',
		'purecart-security'       => 'security',
		'purecart-analytics'      => 'analytics',
		'purecart-settings'       => 'settings',
	);

	/**
	 * Register admin hooks.
	 *
	 * @since 1.0.0
	 */
	public function __construct()
	{
		add_action('admin_menu', array($this, 'register_menus'));
		add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
		add_action('save_post_product', array($this, 'save_product_meta'));
		add_filter('plugin_action_links_' . PURECART_BASENAME, array($this, 'action_links'));
	}

	/**
	 * Register the PureCart top-level menu and all sub-pages.
	 *
	 * All callbacks render the same React SPA root element. WordPress's
	 * admin_enqueue_scripts hook reads $_GET['page'] to determine which
	 * React route to activate on first load (see enqueue_assets()).
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_menus(): void
	{
		add_menu_page(
			__('PureCart', 'purecart'),
			__('PureCart', 'purecart'),
			'manage_woocommerce',
			'purecart-dashboard',
			fn() => $this->render_react_root(),
			'dashicons-download',
			58
		);

		// Sub-pages — all render the same React root.
		// The first entry reuses the parent slug to rename the default
		// "PureCart" submenu item to "Overview" in the WP sidebar.
		$nav_items = array(
			array('purecart-dashboard',      __('Overview',       'purecart'), 'manage_woocommerce'),
			array('purecart-licenses',       __('Licenses',       'purecart'), 'manage_woocommerce'),
			array('purecart-downloads',      __('Downloads',      'purecart'), 'manage_woocommerce'),
			array('purecart-updates',        __('Updates',        'purecart'), 'manage_woocommerce'),
			array('purecart-subscriptions',  __('Subscriptions',  'purecart'), 'manage_woocommerce'),
			array('purecart-saas-accounts',  __('SaaS Accounts',  'purecart'), 'manage_woocommerce'),
			array('purecart-affiliates',     __('Affiliates',     'purecart'), 'manage_woocommerce'),
			array('purecart-abandoned-cart', __('Abandoned Cart', 'purecart'), 'manage_woocommerce'),
			array('purecart-security',       __('Security',       'purecart'), 'manage_woocommerce'),
			array('purecart-analytics',      __('Analytics',      'purecart'), 'manage_woocommerce'),
			array('purecart-settings',       __('Settings',       'purecart'), 'manage_options'),
		);

		foreach ($nav_items as list($slug, $label, $capability)) {
			add_submenu_page(
				'purecart-dashboard',
				/* translators: %s = module name */
				sprintf(__('%s — PureCart', 'purecart'), $label),
				$label,
				$capability,
				$slug,
				fn() => $this->render_react_root()
			);
		}
	}

	/**
	 * Output the React SPA mount point.
	 *
	 * All admin sub-pages call this. The SPA reads window.purecartAdmin.currentPage
	 * (set by enqueue_assets via wp_localize_script) to navigate to the correct
	 * initial route without a second HTTP request.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function render_react_root(): void{
		?>
			<div id="purecart-root"></div>
		<?php
	}

	/**
	 * Enqueue admin assets on PureCart and product-edit pages.
	 *
	 * On PureCart admin pages: loads the React build and localizes the current
	 * React page name so the SPA can navigate on first mount.
	 * On product edit pages: loads only the legacy admin.css / admin.js pair
	 * used for the WooCommerce product meta box.
	 *
	 * @since 1.0.0
	 * @param string $hook Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_assets(string $hook): void
	{
		// Product edit pages
		if ('post.php' === $hook || 'post-new.php' === $hook) {
			wp_enqueue_style('purecart-admin', PURECART_URL . 'assets/css/admin.css', array(), PURECART_VERSION);
			wp_enqueue_script('purecart-admin', PURECART_URL . 'assets/js/admin.js', array('jquery'), PURECART_VERSION, true);
			wp_localize_script('purecart-admin', 'purecartAdmin', array(
				'nonce' => wp_create_nonce('purecart_admin_nonce'),
			));
			return;
		}

		// React SPA pages
		// All purecart pages share the same hook prefix or top-level hook.
		if (strpos($hook, 'purecart') === false) {
			return;
		}

		$asset_file = PURECART_PATH . 'build/admin/app/app.asset.php';
		if (! file_exists($asset_file)) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_style(
			'purecart-app',
			PURECART_URL . 'build/admin/app/app.css',
			array(),
			$asset['version']
		);

		wp_enqueue_script(
			'purecart-app',
			PURECART_URL . 'build/admin/app/app.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		// Determine which React page to show on initial load from the WP slug.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading page slug for routing only, not processing form data.
		$wp_slug      = isset($_GET['page']) ? sanitize_key($_GET['page']) : 'purecart-dashboard';
		$current_page = self::SLUG_TO_PAGE[$wp_slug] ?? 'overview';

		wp_localize_script(
			'purecart-app',
			'purecartAdmin',
			array(
				'nonce'       => wp_create_nonce('purecart_admin_nonce'),
				'restNonce'   => wp_create_nonce('wp_rest'),
				'apiUrl'      => esc_url_raw(rest_url(PURECART_API_NAMESPACE . '/')),
				'currentPage' => $current_page,
				'version'     => PURECART_VERSION,
			)
		);

		$this->enqueue_menu_router();
	}

	/**
	 * Intercept WP sidebar link clicks so the React SPA navigates without a
	 * full page reload. Each purecart-* link maps to a HashRouter path; the
	 * router script prevents the default anchor navigation, pushes the hash
	 * change (which HashRouter picks up via the native hashchange event),
	 * then fixes the browser URL with replaceState so the correct ?page= is
	 * preserved for refreshes and WP menu highlighting.
	 */
	private function enqueue_menu_router(): void {
		$asset_router_file = PURECART_PATH . 'build/admin/menu-router/menu-router.asset.php';
		if (! file_exists($asset_router_file)) {
			return;
		}
		wp_register_script(
			'purecart-menu-router',
			PURECART_URL . 'build/admin/menu-router/menu-router.js',
			array('purecart-app'),
			PURECART_VERSION,
			true
		);

		wp_localize_script(
			'purecart-menu-router',
			'purecartMenuMap',
			array(
				'purecart-dashboard'      => '/overview',
				'purecart-licenses'       => '/licenses',
				'purecart-downloads'      => '/downloads',
				'purecart-updates'        => '/updates',
				'purecart-subscriptions'  => '/subscriptions',
				'purecart-saas-accounts'  => '/saas-accounts',
				'purecart-affiliates'     => '/affiliates',
				'purecart-abandoned-cart' => '/abandoned-cart',
				'purecart-security'       => '/security',
				'purecart-analytics'      => '/analytics',
				'purecart-settings'       => '/settings',
			)
		);

		wp_enqueue_script('purecart-menu-router');
	}
	// ─────────────────────────────────────────────────────────────────────────────
	// Product meta box (WooCommerce product edit screen)
	// ─────────────────────────────────────────────────────────────────────────────

	/**
	 * Register the PureCart product settings meta box.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function meta_boxes(): void
	{
		add_meta_box(
			'purecart_product_settings',
			__('PureCart Settings', 'purecart'),
			array($this, 'render_product_meta_box'),
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
	public function render_product_meta_box(\WP_Post $post): void
	{
		wp_nonce_field('purecart_save_product_meta', 'purecart_product_nonce');

		$product      = wc_get_product($post->ID);
		$license_type = $product ? $product->get_meta('_purecart_license_type') : 'single';
		$act_limit    = $product ? $product->get_meta('_purecart_activation_limit') : 1;
		$duration     = $product ? $product->get_meta('_purecart_license_duration_days') : 365;
		$plugin_slug  = $product ? $product->get_meta('_purecart_plugin_slug') : '';
		$saas_plan    = $product ? $product->get_meta('_purecart_saas_plan') : 'starter';

	?>
		<table class="form-table purecart-meta-table">
			<tr>
				<th><label for="purecart_license_type"><?php esc_html_e('License Type', 'purecart'); ?></label></th>
				<td>
					<select id="purecart_license_type" name="purecart_license_type">
						<?php
						foreach (
							array(
								'single'    => __('Single Site', 'purecart'),
								'multi'     => __('Multi Site', 'purecart'),
								'unlimited' => __('Unlimited Sites', 'purecart'),
								'lifetime'  => __('Lifetime (No Expiry)', 'purecart'),
							) as $val => $label
						) :
						?>
							<option value="<?php echo esc_attr($val); ?>" <?php selected($license_type, $val); ?>>
								<?php echo esc_html($label); ?>
							</option>
						<?php endforeach; ?>
					</select>
				</td>
			</tr>
			<tr>
				<th><label for="purecart_activation_limit"><?php esc_html_e('Activation Limit', 'purecart'); ?></label></th>
				<td>
					<input type="number" id="purecart_activation_limit" name="purecart_activation_limit"
						value="<?php echo esc_attr($act_limit); ?>" min="1" class="small-text">
					<p class="description"><?php esc_html_e('Number of sites the license can be activated on.', 'purecart'); ?></p>
				</td>
			</tr>
			<tr>
				<th><label for="purecart_license_duration_days"><?php esc_html_e('License Duration (days)', 'purecart'); ?></label></th>
				<td>
					<input type="number" id="purecart_license_duration_days" name="purecart_license_duration_days"
						value="<?php echo esc_attr($duration); ?>" min="1" class="small-text">
					<p class="description"><?php esc_html_e('Set 365 for 1 year. Ignored for "Lifetime" type.', 'purecart'); ?></p>
				</td>
			</tr>
			<tr>
				<th><label for="purecart_plugin_slug"><?php esc_html_e('Plugin Slug', 'purecart'); ?></label></th>
				<td>
					<input type="text" id="purecart_plugin_slug" name="purecart_plugin_slug"
						value="<?php echo esc_attr($plugin_slug); ?>" class="regular-text">
					<p class="description"><?php esc_html_e('Used for the auto-update API endpoint.', 'purecart'); ?></p>
				</td>
			</tr>
			<tr>
				<th><label for="purecart_saas_plan"><?php esc_html_e('SaaS Plan', 'purecart'); ?></label></th>
				<td>
					<input type="text" id="purecart_saas_plan" name="purecart_saas_plan"
						value="<?php echo esc_attr($saas_plan); ?>" class="regular-text">
					<p class="description"><?php esc_html_e('Plan identifier sent to your SaaS webhook.', 'purecart'); ?></p>
				</td>
			</tr>
		</table>
<?php
	}

	/**
	 * Save PureCart product meta on product save.
	 *
	 * @since 1.0.0
	 * @param int $post_id The ID of the product post being saved.
	 * @return void
	 */
	public function save_product_meta(int $post_id): void
	{
		if (
			! isset($_POST['purecart_product_nonce'])
			|| ! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['purecart_product_nonce'])), 'purecart_save_product_meta')
			|| (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
			|| ! current_user_can('edit_post', $post_id)
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

		foreach ($fields as $meta_key => $post_key) {
			if (isset($_POST[$post_key])) {
				update_post_meta($post_id, $meta_key, sanitize_text_field(wp_unslash($_POST[$post_key])));
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// Plugin row action links
	// ─────────────────────────────────────────────────────────────────────────────

	/**
	 * Add Settings and Licenses quick links to the plugin row on the Plugins screen.
	 *
	 * @since  1.0.0
	 * @param  string[] $links Existing plugin action links.
	 * @return string[]
	 */
	public function action_links(array $links): array
	{
		$extra = array(
			'<a href="' . esc_url(admin_url('admin.php?page=purecart-settings')) . '">' . esc_html__('Settings', 'purecart') . '</a>',
			'<a href="' . esc_url(admin_url('admin.php?page=purecart-licenses')) . '">' . esc_html__('Licenses', 'purecart') . '</a>',
		);
		return array_merge($extra, $links);
	}
}

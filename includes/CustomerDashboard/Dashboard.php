<?php
/**
 * Adds custom tabs to WooCommerce My Account page.
 *
 * @package PureCart\CustomerDashboard
 */

declare( strict_types=1 );

namespace PureCart\CustomerDashboard;

defined( 'ABSPATH' ) || exit;

use PureCart\Licensing\LicenseGenerator;
use PureCart\SaaS\AccountProvisioner;

/**
 * Registers and renders My Account dashboard tabs.
 *
 * Deliberately does NOT register a "Downloads" tab of its own — WooCommerce
 * already has a native one, and PureCart's own downloads are merged into
 * that same native tab instead (see {@see \PureCart\Downloads\AccountDownloadsMerger}).
 * Running a second, separate "Downloads" tab here used to mean an account
 * with any regular WooCommerce downloadable-product purchase saw two tabs
 * both labeled "Downloads" at once.
 */
class Dashboard {

	/**
	 * My Account endpoint slugs registered by this class.
	 *
	 * @var string[]
	 */
	private array $slugs = array( 'purecart-licenses', 'purecart-api-keys' );

	/**
	 * Register My Account menu, query var, and endpoint hooks.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_filter( 'woocommerce_account_menu_items', array( $this, 'menu_items' ) );
		add_filter( 'woocommerce_get_query_vars', array( $this, 'query_vars' ) );
		add_filter( 'woocommerce_account_menu_item_classes', array( $this, 'menu_item_classes' ), 10, 2 );

		foreach ( $this->slugs as $slug ) {
			add_action( "woocommerce_account_{$slug}_endpoint", array( $this, 'render_tab' ) );
		}

		add_action( 'init', array( $this, 'endpoints' ) );
	}

	/**
	 * Return the slug => label map for PureCart My Account tabs.
	 *
	 * @return array<string,string>
	 */
	private function get_tabs(): array {
		return array(
			'purecart-licenses' => __( 'My Licenses', 'purecart' ),
			'purecart-api-keys' => __( 'API Keys', 'purecart' ),
		);
	}

	/**
	 * Register PureCart endpoints on the WooCommerce My Account page.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function endpoints(): void {
		foreach ( $this->slugs as $slug ) {
			add_rewrite_endpoint( $slug, EP_ROOT | EP_PAGES );
		}
	}

	/**
	 * Inject PureCart tabs into the WooCommerce My Account navigation.
	 *
	 * @since  1.0.0
	 * @param  array<string,string> $items Existing menu items (slug => label).
	 * @return array<string,string>
	 */
	public function menu_items( array $items ): array {
		$logout = $items['customer-logout'] ?? null;
		unset( $items['customer-logout'] );

		foreach ( $this->get_tabs() as $slug => $label ) {
			$items[ $slug ] = $label;
		}

		if ( $logout ) {
			$items['customer-logout'] = $logout;
		}

		return $items;
	}

	/**
	 * Register PureCart endpoint slugs as WooCommerce query variables.
	 *
	 * @since  1.0.0
	 * @param  array<string,string> $vars Existing query vars (slug => slug).
	 * @return array<string,string>
	 */
	public function query_vars( array $vars ): array {
		foreach ( $this->slugs as $slug ) {
			$vars[ $slug ] = $slug;
		}
		return $vars;
	}

	/**
	 * Add an is-active CSS class to the current PureCart My Account menu item.
	 *
	 * @since  1.0.0
	 * @param  string[] $classes  Existing CSS classes for the menu item.
	 * @param  string   $endpoint The endpoint slug being rendered.
	 * @return string[]
	 */
	public function menu_item_classes( array $classes, string $endpoint ): array {
		global $wp;

		if ( isset( $wp->query_vars[ $endpoint ] ) ) {
			$classes[] = 'is-active';
		}

		return $classes;
	}

	/**
	 * Determine the active PureCart endpoint and delegate to the correct renderer.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function render_tab(): void {
		global $wp;

		$active = '';
		foreach ( $this->slugs as $slug ) {
			if ( isset( $wp->query_vars[ $slug ] ) ) {
				$active = $slug;
				break;
			}
		}

		switch ( $active ) {
			case 'purecart-licenses':
				$this->render_licenses_tab();
				break;
			case 'purecart-api-keys':
				$this->render_api_keys_tab();
				break;
		}
	}

	/**
	 * Render the My Licenses tab content.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function render_licenses_tab(): void {
		$user_id  = get_current_user_id();
		$licenses = ( new LicenseGenerator() )->get_by_user( $user_id );

		if ( empty( $licenses ) ) {
			echo '<p>' . esc_html__( 'You have no licenses yet.', 'purecart' ) . '</p>';
			return;
		}

		echo '<table class="woocommerce-table shop_table purecart-licenses-table">';
		echo '<thead><tr>'
			. '<th>' . esc_html__( 'Product', 'purecart' ) . '</th>'
			. '<th>' . esc_html__( 'License Key', 'purecart' ) . '</th>'
			. '<th>' . esc_html__( 'Status', 'purecart' ) . '</th>'
			. '<th>' . esc_html__( 'Sites Used', 'purecart' ) . '</th>'
			. '<th>' . esc_html__( 'Expires', 'purecart' ) . '</th>'
			. '</tr></thead><tbody>';

		foreach ( $licenses as $license ) {
			// Build expiry label — escape at point of output below.
			$expires_label = $license->expires_at
				? date_i18n( get_option( 'date_format' ), strtotime( $license->expires_at ) )
				: __( 'Lifetime', 'purecart' );

			printf(
				'<tr><td>%s</td><td><code>%s</code></td><td><span class="purecart-status purecart-status--%s">%s</span></td><td>%s / %s</td><td>%s</td></tr>',
				esc_html( $license->product_name ?? '' ),
				esc_html( $license->license_key ),
				esc_attr( $license->status ),
				esc_html( ucfirst( $license->status ) ),
				esc_html( (string) $license->activated_count ),
				'unlimited' === $license->plan_type ? esc_html__( '∞', 'purecart' ) : esc_html( (string) $license->activation_limit ),
				esc_html( $expires_label )
			);
		}

		echo '</tbody></table>';
	}

	/**
	 * Render the API Keys tab content.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function render_api_keys_tab(): void {
		$user_id  = get_current_user_id();
		$accounts = ( new AccountProvisioner() )->get_by_user( $user_id );

		if ( empty( $accounts ) ) {
			echo '<p>' . esc_html__( 'No API keys found.', 'purecart' ) . '</p>';
			return;
		}

		echo '<table class="woocommerce-table shop_table purecart-api-keys-table">';
		echo '<thead><tr>'
			. '<th>' . esc_html__( 'Product', 'purecart' ) . '</th>'
			. '<th>' . esc_html__( 'Plan', 'purecart' ) . '</th>'
			. '<th>' . esc_html__( 'API Key', 'purecart' ) . '</th>'
			. '<th>' . esc_html__( 'Status', 'purecart' ) . '</th>'
			. '</tr></thead><tbody>';

		foreach ( $accounts as $account ) {
			printf(
				'<tr><td>%s</td><td>%s</td><td><code class="purecart-api-key">%s</code></td><td><span class="purecart-status purecart-status--%s">%s</span></td></tr>',
				esc_html( $account->product_name ?? '' ),
				esc_html( ucfirst( $account->plan ) ),
				esc_html( $account->api_key ),
				esc_attr( $account->status ),
				esc_html( ucfirst( $account->status ) )
			);
		}

		echo '</tbody></table>';
	}
}

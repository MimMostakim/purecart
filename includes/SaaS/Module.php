<?php
/**
 * SaaS Provisioning module bootstrap.
 *
 * @package PureCart\SaaS
 */

declare( strict_types=1 );

namespace PureCart\SaaS;

use PureCart\API\SaaS as SaasApi;
use PureCart\SaaS\Emails\AccountProvisionedEmail;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the SaaS module into the plugin's init flow, mirroring
 * `PureCart\Updates\Module`. AccountProvisioner, ApiKeyManager and
 * JwtIssuer are stateless collaborators instantiated where they're used
 * (OrderHandler, the REST controller) — nothing here owns a long-lived
 * instance of them, only the module-level concerns (email registration,
 * REST route registration) that need a hook to attach to.
 *
 * @since 1.0.0
 */
class Module {

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		add_filter( 'woocommerce_email_classes', array( $this, 'register_emails' ) );

		( new SaasApi() )->register();
	}

	/**
	 * Put the module's customer email under WooCommerce → Settings → Emails.
	 *
	 * @since 1.0.0
	 * @param array<string, \WC_Email> $emails Registered WooCommerce emails.
	 * @return array<string, \WC_Email>
	 */
	public function register_emails( array $emails ): array {
		$email                 = new AccountProvisionedEmail();
		$emails[ $email->id ] = $email;

		return $emails;
	}
}

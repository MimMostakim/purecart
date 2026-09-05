<?php
/**
 * Central registry of every WP option key the plugin reads or writes.
 *
 * All option keys are defined here as class constants. No module may call
 * get_option() or update_option() with a raw string — use Settings::get()
 * and Settings::set() with a constant from this class instead. This ensures
 * every key is discoverable, refactorable, and impossible to mistype silently.
 *
 * @package PureCart\Settings
 */

declare( strict_types=1 );

namespace PureCart\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Option key constants.
 *
 * @since 1.0.0
 */
class OptionKeys {

	// ─── Subscriptions module ──────────────────────────────────────────────────

	/** Whether the Subscriptions module is enabled (default true). */
	public const SUB_ENABLED = 'purecart_sub_enabled';

	/** WP role slug assigned to trial subscribers (default ''). */
	public const SUB_TRIAL_ROLE = 'purecart_sub_trial_role';

	/** WP role slug assigned to active subscribers (default ''). */
	public const SUB_ACTIVE_ROLE = 'purecart_sub_active_role';

	/** WP role slug assigned after a subscription ends (default ''). */
	public const SUB_CANCELLED_ROLE = 'purecart_sub_cancelled_role';

	/** Whether each customer may only trial a product once (default true). */
	public const SUB_ONE_TRIAL_PER_CUSTOMER = 'purecart_sub_one_trial_per_customer';

	/** Max skips per subscription lifetime; 0 = unlimited (default 1). */
	public const SUB_SKIP_LIMIT = 'purecart_sub_skip_limit';

	/** Days after cancellation/expiry during which resubscribing reuses the same record (default 30). */
	public const SUB_RESUBSCRIBE_WINDOW_DAYS = 'purecart_sub_resubscribe_window_days';

	/** Retry interval list in days, e.g. [1, 3, 5] (default [1, 3, 5]). */
	public const SUB_RETRY_INTERVALS = 'purecart_sub_retry_intervals';

	/** Maximum automatic dunning retry attempts (default 3). */
	public const SUB_RETRY_ATTEMPTS = 'purecart_sub_retry_attempts';

	/** Days past_due before moving to suspended (default 7). */
	public const SUB_ACTIVE_GRACE_DAYS = 'purecart_sub_active_grace_days';

	/** Days suspended before hard-cancellation (default 7). */
	public const SUB_SUSPENDED_GRACE_DAYS = 'purecart_sub_suspended_grace_days';

	/** Average subscription lifetime in months, for LTV projection (default 24). */
	public const SUB_AVG_LIFETIME_MONTHS = 'purecart_sub_avg_lifetime_months';

	/** Default proration mode for plan upgrades/downgrades (default 'apply_at_renewal'). */
	public const SUB_PRORATION_MODE = 'purecart_sub_proration_mode';

	/** Retention offer: discount percentage (default 20). */
	public const SUB_RETENTION_DISCOUNT_PERCENT = 'purecart_sub_retention_discount_percent';

	/** Retention offer: number of discounted renewal cycles (default 3). */
	public const SUB_RETENTION_DISCOUNT_CYCLES = 'purecart_sub_retention_discount_cycles';

	/** Retention offer: pause duration in days (default 30). */
	public const SUB_RETENTION_PAUSE_DAYS = 'purecart_sub_retention_pause_days';

	/** Retention offer: contact-us URL shown to customers who pick "contact support" (default ''). */
	public const SUB_RETENTION_CONTACT_URL = 'purecart_sub_retention_contact_url';

	/** Whether renewal sync (align billing date to a fixed day-of-month) is enabled (default false). */
	public const SUB_RENEWAL_SYNC = 'purecart_sub_renewal_sync';

	/** Day-of-month (1-28) to sync billing dates to when SUB_RENEWAL_SYNC is on (default 1). */
	public const SUB_RENEWAL_SYNC_DATE = 'purecart_sub_renewal_sync_date';

	/** Days before next_payment_at to send renewal reminder emails, e.g. [7, 3, 1] (default [7, 3, 1]). */
	public const SUB_RENEWAL_REMINDER_DAYS = 'purecart_sub_renewal_reminder_days';

	/** Days before trial end to send the "trial ending soon" email (default 3). */
	public const SUB_TRIAL_REMINDER_DAYS = 'purecart_sub_trial_reminder_days';

	/** Days before card expiry to send the "card expiring soon" email (default 30). */
	public const SUB_CARD_EXPIRY_WARNING_DAYS = 'purecart_sub_card_expiry_warning_days';

	/** Whether cancelling a SaaS subscription suspends the SaaS account immediately (default false). */
	public const SUB_CANCEL_SAAS_IMMEDIATELY = 'purecart_sub_cancel_saas_immediately';

	/** Whether a customer may hold more than one active subscription at a time (default true). */
	public const SUB_ALLOW_MULTIPLE_SUBSCRIPTIONS = 'purecart_sub_allow_multiple_subscriptions';

	// ─── Licensing module ──────────────────────────────────────────────────────

	/** Order status that triggers license/download/SaaS provisioning: 'completed' | 'processing' | 'both' (default 'completed'). */
	public const LICENSE_DELIVERY_STATUS = 'purecart_license_delivery_status';

	/** HS256 secret used to sign license JWTs. Auto-generated on first use if unset and PURECART_JWT_SECRET_KEY isn't defined. */
	public const LICENSE_JWT_SECRET = 'purecart_jwt_secret_key';

	// ─── Secure Downloads module ───────────────────────────────────────────────

	/** How protected files are sent: 'streaming' (default). Phase 2 adds xsendfile, xaccel, s3, r2. */
	public const DOWNLOAD_DELIVERY = 'purecart_download_delivery';

	/** Store-wide default download limit per file; 0 = unlimited (default 0). */
	public const DOWNLOAD_MAX_COUNT = 'purecart_download_max_count';

	/** Store-wide default token lifetime in days from order completion; 0 = never expires (default 0). */
	public const DOWNLOAD_EXPIRY_DAYS = 'purecart_download_expiry_days';

	// A separate, shorter expiry for the links inside order emails was
	// considered and dropped. The email and the My Account row are the same
	// token, so a second expiry means a second token per file — with its own
	// counter, handing the customer twice the download limit they paid for,
	// and showing support two rows per file. A short-lived email link would
	// also buy little: the long-lived token is still one click away in My
	// Account. One token, one expiry, one counter.

	/**
	 * Order status that triggers download token creation: 'completed' | 'processing' | 'both'
	 * (default 'completed'). Deliberately separate from LICENSE_DELIVERY_STATUS — plenty of
	 * stores hand over the file as soon as payment clears but issue the license key later.
	 */
	public const DOWNLOAD_TRIGGER_STATUS = 'purecart_download_trigger_status';

	/** Whether an active license is required before a file is served, when Licensing is in play (default true). */
	public const DOWNLOAD_LICENSE_GATE = 'purecart_download_license_gate';

	/** Months of download log history to keep before pruning (default 12). */
	public const DOWNLOAD_LOG_RETENTION = 'purecart_download_log_retention_months';

	/** Whether customers may regenerate their own expired download links from My Account (default false). */
	public const DOWNLOAD_ALLOW_LINK_REGEN = 'purecart_download_allow_link_regen';
}

<?php
/**
 * Registers all subscription WC_Email subclasses, and scans for the handful
 * of emails that fire on "N days before X" rather than a lifecycle event.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

use PureCart\Subscriptions\Emails\SubscriptionCreatedEmail;
use PureCart\Subscriptions\Emails\TrialStartedEmail;
use PureCart\Subscriptions\Emails\TrialEndingSoonEmail;
use PureCart\Subscriptions\Emails\TrialConvertedEmail;
use PureCart\Subscriptions\Emails\RenewalReminderEmail;
use PureCart\Subscriptions\Emails\RenewalSuccessfulEmail;
use PureCart\Subscriptions\Emails\PaymentFailedEmail;
use PureCart\Subscriptions\Emails\PaymentRetryScheduledEmail;
use PureCart\Subscriptions\Emails\OverdueNoticeEmail;
use PureCart\Subscriptions\Emails\SuspendNoticeEmail;
use PureCart\Subscriptions\Emails\SuspendedGraceEndingEmail;
use PureCart\Subscriptions\Emails\CancellationNoticeEmail;
use PureCart\Subscriptions\Emails\ExpirationNoticeEmail;
use PureCart\Subscriptions\Emails\ResubscriptionConfirmedEmail;
use PureCart\Subscriptions\Emails\PlanChangedEmail;
use PureCart\Subscriptions\Emails\SkipRenewalConfirmedEmail;
use PureCart\Subscriptions\Emails\CardExpiringSoonEmail;
use PureCart\Subscriptions\Emails\PaymentReauthorizationEmail;
use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * 16 MVP emails (feature doc § 22) + 2 outside the MVP set that this step's
 * own checklist requires wired anyway (card-expiry, reauth) = 18 total.
 * Built so the remaining ~19 (delivery-type-specific, admin-facing) can be
 * added later as more AbstractSubscriptionEmail subclasses without touching
 * this registry's structure — just append to email_instances().
 *
 * Three of the 18 (`Trial Ending Soon`, `Renewal Reminder`,
 * `Suspended Grace Ending`) and one bonus (`Card Expiring Soon`) have no
 * lifecycle event to fire on — "N days before a future date" is a scan, not
 * a hook. Reuses RenewalEngine's existing hourly `purecart_scan_due_renewals`
 * job and the existing 12h `purecart_process_dunning` job (both already
 * relied on by earlier steps) rather than adding a third/fourth schedule —
 * any class can add its own listener to an existing WordPress action hook,
 * no coupling to RenewalEngine/DunningManager needed for that.
 *
 * @since 1.0.0
 */
class SubscriptionEmail {

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/** @var SubscriptionLogRepository */
	private SubscriptionLogRepository $logs;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->subscriptions = new SubscriptionRepository();
		$this->logs          = new SubscriptionLogRepository();

		add_filter( 'woocommerce_email_classes', array( $this, 'register' ) );
		add_action( 'purecart_scan_due_renewals', array( $this, 'send_reminders' ) );
		add_action( 'purecart_process_dunning', array( $this, 'send_grace_reminders' ) );
	}

	/**
	 * @since 1.0.0
	 * @param array<string, \WC_Email> $email_classes Existing registered WooCommerce emails.
	 * @return array<string, \WC_Email>
	 */
	public function register( array $email_classes ): array {
		foreach ( $this->email_instances() as $email ) {
			$email_classes[ $email->id ] = $email;
		}

		return $email_classes;
	}

	/**
	 * @since 1.0.0
	 * @return \WC_Email[]
	 */
	private function email_instances(): array {
		return array(
			new SubscriptionCreatedEmail(),
			new TrialStartedEmail(),
			new TrialEndingSoonEmail(),
			new TrialConvertedEmail(),
			new RenewalReminderEmail(),
			new RenewalSuccessfulEmail(),
			new PaymentFailedEmail(),
			new PaymentRetryScheduledEmail(),
			new OverdueNoticeEmail(),
			new SuspendNoticeEmail(),
			new SuspendedGraceEndingEmail(),
			new CancellationNoticeEmail(),
			new ExpirationNoticeEmail(),
			new ResubscriptionConfirmedEmail(),
			new PlanChangedEmail(),
			new SkipRenewalConfirmedEmail(),
			new CardExpiringSoonEmail(),
			new PaymentReauthorizationEmail(),
		);
	}

	// -----------------------------------------------------------------------
	// Reminder scans (hourly, piggybacked on RenewalEngine's scan)
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @return void
	 */
	public function send_reminders(): void {
		// Build WooCommerce's email objects before any reminder hook fires.
		// Every WC_Email subclass attaches its listener from its own
		// constructor, and those run only when WC_Emails is instantiated.
		// These scans execute from an Action Scheduler job, where nothing
		// has done that — so without this the reminder actions fire into an
		// empty hook and every reminder is lost silently, with no error and
		// nothing logged. Found while testing the Updates module's
		// notifier, which had the identical problem.
		$this->ensure_mailer();

		$this->send_renewal_reminders();
		$this->send_trial_ending_reminders();
		$this->send_card_expiry_warnings();
	}

	/**
	 * @since 1.0.0
	 * @return void
	 */
	private function send_renewal_reminders(): void {
		$reminder_days = (array) Settings::get( OptionKeys::SUB_RENEWAL_REMINDER_DAYS, array( 7, 3, 1 ) );
		$candidates    = array_merge( $this->subscriptions->find_by_status( 'active' ), $this->subscriptions->find_by_status( 'trialing' ) );

		foreach ( $candidates as $subscription ) {
			if ( ! $subscription->next_payment_at ) {
				continue;
			}

			$days_until = $this->days_until( $subscription->next_payment_at );

			foreach ( $reminder_days as $threshold ) {
				$threshold = (int) $threshold;

				// A 1-day-wide window around the threshold so an hourly scan
				// doesn't need days_until to land on an exact integer.
				if ( $days_until <= $threshold && $days_until > ( $threshold - 1 ) ) {
					$this->maybe_send( (int) $subscription->id, "renewal_reminder:{$subscription->next_payment_at}:{$threshold}", 'purecart_renewal_reminder_due', $threshold );
				}
			}
		}
	}

	/**
	 * @since 1.0.0
	 * @return void
	 */
	private function send_trial_ending_reminders(): void {
		$reminder_days = (int) Settings::get( OptionKeys::SUB_TRIAL_REMINDER_DAYS, 3 );

		foreach ( $this->subscriptions->find_by_status( 'trialing' ) as $subscription ) {
			if ( ! $subscription->trial_ends_at ) {
				continue;
			}

			$days_until = $this->days_until( $subscription->trial_ends_at );

			if ( $days_until > 0 && $days_until <= $reminder_days ) {
				$this->maybe_send( (int) $subscription->id, "trial_ending_soon:{$subscription->trial_ends_at}", 'purecart_trial_ending_soon' );
			}
		}
	}

	/**
	 * Card-expiry scan. Only CC-style tokens expose expiry data
	 * (`WC_Payment_Token_CC`) — other token types (e.g. PayPal) are silently
	 * skipped rather than treated as an error.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function send_card_expiry_warnings(): void {
		if ( ! class_exists( '\WC_Payment_Tokens' ) ) {
			return;
		}

		$warning_days = (int) Settings::get( OptionKeys::SUB_CARD_EXPIRY_WARNING_DAYS, 30 );
		$candidates   = array_merge( $this->subscriptions->find_by_status( 'active' ), $this->subscriptions->find_by_status( 'trialing' ) );

		foreach ( $candidates as $subscription ) {
			if ( empty( $subscription->payment_token_id ) ) {
				continue;
			}

			$token = \WC_Payment_Tokens::get( (int) $subscription->payment_token_id );
			if ( ! $token || ! method_exists( $token, 'get_expiry_year' ) || ! method_exists( $token, 'get_expiry_month' ) ) {
				continue;
			}

			$expiry_year  = (int) $token->get_expiry_year();
			$expiry_month = (int) $token->get_expiry_month();
			if ( ! $expiry_year || ! $expiry_month ) {
				continue;
			}

			// Cards are valid through the end of their expiry month.
			$expiry_timestamp = mktime( 0, 0, 0, $expiry_month + 1, 1, $expiry_year ) - 1;
			$days_until       = ( $expiry_timestamp - time() ) / DAY_IN_SECONDS;

			if ( $days_until > 0 && $days_until <= $warning_days ) {
				$this->maybe_send( (int) $subscription->id, "card_expiring_soon:{$subscription->payment_token_id}:{$expiry_year}-{$expiry_month}", 'purecart_card_expiring_soon' );
			}
		}
	}

	// -----------------------------------------------------------------------
	// Grace-period warning (piggybacked on DunningManager's existing 12h job)
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @return void
	 */
	public function send_grace_reminders(): void {
		$this->ensure_mailer();

		$grace_days    = (int) Settings::get( OptionKeys::SUB_SUSPENDED_GRACE_DAYS, 7 );
		$warn_days_out = 2;

		foreach ( $this->subscriptions->find_by_status( 'suspended' ) as $subscription ) {
			if ( ! $subscription->suspended_at ) {
				continue;
			}

			$elapsed_days   = $this->days_since( $subscription->suspended_at );
			$remaining_days = $grace_days - $elapsed_days;

			if ( $remaining_days > 0 && $remaining_days <= $warn_days_out ) {
				$this->maybe_send( (int) $subscription->id, "suspended_grace_ending:{$subscription->suspended_at}", 'purecart_suspended_grace_ending' );
			}
		}
	}

	/**
	 * Make sure WooCommerce has constructed its WC_Email objects, so the
	 * reminder hooks below actually have listeners attached.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private function ensure_mailer(): void {
		if ( function_exists( 'WC' ) ) {
			WC()->mailer();
		}
	}

	// -----------------------------------------------------------------------
	// Shared helpers
	// -----------------------------------------------------------------------

	/**
	 * Fire $hook for $subscription_id, but only once per unique $dedup_key —
	 * the scans above run hourly/twice-daily, so without this the same
	 * reminder would resend on every tick until the underlying date changes.
	 *
	 * @since 1.0.0
	 * @param int    $subscription_id Subscription row ID.
	 * @param string $dedup_key       Unique key identifying this specific reminder instance.
	 * @param string $hook            Action hook to fire if not already sent.
	 * @param mixed  ...$hook_args    Extra args to pass to the hook, after $subscription_id.
	 * @return void
	 */
	private function maybe_send( int $subscription_id, string $dedup_key, string $hook, ...$hook_args ): void {
		if ( $this->already_sent( $subscription_id, $dedup_key ) ) {
			return;
		}

		$this->logs->log( $subscription_id, 'reminder_sent', array( 'note' => $dedup_key ) );

		do_action( $hook, $subscription_id, ...$hook_args );
	}

	/**
	 * @since 1.0.0
	 * @param int    $subscription_id Subscription row ID.
	 * @param string $dedup_key       Unique key identifying this specific reminder instance.
	 * @return bool
	 */
	private function already_sent( int $subscription_id, string $dedup_key ): bool {
		foreach ( $this->logs->find_by_subscription( $subscription_id ) as $log ) {
			if ( 'reminder_sent' === $log->event && $dedup_key === $log->note ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @since 1.0.0
	 * @param string $mysql_datetime A future `current_time('mysql')`-style datetime string.
	 * @return float Days from now until that datetime (negative if already past).
	 */
	private function days_until( string $mysql_datetime ): float {
		return ( BillingClock::to_dt( $mysql_datetime )->getTimestamp() - BillingClock::now_dt()->getTimestamp() ) / DAY_IN_SECONDS;
	}

	/**
	 * @since 1.0.0
	 * @param string $mysql_datetime A past `current_time('mysql')`-style datetime string.
	 * @return float Days elapsed since that datetime.
	 */
	private function days_since( string $mysql_datetime ): float {
		return ( BillingClock::now_dt()->getTimestamp() - BillingClock::to_dt( $mysql_datetime )->getTimestamp() ) / DAY_IN_SECONDS;
	}
}
